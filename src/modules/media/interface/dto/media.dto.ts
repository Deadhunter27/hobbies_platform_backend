import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { MEDIA_MAX_BYTES, MEDIA_MIME_TYPES, MEDIA_PURPOSES } from '../../domain';

export const initiateUploadSchema = z
  .object({
    purpose: z.enum(MEDIA_PURPOSES),
    mimeType: z.enum(MEDIA_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MEDIA_MAX_BYTES),
  })
  .strict();
export class InitiateUploadDto extends createZodDto(initiateUploadSchema) {}

export const uploadTicketSchema = z.object({
  id: z.string(),
  uploadUrl: z.string().url(),
  uploadMethod: z.literal('PUT'),
  uploadHeaders: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});
export class UploadTicketDto extends createZodDto(uploadTicketSchema) {}

export const mediaIdParamSchema = z
  .object({ mediaId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/) })
  .strict();
export class MediaIdParamDto extends createZodDto(mediaIdParamSchema) {}

export const mediaResponseSchema = z.object({
  id: z.string(),
  purpose: z.enum(MEDIA_PURPOSES),
  status: z.enum(['pending', 'ready', 'deleted']),
  url: z.string().nullable(),
});
export class MediaResponseDto extends createZodDto(mediaResponseSchema) {}
