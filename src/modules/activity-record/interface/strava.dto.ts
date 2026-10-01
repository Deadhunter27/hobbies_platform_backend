import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const stravaStatusSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  athleteId: z.string().nullable(),
  athleteDisplayName: z.string().nullable(),
  scopes: z.array(z.string()),
  lastSyncedAt: z.string().nullable(),
});
export class StravaStatusDto extends createZodDto(stravaStatusSchema) {}

export const stravaAuthorizeSchema = z.object({ authorizationUrl: z.string().url() });
export class StravaAuthorizeDto extends createZodDto(stravaAuthorizeSchema) {}

export const stravaCallbackQuerySchema = z
  .object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    scope: z.string().optional(),
    error: z.string().optional(),
  })
  .strict();
export class StravaCallbackQueryDto extends createZodDto(stravaCallbackQuerySchema) {}

export const stravaSyncSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  lastSyncedAt: z.string(),
});
export class StravaSyncDto extends createZodDto(stravaSyncSchema) {}

export const stravaWebhookEventSchema = z
  .object({
    object_type: z.string().optional(),
    aspect_type: z.string().optional(),
    object_id: z.number().optional(),
    owner_id: z.number().optional(),
  })
  .passthrough();
export class StravaWebhookEventDto extends createZodDto(stravaWebhookEventSchema) {}
