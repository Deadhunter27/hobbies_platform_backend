import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
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
import { ResolveCommunityContextUseCase } from '@modules/community';
import {
  CancelEventUseCase,
  CreateEventUseCase,
  GetActivityUseCase,
  GetMyActivityCommitmentUseCase,
  ListActivitiesUseCase,
  ListMyActivityCommitmentsUseCase,
  UpsertMyActivityCommitmentUseCase,
} from '../application';
import {
  ActivityCommitmentListResponseDto,
  ActivityCommitmentResponseDto,
  ActivityIdParamDto,
  ActivityListQueryDto,
  ActivityListResponseDto,
  ActivityResponseDto,
  CreateEventDto,
  UpsertActivityCommitmentDto,
} from './dto/activity.dto';
import { toActivityCommitmentResponse, toActivityResponse } from './presenters/activity.presenter';

@ApiTags('activities')
@Controller({ path: 'activities', version: '1' })
export class ActivitiesController {
  constructor(
    private readonly listActivities: ListActivitiesUseCase,
    private readonly getActivity: GetActivityUseCase,
    private readonly resolveCommunityContext: ResolveCommunityContextUseCase,
    private readonly createEvent: CreateEventUseCase,
    private readonly cancelEvent: CancelEventUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @RequiresAuth()
  @RateLimit('sensitive-write')
  @ApiOperation({
    summary: 'Create a real-world event you host (optionally inside a community you organize)',
    description: 'Allowed by the platform setting event.creationPolicy (ADR-0035).',
  })
  @ApiCreatedResponse({ type: ActivityResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or ACTIVITY_START_IN_PAST',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 403,
    description: 'CREATION_NOT_ALLOWED or COMMUNITY_HOST_REQUIRED',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async create(
    @CurrentUser() actor: Actor,
    @Body() body: CreateEventDto,
  ): Promise<ActivityResponseDto> {
    const view = await this.createEvent.execute(actor, {
      ...body,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    });
    return toActivityResponse(
      view,
      await this.resolveCommunityContext.execute(view.activity.communityReferenceId),
    );
  }

  @Post(':activityId/cancel')
  @HttpCode(200)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Cancel an event you host' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'NOT_ACTIVITY_HOST', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'ACTIVITY_NOT_FOUND', type: ErrorEnvelopeDto })
  async cancel(
    @CurrentUser() actor: Actor,
    @Param() params: ActivityIdParamDto,
  ): Promise<ActivityResponseDto> {
    const view = await this.cancelEvent.execute(actor, params.activityId);
    return toActivityResponse(
      view,
      await this.resolveCommunityContext.execute(view.activity.communityReferenceId),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List upcoming published activities, by hobby, community or host' })
  @ApiOkResponse({ type: ActivityListResponseDto })
  async list(@Query() query: ActivityListQueryDto): Promise<ActivityListResponseDto> {
    const activities = await this.listActivities.execute(query);
    const data = await Promise.all(
      activities.map(async (view) => {
        const communityContext = await this.resolveCommunityContext.execute(
          view.activity.communityReferenceId,
        );
        return toActivityResponse(view, communityContext);
      }),
    );
    return { data };
  }

  @Get(':activityId')
  @ApiOperation({ summary: 'Get one visible activity with current availability and trust context' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiResponse({ status: 404, description: 'ACTIVITY_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(@Param() params: ActivityIdParamDto): Promise<ActivityResponseDto> {
    const view = await this.getActivity.execute(params.activityId);
    const communityContext = await this.resolveCommunityContext.execute(
      view.activity.communityReferenceId,
    );
    return toActivityResponse(view, communityContext);
  }
}

@ApiTags('activity commitments')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/activity-commitments', version: '1' })
export class MyActivityCommitmentsController {
  constructor(
    private readonly listCommitments: ListMyActivityCommitmentsUseCase,
    private readonly getCommitment: GetMyActivityCommitmentUseCase,
    private readonly upsertCommitment: UpsertMyActivityCommitmentUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated user activity commitments' })
  @ApiOkResponse({ type: ActivityCommitmentListResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  async list(@CurrentUser() actor: Actor): Promise<ActivityCommitmentListResponseDto> {
    const commitments = await this.listCommitments.execute(actor);
    return { data: commitments.map(toActivityCommitmentResponse) };
  }

  @Get(':activityId')
  @ApiOperation({ summary: 'Get the authenticated user commitment for one activity' })
  @ApiOkResponse({ type: ActivityCommitmentResponseDto })
  @ApiResponse({
    status: 404,
    description: 'ACTIVITY_COMMITMENT_NOT_FOUND',
    type: ErrorEnvelopeDto,
  })
  async get(
    @CurrentUser() actor: Actor,
    @Param() params: ActivityIdParamDto,
  ): Promise<ActivityCommitmentResponseDto> {
    return toActivityCommitmentResponse(await this.getCommitment.execute(actor, params.activityId));
  }

  @Put(':activityId')
  @ApiOperation({
    summary: 'Create or replace the authenticated user decision state for one activity',
  })
  @ApiOkResponse({ type: ActivityCommitmentResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 409,
    description: 'ACTIVITY_UNAVAILABLE or ACTIVITY_CAPACITY_FULL',
    type: ErrorEnvelopeDto,
  })
  async put(
    @CurrentUser() actor: Actor,
    @Param() params: ActivityIdParamDto,
    @Body() body: UpsertActivityCommitmentDto,
  ): Promise<ActivityCommitmentResponseDto> {
    return toActivityCommitmentResponse(
      await this.upsertCommitment.execute(actor, params.activityId, body),
    );
  }
}
