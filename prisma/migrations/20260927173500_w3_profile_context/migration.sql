-- CreateEnum
CREATE TYPE "profile_experience_level" AS ENUM ('exploring', 'beginner', 'returning', 'regular', 'experienced');

-- CreateEnum
CREATE TYPE "profile_intent" AS ENUM ('start', 'improve', 'social', 'explore');

-- CreateEnum
CREATE TYPE "profile_social_preference" AS ENUM ('solo', 'mixed', 'social');

-- CreateTable
CREATE TABLE "profile_user_context" (
    "userId" CHAR(26) NOT NULL,
    "city" VARCHAR(120),
    "countryCode" CHAR(2),
    "timezone" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_user_context_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "profile_hobby_context" (
    "id" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "hobbyId" CHAR(26) NOT NULL,
    "experienceLevel" "profile_experience_level" NOT NULL,
    "primaryIntent" "profile_intent" NOT NULL,
    "secondaryIntents" "profile_intent"[] NOT NULL DEFAULT ARRAY[]::"profile_intent"[],
    "goal" VARCHAR(280),
    "socialPreference" "profile_social_preference" NOT NULL DEFAULT 'mixed',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_hobby_context_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_hobby_context_userId_hobbyId_key" ON "profile_hobby_context"("userId", "hobbyId");

-- CreateIndex
CREATE INDEX "profile_hobby_context_userId_updatedAt_idx" ON "profile_hobby_context"("userId", "updatedAt");
