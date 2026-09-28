CREATE TYPE "check_in_kind" AS ENUM ('activity_reminder', 'post_activity', 'missed_plan');
CREATE TYPE "check_in_status" AS ENUM ('pending', 'actioned', 'dismissed');

CREATE TABLE "check_in" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "activityId" CHAR(26) NOT NULL,
    "kind" "check_in_kind" NOT NULL,
    "status" "check_in_status" NOT NULL DEFAULT 'pending',
    "availableAt" TIMESTAMPTZ(3) NOT NULL,
    "actionedAt" TIMESTAMPTZ(3),
    "dismissedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "check_in_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "check_in_userId_activityId_kind_key"
ON "check_in"("userId", "activityId", "kind");

CREATE INDEX "check_in_userId_status_availableAt_id_idx"
ON "check_in"("userId", "status", "availableAt", "id");
