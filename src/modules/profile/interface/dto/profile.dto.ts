import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  ACQUISITION_SOURCES,
  EXPERIENCE_LEVELS,
  PROFILE_GENDERS,
  PROFILE_INTENTS,
  SOCIAL_PREFERENCES,
} from '../../domain';

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

/** Accepts "@Name" or "name", stores lowercase without the "@". */
const socialHandle = (pattern: RegExp, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, '').toLowerCase())
    .pipe(z.string().min(1).max(max).regex(pattern));

/** Minimum age 13 (app-store and data-protection norm); the year is optional. */
export const MIN_USER_AGE = 13;

export const updateProfileDetailsSchema = z
  .object({
    handle: socialHandle(/^(?![._])(?!.*[._]{2})[a-z0-9._]{3,30}(?<![._])$/, 30)
      .nullable()
      .optional(),
    birthYear: z
      .number()
      .int()
      .min(1900)
      .refine((year) => year <= new Date().getUTCFullYear() - MIN_USER_AGE, {
        message: `You must be at least ${MIN_USER_AGE} years old.`,
      })
      .nullable()
      .optional(),
    gender: z.enum(PROFILE_GENDERS).nullable().optional(),
    instagramHandle: socialHandle(/^[a-z0-9._]{1,30}$/, 30)
      .nullable()
      .optional(),
    tiktokHandle: socialHandle(/^[a-z0-9._]{2,24}$/, 24)
      .nullable()
      .optional(),
    acquisitionSource: z.enum(ACQUISITION_SOURCES).nullable().optional(),
    acquisitionDetail: z.string().trim().min(1).max(120).nullable().optional(),
    avatarMediaId: z
      .string()
      .regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)
      .nullable()
      .optional(),
    marketingConsent: z.boolean().optional(),
    introCompleted: z.boolean().optional(),
  })
  .strict();

export class UpdateProfileDetailsDto extends createZodDto(updateProfileDetailsSchema) {}

export const profileDetailsResponseSchema = z.object({
  handle: z.string().nullable(),
  birthYear: z.number().int().nullable(),
  gender: z.enum(PROFILE_GENDERS).nullable(),
  instagramHandle: z.string().nullable(),
  tiktokHandle: z.string().nullable(),
  acquisitionSource: z.enum(ACQUISITION_SOURCES).nullable(),
  acquisitionDetail: z.string().nullable(),
  avatarMediaId: z.string().nullable(),
  /** Short-lived signed URL (15 min); refetch details to refresh it. */
  avatarUrl: z.string().nullable(),
  marketingConsent: z.boolean(),
  marketingConsentUpdatedAt: z.string().nullable(),
  introCompletedAt: z.string().nullable(),
});

export class ProfileDetailsResponseDto extends createZodDto(profileDetailsResponseSchema) {}
