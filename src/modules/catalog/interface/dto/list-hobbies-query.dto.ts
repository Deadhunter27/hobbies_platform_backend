import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { hobbyDifficultySchema } from './enums';

export const listHobbiesQuerySchema = z
  .object({
    category: z.string().min(1).optional(),
    difficulty: z
      .union([hobbyDifficultySchema, z.array(hobbyDifficultySchema)])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : Array.isArray(value) ? value : [value],
      ),
    q: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    cursor: z.string().min(1).optional(),
  })
  .strict();

export class ListHobbiesQueryDto extends createZodDto(listHobbiesQuerySchema) {}
