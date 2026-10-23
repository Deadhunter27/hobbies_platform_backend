import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const personIdParamSchema = z.object({ personId: ulid }).strict();
export class PersonIdParamDto extends createZodDto(personIdParamSchema) {}

export const personRefParamSchema = z
  .object({
    personRef: z
      .string()
      .min(3)
      .max(31)
      .describe('A person id, or an @handle (with or without the @).'),
  })
  .strict();
export class PersonRefParamDto extends createZodDto(personRefParamSchema) {}

export const searchPeopleQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(60),
    limit: z.coerce.number().int().min(1).max(30).default(20),
  })
  .strict();
export class SearchPeopleQueryDto extends createZodDto(searchPeopleQuerySchema) {}

export const suggestedPeopleQuerySchema = z
  .object({
    hobbyId: ulid,
    limit: z.coerce.number().int().min(1).max(30).default(10),
  })
  .strict();
export class SuggestedPeopleQueryDto extends createZodDto(suggestedPeopleQuerySchema) {}

export const followListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
    cursor: z.string().min(1).optional(),
  })
  .strict();
export class FollowListQueryDto extends createZodDto(followListQuerySchema) {}

export const personCardSchema = z.object({
  id: ulid,
  displayName: z.string(),
  handle: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isFollowing: z.boolean(),
  isMe: z.boolean(),
});
export class PersonCardDto extends createZodDto(personCardSchema) {}

export const personListResponseSchema = z.object({ data: z.array(personCardSchema) });
export class PersonListResponseDto extends createZodDto(personListResponseSchema) {}

export const personPageResponseSchema = z.object({
  data: z.array(personCardSchema),
  nextCursor: z.string().nullable(),
});
export class PersonPageResponseDto extends createZodDto(personPageResponseSchema) {}

export const personProfileResponseSchema = personCardSchema.extend({
  instagramHandle: z.string().nullable(),
  tiktokHandle: z.string().nullable(),
  hobbies: z.array(z.object({ id: ulid, name: z.string(), slug: z.string() })),
  followerCount: z.number().int(),
  followingCount: z.number().int(),
  followsYou: z.boolean(),
});
export class PersonProfileResponseDto extends createZodDto(personProfileResponseSchema) {}
