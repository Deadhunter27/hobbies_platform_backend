import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { RECOMMENDATION_STATUSES, REJECTION_REASONS } from '../../domain';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const whatsNextParamSchema = z.object({ hobbyId: ulid }).strict();
export class WhatsNextParamDto extends createZodDto(whatsNextParamSchema) {}

export const recommendationActionParamSchema = z
  .object({ hobbyId: ulid, recommendationId: ulid })
  .strict();
export class RecommendationActionParamDto extends createZodDto(recommendationActionParamSchema) {}

export const rejectRecommendationSchema = z
  .object({
    reason: z.enum(REJECTION_REASONS),
    note: z.string().trim().min(1).max(280).nullable().default(null),
  })
  .strict();
export class RejectRecommendationDto extends createZodDto(rejectRecommendationSchema) {}

export const selectRecommendationSchema = z.object({ activityId: ulid }).strict();
export class SelectRecommendationDto extends createZodDto(selectRecommendationSchema) {}

export const recommendationResponseSchema = z.object({
  id: ulid,
  hobbyId: ulid,
  activityId: ulid,
  title: z.string(),
  rationale: z.string(),
  fitSignals: z.array(z.string()),
  intent: z.string(),
  status: z.enum(RECOMMENDATION_STATUSES),
  rejectionReason: z.enum(REJECTION_REASONS).nullable(),
  rejectionNote: z.string().nullable(),
  selectedActivityId: ulid.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class RecommendationResponseDto extends createZodDto(recommendationResponseSchema) {}
