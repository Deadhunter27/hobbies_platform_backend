import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, prismaClientOf } from '@infra/database';
import type { TxContext } from '@shared/application';
import { encodeCursor } from '@shared/utils';
import type { ConversationRepository } from '../application/ports/conversation.repository.port';
import type {
  Conversation,
  ConversationDetail,
  ConversationPage,
  ConversationReply,
  ConversationStatus,
} from '../domain';

type ConversationRow = {
  id: string;
  hobbyId: string;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
  authorId: string;
  authorDisplayName: string;
  title: string;
  body: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type ReplyRow = {
  id: string;
  conversationId: string;
  authorId: string;
  authorDisplayName: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

function conversationFromRow(row: ConversationRow): Conversation {
  return {
    ...row,
    status: row.status as ConversationStatus,
  };
}

function replyFromRow(row: ReplyRow): ConversationReply {
  return { ...row };
}

@Injectable()
export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(input: {
    hobbyId: string;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }): Promise<ConversationPage> {
    const take = input.limit + 1;
    const cursorPredicate = input.cursor
      ? Prisma.sql`AND ("createdAt" < ${input.cursor.createdAt} OR ("createdAt" = ${input.cursor.createdAt} AND "id" < ${input.cursor.id}))`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ConversationRow[]>(Prisma.sql`
      SELECT
        "id", "hobbyId", "communityReferenceId", "activityReferenceId",
        "authorId", "authorDisplayName", "title", "body", "status"::text AS "status",
        "createdAt", "updatedAt"
      FROM "conversation"
      WHERE "hobbyId" = ${input.hobbyId}
        AND "status" = 'published'::"conversation_status"
        ${cursorPredicate}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT ${take}
    `);

    const hasMore = rows.length > input.limit;
    const pageRows = rows.slice(0, input.limit);
    const last = pageRows.at(-1);
    return {
      data: pageRows.map(conversationFromRow),
      nextCursor:
        hasMore && last ? encodeCursor({ name: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }

  async findPublishedById(id: string): Promise<ConversationDetail | null> {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>(Prisma.sql`
      SELECT
        "id", "hobbyId", "communityReferenceId", "activityReferenceId",
        "authorId", "authorDisplayName", "title", "body", "status"::text AS "status",
        "createdAt", "updatedAt"
      FROM "conversation"
      WHERE "id" = ${id}
        AND "status" = 'published'::"conversation_status"
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) return null;

    const replies = await this.prisma.$queryRaw<ReplyRow[]>(Prisma.sql`
      SELECT "id", "conversationId", "authorId", "authorDisplayName", "body", "createdAt", "updatedAt"
      FROM "conversation_reply"
      WHERE "conversationId" = ${id}
      ORDER BY "createdAt" ASC, "id" ASC
    `);

    return {
      conversation: conversationFromRow(row),
      replies: replies.map(replyFromRow),
    };
  }

  async findById(id: string, tx?: TxContext): Promise<Conversation | null> {
    const rows = await prismaClientOf(this.prisma, tx).$queryRaw<ConversationRow[]>(Prisma.sql`
      SELECT
        "id", "hobbyId", "communityReferenceId", "activityReferenceId",
        "authorId", "authorDisplayName", "title", "body", "status"::text AS "status",
        "createdAt", "updatedAt"
      FROM "conversation"
      WHERE "id" = ${id}
      LIMIT 1
    `);
    return rows[0] ? conversationFromRow(rows[0]) : null;
  }

  async createConversation(input: Conversation): Promise<Conversation> {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>(Prisma.sql`
      INSERT INTO "conversation" (
        "id", "hobbyId", "communityReferenceId", "activityReferenceId",
        "authorId", "authorDisplayName", "title", "body", "status", "createdAt", "updatedAt"
      ) VALUES (
        ${input.id}, ${input.hobbyId}, ${input.communityReferenceId}, ${input.activityReferenceId},
        ${input.authorId}, ${input.authorDisplayName}, ${input.title}, ${input.body},
        ${input.status}::"conversation_status", ${input.createdAt}, ${input.updatedAt}
      )
      RETURNING
        "id", "hobbyId", "communityReferenceId", "activityReferenceId",
        "authorId", "authorDisplayName", "title", "body", "status"::text AS "status",
        "createdAt", "updatedAt"
    `);
    return conversationFromRow(rows[0]!);
  }

  async createReply(input: ConversationReply): Promise<ConversationReply> {
    const rows = await this.prisma.$queryRaw<ReplyRow[]>(Prisma.sql`
      INSERT INTO "conversation_reply" (
        "id", "conversationId", "authorId", "authorDisplayName", "body", "createdAt", "updatedAt"
      ) VALUES (
        ${input.id}, ${input.conversationId}, ${input.authorId}, ${input.authorDisplayName},
        ${input.body}, ${input.createdAt}, ${input.updatedAt}
      )
      RETURNING "id", "conversationId", "authorId", "authorDisplayName", "body", "createdAt", "updatedAt"
    `);
    return replyFromRow(rows[0]!);
  }

  async updateStatus(
    input: { id: string; status: ConversationStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Conversation | null> {
    const rows = await prismaClientOf(this.prisma, tx).$queryRaw<ConversationRow[]>(Prisma.sql`
      UPDATE "conversation"
      SET "status" = ${input.status}::"conversation_status", "updatedAt" = ${input.updatedAt}
      WHERE "id" = ${input.id}
      RETURNING
        "id", "hobbyId", "communityReferenceId", "activityReferenceId",
        "authorId", "authorDisplayName", "title", "body", "status"::text AS "status",
        "createdAt", "updatedAt"
    `);
    return rows[0] ? conversationFromRow(rows[0]) : null;
  }
}
