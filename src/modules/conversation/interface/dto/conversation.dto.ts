import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const conversationIdParamSchema = z.object({ conversationId: ulid }).strict();
export class ConversationIdParamDto extends createZodDto(conversationIdParamSchema) {}

export const hobbyIdParamSchema = z.object({ hobbyId: ulid }).strict();
export class ConversationHobbyIdParamDto extends createZodDto(hobbyIdParamSchema) {}

export const conversationListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).optional(),
  })
  .strict();
export class ConversationListQueryDto extends createZodDto(conversationListQuerySchema) {}

export const createConversationSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    body: z.string().trim().min(1).max(4000),
    communityReferenceId: ulid.nullable().default(null),
    activityReferenceId: ulid.nullable().default(null),
  })
  .strict();
export class CreateConversationDto extends createZodDto(createConversationSchema) {}

export const createConversationReplySchema = z
  .object({ body: z.string().trim().min(1).max(2000) })
  .strict();
export class CreateConversationReplyDto extends createZodDto(createConversationReplySchema) {}

export const conversationResponseSchema = z.object({
  id: ulid,
  hobbyId: ulid,
  communityReferenceId: ulid.nullable(),
  activityReferenceId: ulid.nullable(),
  author: z.object({ personId: ulid, displayName: z.string() }),
  title: z.string(),
  body: z.string(),
  status: z.enum(['published', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class ConversationResponseDto extends createZodDto(conversationResponseSchema) {}

export const conversationReplyResponseSchema = z.object({
  id: ulid,
  conversationId: ulid,
  author: z.object({ personId: ulid, displayName: z.string() }),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class ConversationReplyResponseDto extends createZodDto(conversationReplyResponseSchema) {}

export const conversationDetailResponseSchema = z.object({
  ...conversationResponseSchema.shape,
  replies: z.array(conversationReplyResponseSchema),
});
export class ConversationDetailResponseDto extends createZodDto(conversationDetailResponseSchema) {}

export const conversationPageResponseSchema = z.object({
  data: z.array(conversationResponseSchema),
  nextCursor: z.string().nullable(),
});
export class ConversationPageResponseDto extends createZodDto(conversationPageResponseSchema) {}

const feedConversationSchema = z.object({
  type: z.literal('conversation'),
  sourceId: ulid,
  occurredAt: z.string(),
  title: z.string(),
  summary: z.string(),
  authorDisplayName: z.string(),
});

const feedActivitySchema = z.object({
  type: z.literal('activity'),
  sourceId: ulid,
  occurredAt: z.string(),
  title: z.string(),
  summary: z.string(),
  placeName: z.string(),
  hostName: z.string().nullable(),
});

export const hobbyFeedPageResponseSchema = z.object({
  data: z.array(z.discriminatedUnion('type', [feedConversationSchema, feedActivitySchema])),
  nextCursor: z.string().nullable(),
});
export class HobbyFeedPageResponseDto extends createZodDto(hobbyFeedPageResponseSchema) {}
