-- CampusLink Phase 6: targeted indexes for common active-record feed queries.
-- Additive only: no tables, rows, or existing indexes are removed.
CREATE INDEX IF NOT EXISTS "Post_deletedAt_createdAt_id_idx" ON "Post" ("deletedAt", "createdAt" DESC, "id");
CREATE INDEX IF NOT EXISTS "Comment_postId_parentId_deletedAt_createdAt_id_idx" ON "Comment" ("postId", "parentId", "deletedAt", "createdAt" DESC, "id");
CREATE INDEX IF NOT EXISTS "User_deletedAt_deactivatedAt_createdAt_id_idx" ON "User" ("deletedAt", "deactivatedAt", "createdAt" DESC, "id");
CREATE INDEX IF NOT EXISTS "Listing_campusId_available_deletedAt_createdAt_id_idx" ON "Listing" ("campusId", "available", "deletedAt", "createdAt" DESC, "id");
CREATE INDEX IF NOT EXISTS "Event_campusId_deletedAt_startsAt_id_idx" ON "Event" ("campusId", "deletedAt", "startsAt", "id");
