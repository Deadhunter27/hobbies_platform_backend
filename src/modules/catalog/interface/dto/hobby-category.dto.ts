import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const hobbyCategoryResponseSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class HobbyCategoryResponseDto extends createZodDto(hobbyCategoryResponseSchema) {}

export const hobbyCategoriesResponseSchema = z.object({
  data: z.array(hobbyCategoryResponseSchema),
});

export class HobbyCategoriesResponseDto extends createZodDto(hobbyCategoriesResponseSchema) {}
