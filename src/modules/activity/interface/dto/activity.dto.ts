import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  ACTIVITY_COMMITMENT_STATES,
  ACTIVITY_EFFORT_LEVELS,
  ACTIVITY_STATUSES,
} from '../../domain';

const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const activityIdParamSchema = z.object({ activityId: ulidSchema }).strict();
export class ActivityIdParamDto extends createZodDto(activityIdParamSchema) {}

export const activityListQuerySchema = z.object({ hobbyId: ulidSchema.optional() }).strict();
export class ActivityListQueryDto extends createZodDto(activityListQuerySchema) {}

export const activityResponseSchema = z.object({
  id: z.string(),
  hobbyId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  activityType: z.string(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  timezone: z.string(),
  placeName: z.string(),
  addressLabel: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  hostName: z.string().nullable(),
  hostType: z.string().nullable(),
  hostReferenceId: z.string().nullable(),
  communityReferenceId: z.string().nullable(),
  effortLevel: z.enum(ACTIVITY_EFFORT_LEVELS),
  capacity: z.number().int().positive().nullable(),
  status: z.enum(ACTIVITY_STATUSES),
  preparation: z.string(),
  expectations: z.string(),
  committedCount: z.number().int().nonnegative(),
  spotsRemaining: z.number().int().nonnegative().nullable(),
  availability: z.enum(['available', 'full', 'cancelled', 'ended']),
});
export class ActivityResponseDto extends createZodDto(activityResponseSchema) {}

export const activityListResponseSchema = z.object({ data: z.array(activityResponseSchema) });
export class ActivityListResponseDto extends createZodDto(activityListResponseSchema) {}

export const upsertActivityCommitmentSchema = z
  .object({
    state: z.enum(ACTIVITY_COMMITMENT_STATES),
    note: z.string().trim().min(1).max(280).nullable().default(null),
  })
  .strict();
export class UpsertActivityCommitmentDto extends createZodDto(upsertActivityCommitmentSchema) {}

export const activityCommitmentResponseSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  state: z.enum(ACTIVITY_COMMITMENT_STATES),
  committedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  missedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class ActivityCommitmentResponseDto extends createZodDto(activityCommitmentResponseSchema) {}

export const activityCommitmentListResponseSchema = z.object({
  data: z.array(activityCommitmentResponseSchema),
});
export class ActivityCommitmentListResponseDto extends createZodDto(
  activityCommitmentListResponseSchema,
) {}
