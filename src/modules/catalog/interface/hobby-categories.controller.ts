import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListHobbyCategoriesUseCase } from '../application';
import { HobbyCategoriesResponseDto } from './dto/hobby-category.dto';
import { toHobbyCategoryResponse } from './presenters/hobby-category.presenter';

@ApiTags('hobby-categories')
@Controller({ path: 'hobby-categories', version: '1' })
export class HobbyCategoriesController {
  constructor(private readonly listHobbyCategories: ListHobbyCategoriesUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List active hobby categories, ordered' })
  @ApiOkResponse({ type: HobbyCategoriesResponseDto })
  async list(): Promise<HobbyCategoriesResponseDto> {
    const categories = await this.listHobbyCategories.execute();
    return { data: categories.map(toHobbyCategoryResponse) };
  }
}
