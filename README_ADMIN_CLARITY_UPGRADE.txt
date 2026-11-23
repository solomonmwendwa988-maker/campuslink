CampusLink Admin Clarity Upgrade

Extract the included files into the workspace root, allowing overwrite.
This patch adds recent comment context to admin user details, formats audit metadata into readable labels, and replaces Activity Center dark/black panels with a clean light admin surface.

Build validation should be run locally:
  npm run build -w apps/web
  npm run build -w apps/api

No database migration is included. This patch has not been compiled against the Windows workspace.
