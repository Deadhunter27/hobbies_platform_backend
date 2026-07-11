import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const hobbyDetailParamSchema = z.object({
  slugOrId: z.string().min(1),
});

export class HobbyDetailParamDto extends createZodDto(hobbyDetailParamSchema) {}
