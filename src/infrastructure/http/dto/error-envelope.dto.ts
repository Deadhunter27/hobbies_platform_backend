import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()),
  }),
});

export class ErrorEnvelopeDto extends createZodDto(errorEnvelopeSchema) {}
