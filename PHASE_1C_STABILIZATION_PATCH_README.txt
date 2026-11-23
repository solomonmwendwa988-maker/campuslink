CampusLink Phase 1C stabilization patch

Files in this archive are intended to be copied into the existing CampusLink workspace,
preserving their relative paths and overwriting matching files.

Changes:
- Post cards now carry and render the author's profile photo URL from the API.
- Comment UI renders nested replies returned by the comments endpoint.
- Verification mark is forced to a circular, compact Meta-style blue check.
- Poll action now uses a Lucide BarChart2 icon instead of a malformed glyph.

Please run:
  npm run build -w apps/web
  npm run build -w apps/api
  npm run test -w apps/api

Note: This patch was source-reviewed but could not be built in this isolated environment
because dependencies are not installed here. Run the commands above locally before deploying.
