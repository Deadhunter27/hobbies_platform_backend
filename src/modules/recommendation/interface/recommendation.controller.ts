import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
  GetWhatsNextUseCase,
  RejectRecommendationUseCase,
  SelectRecommendationUseCase,
} from '../application';
import {
  RecommendationActionParamDto,
  RecommendationResponseDto,
  RejectRecommendationDto,
  SelectRecommendationDto,
  WhatsNextParamDto,
} from './dto/recommendation.dto';
import { toRecommendationResponse } from './presenters/recommendation.presenter';

@ApiTags('recommendation')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/hobbies', version: '1' })
export class RecommendationController {
  constructor(
    private readonly getWhatsNext: GetWhatsNextUseCase,
    private readonly rejectRecommendation: RejectRecommendationUseCase,
    private readonly selectRecommendation: SelectRecommendationUseCase,
  ) {}

  @Get(':hobbyId/whats-next')
  @ApiOperation({ summary: 'Get the authenticated user current explainable next step' })
  @ApiOkResponse({ type: RecommendationResponseDto })
  @ApiResponse({
    status: 404,
    description: 'HOBBY_CONTEXT_NOT_FOUND or NO_VIABLE_RECOMMENDATION',
    type: ErrorEnvelopeDto,
  })
  async get(
    @CurrentUser() actor: Actor,
    @Param() params: WhatsNextParamDto,
  ): Promise<RecommendationResponseDto> {
    return toRecommendationResponse(await this.getWhatsNext.execute(actor, params.hobbyId));
  }

  @Post(':hobbyId/whats-next/:recommendationId/reject')
  @ApiOperation({ summary: 'Reject the current next step and get a recovery alternative' })
  @ApiOkResponse({ type: RecommendationResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 404,
    description: 'RECOMMENDATION_NOT_FOUND or NO_VIABLE_RECOMMENDATION',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 409, description: 'RECOMMENDATION_STALE', type: ErrorEnvelopeDto })
  async reject(
    @CurrentUser() actor: Actor,
    @Param() params: RecommendationActionParamDto,
    @Body() body: RejectRecommendationDto,
  ): Promise<RecommendationResponseDto> {
    return toRecommendationResponse(
      await this.rejectRecommendation.execute(actor, params.hobbyId, params.recommendationId, body),
    );
  }

  @Post(':hobbyId/whats-next/:recommendationId/select')
  @ApiOperation({ summary: 'Record the activity path selected from the current recommendation' })
  @ApiOkResponse({ type: RecommendationResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'RECOMMENDATION_NOT_FOUND', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 409, description: 'RECOMMENDATION_STALE', type: ErrorEnvelopeDto })
  async select(
    @CurrentUser() actor: Actor,
    @Param() params: RecommendationActionParamDto,
    @Body() body: SelectRecommendationDto,
  ): Promise<RecommendationResponseDto> {
    return toRecommendationResponse(
      await this.selectRecommendation.execute(
        actor,
        params.hobbyId,
        params.recommendationId,
        body.activityId,
      ),
    );
  }
}
