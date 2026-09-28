import type { TxContext } from '@shared/application';
import type { HobbyCategory } from '../../domain';

export interface HobbyCategoryRepository {
  findAllOrdered(tx?: TxContext): Promise<HobbyCategory[]>;
  findBySlug(slug: string, tx?: TxContext): Promise<HobbyCategory | null>;
  findById(id: string, tx?: TxContext): Promise<HobbyCategory | null>;
  create(category: HobbyCategory, tx?: TxContext): Promise<HobbyCategory>;
  update(category: HobbyCategory, tx?: TxContext): Promise<HobbyCategory>;
}

export const HOBBY_CATEGORY_REPOSITORY = Symbol('HOBBY_CATEGORY_REPOSITORY');
