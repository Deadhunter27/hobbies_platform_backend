-- ADR-0036: reporting and auto-hide.
CREATE TYPE "report_target_type" AS ENUM ('post', 'reply', 'community', 'event', 'person');
CREATE TYPE "report_reason" AS ENUM ('spam', 'inappropriate', 'harassment', 'scam', 'dangerous', 'off_topic', 'other');
CREATE TYPE "report_status" AS ENUM ('open', 'dismissed', 'actioned');

CREATE TABLE "content_report" (
    "id" CHAR(26) NOT NULL,
    "reporterId" CHAR(26) NOT NULL,
    "targetType" "report_target_type" NOT NULL,
    "targetId" CHAR(26) NOT NULL,
    "reason" "report_reason" NOT NULL,
    "note" VARCHAR(500),
    "status" "report_status" NOT NULL DEFAULT 'open',
    "autoHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedBy" CHAR(26),
    CONSTRAINT "content_report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_report_reporter_target_key"
  ON "content_report"("reporterId", "targetType", "targetId");
CREATE INDEX "content_report_status_target_idx"
  ON "content_report"("status", "targetType", "targetId");
CREATE INDEX "content_report_status_created_idx"
  ON "content_report"("status", "createdAt" DESC);

-- ADR-0035: event lists by community and by host.
CREATE INDEX "activity_communityReferenceId_status_startsAt_idx"
  ON "activity"("communityReferenceId", "status", "startsAt");
CREATE INDEX "activity_hostReferenceId_status_startsAt_idx"
  ON "activity"("hostReferenceId", "status", "startsAt");

ALTER TABLE "content_report" ENABLE ROW LEVEL SECURITY;
