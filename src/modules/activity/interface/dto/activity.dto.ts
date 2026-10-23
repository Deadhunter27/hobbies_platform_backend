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

export const activityListQuerySchema = z
  .object({
    hobbyId: ulidSchema.optional(),
    communityId: ulidSchema.optional(),
    hostId: ulidSchema.optional().describe('Events hosted by this person.'),
  })
  .strict();
export class ActivityListQueryDto extends createZodDto(activityListQuerySchema) {}

export const activityCommunityContextSchema = z
  .object({
    id: ulidSchema,
    name: z.string(),
    slug: z.string(),
    city: z.string().nullable(),
    memberCount: z.number().int().nonnegative(),
    hosts: z.array(
      z.object({
        personId: ulidSchema,
        displayName: z.string(),
        role: z.enum(['host', 'organizer']),
      }),
    ),
  })
  .nullable();

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
  communityContext: activityCommunityContextSchema,
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

const isTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const createEventSchema = z
  .object({
    hobbyId: ulidSchema,
    communityId: ulidSchema.nullable().default(null),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(4000).nullable().default(null),
    activityType: z
      .string()
      .trim()
      .regex(/^[a-z0-9_-]{2,40}$/)
      .default('meetup'),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().default(null),
    timezone: z.string().trim().refine(isTimeZone, 'Unknown time zone.').default('Asia/Jakarta'),
    placeName: z.string().trim().min(2).max(160),
    addressLabel: z.string().trim().max(240).nullable().default(null),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    effortLevel: z.enum(ACTIVITY_EFFORT_LEVELS).default('open'),
    capacity: z.number().int().min(2).max(10000).nullable().default(null),
    preparation: z.string().trim().max(2000).default(''),
    expectations: z.string().trim().max(2000).default(''),
  })
  .strict()
  .refine((event) => !event.endsAt || event.endsAt > event.startsAt, {
    message: 'The end must be after the start.',
    path: ['endsAt'],
  })
  .refine((event) => event.startsAt.getTime() < Date.now() + 366 * 24 * 60 * 60 * 1000, {
    message: 'Events can be scheduled up to a year ahead.',
    path: ['startsAt'],
  });
export class CreateEventDto extends createZodDto(createEventSchema) {}
