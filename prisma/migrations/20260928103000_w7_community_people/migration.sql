CREATE TYPE "community_status" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "community_membership_role" AS ENUM ('member', 'host', 'organizer');
CREATE TYPE "community_membership_state" AS ENUM ('active', 'left');

CREATE TABLE "community" (
    "id" CHAR(26) NOT NULL,
    "hobbyId" CHAR(26) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "city" VARCHAR(120),
    "countryCode" CHAR(2),
    "status" "community_status" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "community_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_membership" (
    "id" CHAR(26) NOT NULL,
    "communityId" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "displayNameSnapshot" VARCHAR(120) NOT NULL,
    "role" "community_membership_role" NOT NULL DEFAULT 'member',
    "state" "community_membership_state" NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMPTZ(3) NOT NULL,
    "leftAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "community_membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_slug_key" ON "community"("slug");
CREATE INDEX "community_status_name_id_idx" ON "community"("status", "name", "id");
CREATE INDEX "community_hobbyId_status_idx" ON "community"("hobbyId", "status");

CREATE UNIQUE INDEX "community_membership_communityId_userId_key"
ON "community_membership"("communityId", "userId");
CREATE INDEX "community_membership_userId_state_updatedAt_idx"
ON "community_membership"("userId", "state", "updatedAt");
CREATE INDEX "community_membership_communityId_state_role_idx"
ON "community_membership"("communityId", "state", "role");

ALTER TABLE "community_membership"
ADD CONSTRAINT "community_membership_communityId_fkey"
FOREIGN KEY ("communityId") REFERENCES "community"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
