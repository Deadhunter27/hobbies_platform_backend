import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
  CreateConversationUseCase,
  GetConversationUseCase,
  ListConversationsUseCase,
  ListHobbyFeedUseCase,
  ReplyToConversationUseCase,
} from '../application';
import {
  ConversationDetailResponseDto,
  ConversationHobbyIdParamDto,
  ConversationIdParamDto,
  ConversationListQueryDto,
  ConversationPageResponseDto,
  ConversationReplyResponseDto,
  ConversationResponseDto,
  CreateConversationDto,
  CreateConversationReplyDto,
  HobbyFeedPageResponseDto,
} from './dto/conversation.dto';
import {
  toConversationDetailResponse,
  toConversationReplyResponse,
  toConversationResponse,
  toHobbyFeedResponse,
} from './presenters/conversation.presenter';

@ApiTags('conversations')
@Controller({ version: '1' })
export class ConversationController {
  constructor(
    private readonly listConversations: ListConversationsUseCase,
    private readonly getConversation: GetConversationUseCase,
    private readonly createConversation: CreateConversationUseCase,
    private readonly replyToConversation: ReplyToConversationUseCase,
    private readonly listFeed: ListHobbyFeedUseCase,
  ) {}

  @Get('hobbies/:hobbyId/conversations')
  @ApiOperation({ summary: 'List published hobby conversations with bounded keyset pagination' })
  @ApiOkResponse({ type: ConversationPageResponseDto })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  async list(
    @Param() params: ConversationHobbyIdParamDto,
    @Query() query: ConversationListQueryDto,
  ): Promise<ConversationPageResponseDto> {
    const page = await this.listConversations.execute({
      hobbyId: params.hobbyId,
      limit: query.limit,
      cursor: query.cursor,
    });
    return {
      data: page.data.map(toConversationResponse),
      nextCursor: page.nextCursor,
    };
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get one published conversation with flat chronological replies' })
  @ApiOkResponse({ type: ConversationDetailResponseDto })
  @ApiResponse({ status: 404, description: 'CONVERSATION_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(@Param() params: ConversationIdParamDto): Promise<ConversationDetailResponseDto> {
    return toConversationDetailResponse(await this.getConversation.execute(params.conversationId));
  }

  @Post('hobbies/:hobbyId/conversations')
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Create a hobby-scoped conversation for an active user hobby context' })
  @ApiCreatedResponse({ type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'CONVERSATION_ACCESS_DENIED', type: ErrorEnvelopeDto })
  async create(
    @CurrentUser() actor: Actor,
    @Param() params: ConversationHobbyIdParamDto,
    @Body() body: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return toConversationResponse(
      await this.createConversation.execute(actor, params.hobbyId, body),
    );
  }

  @Post('conversations/:conversationId/replies')
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Add one flat reply to a published conversation' })
  @ApiCreatedResponse({ type: ConversationReplyResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'CONVERSATION_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'CONVERSATION_NOT_FOUND', type: ErrorEnvelopeDto })
  async reply(
    @CurrentUser() actor: Actor,
    @Param() params: ConversationIdParamDto,
    @Body() body: CreateConversationReplyDto,
  ): Promise<ConversationReplyResponseDto> {
    return toConversationReplyResponse(
      await this.replyToConversation.execute(actor, params.conversationId, body.body),
    );
  }

  @Get('hobbies/:hobbyId/feed')
  @ApiOperation({ summary: 'Read the chronological hobby feed of conversations and upcoming activities' })
  @ApiOkResponse({ type: HobbyFeedPageResponseDto })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  async feed(
    @Param() params: ConversationHobbyIdParamDto,
    @Query() query: ConversationListQueryDto,
  ): Promise<HobbyFeedPageResponseDto> {
    return toHobbyFeedResponse(
      await this.listFeed.execute({
        hobbyId: params.hobbyId,
        limit: query.limit,
        cursor: query.cursor,
      }),
    );
  }
}
