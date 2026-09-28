import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { CurateActivityUseCase, CurateCommunityUseCase } from '../application';
import {
  AdminActivityIdParamDto,
  AdminActivityStatusDto,
  AdminActivityStatusResponseDto,
  AdminCommunityIdParamDto,
  AdminCommunityStatusDto,
  AdminCommunityStatusResponseDto,
} from './dto/admin-supply.dto';

@ApiTags('admin')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'admin', version: '1' })
export class AdminSupplyController {
  constructor(
    private readonly curateActivity: CurateActivityUseCase,
    private readonly curateCommunity: CurateCommunityUseCase,
  ) {}

  @Put('activities/:activityId/status')
  @ApiOperation({ summary: 'Set an Activity lifecycle status through the staff curation path' })
  @ApiOkResponse({ type: AdminActivityStatusResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'ACTIVITY_NOT_FOUND', type: ErrorEnvelopeDto })
  async setActivityStatus(
    @CurrentUser() actor: Actor,
    @Param() params: AdminActivityIdParamDto,
    @Body() body: AdminActivityStatusDto,
  ): Promise<AdminActivityStatusResponseDto> {
    const activity = await this.curateActivity.execute(actor, params.activityId, body.status);
    return { id: activity.id, status: activity.status, updatedAt: activity.updatedAt.toISOString() };
  }

  @Put('communities/:communityId/status')
  @ApiOperation({ summary: 'Set a Community lifecycle status through the staff curation path' })
  @ApiOkResponse({ type: AdminCommunityStatusResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'COMMUNITY_NOT_FOUND', type: ErrorEnvelopeDto })
  async setCommunityStatus(
    @CurrentUser() actor: Actor,
    @Param() params: AdminCommunityIdParamDto,
    @Body() body: AdminCommunityStatusDto,
  ): Promise<AdminCommunityStatusResponseDto> {
    const community = await this.curateCommunity.execute(actor, params.communityId, body.status);
    return {
      id: community.id,
      status: community.status,
      updatedAt: community.updatedAt.toISOString(),
    };
  }
}
