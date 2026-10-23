import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { RateLimit } from '@infra/rate-limit';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import { ReportContentUseCase, ReviewReportsUseCase } from '../application';
import {
  CreateReportDto,
  ReportGroupListDto,
  ReportListQueryDto,
  ReportResultDto,
  ResolveReportsDto,
  ResolveResultDto,
} from './dto/moderation.dto';

@ApiTags('reports')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly report: ReportContentUseCase) {}

  @Post()
  @HttpCode(200)
  @RateLimit('sensitive-write')
  @ApiOperation({
    summary: 'Report a post, reply, community, event or person (idempotent per person)',
  })
  @ApiOkResponse({ type: ReportResultDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'REPORT_TARGET_NOT_FOUND', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 409, description: 'CANNOT_REPORT_SELF', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async create(
    @CurrentUser() actor: Actor,
    @Body() body: CreateReportDto,
  ): Promise<ReportResultDto> {
    const result = await this.report.execute(actor, {
      target: { type: body.targetType, id: body.targetId },
      reason: body.reason,
      note: body.note,
    });
    return { received: true, hidden: result.hidden };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'admin/reports', version: '1' })
export class AdminReportsController {
  constructor(private readonly review: ReviewReportsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Open reports grouped by target, most-reported first (staff)' })
  @ApiOkResponse({ type: ReportGroupListDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  async list(
    @CurrentUser() actor: Actor,
    @Query() query: ReportListQueryDto,
  ): Promise<ReportGroupListDto> {
    const groups = await this.review.list(actor, query.limit);
    return {
      data: groups.map((group) => ({
        ...group,
        firstReportedAt: group.firstReportedAt.toISOString(),
        lastReportedAt: group.lastReportedAt.toISOString(),
      })),
    };
  }

  @Post('resolve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Close all open reports on a target: dismiss (restore) or remove (keep hidden)',
  })
  @ApiOkResponse({ type: ResolveResultDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  async resolve(
    @CurrentUser() actor: Actor,
    @Body() body: ResolveReportsDto,
  ): Promise<ResolveResultDto> {
    return this.review.resolve(actor, { type: body.targetType, id: body.targetId }, body.decision);
  }
}
