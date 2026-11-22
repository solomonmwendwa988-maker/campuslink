CREATE TABLE "MessagingPresence" (
  "userId" UUID NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "typingConversationId" UUID,
  "typingUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessagingPresence_pkey" PRIMARY KEY ("userId")
);
CREATE INDEX "MessagingPresence_lastSeenAt_idx" ON "MessagingPresence"("lastSeenAt");
CREATE INDEX "MessagingPresence_typingConversationId_typingUntil_idx" ON "MessagingPresence"("typingConversationId", "typingUntil");
