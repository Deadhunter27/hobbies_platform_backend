-- ADR-0034: follow graph. Logical user references, no FK to identity.
CREATE TABLE "person_follow" (
    "followerId" CHAR(26) NOT NULL,
    "followeeId" CHAR(26) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "person_follow_pkey" PRIMARY KEY ("followerId", "followeeId"),
    CONSTRAINT "person_follow_not_self_check" CHECK ("followerId" <> "followeeId")
);
CREATE INDEX "person_follow_followee_created_idx" ON "person_follow"("followeeId", "createdAt" DESC);
CREATE INDEX "person_follow_follower_created_idx" ON "person_follow"("followerId", "createdAt" DESC);

-- People-in-a-hobby suggestions.
CREATE INDEX "profile_hobby_context_hobbyId_updatedAt_idx" ON "profile_hobby_context"("hobbyId", "updatedAt" DESC);

ALTER TABLE "person_follow" ENABLE ROW LEVEL SECURITY;
