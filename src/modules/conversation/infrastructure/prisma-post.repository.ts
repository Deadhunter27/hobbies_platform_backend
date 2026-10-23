import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/database';
import { encodeCursor, newId } from '@shared/utils';
import type {
  NewPost,
  NewReply,
  PostRepository,
  ReplyRef,
} from '../application/ports/post.repository.port';
import type { LikeTarget, PostPage, PostRecord, ReplyRecord } from '../domain';

type PostRow = {
  id: string;
  hobbyId: string;
  authorId: string;
  authorDisplayName: string;
  title: string | null;
  body: string;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
  createdAt: Date;
  likeCount: bigint | number;
  replyCount: bigint | number;
  likedByViewer: boolean;
};

type ReplyRow = {
  id: string;
  postId: string;
  parentReplyId: string | null;
  authorId: string;
  authorDisplayName: string;
  body: string;
  createdAt: Date;
  likeCount: bigint | number;
  likedByViewer: boolean;
};

type AttachmentRow = { ownerId: string; mediaId: string };

const PUBLISHED = Prisma.sql`'published'::"conversation_status"`;

function postSelect(viewerId: string | null): Prisma.Sql {
  return Prisma.sql`
    SELECT
      c."id", c."hobbyId", c."authorId", c."authorDisplayName", c."title", c."body",
      c."communityReferenceId", c."activityReferenceId", c."createdAt",
      (SELECT COUNT(*) FROM "conversation_like" l
        WHERE l."targetType" = 'conversation' AND l."targetId" = c."id") AS "likeCount",
      (SELECT COUNT(*) FROM "conversation_reply" r
        WHERE r."conversationId" = c."id" AND r."status" = ${PUBLISHED}) AS "replyCount",
      EXISTS (SELECT 1 FROM "conversation_like" l
        WHERE l."targetType" = 'conversation' AND l."targetId" = c."id"
          AND l."userId" = ${viewerId}) AS "likedByViewer"
    FROM "conversation" c`;
}

