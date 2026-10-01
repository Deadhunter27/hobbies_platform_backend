import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  COMMUNITY_MEMBERSHIP_ROLES,
  COMMUNITY_MEMBERSHIP_STATES,
  COMMUNITY_STATUSES,
} from '../../domain';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const communityRefParamSchema = z
  .object({ communityRef: z.string().trim().min(1).max(180) })
  .strict();
export class CommunityRefParamDto extends createZodDto(communityRefParamSchema) {}

export const communityIdParamSchema = z.object({ communityId: ulid }).strict();
export class CommunityIdParamDto extends createZodDto(communityIdParamSchema) {}

export const communityResponseSchema = z.object({
  id: ulid,
  hobbyId: ulid,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  status: z.enum(COMMUNITY_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class CommunityResponseDto extends createZodDto(communityResponseSchema) {}

export const communityHostSchema = z.object({
  personId: ulid,
  displayName: z.string(),
  role: z.enum(COMMUNITY_MEMBERSHIP_ROLES),
});

export const communityContextResponseSchema = z.object({
  ...communityResponseSchema.shape,
  people: z.object({
    memberCount: z.number().int().nonnegative(),
    hosts: z.array(communityHostSchema),
    membersPreview: z.array(communityHostSchema).max(12),
  }),
});
export class CommunityContextResponseDto extends createZodDto(communityContextResponseSchema) {}

export const upsertCommunityMembershipSchema = z
  .object({ state: z.enum(COMMUNITY_MEMBERSHIP_STATES) })
  .strict();
export class UpsertCommunityMembershipDto extends createZodDto(upsertCommunityMembershipSchema) {}

export const communityMembershipResponseSchema = z.object({
  id: ulid,
  communityId: ulid,
  displayName: z.string(),
  role: z.enum(COMMUNITY_MEMBERSHIP_ROLES),
  state: z.enum(COMMUNITY_MEMBERSHIP_STATES),
  joinedAt: z.string(),
  leftAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class CommunityMembershipResponseDto extends createZodDto(
  communityMembershipResponseSchema,
) {}

export const communityMembershipListResponseSchema = z.object({
  data: z.array(communityMembershipResponseSchema),
});
export class CommunityMembershipListResponseDto extends createZodDto(
  communityMembershipListResponseSchema,
) {}
