-- ADR-0032: Threads-style posts on top of W9 conversations.
-- ADR-0033: runtime platform settings.
-- Additive only: existing rows and the W9 API keep working.

ALTER TYPE "conversation_status" ADD VALUE IF NOT EXISTS 'deleted';

-- A post can be just text (or just photos); a title is now optional.
ALTER TABLE "conversation" ALTER COLUMN "title" DROP NOT NULL;

-- One visible level of nesting, and replies can be removed by their author.
ALTER TABLE "conversation_reply"
  ADD COLUMN "parentReplyId" CHAR(26),
  ADD COLUMN "status" "conversation_status" NOT NULL DEFAULT 'published';
ALTER TABLE "conversation_reply"
  ADD CONSTRAINT "conversation_reply_parentReplyId_fkey"
  FOREIGN KEY ("parentReplyId") REFERENCES "conversation_reply"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "conversation_reply_parentReplyId_idx" ON "conversation_reply"("parentReplyId");

-- Photos attached to a post (replyId NULL) or to a reply. A media item can be
-- attached once only.
CREATE TABLE "conversation_attachment" (
    "id" CHAR(26) NOT NULL,
    "conversationId" CHAR(26) NOT NULL,
    "replyId" CHAR(26),
    "mediaId" CHAR(26) NOT NULL,
    "position" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversation_attachment_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "conversation"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversation_attachment_replyId_fkey"
      FOREIGN KEY ("replyId") REFERENCES "conversation_reply"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversation_attachment_position_check" CHECK ("position" BETWEEN 0 AND 3)
);
CREATE UNIQUE INDEX "conversation_attachment_mediaId_key" ON "conversation_attachment"("mediaId");
CREATE INDEX "conversation_attachment_conversationId_replyId_position_idx"
  ON "conversation_attachment"("conversationId", "replyId", "position");

-- One like per person per post or reply.
CREATE TABLE "conversation_like" (
    "targetType" VARCHAR(16) NOT NULL,
    "targetId" CHAR(26) NOT NULL,
    "userId" CHAR(26) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_like_pkey" PRIMARY KEY ("targetType", "targetId", "userId"),
    CONSTRAINT "conversation_like_targetType_check" CHECK ("targetType" IN ('conversation', 'reply'))
);
CREATE INDEX "conversation_like_userId_createdAt_idx" ON "conversation_like"("userId", "createdAt" DESC);

-- Cross-hobby feed ordering.
CREATE INDEX "conversation_status_createdAt_id_idx"
  ON "conversation"("status", "createdAt" DESC, "id" DESC);

CREATE TABLE "platform_setting" (
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" CHAR(26),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "platform_setting_pkey" PRIMARY KEY ("key")
);

-- Reached only through the API (same posture as every other table).
ALTER TABLE "conversation_attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_like" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_setting" ENABLE ROW LEVEL SECURITY;