/** Raw SQL like the rest of this module (the W9 tables are not Prisma models). */
@Injectable()
export class PrismaPostRepository implements PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPosts(input: {
    hobbyId: string | null;
    communityId: string | null;
    authorId: string | null;
    authorIds: string[] | null;
    viewerId: string | null;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }): Promise<PostPage> {
    const filters: Prisma.Sql[] = [Prisma.sql`c."status" = ${PUBLISHED}`];
    if (input.hobbyId) filters.push(Prisma.sql`c."hobbyId" = ${input.hobbyId}`);
    if (input.authorId) filters.push(Prisma.sql`c."authorId" = ${input.authorId}`);
    if (input.communityId) {
      filters.push(Prisma.sql`c."communityReferenceId" = ${input.communityId}`);
    }
    if (input.authorIds) {
      if (input.authorIds.length === 0) return { data: [], nextCursor: null };
      filters.push(Prisma.sql`c."authorId" IN (${Prisma.join(input.authorIds)})`);
    }
    if (input.cursor) {
      filters.push(
        Prisma.sql`(c."createdAt" < ${input.cursor.createdAt} OR (c."createdAt" = ${input.cursor.createdAt} AND c."id" < ${input.cursor.id}))`,
      );
    }
    const rows = await this.prisma.$queryRaw<PostRow[]>(Prisma.sql`
      ${postSelect(input.viewerId)}
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY c."createdAt" DESC, c."id" DESC
      LIMIT ${input.limit + 1}
    `);
    const pageRows = rows.slice(0, input.limit);
    const last = pageRows.at(-1);
    const media = await this.postMedia(pageRows.map((row) => row.id));
    return {
      data: pageRows.map((row) => this.toPost(row, media)),
      nextCursor:
        rows.length > input.limit && last
          ? encodeCursor({ name: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async findPost(id: string, viewerId: string | null): Promise<PostRecord | null> {
    const rows = await this.prisma.$queryRaw<PostRow[]>(Prisma.sql`
      ${postSelect(viewerId)}
      WHERE c."id" = ${id} AND c."status" = ${PUBLISHED}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) return null;
    return this.toPost(row, await this.postMedia([row.id]));
  }

  async listReplies(postId: string, viewerId: string | null): Promise<ReplyRecord[]> {
    const rows = await this.prisma.$queryRaw<ReplyRow[]>(Prisma.sql`
      SELECT
        r."id", r."conversationId" AS "postId", r."parentReplyId", r."authorId",
        r."authorDisplayName", r."body", r."createdAt",
        (SELECT COUNT(*) FROM "conversation_like" l
          WHERE l."targetType" = 'reply' AND l."targetId" = r."id") AS "likeCount",
        EXISTS (SELECT 1 FROM "conversation_like" l
          WHERE l."targetType" = 'reply' AND l."targetId" = r."id"
            AND l."userId" = ${viewerId}) AS "likedByViewer"
      FROM "conversation_reply" r
      WHERE r."conversationId" = ${postId} AND r."status" = ${PUBLISHED}
      ORDER BY r."createdAt" ASC, r."id" ASC
    `);
    const attachments = rows.length
      ? await this.prisma.$queryRaw<AttachmentRow[]>(Prisma.sql`
          SELECT "replyId" AS "ownerId", "mediaId" FROM "conversation_attachment"
          WHERE "replyId" IN (${Prisma.join(rows.map((row) => row.id))})
          ORDER BY "position" ASC
        `)
      : [];
    const media = this.group(attachments);
    return rows.map((row) => ({
      id: row.id,
      postId: row.postId,
      parentReplyId: row.parentReplyId,
      authorId: row.authorId,
      authorDisplayName: row.authorDisplayName,
      body: row.body,
      mediaIds: media.get(row.id) ?? [],
      likeCount: Number(row.likeCount),
      likedByViewer: row.likedByViewer,
      createdAt: row.createdAt,
    }));
  }

  async findReply(id: string): Promise<ReplyRef | null> {
    const rows = await this.prisma.$queryRaw<ReplyRef[]>(Prisma.sql`
      SELECT r."id", r."conversationId" AS "postId", r."parentReplyId", r."authorId"
      FROM "conversation_reply" r
      JOIN "conversation" c ON c."id" = r."conversationId"
      WHERE r."id" = ${id} AND r."status" = ${PUBLISHED} AND c."status" = ${PUBLISHED}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async createPost(post: NewPost): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "conversation" (
          "id", "hobbyId", "communityReferenceId", "activityReferenceId",
          "authorId", "authorDisplayName", "title", "body", "status", "createdAt", "updatedAt"
        ) VALUES (
          ${post.id}, ${post.hobbyId}, ${post.communityReferenceId}, ${post.activityReferenceId},
          ${post.authorId}, ${post.authorDisplayName}, ${post.title}, ${post.body},
          ${PUBLISHED}, ${post.createdAt}, ${post.createdAt}
        )
      `);
      await this.attach(tx, post.id, null, post.mediaIds);
    });
  }

  async createReply(reply: NewReply): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "conversation_reply" (
          "id", "conversationId", "parentReplyId", "authorId", "authorDisplayName",
          "body", "status", "createdAt", "updatedAt"
        ) VALUES (
          ${reply.id}, ${reply.postId}, ${reply.parentReplyId}, ${reply.authorId},
          ${reply.authorDisplayName}, ${reply.body}, ${PUBLISHED}, ${reply.createdAt}, ${reply.createdAt}
        )
      `);
      await this.attach(tx, reply.postId, reply.id, reply.mediaIds);
    });
  }

  async setLike(
    target: LikeTarget,
    targetId: string,
    userId: string,
    liked: boolean,
  ): Promise<void> {
    if (liked) {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "conversation_like" ("targetType", "targetId", "userId")
        VALUES (${target}, ${targetId}, ${userId})
        ON CONFLICT DO NOTHING
      `);
    } else {
      await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM "conversation_like"
        WHERE "targetType" = ${target} AND "targetId" = ${targetId} AND "userId" = ${userId}
      `);
    }
  }

  async deletePost(id: string, now: Date): Promise<string[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "conversation" SET "status" = 'deleted'::"conversation_status", "updatedAt" = ${now}
        WHERE "id" = ${id}
      `);
      const rows = await tx.$queryRaw<AttachmentRow[]>(Prisma.sql`
        SELECT "conversationId" AS "ownerId", "mediaId" FROM "conversation_attachment"
        WHERE "conversationId" = ${id}
      `);
      return rows.map((row) => row.mediaId);
    });
  }

  async deleteReply(id: string, now: Date): Promise<string[]> {
    return this.prisma.$transaction(async (tx) => {
      // Removing a reply removes the replies nested under it too.
      await tx.$executeRaw(Prisma.sql`
        UPDATE "conversation_reply" SET "status" = 'deleted'::"conversation_status", "updatedAt" = ${now}
        WHERE "id" = ${id} OR "parentReplyId" = ${id}
      `);
      const rows = await tx.$queryRaw<AttachmentRow[]>(Prisma.sql`
        SELECT a."replyId" AS "ownerId", a."mediaId" FROM "conversation_attachment" a
        JOIN "conversation_reply" r ON r."id" = a."replyId"
        WHERE r."id" = ${id} OR r."parentReplyId" = ${id}
      `);
      return rows.map((row) => row.mediaId);
    });
  }

  async setReplyVisibility(id: string, visible: boolean, now: Date): Promise<boolean> {
    // Never resurrect a reply its author deleted.
    const changed = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "conversation_reply"
      SET "status" = ${visible ? PUBLISHED : Prisma.sql`'archived'::"conversation_status"`},
          "updatedAt" = ${now}
      WHERE "id" = ${id} AND "status" <> 'deleted'::"conversation_status"
    `);
    return changed > 0;
  }

  private async attach(
    tx: Prisma.TransactionClient,
    conversationId: string,
    replyId: string | null,
    mediaIds: string[],
  ): Promise<void> {
    for (const [position, mediaId] of mediaIds.entries()) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "conversation_attachment" ("id", "conversationId", "replyId", "mediaId", "position")
        VALUES (${newId()}, ${conversationId}, ${replyId}, ${mediaId}, ${position})
      `);
    }
  }

  private async postMedia(postIds: string[]): Promise<Map<string, string[]>> {
    if (postIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<AttachmentRow[]>(Prisma.sql`
      SELECT "conversationId" AS "ownerId", "mediaId" FROM "conversation_attachment"
      WHERE "conversationId" IN (${Prisma.join(postIds)}) AND "replyId" IS NULL
      ORDER BY "position" ASC
    `);
    return this.group(rows);
  }

  private group(rows: AttachmentRow[]): Map<string, string[]> {
    const grouped = new Map<string, string[]>();
    for (const row of rows)
      grouped.set(row.ownerId, [...(grouped.get(row.ownerId) ?? []), row.mediaId]);
    return grouped;
  }

  private toPost(row: PostRow, media: Map<string, string[]>): PostRecord {
    return {
      id: row.id,
      hobbyId: row.hobbyId,
      authorId: row.authorId,
      authorDisplayName: row.authorDisplayName,
      title: row.title,
      body: row.body,
      communityReferenceId: row.communityReferenceId,
      activityReferenceId: row.activityReferenceId,
      mediaIds: media.get(row.id) ?? [],
      likeCount: Number(row.likeCount),
      replyCount: Number(row.replyCount),
      likedByViewer: row.likedByViewer,
      createdAt: row.createdAt,
    };
  }
}
