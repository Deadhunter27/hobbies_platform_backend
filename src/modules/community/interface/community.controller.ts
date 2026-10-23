import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RateLimit } from '@infra/rate-limit';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
  CreateCommunityUseCase,
  ListCommunitiesUseCase,
  GetCommunityContextUseCase,
  ListMyCommunityMembershipsUseCase,
  UpsertMyCommunityMembershipUseCase,
} from '../application';
import {
  CommunityContextResponseDto,
  CommunityIdParamDto,
  CommunityPageResponseDto,
  CreateCommunityDto,
  ListCommunitiesQueryDto,
  CommunityMembershipListResponseDto,
  CommunityMembershipResponseDto,
  CommunityRefParamDto,
  UpsertCommunityMembershipDto,
} from './dto/community.dto';
import {
  toCommunityContextResponse,
  toCommunityMembershipResponse,
  toCommunityResponse,
} from './presenters/community.presenter';

@ApiTags('communities')
@Controller({ path: 'communities', version: '1' })
export class CommunitiesController {
  constructor(
    private readonly getContext: GetCommunityContextUseCase,
    private readonly createCommunity: CreateCommunityUseCase,
    private readonly listCommunities: ListCommunitiesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published communities, optionally by hobby or name/city search' })
  @ApiOkResponse({ type: CommunityPageResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or INVALID_CURSOR',
    type: ErrorEnvelopeDto,
  })
  async list(@Query() query: ListCommunitiesQueryDto): Promise<CommunityPageResponseDto> {
    const page = await this.listCommunities.execute({
      hobbyId: query.hobbyId,
      query: query.q,
      limit: query.limit,
      cursor: query.cursor,
    });
    return {
      data: page.data.map((row) => ({
        ...toCommunityResponse(row.community),
        memberCount: row.memberCount,
      })),
      nextCursor: page.nextCursor,
    };
  }

  @Post()
  @ApiBearerAuth()
  @RequiresAuth()
  @RateLimit('sensitive-write')
  @ApiOperation({
    summary: 'Start a community in a hobby; you become its organizer',
    description: 'Allowed by the platform setting community.creationPolicy (ADR-0035).',
  })
  @ApiCreatedResponse({ type: CommunityContextResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'CREATION_NOT_ALLOWED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async create(
    @CurrentUser() actor: Actor,
    @Body() body: CreateCommunityDto,
  ): Promise<CommunityContextResponseDto> {
    return toCommunityContextResponse(await this.createCommunity.execute(actor, body));
  }

  @Get(':communityRef')
  @ApiOperation({ summary: 'Get one published community with activity-facing people context' })
  @ApiOkResponse({ type: CommunityContextResponseDto })
  @ApiResponse({ status: 404, description: 'COMMUNITY_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(@Param() params: CommunityRefParamDto): Promise<CommunityContextResponseDto> {
    return toCommunityContextResponse(await this.getContext.execute(params.communityRef));
  }
}

@ApiTags('community memberships')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/community-memberships', version: '1' })
export class MyCommunityMembershipsController {
  constructor(
    private readonly listMemberships: ListMyCommunityMembershipsUseCase,
    private readonly upsertMembership: UpsertMyCommunityMembershipUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated user community memberships' })
  @ApiOkResponse({ type: CommunityMembershipListResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  async list(@CurrentUser() actor: Actor): Promise<CommunityMembershipListResponseDto> {
    const memberships = await this.listMemberships.execute(actor);
    return { data: memberships.map(toCommunityMembershipResponse) };
  }

  @Put(':communityId')
  @ApiOperation({ summary: 'Join, rejoin, or leave one published community' })
  @ApiOkResponse({ type: CommunityMembershipResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 404,
    description: 'COMMUNITY_NOT_FOUND or COMMUNITY_MEMBERSHIP_NOT_FOUND',
    type: ErrorEnvelopeDto,
  })
  async put(
    @CurrentUser() actor: Actor,
    @Param() params: CommunityIdParamDto,
    @Body() body: UpsertCommunityMembershipDto,
  ): Promise<CommunityMembershipResponseDto> {
    return toCommunityMembershipResponse(
      await this.upsertMembership.execute(actor, params.communityId, body),
    );
  }
}
