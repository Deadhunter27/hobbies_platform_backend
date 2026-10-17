import {
  Logger,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { APP_CONFIG, type AppConfig } from '@config/index';
import { ErrorTrackerService } from '@infra/observability';
import { AppError } from '@shared/errors';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { StravaIntegrationService } from '../application/strava-integration.service';
import {
  StravaAuthorizeDto,
  StravaCallbackQueryDto,
  StravaStatusDto,
  StravaSyncDto,
  StravaWebhookEventDto,
} from './strava.dto';

@ApiTags('Strava integration')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/integrations/strava', version: '1' })
export class MyStravaController {
  constructor(private readonly strava: StravaIntegrationService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user Strava connection status' })
  @ApiOkResponse({ type: StravaStatusDto })
  async status(@CurrentUser() actor: Actor): Promise<StravaStatusDto> {
    const status = await this.strava.status(actor);
    return {
      ...status,
      lastSyncedAt: status.lastSyncedAt?.toISOString() ?? null,
    };
  }

  @Post('authorize')
  @ApiOperation({ summary: 'Create a short-lived Strava OAuth authorization URL' })
  @ApiOkResponse({ type: StravaAuthorizeDto })
  authorize(@CurrentUser() actor: Actor): StravaAuthorizeDto {
    return { authorizationUrl: this.strava.authorizationUrl(actor) };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Import recent Strava activities as Wayfinder activity records' })
  @ApiOkResponse({ type: StravaSyncDto })
  async sync(@CurrentUser() actor: Actor): Promise<StravaSyncDto> {
    const result = await this.strava.sync(actor);
    return { ...result, lastSyncedAt: result.lastSyncedAt.toISOString() };
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke and remove the authenticated user Strava connection' })
  @ApiNoContentResponse()
  async disconnect(@CurrentUser() actor: Actor): Promise<void> {
    await this.strava.disconnect(actor);
  }
}

@Controller({ path: 'integrations/strava', version: '1' })
export class StravaPublicController {
  private readonly logger = new Logger(StravaPublicController.name);

  constructor(
    private readonly strava: StravaIntegrationService,
    private readonly errors: ErrorTrackerService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('callback')
  @ApiExcludeEndpoint()
  @Redirect()
  async callback(
    @Query() query: StravaCallbackQueryDto,
  ): Promise<{ url: string; statusCode: number }> {
    if (query.error || !query.code || !query.state) {
      const params = new URLSearchParams({ status: query.error ? 'cancelled' : 'failed' });
      // nosemgrep: nestjs-open-redirect -- destination is the server-configured mobile deep link; only fixed status params are appended
      return {
        url: `${this.config.wayfinderMobileRedirectUri}?${params.toString()}`,
        statusCode: 302,
      };
    }
    try {
      const redirect = await this.strava.completeAuthorization({
        code: query.code,
        state: query.state,
        grantedScope: query.scope,
      });
      // nosemgrep: nestjs-open-redirect -- destination is the server-configured mobile deep link; only fixed status params are appended
      return { url: `${redirect}?status=success`, statusCode: 302 };
    } catch (error) {
      const reason = callbackFailureReason(error);
      this.logger.warn(
        { reason, details: error instanceof AppError ? error.details : undefined },
        'Strava OAuth callback failed',
      );
      this.errors.captureException(error, {
        requestId: 'strava-oauth-callback',
        method: 'GET',
        route: '/api/v1/integrations/strava/callback',
        errorCode: reason,
      });
      const params = new URLSearchParams({ status: 'failed', reason });
      // nosemgrep: nestjs-open-redirect -- destination is the server-configured mobile deep link; only fixed status params are appended
      return {
        url: `${this.config.wayfinderMobileRedirectUri}?${params.toString()}`,
        statusCode: 302,
      };
    }
  }

  @Get('webhook')
  @ApiExcludeEndpoint()
  verifyWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): { 'hub.challenge': string } {
    return { 'hub.challenge': this.strava.verifyWebhook(mode, token, challenge) };
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async webhook(@Body() body: StravaWebhookEventDto): Promise<{ received: true }> {
    await this.strava.handleWebhook(body);
    return { received: true };
  }
}

const CALLBACK_REASONS = new Set([
  'STRAVA_STATE_INVALID',
  'STRAVA_STATE_EXPIRED',
  'STRAVA_AUTH_FAILED',
  'STRAVA_ATHLETE_MISSING',
  'STRAVA_NOT_CONFIGURED',
]);

/** Only known, non-sensitive error codes are forwarded to the app's deep link. */
export function callbackFailureReason(error: unknown): string {
  return error instanceof AppError && CALLBACK_REASONS.has(error.code) ? error.code : 'UNKNOWN';
}
