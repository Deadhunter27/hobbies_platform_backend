import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
  GetCommunityContextUseCase,
  ListMyCommunityMembershipsUseCase,
  UpsertMyCommunityMembershipUseCase,
} from '../application';
import {
  CommunityContextResponseDto,
  CommunityIdParamDto,
  CommunityMembershipListResponseDto,
  CommunityMembershipResponseDto,
  CommunityRefParamDto,
  UpsertCommunityMembershipDto,
} from './dto/community.dto';
import {
  toCommunityContextResponse,
  toCommunityMembershipResponse,
} from './presenters/community.presenter';

@ApiTags('communities')
@Controller({ path: 'communities', version: '1' })
export class CommunitiesController {
  constructor(private readonly getContext: GetCommunityContextUseCase) {}

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
