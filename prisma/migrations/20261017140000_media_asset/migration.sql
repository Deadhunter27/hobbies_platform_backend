-- CreateEnum
CREATE TYPE "media_purpose" AS ENUM ('avatar', 'activity_record', 'conversation', 'community_cover', 'activity_cover');

-- CreateEnum
CREATE TYPE "media_status" AS ENUM ('pending', 'ready', 'deleted');

-- AlterTable
ALTER TABLE "profile_user_details" ADD COLUMN "avatarMediaId" CHAR(26);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" CHAR(26) NOT NULL,
    "ownerUserId" CHAR(26) NOT NULL,
    "purpose" "media_purpose" NOT NULL,
    "status" "media_status" NOT NULL DEFAULT 'pending',
    "objectKey" VARCHAR(200) NOT NULL,
    "mimeType" VARCHAR(40) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_object_key_key" ON "media_asset"("objectKey");

-- CreateIndex
CREATE INDEX "media_asset_owner_created_idx" ON "media_asset"("ownerUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "media_asset_status_created_idx" ON "media_asset"("status", "createdAt");

-- Personal media metadata is reached only through the API (ADR-0030).
ALTER TABLE "media_asset" ENABLE ROW LEVEL SECURITY;
