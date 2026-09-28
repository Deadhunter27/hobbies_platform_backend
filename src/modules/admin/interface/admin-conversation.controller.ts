import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { ModerateConversationUseCase } from '../application';
import {
  AdminConversationIdParamDto,
  AdminConversationStatusResponseDto,
} from './dto/admin-conversation.dto';

@ApiTags('admin')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'admin/conversations', version: '1' })
export class AdminConversationController {
  constructor(private readonly moderateConversation: ModerateConversationUseCase) {}

  @Post(':conversationId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a Conversation through the explicit staff moderation path' })
  @ApiOkResponse({ type: AdminConversationStatusResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'CONVERSATION_NOT_FOUND', type: ErrorEnvelopeDto })
  async archive(
    @CurrentUser() actor: Actor,
    @Param() params: AdminConversationIdParamDto,
  ): Promise<AdminConversationStatusResponseDto> {
    const conversation = await this.moderateConversation.execute(
      actor,
      params.conversationId,
      'archived',
    );
    return {
      id: conversation.id,
      status: conversation.status,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  @Post(':conversationId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a Conversation through the explicit staff moderation path' })
  @ApiOkResponse({ type: AdminConversationStatusResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'CONVERSATION_NOT_FOUND', type: ErrorEnvelopeDto })
  async publish(
    @CurrentUser() actor: Actor,
    @Param() params: AdminConversationIdParamDto,
  ): Promise<AdminConversationStatusResponseDto> {
    const conversation = await this.moderateConversation.execute(
      actor,
      params.conversationId,
      'published',
    );
    return {
      id: conversation.id,
      status: conversation.status,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }
}
