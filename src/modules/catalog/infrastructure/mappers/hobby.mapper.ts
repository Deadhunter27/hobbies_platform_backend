import type { CatalogHobby } from '@prisma/client';
import { Hobby } from '../../domain';

export function toDomainHobby(record: CatalogHobby): Hobby {
  return Hobby.reconstitute({
    id: record.id,
    categoryId: record.categoryId,
    name: record.name,
    slug: record.slug,
    description: record.description,
    difficulty: record.difficulty,
    costLevel: record.costLevel,
    setting: record.setting,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
