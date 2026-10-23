import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { MAX_POST_MEDIA } from '../../domain';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const mediaIds = z.array(ulid).max(MAX_POST_MEDIA).default([]);

export const postIdParamSchema = z.object({ postId: ulid }).strict();
export class PostIdParamDto extends createZodDto(postIdParamSchema) {}

export const replyIdParamSchema = z.object({ replyId: ulid }).strict();
export class ReplyIdParamDto extends createZodDto(replyIdParamSchema) {}

export const feedQuerySchema = z
  .object({
    hobbyId: ulid.optional(),
    authorId: ulid.optional(),
    following: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional()
      .describe('Only posts by people you follow (requires sign-in).'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).optional(),
  })
  .strict();
export class FeedQueryDto extends createZodDto(feedQuerySchema) {}

const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;

export const createPostSchema = z
  .object({
    hobbyId: ulid,
    title: z.string().trim().max(180).nullable().default(null),
    body: z.string().trim().max(5000).default(''),
    mediaIds,
    communityReferenceId: ulid.nullable().default(null),
    activityReferenceId: ulid.nullable().default(null),
  })
  .strict()
  .refine((post) => post.body.length > 0 || post.mediaIds.length > 0, {
    message: 'A post needs text or at least one photo.',
    path: ['body'],
  })
  .refine((post) => uniqueIds(post.mediaIds), {
    message: 'Each photo can be attached once.',
    path: ['mediaIds'],
  });
export class CreatePostDto extends createZodDto(createPostSchema) {}

export const createReplySchema = z
  .object({
    body: z.string().trim().max(2000).default(''),
    parentReplyId: ulid.nullable().default(null),
    mediaIds,
  })
  .strict()
  .refine((reply) => reply.body.length > 0 || reply.mediaIds.length > 0, {
    message: 'A reply needs text or at least one photo.',
    path: ['body'],
  })
  .refine((reply) => uniqueIds(reply.mediaIds), {
    message: 'Each photo can be attached once.',
    path: ['mediaIds'],
  });
export class CreateReplyDto extends createZodDto(createReplySchema) {}

const personSchema = z.object({
  id: ulid,
  displayName: z.string(),
  handle: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const mediaSchema = z.object({
  id: ulid,
  mimeType: z.string().nullable(),
  url: z.string().nullable().describe('Signed URL valid for 15 minutes; null when locked.'),
  locked: z.boolean().describe('True for photos a signed-out viewer must sign in to see.'),
});

export const postResponseSchema = z.object({
  id: ulid,
  hobby: z.object({ id: ulid, name: z.string(), slug: z.string() }).nullable(),
  author: personSchema,
  title: z.string().nullable(),
  body: z.string(),
  media: z.array(mediaSchema),
  likeCount: z.number().int(),
  replyCount: z.number().int(),
  likedByMe: z.boolean(),
  isMine: z.boolean(),
  communityReferenceId: ulid.nullable(),
  activityReferenceId: ulid.nullable(),
  createdAt: z.string(),
});
export class PostResponseDto extends createZodDto(postResponseSchema) {}

export const replyResponseSchema = z.object({
  id: ulid,
  postId: ulid,
  parentReplyId: ulid.nullable(),
  author: personSchema,
  body: z.string(),
  media: z.array(mediaSchema),
  likeCount: z.number().int(),
  likedByMe: z.boolean(),
  isMine: z.boolean(),
  createdAt: z.string(),
});
export class ReplyResponseDto extends createZodDto(replyResponseSchema) {}

export const postDetailResponseSchema = z.object({
  post: postResponseSchema,
  replies: z.array(replyResponseSchema),
});
export class PostDetailResponseDto extends createZodDto(postDetailResponseSchema) {}

export const feedPageResponseSchema = z.object({
  data: z.array(postResponseSchema),
  nextCursor: z.string().nullable(),
});
export class FeedPageResponseDto extends createZodDto(feedPageResponseSchema) {}
