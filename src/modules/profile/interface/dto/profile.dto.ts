import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EXPERIENCE_LEVELS, PROFILE_INTENTS, SOCIAL_PREFERENCES } from '../../domain';

export const upsertProfileContextSchema = z
  .object({
    city: z.string().trim().min(1).max(120).nullable().default(null),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .nullable()
      .default(null),
    timezone: z.string().trim().min(1).max(64).nullable().default(null),
  })
  .strict();

export class UpsertProfileContextDto extends createZodDto(upsertProfileContextSchema) {}

export const profileContextResponseSchema = z.object({
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  timezone: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export class ProfileContextResponseDto extends createZodDto(profileContextResponseSchema) {}

export const hobbyIdParamSchema = z
  .object({
    hobbyId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  })
  .strict();

export class HobbyIdParamDto extends createZodDto(hobbyIdParamSchema) {}

export const upsertHobbyContextSchema = z
  .object({
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
    primaryIntent: z.enum(PROFILE_INTENTS),
    secondaryIntents: z.array(z.enum(PROFILE_INTENTS)).max(3).default([]),
    goal: z.string().trim().min(1).max(280).nullable().default(null),
    socialPreference: z.enum(SOCIAL_PREFERENCES).default('mixed'),
  })
  .strict();

export class UpsertHobbyContextDto extends createZodDto(upsertHobbyContextSchema) {}

export const hobbyContextResponseSchema = z.object({
  id: z.string(),
  hobbyId: z.string(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  primaryIntent: z.enum(PROFILE_INTENTS),
  secondaryIntents: z.array(z.enum(PROFILE_INTENTS)),
  goal: z.string().nullable(),
  socialPreference: z.enum(SOCIAL_PREFERENCES),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class HobbyContextResponseDto extends createZodDto(hobbyContextResponseSchema) {}

export const hobbyContextListResponseSchema = z.object({
  data: z.array(hobbyContextResponseSchema),
});
export class HobbyContextListResponseDto extends createZodDto(hobbyContextListResponseSchema) {}
