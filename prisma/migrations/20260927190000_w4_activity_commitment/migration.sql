CREATE TYPE "activity_effort_level" AS ENUM ('easy', 'moderate', 'challenging', 'open');
CREATE TYPE "activity_status" AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE "activity_commitment_state" AS ENUM ('interested', 'committed', 'cancelled', 'missed');

CREATE TABLE "activity" (
    "id" CHAR(26) NOT NULL,
    "hobbyId" CHAR(26) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "activityType" VARCHAR(80) NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3),
    "timezone" VARCHAR(64) NOT NULL,
    "placeName" VARCHAR(160) NOT NULL,
    "addressLabel" VARCHAR(240),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "hostName" VARCHAR(160),
    "hostType" VARCHAR(40),
    "hostReferenceId" CHAR(26),
    "communityReferenceId" CHAR(26),
    "effortLevel" "activity_effort_level" NOT NULL,
    "capacity" INTEGER,
    "status" "activity_status" NOT NULL DEFAULT 'draft',
    "preparation" TEXT NOT NULL,
    "expectations" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_commitment" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "activityId" CHAR(26) NOT NULL,
    "state" "activity_commitment_state" NOT NULL,
    "committedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "missedAt" TIMESTAMPTZ(3),
    "note" VARCHAR(280),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "activity_commitment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_status_startsAt_id_idx" ON "activity"("status", "startsAt", "id");
CREATE INDEX "activity_hobbyId_status_startsAt_idx" ON "activity"("hobbyId", "status", "startsAt");
CREATE UNIQUE INDEX "activity_commitment_userId_activityId_key" ON "activity_commitment"("userId", "activityId");
CREATE INDEX "activity_commitment_userId_updatedAt_idx" ON "activity_commitment"("userId", "updatedAt");
CREATE INDEX "activity_commitment_activityId_state_idx" ON "activity_commitment"("activityId", "state");

ALTER TABLE "activity_commitment"
ADD CONSTRAINT "activity_commitment_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
