import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { hobbyResponseSchema } from './hobby.dto';

export const paginatedHobbiesResponseSchema = z.object({
  data: z.array(hobbyResponseSchema),
  page: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export class PaginatedHobbiesResponseDto extends createZodDto(paginatedHobbiesResponseSchema) {}
