CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "Profile" ADD COLUMN "verifiedAt" TIMESTAMP(3);
CREATE TABLE "VerificationRequest" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "course" TEXT NOT NULL,
  "campus" TEXT NOT NULL,
  "reason" VARCHAR(800) NOT NULL,
  "studentIdHash" TEXT NOT NULL,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewerId" UUID,
  "reviewNote" VARCHAR(500),
  CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VerificationRequest_userId_status_submittedAt_idx" ON "VerificationRequest"("userId", "status", "submittedAt");
