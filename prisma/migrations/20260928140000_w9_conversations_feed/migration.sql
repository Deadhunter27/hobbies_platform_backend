CREATE TYPE "conversation_status" AS ENUM ('published', 'archived');

CREATE TABLE "conversation" (
    "id" CHAR(26) NOT NULL,
    "hobbyId" CHAR(26) NOT NULL,
    "communityReferenceId" CHAR(26),
    "activityReferenceId" CHAR(26),
    "authorId" CHAR(26) NOT NULL,
    "authorDisplayName" VARCHAR(120) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "body" TEXT NOT NULL,
    "status" "conversation_status" NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversation_hobbyId_status_createdAt_id_idx"
ON "conversation"("hobbyId", "status", "createdAt" DESC, "id" DESC);
CREATE INDEX "conversation_communityReferenceId_idx" ON "conversation"("communityReferenceId");
CREATE INDEX "conversation_activityReferenceId_idx" ON "conversation"("activityReferenceId");
CREATE INDEX "conversation_authorId_createdAt_idx" ON "conversation"("authorId", "createdAt" DESC);

CREATE TABLE "conversation_reply" (
    "id" CHAR(26) NOT NULL,
    "conversationId" CHAR(26) NOT NULL,
    "authorId" CHAR(26) NOT NULL,
    "authorDisplayName" VARCHAR(120) NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "conversation_reply_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversation_reply_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "conversation"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "conversation_reply_conversationId_createdAt_id_idx"
ON "conversation_reply"("conversationId", "createdAt" ASC, "id" ASC);
CREATE INDEX "conversation_reply_authorId_createdAt_idx"
ON "conversation_reply"("authorId", "createdAt" DESC);
