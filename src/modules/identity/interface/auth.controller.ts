import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '@config/index';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
  ChangePasswordUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshUseCase,
  RegisterUseCase,
} from '../application';
import {
  AuthTokensResponseDto,
  ChangePasswordBodyDto,
  LoginBodyDto,
  RefreshBodyDto,
  RegisterBodyDto,
  UserResponseDto,
} from './dto/auth.dto';

type RequestWithId = Request & { id?: string | number };

function requestIdOf(req: RequestWithId): string | null {
  return req.id !== undefined ? String(req.id) : null;
}

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'EMAIL_ALREADY_REGISTERED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or PASSWORD_TOO_WEAK',
    type: ErrorEnvelopeDto,
  })
  async register(@Body() body: RegisterBodyDto, @Req() req: RequestWithId) {
    const user = await this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      requestId: requestIdOf(req),
    });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      globalRole: user.globalRole,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiResponse({
    status: 401,
    description: 'INVALID_CREDENTIALS (never distinguishes unknown email from wrong password)',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 403, description: 'USER_SUSPENDED', type: ErrorEnvelopeDto })
  async login(@Body() body: LoginBodyDto, @Req() req: RequestWithId) {
    return this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      deviceLabel: body.deviceLabel ?? null,
      refreshTtlDays: this.config.refreshTokenTtlDays,
      requestId: requestIdOf(req),
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token for a new token pair' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiResponse({
    status: 401,
    description:
      'INVALID_REFRESH_TOKEN (unknown/expired) or SESSION_REVOKED (reuse detected — the entire session family has been revoked)',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 403, description: 'USER_SUSPENDED', type: ErrorEnvelopeDto })
  async refresh(@Body() body: RefreshBodyDto, @Req() req: RequestWithId) {
    return this.refreshUseCase.execute({
      refreshToken: body.refreshToken,
      refreshTtlDays: this.config.refreshTokenTtlDays,
      requestId: requestIdOf(req),
    });
  }

  @Post('logout')
  @HttpCode(204)
  @RequiresAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the presenting session (idempotent)' })
  @ApiNoContentResponse({ description: 'Session revoked (or already revoked)' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  async logout(@CurrentUser() actor: Actor, @Req() req: RequestWithId): Promise<void> {
    await this.logoutUseCase.execute({
      actorId: actor.id,
      sessionId: actor.sessionId,
      requestId: requestIdOf(req),
    });
  }

  @Post('change-password')
  @HttpCode(204)
  @RequiresAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password; revokes ALL sessions (ADR-0017)' })
  @ApiNoContentResponse({ description: 'Password changed, every session revoked' })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or PASSWORD_TOO_WEAK',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED or INVALID_CREDENTIALS (wrong current password)',
    type: ErrorEnvelopeDto,
  })
  async changePassword(
    @CurrentUser() actor: Actor,
    @Body() body: ChangePasswordBodyDto,
    @Req() req: RequestWithId,
  ): Promise<void> {
    await this.changePasswordUseCase.execute({
      actorId: actor.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      requestId: requestIdOf(req),
    });
  }
}
