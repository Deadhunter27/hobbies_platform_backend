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
  list(query: ListHobbiesQuery): Promise<ListHobbiesResult>;
  findBySlugOrId(slugOrId: string): Promise<Hobby | null>;
}

export const HOBBY_REPOSITORY = Symbol('HOBBY_REPOSITORY');
