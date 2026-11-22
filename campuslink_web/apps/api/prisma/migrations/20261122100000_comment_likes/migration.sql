CREATE TABLE "CommentLike" (
    "userId" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("userId", "commentId")
);
CREATE INDEX "CommentLike_commentId_createdAt_idx" ON "CommentLike"("commentId", "createdAt");
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
