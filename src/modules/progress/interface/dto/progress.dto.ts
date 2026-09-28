import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const progressActivityParamSchema = z.object({ hobbyId: ulid, activityId: ulid }).strict();
export class ProgressActivityParamDto extends createZodDto(progressActivityParamSchema) {}

export const journeyParamSchema = z.object({ hobbyId: ulid }).strict();
export class JourneyParamDto extends createZodDto(journeyParamSchema) {}

export const saveProgressReflectionSchema = z
  .object({
    rating: z.number().int().min(1).max(5).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(64)).max(8).default([]),
    note: z.string().trim().min(1).max(560).nullable().default(null),
  })
  .strict();
export class SaveProgressReflectionDto extends createZodDto(saveProgressReflectionSchema) {}

export const progressReflectionResponseSchema = z.object({
  id: ulid,
  hobbyId: ulid,
  activityId: ulid,
  rating: z.number().int().min(1).max(5).nullable(),
  tags: z.array(z.string()),
  note: z.string().nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class ProgressReflectionResponseDto extends createZodDto(progressReflectionResponseSchema) {}

export const journeyMomentResponseSchema = progressReflectionResponseSchema.extend({
  activityTitle: z.string(),
  activityType: z.string(),
  placeName: z.string(),
  hostName: z.string().nullable(),
});
export class JourneyMomentResponseDto extends createZodDto(journeyMomentResponseSchema) {}

export const journeyResponseSchema = z.object({ data: z.array(journeyMomentResponseSchema) });
export class JourneyResponseDto extends createZodDto(journeyResponseSchema) {}
