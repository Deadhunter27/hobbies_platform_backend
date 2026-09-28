import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const name = z.string().trim().min(1).max(120);
const description = z.string().trim().max(2000).nullable();
const hobbyDifficulty = z.enum(['beginner_friendly', 'moderate', 'demanding']);
const hobbyCostLevel = z.enum(['free', 'low', 'medium', 'high']);
const hobbySetting = z.enum(['indoor', 'outdoor', 'both']);
const hobbyStatus = z.enum(['draft', 'active', 'archived']);

export const adminCategoryIdParamSchema = z.object({ categoryId: ulid }).strict();
export class AdminCategoryIdParamDto extends createZodDto(adminCategoryIdParamSchema) {}

export const adminHobbyIdParamSchema = z.object({ hobbyId: ulid }).strict();
export class AdminHobbyIdParamDto extends createZodDto(adminHobbyIdParamSchema) {}

export const adminCategoryMutationSchema = z
  .object({
    parentId: ulid.nullable(),
    name,
    slug,
    description,
    sortOrder: z.number().int().min(0),
  })
  .strict();
export class AdminCategoryMutationDto extends createZodDto(adminCategoryMutationSchema) {}

export const adminCategoryResponseSchema = adminCategoryMutationSchema.extend({
  id: ulid,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class AdminCategoryResponseDto extends createZodDto(adminCategoryResponseSchema) {}

const hobbyMutationBase = z
  .object({
    categoryId: ulid,
    name,
    slug,
    description,
    difficulty: hobbyDifficulty,
    costLevel: hobbyCostLevel,
    setting: hobbySetting,
  })
  .strict();

export const adminCreateHobbySchema = hobbyMutationBase.extend({ status: hobbyStatus.optional() });
export class AdminCreateHobbyDto extends createZodDto(adminCreateHobbySchema) {}

export const adminUpdateHobbySchema = hobbyMutationBase.extend({ status: hobbyStatus });
export class AdminUpdateHobbyDto extends createZodDto(adminUpdateHobbySchema) {}

export const adminHobbyResponseSchema = hobbyMutationBase.extend({
  id: ulid,
  status: hobbyStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class AdminHobbyResponseDto extends createZodDto(adminHobbyResponseSchema) {}
