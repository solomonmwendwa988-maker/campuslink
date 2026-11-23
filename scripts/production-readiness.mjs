#!/usr/bin/env node
// CampusLink production preflight. Read-only; does not contact external services.
const mode = process.argv[2];
const errors = [], warnings = [];
const pass = (s) => console.log(`  PASS  ${s}`);
const fail = (s) => errors.push(s);
const warn = (s) => warnings.push(s);
const https = (s) => { try { return new URL(s).protocol === 'https:'; } catch { return false; } };
const local = (s) => /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(s || '');
console.log(`\nCampusLink production preflight (${mode || 'unknown'})`);
console.log('Read-only check. Secret values are never printed.\n');
if (mode === 'api') {
  if (process.env.NODE_ENV === 'production') pass('NODE_ENV=production'); else fail('NODE_ENV must be production.');
  for (const key of ['DATABASE_URL','DIRECT_URL','JWT_ACCESS_SECRET','CORS_ORIGINS']) {
    if (process.env[key]?.trim()) pass(`${key} configured`); else fail(`${key} is missing.`);
  }
  const secret = process.env.JWT_ACCESS_SECRET || '';
  if (secret.length >= 32 && !/^replace[-_]/i.test(secret)) pass('JWT secret length and placeholder check'); else fail('JWT_ACCESS_SECRET must be a non-placeholder secret of at least 32 characters.');
  const origins=(process.env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if (origins.length && origins.every(x=>https(x)&&!local(x))) pass('CORS origins are HTTPS and non-local'); else fail('CORS_ORIGINS must contain exact production HTTPS origins only (no localhost).');
  const port=process.env.PORT;
  if (!port || (Number.isInteger(Number(port))&&Number(port)>=1&&Number(port)<=65535)) pass('PORT is platform-managed or valid'); else fail('PORT must be a valid TCP port (1-65535).');
  const cloud=['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'];
  const count=cloud.filter(k=>!!process.env[k]?.trim()).length;
  if (count===0) warn('Cloudinary is unset; media features requiring it may be unavailable.'); else if(count===3) pass('Cloudinary credentials consistently configured'); else fail('Set all Cloudinary variables or leave all unset.');
} else if (mode === 'web') {
  const url=process.env.VITE_API_URL?.trim();
  if(url&&https(url)&&!local(url)) pass('VITE_API_URL is a production HTTPS URL'); else fail('VITE_API_URL must be set to a production HTTPS API origin (no localhost and no /api/v1 suffix).');
  if(url) try { const u=new URL(url); if((u.pathname&&u.pathname!=='/')||u.search||u.hash) warn('Use a clean API origin without path, query or fragment; verify the /api/v1 prefix is not duplicated.'); } catch {}
} else fail('Usage: node scripts/production-readiness.mjs api|web');
for(const w of warnings) console.log(`  WARN  ${w}`);
for(const e of errors) console.error(`  FAIL  ${e}`);
console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s).`);
if(errors.length) process.exitCode=1; else console.log('Preflight passed. Review the deployment checklist before release.');
