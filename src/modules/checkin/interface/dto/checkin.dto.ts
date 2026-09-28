import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CHECK_IN_KINDS, CHECK_IN_STATUSES } from '../../domain';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const checkInIdParamSchema = z.object({ checkInId: ulid }).strict();
export class CheckInIdParamDto extends createZodDto(checkInIdParamSchema) {}

export const checkInActivitySchema = z.object({
  title: z.string(),
  startsAt: z.string(),
  placeName: z.string(),
});

export const checkInResponseSchema = z.object({
  id: ulid,
  activityId: ulid,
  kind: z.enum(CHECK_IN_KINDS),
  status: z.enum(CHECK_IN_STATUSES),
  availableAt: z.string(),
  actionedAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  activity: checkInActivitySchema,
});
export class CheckInResponseDto extends createZodDto(checkInResponseSchema) {}

export const checkInListResponseSchema = z.object({ data: z.array(checkInResponseSchema) });
export class CheckInListResponseDto extends createZodDto(checkInListResponseSchema) {}

export const updateCheckInSchema = z
  .object({ status: z.enum(['actioned', 'dismissed']) })
  .strict();
export class UpdateCheckInDto extends createZodDto(updateCheckInSchema) {}
