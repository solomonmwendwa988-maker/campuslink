# CampusLink refinement package notes

## Included changes
- Circular avatar rendering with image crop applied consistently to profile, messaging, and header avatar instances.
- Added an accessible header logout control with confirmation.
- Added animated inbox and message-history skeleton placeholders.
- Added an in-app notification sound and notification-sound preference; the preference is persisted through the existing local preference state.
- Added browser desktop-notification permission control. Browser notifications are only surfaced while the application is running and polling for notification updates.
- Updated settings security copy to avoid presenting password-change controls that are only a nonfunctional preview.

## Not represented as completed
- Voice notes are not implemented. Messaging has no durable audio upload/storage service configured. A client-only recorder would create unreliable messages that disappear or cannot be played by recipients; durable voice notes need a storage strategy and upload API.
- Background web push is not implemented. Browser desktop notification permission is not Web Push. Background push requires a service-worker subscription endpoint, server push delivery, VAPID configuration, and production testing.
- Full production build could not be run here because `npm ci` timed out twice. TypeScript syntax/transpile parsing succeeded for 65 non-declaration TS/TSX source files. The user's local dependencies should be used for full build verification.
