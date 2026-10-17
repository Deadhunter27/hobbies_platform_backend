import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { RateLimit } from '@infra/rate-limit';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import {
  GetMyHobbyContextUseCase,
  GetMyProfileContextUseCase,
  ListMyHobbyContextsUseCase,
  UpsertMyHobbyContextUseCase,
  UpsertMyProfileContextUseCase,
  GetMyProfileDetailsUseCase,
  UpdateMyProfileDetailsUseCase,
} from '../application';
import {
  HobbyContextListResponseDto,
  HobbyContextResponseDto,
  HobbyIdParamDto,
  ProfileContextResponseDto,
  UpsertHobbyContextDto,
  UpsertProfileContextDto,
  ProfileDetailsResponseDto,
  UpdateProfileDetailsDto,
} from './dto/profile.dto';
import {
  toHobbyContextResponse,
  toProfileContextResponse,
  toProfileDetailsResponse,
} from './presenters/profile.presenter';

@ApiTags('profile')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'me', version: '1' })
export class ProfileController {
  constructor(
    private readonly getProfile: GetMyProfileContextUseCase,
    private readonly upsertProfile: UpsertMyProfileContextUseCase,
    private readonly listHobbyContexts: ListMyHobbyContextsUseCase,
    private readonly getHobbyContext: GetMyHobbyContextUseCase,
    private readonly upsertHobbyContext: UpsertMyHobbyContextUseCase,
    private readonly getDetails: GetMyProfileDetailsUseCase,
    private readonly updateDetails: UpdateMyProfileDetailsUseCase,
  ) {}

  @Get('profile-details')
  @ApiOperation({ summary: 'Get the optional personal details the user chose to share' })
  @ApiOkResponse({ type: ProfileDetailsResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 403,
    description: 'USER_SUSPENDED or PROFILE_ACCESS_DENIED',
    type: ErrorEnvelopeDto,
  })
  async getProfileDetails(@CurrentUser() actor: Actor): Promise<ProfileDetailsResponseDto> {
    return toProfileDetailsResponse(await this.getDetails.execute(actor));
  }

  @Patch('profile-details')
  @RateLimit('sensitive-write')
  @ApiOperation({
    summary: 'Partially update optional personal details; omitted fields are unchanged',
  })
  @ApiOkResponse({ type: ProfileDetailsResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 403,
    description: 'USER_SUSPENDED or PROFILE_ACCESS_DENIED',
    type: ErrorEnvelopeDto,
  })
  @ApiResponse({ status: 409, description: 'HANDLE_TAKEN', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 429, description: 'RATE_LIMIT_EXCEEDED', type: ErrorEnvelopeDto })
  async patchProfileDetails(
    @CurrentUser() actor: Actor,
    @Body() body: UpdateProfileDetailsDto,
  ): Promise<ProfileDetailsResponseDto> {
    return toProfileDetailsResponse(await this.updateDetails.execute(actor, body));
  }

  @Get('profile-context')
  @ApiOperation({ summary: 'Get private Wayfinder profile context for the authenticated user' })
  @ApiOkResponse({ type: ProfileContextResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 403,
    description: 'USER_SUSPENDED or PROFILE_ACCESS_DENIED',
    type: ErrorEnvelopeDto,
  })
  async getProfileContext(@CurrentUser() actor: Actor): Promise<ProfileContextResponseDto> {
    return toProfileContextResponse(await this.getProfile.execute(actor));
  }

  @Put('profile-context')
  @ApiOperation({ summary: 'Create or replace private Wayfinder profile context' })
  @ApiOkResponse({ type: ProfileContextResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({
    status: 403,
    description: 'USER_SUSPENDED or PROFILE_ACCESS_DENIED',
    type: ErrorEnvelopeDto,
  })
  async putProfileContext(
    @CurrentUser() actor: Actor,
    @Body() body: UpsertProfileContextDto,
  ): Promise<ProfileContextResponseDto> {
    const context = await this.upsertProfile.execute(actor, body);
    return toProfileContextResponse(context);
  }

  @Get('hobby-contexts')
  @ApiOperation({ summary: 'List the authenticated user hobby contexts' })
  @ApiOkResponse({ type: HobbyContextListResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  async listContexts(@CurrentUser() actor: Actor): Promise<HobbyContextListResponseDto> {
    const contexts = await this.listHobbyContexts.execute(actor);
    return { data: contexts.map(toHobbyContextResponse) };
  }

  @Get('hobby-contexts/:hobbyId')
  @ApiOperation({ summary: 'Get the authenticated user context for one hobby' })
  @ApiOkResponse({ type: HobbyContextResponseDto })
  @ApiResponse({ status: 404, description: 'HOBBY_CONTEXT_NOT_FOUND', type: ErrorEnvelopeDto })
  async getContext(
    @CurrentUser() actor: Actor,
    @Param() params: HobbyIdParamDto,
  ): Promise<HobbyContextResponseDto> {
    return toHobbyContextResponse(await this.getHobbyContext.execute(actor, params.hobbyId));
  }

  @Put('hobby-contexts/:hobbyId')
  @ApiOperation({ summary: 'Create or replace the authenticated user context for an active hobby' })
  @ApiOkResponse({ type: HobbyContextResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  async putContext(
    @CurrentUser() actor: Actor,
    @Param() params: HobbyIdParamDto,
    @Body() body: UpsertHobbyContextDto,
  ): Promise<HobbyContextResponseDto> {
    return toHobbyContextResponse(
      await this.upsertHobbyContext.execute(actor, params.hobbyId, body),
    );
  }
}
