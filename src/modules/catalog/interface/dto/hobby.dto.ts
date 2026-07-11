import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { hobbyCostLevelSchema, hobbyDifficultySchema, hobbySettingSchema } from './enums';

export const hobbyResponseSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  difficulty: hobbyDifficultySchema,
  costLevel: hobbyCostLevelSchema,
  setting: hobbySettingSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class HobbyResponseDto extends createZodDto(hobbyResponseSchema) {}
