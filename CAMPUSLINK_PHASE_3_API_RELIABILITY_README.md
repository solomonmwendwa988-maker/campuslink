# CampusLink Phase 3 — API Security, Error Handling & Reliability

This patch adds a consistent, safer API error envelope and request correlation IDs without changing route contracts or database schema.


## Included
- Per-request UUID correlation ID exposed as `X-Request-Id`.
- Global exception filter for consistent JSON error responses.
- Unexpected 5xx errors return generic messages; details are not returned to clients.
- 5xx logs include request ID, HTTP method, path, and error class only (not exception text, tokens, or request body).
- Error response path excludes query strings.
- Global validation remains whitelist/strict; implicit conversion is disabled explicitly.
- In production, validation messages are suppressed by `disableErrorMessages` setting.
- Unit tests for response sanitization and client-safe messages.


## Error response shape
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Internal server error",
  "timestamp": "ISO-8601 timestamp",
  "path": "/api/v1/example",
  "requestId": "uuid"
}
```

## Apply
Extract this patch into the CampusLink workspace root and overwrite only the listed files. No migration or data changes.


## Verify
```powershell
npm run build -w apps/api
npm run test -w apps/api
```
The new HTTP error-filter tests can also be run with:
```powershell
npx tsx --test apps/api/test/http-error-filter.spec.ts
```
