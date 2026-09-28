import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '@infra/http';
import { CurrentUser, RequiresAuth, type Actor } from '@modules/access';
import type { Hobby, HobbyCategory } from '@modules/catalog/domain';
import { ManageCatalogUseCase } from '../application';
import {
  AdminCategoryIdParamDto,
  AdminCategoryMutationDto,
  AdminCategoryResponseDto,
  AdminCreateHobbyDto,
  AdminHobbyIdParamDto,
  AdminHobbyResponseDto,
  AdminUpdateHobbyDto,
} from './dto/admin-catalog.dto';

function categoryResponse(category: HobbyCategory): AdminCategoryResponseDto {
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function hobbyResponse(hobby: Hobby): AdminHobbyResponseDto {
  return {
    id: hobby.id,
    categoryId: hobby.categoryId,
    name: hobby.name,
    slug: hobby.slug,
    description: hobby.description,
    difficulty: hobby.difficulty,
    costLevel: hobby.costLevel,
    setting: hobby.setting,
    status: hobby.status,
    createdAt: hobby.createdAt.toISOString(),
    updatedAt: hobby.updatedAt.toISOString(),
  };
}

@ApiTags('admin')
@ApiBearerAuth()
@RequiresAuth()
@Controller({ path: 'admin/catalog', version: '1' })
export class AdminCatalogController {
  constructor(private readonly manageCatalog: ManageCatalogUseCase) {}

  @Post('categories')
  @ApiOperation({ summary: 'Create a hobby category through Catalog-owned staff tooling' })
  @ApiCreatedResponse({ type: AdminCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  async createCategory(
    @CurrentUser() actor: Actor,
    @Body() body: AdminCategoryMutationDto,
  ): Promise<AdminCategoryResponseDto> {
    return categoryResponse(await this.manageCatalog.createHobbyCategory(actor, body));
  }

  @Put('categories/:categoryId')
  @ApiOperation({ summary: 'Update a hobby category through Catalog-owned staff tooling' })
  @ApiOkResponse({ type: AdminCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'HOBBY_CATEGORY_NOT_FOUND', type: ErrorEnvelopeDto })
  async updateCategory(
    @CurrentUser() actor: Actor,
    @Param() params: AdminCategoryIdParamDto,
    @Body() body: AdminCategoryMutationDto,
  ): Promise<AdminCategoryResponseDto> {
    return categoryResponse(
      await this.manageCatalog.updateHobbyCategory(actor, params.categoryId, body),
    );
  }

  @Post('hobbies')
  @ApiOperation({ summary: 'Create a hobby through Catalog-owned staff tooling' })
  @ApiCreatedResponse({ type: AdminHobbyResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  async createHobby(
    @CurrentUser() actor: Actor,
    @Body() body: AdminCreateHobbyDto,
  ): Promise<AdminHobbyResponseDto> {
    return hobbyResponse(await this.manageCatalog.createCatalogHobby(actor, body));
  }

  @Put('hobbies/:hobbyId')
  @ApiOperation({ summary: 'Update a hobby through Catalog-owned staff tooling' })
  @ApiOkResponse({ type: AdminHobbyResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 403, description: 'ADMIN_ACCESS_DENIED', type: ErrorEnvelopeDto })
  @ApiResponse({ status: 404, description: 'HOBBY_NOT_FOUND', type: ErrorEnvelopeDto })
  async updateHobby(
    @CurrentUser() actor: Actor,
    @Param() params: AdminHobbyIdParamDto,
    @Body() body: AdminUpdateHobbyDto,
  ): Promise<AdminHobbyResponseDto> {
    return hobbyResponse(await this.manageCatalog.updateCatalogHobby(actor, params.hobbyId, body));
  }
}
