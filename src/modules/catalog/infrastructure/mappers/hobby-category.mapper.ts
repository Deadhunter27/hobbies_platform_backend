import type { CatalogHobbyCategory } from '@prisma/client';
import { HobbyCategory } from '../../domain';

export function toDomainHobbyCategory(record: CatalogHobbyCategory): HobbyCategory {
  return HobbyCategory.reconstitute({
    id: record.id,
    parentId: record.parentId,
    name: record.name,
    slug: record.slug,
    description: record.description,
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
