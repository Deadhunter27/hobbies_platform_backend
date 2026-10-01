import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
  ActivityRecordService,
  type ActivityRecordView,
} from '../application/activity-record.service';
import {
  ActivityRecordIdParamDto,
  ActivityRecordListResponseDto,
  ActivityRecordResponseDto,
  CreateActivityRecordDto,
  UpdateActivityRecordDto,
} from './activity-record.dto';

function present(record: ActivityRecordView): ActivityRecordResponseDto {
  return {
    id: record.id,
    hobbyId: record.hobbyId,
    opportunityId: record.opportunityId,
    sportType: record.sportType,
    title: record.title,
    startedAt: record.startedAt.toISOString(),
    durationSeconds: record.durationSeconds,
    distanceMeters: record.distanceMeters,
    notes: record.notes,
    source: record.source,
    sourceReferenceId: record.sourceReferenceId,
    externalUrl: record.externalUrl,
    visibility: record.visibility,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@ApiTags('activity records')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/activity-records', version: '1' })
export class ActivityRecordController {
  constructor(private readonly records: ActivityRecordService) {}

  @Get()
  @ApiOperation({ summary: 'List activities the authenticated user actually did' })
  @ApiOkResponse({ type: ActivityRecordListResponseDto })
  async list(@CurrentUser() actor: Actor): Promise<ActivityRecordListResponseDto> {
    return { data: (await this.records.listMine(actor)).map(present) };
  }

  @Get(':recordId')
  @ApiOperation({ summary: 'Get one owned completed activity record' })
  @ApiOkResponse({ type: ActivityRecordResponseDto })
  @ApiResponse({ status: 404, description: 'ACTIVITY_RECORD_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(
    @CurrentUser() actor: Actor,
    @Param() params: ActivityRecordIdParamDto,
  ): Promise<ActivityRecordResponseDto> {
    return present(await this.records.getMine(actor, params.recordId));
  }

  @Post()
  @ApiOperation({ summary: 'Manually record something the authenticated user already did' })
  @ApiOkResponse({ type: ActivityRecordResponseDto })
  async create(
    @CurrentUser() actor: Actor,
    @Body() body: CreateActivityRecordDto,
  ): Promise<ActivityRecordResponseDto> {
    return present(await this.records.createManual(actor, body));
  }

  @Patch(':recordId')
  @ApiOperation({ summary: 'Edit an owned activity record' })
  @ApiOkResponse({ type: ActivityRecordResponseDto })
  @ApiResponse({ status: 404, description: 'ACTIVITY_RECORD_NOT_FOUND', type: ErrorEnvelopeDto })
  async update(
    @CurrentUser() actor: Actor,
    @Param() params: ActivityRecordIdParamDto,
    @Body() body: UpdateActivityRecordDto,
  ): Promise<ActivityRecordResponseDto> {
    return present(await this.records.updateMine(actor, params.recordId, body));
  }

  @Delete(':recordId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an owned activity record' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 404, description: 'ACTIVITY_RECORD_NOT_FOUND', type: ErrorEnvelopeDto })
  async remove(
    @CurrentUser() actor: Actor,
    @Param() params: ActivityRecordIdParamDto,
  ): Promise<void> {
    await this.records.deleteMine(actor, params.recordId);
  }
}
