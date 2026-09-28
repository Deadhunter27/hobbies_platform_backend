import { ACTIVITY_STATUSES } from '@modules/activity/domain';
import { COMMUNITY_STATUSES } from '@modules/community/domain';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const adminActivityIdParamSchema = z.object({ activityId: ulid }).strict();
export class AdminActivityIdParamDto extends createZodDto(adminActivityIdParamSchema) {}

export const adminActivityStatusSchema = z
  .object({ status: z.enum(ACTIVITY_STATUSES) })
  .strict();
export class AdminActivityStatusDto extends createZodDto(adminActivityStatusSchema) {}

export const adminCommunityIdParamSchema = z.object({ communityId: ulid }).strict();
export class AdminCommunityIdParamDto extends createZodDto(adminCommunityIdParamSchema) {}

export const adminCommunityStatusSchema = z
  .object({ status: z.enum(COMMUNITY_STATUSES) })
  .strict();
export class AdminCommunityStatusDto extends createZodDto(adminCommunityStatusSchema) {}

export const adminActivityStatusResponseSchema = z.object({
  id: ulid,
  status: z.enum(ACTIVITY_STATUSES),
  updatedAt: z.string(),
});
export class AdminActivityStatusResponseDto extends createZodDto(
  adminActivityStatusResponseSchema,
) {}

export const adminCommunityStatusResponseSchema = z.object({
  id: ulid,
  status: z.enum(COMMUNITY_STATUSES),
  updatedAt: z.string(),
});
export class AdminCommunityStatusResponseDto extends createZodDto(
  adminCommunityStatusResponseSchema,
) {}
