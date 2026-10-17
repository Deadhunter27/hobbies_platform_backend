import { Body, Controller, Delete, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { RateLimit } from '@infra/rate-limit';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { MediaService } from '../application';
import {
  InitiateUploadDto,
  MediaIdParamDto,
  MediaResponseDto,
  UploadTicketDto,
} from './dto/media.dto';

@ApiTags('media')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/media', version: '1' })
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @RateLimit('sensitive-write')
  @ApiOperation({ summary: 'Start a photo upload; returns a short-lived direct upload URL' })
  @ApiCreatedResponse({ type: UploadTicketDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or MEDIA_REJECTED',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 409, description: 'MEDIA_NOT_CONFIGURED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async initiate(
    @CurrentUser() actor: Actor,
    @Body() body: InitiateUploadDto,
  ): Promise<UploadTicketDto> {
    const ticket = await this.media.initiate(actor, body);
    return {
      id: ticket.media.id,
      uploadUrl: ticket.uploadUrl,
      uploadMethod: 'PUT',
      uploadHeaders: { 'Content-Type': ticket.media.mimeType },
      expiresAt: ticket.expiresAt.toISOString(),
    };
  }

  @Post(':mediaId/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify an uploaded photo (size, type, no location data) and mark it ready',
  })
  @ApiOkResponse({ type: MediaResponseDto })
  @ApiResponse({ status: 400, description: 'MEDIA_REJECTED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'MEDIA_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'MEDIA_NOT_FOUND', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 409, description: 'MEDIA_NOT_CONFIGURED', type: ErrorEnvelopeDto })
  async complete(
    @CurrentUser() actor: Actor,
    @Param() params: MediaIdParamDto,
  ): Promise<MediaResponseDto> {
    const media = await this.media.complete(actor, params.mediaId);
    return {
      id: media.id,
      purpose: media.purpose,
      status: media.status,
      url: await this.media.signedUrl(media.id),
    };
  }

  @Delete(':mediaId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete one of your photos' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'MEDIA_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'MEDIA_NOT_FOUND', type: ErrorEnvelopeDto })
  async remove(@CurrentUser() actor: Actor, @Param() params: MediaIdParamDto): Promise<void> {
    await this.media.delete(actor, params.mediaId);
  }
}
