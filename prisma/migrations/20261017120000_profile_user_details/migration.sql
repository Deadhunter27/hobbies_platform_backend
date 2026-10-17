-- CreateEnum
CREATE TYPE "profile_gender" AS ENUM ('female', 'male', 'nonbinary', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "profile_acquisition_source" AS ENUM ('instagram', 'tiktok', 'friend', 'community', 'search', 'event', 'other');

-- CreateTable
CREATE TABLE "profile_user_details" (
    "userId" CHAR(26) NOT NULL,
    "handle" VARCHAR(30),
    "birthYear" SMALLINT,
    "gender" "profile_gender",
    "instagramHandle" VARCHAR(30),
    "tiktokHandle" VARCHAR(24),
    "acquisitionSource" "profile_acquisition_source",
    "acquisitionDetail" VARCHAR(120),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentUpdatedAt" TIMESTAMPTZ(3),
    "introCompletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_user_details_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_user_details_handle_key" ON "profile_user_details"("handle");

-- Personal data is reached only through the API (ADR-0028/0031): never expose it via PostgREST.
ALTER TABLE "profile_user_details" ENABLE ROW LEVEL SECURITY;
