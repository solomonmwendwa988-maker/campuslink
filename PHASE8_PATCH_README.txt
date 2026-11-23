CampusLink Phase 8 - Production Readiness patch

Additive patch: preflight scripts, package scripts and deployment checklist. No app routes, schema, database data, authentication or hosting settings are changed.

Extract into the existing repo root, preserving paths and overwriting the included package.json files. Run:
  npm run production:check:api
  npm run production:check:web

Set the intended environment variables before running the checks. They are read-only and never print secret values. Review docs/production/PHASE_8_PRODUCTION_READINESS.md before deploying.
