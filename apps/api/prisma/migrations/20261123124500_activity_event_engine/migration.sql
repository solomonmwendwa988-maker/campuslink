CREATE TABLE "ActivityEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventType" VARCHAR(80) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "outcome" VARCHAR(24),
  "actorUserId" UUID,
  "targetType" VARCHAR(40),
  "targetId" VARCHAR(80),
  "maskedIdentifier" VARCHAR(160),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt" DESC);
CREATE INDEX "ActivityEvent_category_createdAt_idx" ON "ActivityEvent"("category", "createdAt" DESC);
CREATE INDEX "ActivityEvent_eventType_createdAt_idx" ON "ActivityEvent"("eventType", "createdAt" DESC);
CREATE INDEX "ActivityEvent_actorUserId_createdAt_idx" ON "ActivityEvent"("actorUserId", "createdAt" DESC);
CREATE INDEX "ActivityEvent_outcome_createdAt_idx" ON "ActivityEvent"("outcome", "createdAt" DESC);
