import type { HobbyCategory } from '../../domain';
import type { HobbyCategoryResponseDto } from '../dto/hobby-category.dto';

export function toHobbyCategoryResponse(category: HobbyCategory): HobbyCategoryResponseDto {
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
