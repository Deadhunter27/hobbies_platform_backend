import { Controller, Delete, Get, HttpCode, Param, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { RateLimit } from '@infra/rate-limit';
import { CurrentUser, OptionalAuth, OptionalUser, RequiresAuth, type Actor } from '@modules/access';
import {
  FollowUseCase,
  GetPersonUseCase,
  ListFollowsUseCase,
  SearchPeopleUseCase,
  SuggestPeopleUseCase,
} from '../application';
import {
  FollowListQueryDto,
  PersonIdParamDto,
  PersonListResponseDto,
  PersonPageResponseDto,
  PersonProfileResponseDto,
  PersonRefParamDto,
  SearchPeopleQueryDto,
  SuggestedPeopleQueryDto,
} from './dto/people.dto';

/** ADR-0034: public profiles, search and follows. */
@ApiTags('people')
@Controller({ path: 'people', version: '1' })
export class PeopleController {
  constructor(
    private readonly getPerson: GetPersonUseCase,
    private readonly searchPeople: SearchPeopleUseCase,
    private readonly suggestPeople: SuggestPeopleUseCase,
    private readonly followPerson: FollowUseCase,
    private readonly listFollows: ListFollowsUseCase,
  ) {}

  @Get()
  @OptionalAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search people by name or @handle' })
  @ApiOkResponse({ type: PersonListResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  async search(
    @OptionalUser() viewer: Actor | null,
    @Query() query: SearchPeopleQueryDto,
  ): Promise<PersonListResponseDto> {
    return { data: await this.searchPeople.execute(viewer, query.q, query.limit) };
  }

  @Get('suggested')
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'People in a hobby you do not follow yet (most recently active first)' })
  @ApiOkResponse({ type: PersonListResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  async suggested(
    @CurrentUser() actor: Actor,
    @Query() query: SuggestedPeopleQueryDto,
  ): Promise<PersonListResponseDto> {
    return { data: await this.suggestPeople.execute(actor, query.hobbyId, query.limit) };
  }

  @Get(':personRef')
  @OptionalAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'A public profile by id or @handle' })
  @ApiOkResponse({ type: PersonProfileResponseDto })
  @ApiResponse({ status: 404, description: 'PERSON_NOT_FOUND', type: ErrorEnvelopeDto })
  async get(
    @OptionalUser() viewer: Actor | null,
    @Param() params: PersonRefParamDto,
  ): Promise<PersonProfileResponseDto> {
    return this.getPerson.execute(viewer, params.personRef);
  }

  @Get(':personId/followers')
  @OptionalAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'People who follow this person, newest first' })
  @ApiOkResponse({ type: PersonPageResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_CURSOR', type: ErrorEnvelopeDto })
  followers(
    @OptionalUser() viewer: Actor | null,
    @Param() params: PersonIdParamDto,
    @Query() query: FollowListQueryDto,
  ): Promise<PersonPageResponseDto> {
    return this.listFollows.execute(
      viewer,
      params.personId,
      'followers',
      query.limit,
      query.cursor,
    );
  }

  @Get(':personId/following')
  @OptionalAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'People this person follows, newest first' })
  @ApiOkResponse({ type: PersonPageResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_CURSOR', type: ErrorEnvelopeDto })
  following(
    @OptionalUser() viewer: Actor | null,
    @Param() params: PersonIdParamDto,
    @Query() query: FollowListQueryDto,
  ): Promise<PersonPageResponseDto> {
    return this.listFollows.execute(
      viewer,
      params.personId,
      'following',
      query.limit,
      query.cursor,
    );
  }

  @Put(':personId/follow')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @RateLimit('sensitive-write')
  @ApiOperation({ summary: 'Follow someone (idempotent)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'PERSON_NOT_FOUND', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 409, description: 'CANNOT_FOLLOW_SELF', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async follow(@CurrentUser() actor: Actor, @Param() params: PersonIdParamDto): Promise<void> {
    await this.followPerson.execute(actor, params.personId, true);
  }

  @Delete(':personId/follow')
  @HttpCode(204)
  @ApiBearerAuth()
  @RequiresAuth()
  @ApiOperation({ summary: 'Unfollow someone (idempotent)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 409, description: 'CANNOT_FOLLOW_SELF', type: ErrorEnvelopeDto })
  async unfollow(@CurrentUser() actor: Actor, @Param() params: PersonIdParamDto): Promise<void> {
    await this.followPerson.execute(actor, params.personId, false);
  }
}
