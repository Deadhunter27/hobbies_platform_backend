-- Separate a completed real-world record from an Activity opportunity/plan.
CREATE TABLE "activity_record" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "hobbyId" CHAR(26) NOT NULL,
    "opportunityId" CHAR(26),
    "sportType" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "distanceMeters" DOUBLE PRECISION,
    "notes" TEXT,
    "source" VARCHAR(24) NOT NULL,
    "sourceReferenceId" VARCHAR(80),
    "externalUrl" TEXT,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_record_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_record_user_started_idx"
  ON "activity_record"("userId", "startedAt" DESC, "id");
CREATE INDEX "activity_record_hobby_started_idx"
  ON "activity_record"("hobbyId", "startedAt" DESC, "id");
-- PostgreSQL unique indexes allow multiple NULLs, so manual records may share
-- sourceReferenceId=NULL while each imported external activity stays idempotent.
CREATE UNIQUE INDEX "activity_record_external_source_key"
  ON "activity_record"("userId", "source", "sourceReferenceId");

-- Tokens are encrypted by the application before persistence. The table owns
-- only the durable connection; Wayfinder identity remains the source of user ownership.
CREATE TABLE "strava_connection" (
    "userId" CHAR(26) NOT NULL,
    "athleteId" VARCHAR(32) NOT NULL,
    "athleteDisplayName" VARCHAR(160),
    "accessTokenCiphertext" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strava_connection_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "strava_connection_athlete_key" ON "strava_connection"("athleteId");
