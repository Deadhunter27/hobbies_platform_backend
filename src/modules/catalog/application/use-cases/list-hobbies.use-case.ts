import { Inject, Injectable } from '@nestjs/common';
import type { CursorPage, UseCase } from '@shared/application';
import { decodeCursor, encodeCursor } from '@shared/utils';
import type { Hobby, HobbyDifficulty } from '../../domain';
import {
  HOBBY_REPOSITORY,
  type HobbyRepository,
  type ListHobbiesFilter,
} from '../ports/hobby.repository.port';

export interface ListHobbiesInput {
  category?: string;
  difficulty?: HobbyDifficulty[];
  q?: string;
  limit: number;
  cursor?: string;
}

@Injectable()
export class ListHobbiesUseCase implements UseCase<ListHobbiesInput, CursorPage<Hobby>> {
  constructor(@Inject(HOBBY_REPOSITORY) private readonly repository: HobbyRepository) {}

  async execute(input: ListHobbiesInput): Promise<CursorPage<Hobby>> {
    const cursor = input.cursor ? decodeCursor(input.cursor) : undefined;

    const filter: ListHobbiesFilter = {
      categorySlug: input.category,
      difficulty: input.difficulty,
      q: input.q,
    };

    const result = await this.repository.list({
      filter,
      limit: input.limit,
      cursor: cursor ? { name: cursor.name, id: cursor.id } : undefined,
    });

    const last = result.items.at(-1);
    const nextCursor =
      result.hasMore && last ? encodeCursor({ name: last.name, id: last.id }) : null;

    return {
      data: result.items,
      page: {
        nextCursor,
        hasMore: result.hasMore,
      },
    };
  }
}
