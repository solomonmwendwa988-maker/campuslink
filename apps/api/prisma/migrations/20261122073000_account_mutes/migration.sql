-- Account-level mute management for CampusLink.
CREATE TABLE IF NOT EXISTS "AccountMute" (
  "userId" UUID NOT NULL,
  "mutedUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountMute_pkey" PRIMARY KEY ("userId", "mutedUserId"),
  CONSTRAINT "AccountMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountMute_mutedUserId_fkey" FOREIGN KEY ("mutedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AccountMute_mutedUserId_idx" ON "AccountMute"("mutedUserId");
