import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

export const adminConversationIdParamSchema = z.object({ conversationId: ulid }).strict();
export class AdminConversationIdParamDto extends createZodDto(adminConversationIdParamSchema) {}

export const adminConversationStatusResponseSchema = z.object({
  id: ulid,
  status: z.enum(['published', 'archived']),
  updatedAt: z.string(),
});
export class AdminConversationStatusResponseDto extends createZodDto(
  adminConversationStatusResponseSchema,
) {}
