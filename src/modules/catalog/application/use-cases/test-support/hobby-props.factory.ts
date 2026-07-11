import { newId } from '@shared/utils';
import type { HobbyCategoryProps, HobbyProps } from '../../../domain';

export function makeHobbyProps(overrides: Partial<HobbyProps> = {}): HobbyProps {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: newId(),
    categoryId: 'category-1',
    name: 'Hobby',
    slug: 'hobby',
    description: null,
    difficulty: 'beginner_friendly',
    costLevel: 'free',
    setting: 'outdoor',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeCategoryProps(overrides: Partial<HobbyCategoryProps> = {}): HobbyCategoryProps {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: newId(),
    parentId: null,
    name: 'Category',
    slug: 'category',
    description: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
