import type { Hobby } from '../../domain';
import type { HobbyResponseDto } from '../dto/hobby.dto';

export function toHobbyResponse(hobby: Hobby): HobbyResponseDto {
  return {
    id: hobby.id,
    categoryId: hobby.categoryId,
    name: hobby.name,
    slug: hobby.slug,
    description: hobby.description,
    difficulty: hobby.difficulty,
    costLevel: hobby.costLevel,
    setting: hobby.setting,
    createdAt: hobby.createdAt.toISOString(),
    updatedAt: hobby.updatedAt.toISOString(),
  };
}
