import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
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
import { CurrentUser, OptionalAuth, OptionalUser, RequiresAuth, type Actor } from '@modules/access';
import {
  CreatePostUseCase,
  DeleteOwnContentUseCase,
  GetPostUseCase,
  ListPostFeedUseCase,
  ReplyToPostUseCase,
  SetLikeUseCase,
} from '../application';
import {
  CreatePostDto,
  CreateReplyDto,
  FeedPageResponseDto,
  FeedQueryDto,
  PostDetailResponseDto,
  PostIdParamDto,
  PostResponseDto,
  ReplyIdParamDto,
  ReplyResponseDto,
} from './dto/post.dto';
import { toPostResponse, toReplyResponse } from './presenters/post.presenter';

/** ADR-0032: Threads-style posts. Reads are public; signing in unlocks all photos. */
@ApiTags('posts')
@Controller({ version: '1' })
export class PostController {
  constructor(
    private readonly listFeed: ListPostFeedUseCase,
    private readonly getPost: GetPostUseCase,
    private readonly createPost: CreatePostUseCase,
    private readonly replyToPost: ReplyToPostUseCase,
    private readonly setLike: SetLikeUseCase,
    private readonly deleteContent: DeleteOwnContentUseCase,
  ) {}

  @Get('feed')
  @OptionalAuth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chronological post feed, optionally for one hobby or one author',
    description:
      'Public. Signed-out viewers see a share of each post’s photos (platform setting media.signedOutVisibleRatio); the rest are returned locked.',
  })
  @ApiOkResponse({ type: FeedPageResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or INVALID_CURSOR',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED (an invalid token was sent)',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  async feed(
    @OptionalUser() viewer: Actor | null,
    @Query() query: FeedQueryDto,
  ): Promise<FeedPageResponseDto> {
    const page = await this.listFeed.execute(viewer, query);
    return { data: page.data.map(toPostResponse), nextCursor: page.nextCursor };
  }

  @Get('posts/:postId')
  @OptionalAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'One post with its replies (nested one level by parentReplyId)' })
  @ApiOkResponse({ type: PostDetailResponseDto })
  @ApiResponse({
    status: 401,
    description: 'UNAUTHORIZED (an invalid token was sent)',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 404, description: 'POST_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(
    @OptionalUser() viewer: Actor | null,
    @Param() params: PostIdParamDto,
  ): Promise<PostDetailResponseDto> {
    const detail = await this.getPost.execute(viewer, params.postId);
    return { post: toPostResponse(detail.post), replies: detail.replies.map(toReplyResponse) };
  }

  @Post('posts')
  @ApiBearerAuth()
  @RequiresAuth()
  @RateLimit('sensitive-write')
  @ApiOperation({ summary: 'Publish a post (text and/or up to 4 photos) in a hobby' })
  @ApiCreatedResponse({ type: PostResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or MEDIA_REJECTED',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 403,
    description: 'CONVERSATION_ACCESS_DENIED or MEDIA_ACCESS_DENIED',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({
    status: 404,
    description: 'HOBBY_NOT_FOUND or MEDIA_NOT_FOUND',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async create(@CurrentUser() actor: Actor, @Body() body: CreatePostDto): Promise<PostResponseDto> {
    return toPostResponse(await this.createPost.execute(actor, body));
  }

  @Post('posts/:postId/replies')
  @ApiBearerAuth()
  @RequiresAuth()
  @RateLimit('sensitive-write')
  @ApiOperation({ summary: 'Reply to a post or to one of its replies' })
  @ApiCreatedResponse({ type: ReplyResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or MEDIA_REJECTED',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'CONVERSATION_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 404,
    description: 'POST_NOT_FOUND or REPLY_NOT_FOUND',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async reply(
    @CurrentUser() actor: Actor,
    @Param() params: PostIdParamDto,
    @Body() body: CreateReplyDto,
  ): Promise<ReplyResponseDto> {
    return toReplyResponse(await this.replyToPost.execute(actor, params.postId, body));
  }

  @Put('posts/:postId/like')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Like a post (idempotent)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'POST_NOT_FOUND', type: ErrorEnvelopeDto })
  async likePost(@CurrentUser() actor: Actor, @Param() params: PostIdParamDto): Promise<void> {
    await this.setLike.execute(actor, 'conversation', params.postId, true);
  }

  @Delete('posts/:postId/like')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Remove your like from a post (idempotent)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'POST_NOT_FOUND', type: ErrorEnvelopeDto })
  async unlikePost(@CurrentUser() actor: Actor, @Param() params: PostIdParamDto): Promise<void> {
    await this.setLike.execute(actor, 'conversation', params.postId, false);
  }

  @Put('replies/:replyId/like')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Like a reply (idempotent)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'REPLY_NOT_FOUND', type: ErrorEnvelopeDto })
  async likeReply(@CurrentUser() actor: Actor, @Param() params: ReplyIdParamDto): Promise<void> {
    await this.setLike.execute(actor, 'reply', params.replyId, true);
  }

  @Delete('replies/:replyId/like')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Remove your like from a reply (idempotent)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'REPLY_NOT_FOUND', type: ErrorEnvelopeDto })
  async unlikeReply(@CurrentUser() actor: Actor, @Param() params: ReplyIdParamDto): Promise<void> {
    await this.setLike.execute(actor, 'reply', params.replyId, false);
  }

  @Delete('posts/:postId')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Delete your own post and its photos' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'NOT_CONTENT_AUTHOR', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'POST_NOT_FOUND', type: ErrorEnvelopeDto })
  async deletePost(@CurrentUser() actor: Actor, @Param() params: PostIdParamDto): Promise<void> {
    await this.deleteContent.deletePost(actor, params.postId);
  }

  @Delete('replies/:replyId')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Delete your own reply (and replies nested under it)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'NOT_CONTENT_AUTHOR', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'REPLY_NOT_FOUND', type: ErrorEnvelopeDto })
  async deleteReply(@CurrentUser() actor: Actor, @Param() params: ReplyIdParamDto): Promise<void> {
    await this.deleteContent.deleteReply(actor, params.replyId);
  }
}
