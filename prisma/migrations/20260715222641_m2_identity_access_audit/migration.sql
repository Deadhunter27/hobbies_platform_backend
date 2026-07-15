-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "global_role" AS ENUM ('user', 'staff');

-- CreateTable
CREATE TABLE "identity_user" (
    "id" CHAR(26) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "globalRole" "global_role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "identity_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_session" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "refreshTokenHash" CHAR(64) NOT NULL,
    "familyId" CHAR(26) NOT NULL,
    "deviceLabel" VARCHAR(120),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "replacedById" CHAR(26),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_resource_role" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "resourceType" VARCHAR(40) NOT NULL,
    "resourceId" VARCHAR(40) NOT NULL,
    "role" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_resource_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entry" (
    "id" CHAR(26) NOT NULL,
    "actorId" CHAR(26),
    "action" VARCHAR(80) NOT NULL,
    "resourceType" VARCHAR(40) NOT NULL,
    "resourceId" VARCHAR(40),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "requestId" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_user_email_key" ON "identity_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "identity_session_refreshTokenHash_key" ON "identity_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "identity_session_userId_idx" ON "identity_session"("userId");

-- CreateIndex
CREATE INDEX "identity_session_familyId_idx" ON "identity_session"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "access_resource_role_userId_resourceType_resourceId_key" ON "access_resource_role"("userId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_entry_resourceType_resourceId_createdAt_idx" ON "audit_entry"("resourceType", "resourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "identity_session" ADD CONSTRAINT "identity_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
