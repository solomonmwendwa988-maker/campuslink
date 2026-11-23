# CampusLink Phase 1A — Icon declaration fix

This patch adds five Lucide icon declarations missing from `apps/web/src/vendor.d.ts`: `BookOpen`, `Briefcase`, `HeartHandshake`, `MapPin`, and `ArrowUpRight`. It also includes the Phase 1A files.

Extract into the project root and overwrite when prompted. Then run:

```powershell
npm run build -w apps/web
npm run build -w apps/api
npm run test -w apps/api
```

The root package does not define `test:api`. The API workspace defines `test`, so use `npm run test -w apps/api`.
