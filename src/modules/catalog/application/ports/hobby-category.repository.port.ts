import type { HobbyCategory } from '../../domain';

export interface HobbyCategoryRepository {
  findAllOrdered(): Promise<HobbyCategory[]>;
  findBySlug(slug: string): Promise<HobbyCategory | null>;
}

export const HOBBY_CATEGORY_REPOSITORY = Symbol('HOBBY_CATEGORY_REPOSITORY');
