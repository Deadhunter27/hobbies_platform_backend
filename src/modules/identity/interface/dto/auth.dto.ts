import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Password length is NOT validated here: the domain policy owns it and
// violations must surface as PASSWORD_TOO_WEAK, not VALIDATION_FAILED.

export const registerBodySchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(200),
    displayName: z.string().min(1).max(120),
  })
  .strict();

export class RegisterBodyDto extends createZodDto(registerBodySchema) {}

export const loginBodySchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(200),
    deviceLabel: z.string().min(1).max(120).optional(),
  })
  .strict();

export class LoginBodyDto extends createZodDto(loginBodySchema) {}

export const refreshBodySchema = z
  .object({
    refreshToken: z.string().min(1).max(200),
  })
  .strict();

export class RefreshBodyDto extends createZodDto(refreshBodySchema) {}

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(1).max(200),
  })
  .strict();

export class ChangePasswordBodyDto extends createZodDto(changePasswordBodySchema) {}

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  status: z.enum(['active', 'suspended', 'deleted']),
  globalRole: z.enum(['user', 'staff']),
  createdAt: z.string(),
});

export class UserResponseDto extends createZodDto(userResponseSchema) {}

export const authTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number(),
  userId: z.string(),
});

export class AuthTokensResponseDto extends createZodDto(authTokensResponseSchema) {}

export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  globalRole: z.enum(['user', 'staff']),
  sessionId: z.string(),
});

export class MeResponseDto extends createZodDto(meResponseSchema) {}
