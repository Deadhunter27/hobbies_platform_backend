import type { TxContext } from '@shared/application';
import type { Hobby, HobbyDifficulty } from '../../domain';

export interface ListHobbiesFilter {
  categorySlug?: string;
  difficulty?: HobbyDifficulty[];
  q?: string;
}

export interface HobbyCursor {
  name: string;
  id: string;
}

export interface ListHobbiesQuery {
  filter: ListHobbiesFilter;
  limit: number;
  cursor?: HobbyCursor;
}

export interface ListHobbiesResult {
  items: Hobby[];
  hasMore: boolean;
}

export interface HobbyRepository {
  list(query: ListHobbiesQuery, tx?: TxContext): Promise<ListHobbiesResult>;
  findBySlugOrId(slugOrId: string, tx?: TxContext): Promise<Hobby | null>;
  findAnyById(id: string, tx?: TxContext): Promise<Hobby | null>;
  findAnyBySlug(slug: string, tx?: TxContext): Promise<Hobby | null>;
  create(hobby: Hobby, tx?: TxContext): Promise<Hobby>;
  update(hobby: Hobby, tx?: TxContext): Promise<Hobby>;
}

export const HOBBY_REPOSITORY = Symbol('HOBBY_REPOSITORY');
