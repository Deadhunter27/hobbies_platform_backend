import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { GetHobbyUseCase, ListHobbiesUseCase } from '../application';
import { ListHobbiesQueryDto } from './dto/list-hobbies-query.dto';
import { HobbyDetailParamDto } from './dto/hobby-detail-param.dto';
import { PaginatedHobbiesResponseDto } from './dto/paginated-hobbies-response.dto';
import { HobbyResponseDto } from './dto/hobby.dto';
import { toHobbyResponse } from './presenters/hobby.presenter';

@ApiTags('hobbies')
@Controller({ path: 'hobbies', version: '1' })
export class HobbiesController {
  constructor(
    private readonly listHobbies: ListHobbiesUseCase,
    private readonly getHobby: GetHobbyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active hobbies, cursor-paginated' })
  @ApiQuery({ name: 'category', required: false, description: 'Category slug filter' })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    isArray: true,
    description: 'Repeatable difficulty filter',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Free-text search on hobby name' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default 20, max 100)',
  })
  @ApiQuery({ name: 'cursor', required: false, description: 'Opaque pagination cursor' })
  @ApiOkResponse({ type: PaginatedHobbiesResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED (unknown/malformed query param) or INVALID_CURSOR',
    type: ErrorEnvelopeDto,
  })
  async list(@Query() query: ListHobbiesQueryDto): Promise<PaginatedHobbiesResponseDto> {
    const page = await this.listHobbies.execute({
      category: query.category,
      difficulty: query.difficulty,
      q: query.q,
      limit: query.limit,
      cursor: query.cursor,
    });

    return {
      data: page.data.map(toHobbyResponse),
      page: page.page,
    };
  }

  @Get(':slugOrId')
  @ApiOperation({ summary: 'Get one active hobby by slug or id' })
  @ApiParam({ name: 'slugOrId', description: 'Hobby slug or ULID' })
  @ApiOkResponse({ type: HobbyResponseDto })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(@Param() params: HobbyDetailParamDto): Promise<HobbyResponseDto> {
    const hobby = await this.getHobby.execute({ slugOrId: params.slugOrId });
    return toHobbyResponse(hobby);
  }
}
