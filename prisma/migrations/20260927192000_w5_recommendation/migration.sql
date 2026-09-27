-- CreateEnum
CREATE TYPE "recommendation_status" AS ENUM ('active', 'rejected', 'superseded', 'selected');

-- CreateEnum
CREATE TYPE "recommendation_rejection_reason" AS ENUM ('timing', 'too_difficult', 'prefer_solo', 'learn_first', 'social_comfort', 'other');

-- CreateTable
CREATE TABLE "recommendation_decision" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "hobbyId" CHAR(26) NOT NULL,
    "activityId" CHAR(26) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "rationale" TEXT NOT NULL,
    "fitSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intent" VARCHAR(40) NOT NULL,
    "status" "recommendation_status" NOT NULL DEFAULT 'active',
    "rejectionReason" "recommendation_rejection_reason",
    "rejectionNote" VARCHAR(280),
    "selectedActivityId" CHAR(26),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recommendation_decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_decision_userId_hobbyId_status_updatedAt_idx"
ON "recommendation_decision"("userId", "hobbyId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "recommendation_decision_activityId_idx"
ON "recommendation_decision"("activityId");

-- CreateIndex
CREATE INDEX "recommendation_decision_selectedActivityId_idx"
ON "recommendation_decision"("selectedActivityId");
