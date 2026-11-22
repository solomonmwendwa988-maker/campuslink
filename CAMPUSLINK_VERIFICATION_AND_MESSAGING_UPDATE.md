# CampusLink messaging + verification update

## Included
- Mobile inbox scrolling/layout stabilization (`conversation-items` now owns the remaining vertical space and scrolls independently).
- More consistent voice recording/preview action surfaces.
- Verification request flow from the owner profile, request status lookup, pending-request duplicate guard.
- Student ID value is hashed before storage; raw student ID is not stored in this request table.
- `Profile.verifiedAt` supports a verified badge only after a future trusted admin review sets the timestamp.
- Migration: `20261122042000_verification_requests`.

## Verification limitations (intentionally strict)
- This iteration does NOT grant verification badges automatically.
- Email OTP, phone OTP, secure document upload, and the admin review/grant/revoke workspace are not implemented yet.
- Requests are stored as pending for the later admin workflow. Do not mark a user verified by editing client state.
- The student ID hash is not a substitute for a document/registry check; the later reviewer workflow needs a trusted source of proof.

## Voice-message setup
Voice recording uses the browser's MediaRecorder and requires HTTPS plus microphone permission. Uploading requires the API environment variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to be configured in the deployment host (Render). The app code does not contain these secrets.

## Database
Run Prisma generate, then deploy the new migration. This migration creates the VerificationStatus enum and VerificationRequest table, and adds Profile.verifiedAt.

## Build validation
This source package could not be build-verified in the authoring environment because dependency installation timed out and left incomplete node_modules folders. Run the standard API and web builds locally before deploying.
