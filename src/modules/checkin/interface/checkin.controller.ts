import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { ListMyCheckInsUseCase, UpdateMyCheckInUseCase } from '../application';
import {
  CheckInIdParamDto,
  CheckInListResponseDto,
  CheckInStateResponseDto,
  UpdateCheckInDto,
} from './dto/checkin.dto';
import { toCheckInResponse, toCheckInStateResponse } from './presenters/checkin.presenter';

@ApiTags('check-ins')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me/check-ins', version: '1' })
export class MyCheckInsController {
  constructor(
    private readonly listMyCheckIns: ListMyCheckInsUseCase,
    private readonly updateMyCheckIn: UpdateMyCheckInUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List currently actionable in-app check-ins for the authenticated user' })
  @ApiOkResponse({ type: CheckInListResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'CHECK_IN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  async list(@CurrentUser() actor: Actor): Promise<CheckInListResponseDto> {
    const checkIns = await this.listMyCheckIns.execute(actor);
    return { data: checkIns.map(toCheckInResponse) };
  }

  @Put(':checkInId')
  @ApiOperation({ summary: 'Mark one own check-in as actioned or dismissed' })
  @ApiOkResponse({ type: CheckInStateResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'CHECK_IN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'CHECK_IN_NOT_FOUND', type: ErrorEnvelopeDto })
  async update(
    @CurrentUser() actor: Actor,
    @Param() params: CheckInIdParamDto,
    @Body() body: UpdateCheckInDto,
  ): Promise<CheckInStateResponseDto> {
    return toCheckInStateResponse(
      await this.updateMyCheckIn.execute(actor, params.checkInId, body.status),
    );
  }
}
