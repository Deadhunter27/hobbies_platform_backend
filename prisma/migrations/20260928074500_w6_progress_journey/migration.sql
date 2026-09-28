ALTER TYPE "activity_commitment_state" ADD VALUE IF NOT EXISTS 'completed';

ALTER TABLE "activity_commitment"
ADD COLUMN "completedAt" TIMESTAMPTZ(3);

CREATE TABLE "progress_reflection" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "hobbyId" CHAR(26) NOT NULL,
    "activityId" CHAR(26) NOT NULL,
    "rating" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" VARCHAR(560),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "progress_reflection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "progress_reflection_userId_activityId_key"
ON "progress_reflection"("userId", "activityId");

CREATE INDEX "progress_reflection_userId_hobbyId_occurredAt_id_idx"
ON "progress_reflection"("userId", "hobbyId", "occurredAt", "id");
