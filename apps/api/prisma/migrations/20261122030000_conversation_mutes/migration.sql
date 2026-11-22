CREATE TABLE "ConversationMute" (
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationMute_pkey" PRIMARY KEY ("conversationId", "userId")
);
CREATE INDEX "ConversationMute_userId_createdAt_idx" ON "ConversationMute"("userId", "createdAt");
ALTER TABLE "ConversationMute" ADD CONSTRAINT "ConversationMute_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMute" ADD CONSTRAINT "ConversationMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
