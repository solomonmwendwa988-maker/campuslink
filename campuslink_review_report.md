# CampusLink review — findings

## Confirmed frontend behavior issue
One `App.tsx` version in the uploaded archive contains this automatic redirect:

```tsx
if (isAuthenticated && adminIdentity?.admin.role === 'SUPER_ADMIN' && page !== 'Admin')
  return <AdminDashboardPage identity={adminIdentity} onBack={()=>{}}/>;
```

This sends an authenticated Super Admin to the Admin dashboard even when they navigate to ordinary app pages. It can make a successful login appear to skip the normal app. A newer App version in the archive does not contain this redirect, so the flattened archive does not let me confirm which copy is the active file.

## Repair script
`campuslink_repair.ps1`:
- Creates a backup before touching `apps/web/src/app/App.tsx`.
- Removes the automatic Super Admin dashboard redirect if present.
- Restores the Admin dashboard Back action to navigate to Home if the older variant has the empty Back handler.
- Adds a missing `Shield` lucide import only if `Shield` is referenced but not imported.
- Regenerates Prisma Client, builds frontend and backend, and runs API auth security tests.

## Security review notes
- Frontend sign-in calls the real API login endpoint and sends identifier/password.
- Backend login verifies a password hash; it does not contain a hardcoded Admin credential or unconditional login bypass in the reviewed code.
- Refresh sessions are opaque tokens, hashed in the database, rotated on refresh, and checked against session revocation/expiry.
- Admin endpoints use JWT and role guards; role elevation to `SUPER_ADMIN` is bootstrap-only through the reviewed role-change service.
- A valid local refresh cookie can silently restore a prior session. This is normal session restoration, not an authentication bypass. Sign out locally before testing a fresh login.

## Limitations
The archive flattened directory paths and contains duplicate files with different contents. I cannot safely replace files or rebuild the complete project from this archive alone. It also excludes installed dependencies, so builds/tests cannot be executed in this review environment. The repair script is intended to run against your actual workspace and report remaining build/test errors.
