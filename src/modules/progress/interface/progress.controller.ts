import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { ListMyJourneyUseCase, SaveMyProgressReflectionUseCase } from '../application';
import {
  JourneyParamDto,
  JourneyResponseDto,
  ProgressActivityParamDto,
  ProgressReflectionResponseDto,
  SaveProgressReflectionDto,
} from './dto/progress.dto';
import {
  toJourneyMomentResponse,
  toProgressReflectionResponse,
} from './presenters/progress.presenter';

@ApiTags('progress')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/hobbies', version: '1' })
export class ProgressController {
  constructor(
    private readonly saveProgress: SaveMyProgressReflectionUseCase,
    private readonly listJourney: ListMyJourneyUseCase,
  ) {}

  @Put(':hobbyId/progress/:activityId')
  @ApiOperation({ summary: 'Save or revise a qualitative reflection after a real-world activity' })
  @ApiOkResponse({ type: ProgressReflectionResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'ACTIVITY_NOT_FOUND or ACTIVITY_COMMITMENT_NOT_FOUND', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 409, description: 'PROGRESS_ACTIVITY_HOBBY_MISMATCH or PROGRESS_COMMITMENT_REQUIRED', type: ErrorEnvelopeDto })
  async save(
    @CurrentUser() actor: Actor,
    @Param() params: ProgressActivityParamDto,
    @Body() body: SaveProgressReflectionDto,
  ): Promise<ProgressReflectionResponseDto> {
    return toProgressReflectionResponse(
      await this.saveProgress.execute(actor, params.hobbyId, params.activityId, body),
    );
  }

  @Get(':hobbyId/journey')
  @ApiOperation({ summary: 'List the authenticated user meaningful progress moments for a hobby' })
  @ApiOkResponse({ type: JourneyResponseDto })
  async journey(
    @CurrentUser() actor: Actor,
    @Param() params: JourneyParamDto,
  ): Promise<JourneyResponseDto> {
    const moments = await this.listJourney.execute(actor, params.hobbyId);
    return { data: moments.map(toJourneyMomentResponse) };
  }
}
