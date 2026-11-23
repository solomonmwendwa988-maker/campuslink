import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { PrismaClient } from '@prisma/client';

const baseUrl = process.env.API_TEST_BASE_URL;
const enabled = Boolean(baseUrl && process.env.DATABASE_URL);
const prisma = enabled ? new PrismaClient() : undefined;

test('PostgreSQL-backed auth registration, uniqueness, login, rotation and logout', { skip: !enabled }, async () => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 18);
  const email = `dbtest-${suffix}@example.invalid`;
  const username = `dbtest_${suffix}`;
  const password = `DbTest-${randomUUID()}-aA1!`;
  const base = baseUrl!;
  const body = { name: 'Database Integration Test', username, email, password, campus: 'Main Campus', course: 'Database Test', year: 1 };
  const request = (url: string, init?: RequestInit) => fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const cookieValue = (response: Response) => {
    const cookies = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
    const match = cookies.map((cookie) => cookie.match(/(?:^|;\s*)campuslink_refresh=([^;]+)/)).find(Boolean);
    assert.ok(match, 'expected refresh cookie');
    return decodeURIComponent(match[1]);
  };
  let createdUserId: string | undefined;

  try {
    const registerUrl = `${base}/api/v1/auth/register`;
    const registered = await request(registerUrl, { method: 'POST', body: JSON.stringify(body) });
    assert.equal(registered.status, 201);
    const registeredBody = await registered.json() as { user: { id: string } };
    createdUserId = registeredBody.user.id;
    const persisted = await prisma!.user.findUnique({ where: { id: createdUserId }, include: { profile: true } });
    assert.ok(persisted?.profile, 'account and profile should persist');
    assert.notEqual(persisted.passwordHash, password, 'password must not be stored as plaintext');
    assert.match(persisted.passwordHash, /^\$2[aby]\$/);

    const duplicateEmail = await request(registerUrl, { method: 'POST', body: JSON.stringify({ ...body, username: `${username}x` }) });
    assert.equal(duplicateEmail.status, 409);
    const duplicateUsername = await request(registerUrl, { method: 'POST', body: JSON.stringify({ ...body, email: `other-${suffix}@example.invalid` }) });
    assert.equal(duplicateUsername.status, 409);

    const loginUrl = `${base}/api/v1/auth/login`;
    const wrongLogin = await request(loginUrl, { method: 'POST', body: JSON.stringify({ identifier: email, password: 'incorrect-password' }) });
    assert.equal(wrongLogin.status, 401);
    const login = await request(loginUrl, { method: 'POST', body: JSON.stringify({ identifier: email, password }) });
    assert.equal(login.status, 200);
    const accessToken = (await login.json() as { accessToken: string }).accessToken;
    const oldRefresh = cookieValue(login);
    const session = await prisma!.refreshSession.findFirst({ where: { userId: createdUserId } });
    assert.ok(session);
    assert.notEqual(session.tokenHash, oldRefresh, 'refresh token must be stored only as a hash');

    const meUrl = `${base}/api/v1/auth/me`;
    assert.equal((await request(meUrl, { headers: { authorization: `Bearer ${accessToken}` } })).status, 200);
    const refreshUrl = `${base}/api/v1/auth/refresh`;
    const refresh = await request(refreshUrl, { method: 'POST', headers: { origin: 'http://localhost:5173', cookie: `campuslink_refresh=${encodeURIComponent(oldRefresh)}` } });
    assert.equal(refresh.status, 200);
    const rotatedAccess = (await refresh.json() as { accessToken: string }).accessToken;
    const newRefresh = cookieValue(refresh);
    assert.notEqual(newRefresh, oldRefresh);
    const replay = await request(refreshUrl, { method: 'POST', headers: { origin: 'http://localhost:5173', cookie: `campuslink_refresh=${encodeURIComponent(oldRefresh)}` } });
    assert.equal(replay.status, 401);

    const logout = await request(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { origin: 'http://localhost:5173', cookie: `campuslink_refresh=${encodeURIComponent(newRefresh)}` } });
    assert.equal(logout.status, 200);
    assert.equal((await request(meUrl, { headers: { authorization: `Bearer ${rotatedAccess}` } })).status, 401);

    // Session list/revoke must invalidate both the refresh cookie and its access token.
    const loginAgain = await request(loginUrl, { method: 'POST', body: JSON.stringify({ identifier: email, password }) });
    assert.equal(loginAgain.status, 200);
    const loginAgainBody = await loginAgain.json() as { accessToken: string };
    const loginAgainRefresh = cookieValue(loginAgain);
    const sessionsResponse = await request(`${base}/api/v1/auth/sessions`, { headers: { authorization: `Bearer ${loginAgainBody.accessToken}` } });
    assert.equal(sessionsResponse.status, 200);
    const sessions = await sessionsResponse.json() as { data: Array<{ id: string }> };
    assert.ok(sessions.data.length > 0);
    const revoked = await request(`${base}/api/v1/auth/sessions/${sessions.data[0].id}/revoke`, { method: 'POST', headers: { authorization: `Bearer ${loginAgainBody.accessToken}` } });
    assert.equal(revoked.status, 200);
    assert.equal((await request(meUrl, { headers: { authorization: `Bearer ${loginAgainBody.accessToken}` } })).status, 401);
    const revokedRefresh = await request(refreshUrl, { method: 'POST', headers: { origin: 'http://localhost:5173', cookie: `campuslink_refresh=${encodeURIComponent(loginAgainRefresh)}` } });
    assert.equal(revokedRefresh.status, 401);

    // Changing a password revokes every session, not just the current one.
    const changeLogin = await request(loginUrl, { method: 'POST', body: JSON.stringify({ identifier: email, password }) });
    assert.equal(changeLogin.status, 200);
    const changeLoginBody = await changeLogin.json() as { accessToken: string };
    const changeLoginRefresh = cookieValue(changeLogin);
    const changedPassword = `Changed-${randomUUID()}-Aa9!`;
    const changeResponse = await request(`${base}/api/v1/auth/change-password`, { method: 'POST', headers: { authorization: `Bearer ${changeLoginBody.accessToken}` }, body: JSON.stringify({ currentPassword: password, newPassword: changedPassword }) });
    assert.equal(changeResponse.status, 200);
    assert.equal((await request(meUrl, { headers: { authorization: `Bearer ${changeLoginBody.accessToken}` } })).status, 401);
    const invalidatedRefresh = await request(refreshUrl, { method: 'POST', headers: { origin: 'http://localhost:5173', cookie: `campuslink_refresh=${encodeURIComponent(changeLoginRefresh)}` } });
    assert.equal(invalidatedRefresh.status, 401);

    // Deactivation revokes sessions; a deliberate fresh login reactivates the account.
    const changedLogin = await request(loginUrl, { method: 'POST', body: JSON.stringify({ identifier: email, password: changedPassword }) });
    assert.equal(changedLogin.status, 200);
    const changedLoginBody = await changedLogin.json() as { accessToken: string };
    const deactivateResponse = await request(`${base}/api/v1/auth/deactivate`, { method: 'POST', headers: { authorization: `Bearer ${changedLoginBody.accessToken}` }, body: JSON.stringify({ password: changedPassword }) });
    assert.equal(deactivateResponse.status, 200);
    assert.equal((await request(meUrl, { headers: { authorization: `Bearer ${changedLoginBody.accessToken}` } })).status, 401);
    const reactivationLogin = await request(loginUrl, { method: 'POST', body: JSON.stringify({ identifier: email, password: changedPassword }) });
    assert.equal(reactivationLogin.status, 200);
    const reactivationBody = await reactivationLogin.json() as { accessToken: string; reactivated: boolean };
    assert.equal(reactivationBody.reactivated, true);
    assert.equal((await request(meUrl, { headers: { authorization: `Bearer ${reactivationBody.accessToken}` } })).status, 200);
    const finalLogout = await request(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { origin: 'http://localhost:5173', cookie: `campuslink_refresh=${encodeURIComponent(cookieValue(reactivationLogin))}` } });
    assert.equal(finalLogout.status, 200);
  } finally {
    if (createdUserId) await prisma!.user.deleteMany({ where: { id: createdUserId } });
    else await prisma!.user.deleteMany({ where: { email, username } });
  }
});

after(async () => { await prisma?.$disconnect(); });
