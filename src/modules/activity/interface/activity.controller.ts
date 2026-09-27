import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
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
  UpsertActivityCommitmentDto,
} from './dto/activity.dto';
import { toActivityCommitmentResponse, toActivityResponse } from './presenters/activity.presenter';

@ApiTags('activities')
@Controller({ path: 'activities', version: '1' })
export class ActivitiesController {
  constructor(
    private readonly listActivities: ListActivitiesUseCase,
    private readonly getActivity: GetActivityUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List upcoming published real-world activities' })
  @ApiOkResponse({ type: ActivityListResponseDto })
  async list(@Query() query: ActivityListQueryDto): Promise<ActivityListResponseDto> {
    const activities = await this.listActivities.execute(query);
    return { data: activities.map(toActivityResponse) };
  }

  @Get(':activityId')
  @ApiOperation({ summary: 'Get one visible activity with current availability' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiResponse({ status: 404, description: 'ACTIVITY_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(@Param() params: ActivityIdParamDto): Promise<ActivityResponseDto> {
    return toActivityResponse(await this.getActivity.execute(params.activityId));
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
    return toActivityCommitmentResponse(
      await this.getCommitment.execute(actor, params.activityId),
    );
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
