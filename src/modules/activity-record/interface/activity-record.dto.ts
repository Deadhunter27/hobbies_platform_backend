import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const visibility = z.enum(['private', 'followers', 'public']);

export const activityRecordIdParamSchema = z.object({ recordId: ulid }).strict();
export class ActivityRecordIdParamDto extends createZodDto(activityRecordIdParamSchema) {}

export const createActivityRecordSchema = z
  .object({
    hobbyId: ulid,
    opportunityId: ulid.nullable().optional(),
    sportType: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(160),
    startedAt: z.iso.datetime({ offset: true }),
    durationSeconds: z
      .number()
      .int()
      .positive()
      .max(60 * 60 * 48),
    distanceMeters: z.number().nonnegative().max(1_000_000).nullable().optional(),
    notes: z.string().trim().max(2_000).nullable().optional(),
    visibility: visibility.default('private'),
  })
  .strict()
  .refine((value) => new Date(value.startedAt).getTime() <= Date.now() + 5 * 60 * 1000, {
    path: ['startedAt'],
    message: 'A completed activity record cannot start in the future.',
  });
export class CreateActivityRecordDto extends createZodDto(createActivityRecordSchema) {}

export const updateActivityRecordSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    startedAt: z.iso.datetime({ offset: true }).optional(),
    durationSeconds: z
      .number()
      .int()
      .positive()
      .max(60 * 60 * 48)
      .optional(),
    distanceMeters: z.number().nonnegative().max(1_000_000).nullable().optional(),
    notes: z.string().trim().max(2_000).nullable().optional(),
    visibility: visibility.optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.startedAt || new Date(value.startedAt).getTime() <= Date.now() + 5 * 60 * 1000,
    { path: ['startedAt'], message: 'A completed activity record cannot start in the future.' },
  );
export class UpdateActivityRecordDto extends createZodDto(updateActivityRecordSchema) {}

export const activityRecordResponseSchema = z.object({
  id: ulid,
  hobbyId: ulid,
  opportunityId: ulid.nullable(),
  sportType: z.string(),
  title: z.string(),
  startedAt: z.string(),
  durationSeconds: z.number().int(),
  distanceMeters: z.number().nullable(),
  notes: z.string().nullable(),
  source: z.enum(['manual', 'strava', 'share']),
  sourceReferenceId: z.string().nullable(),
  externalUrl: z.string().nullable(),
  visibility,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class ActivityRecordResponseDto extends createZodDto(activityRecordResponseSchema) {}

export const activityRecordListResponseSchema = z.object({
  data: z.array(activityRecordResponseSchema),
});
export class ActivityRecordListResponseDto extends createZodDto(activityRecordListResponseSchema) {}
