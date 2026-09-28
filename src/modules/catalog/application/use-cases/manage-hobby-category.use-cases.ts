import { Inject, Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { newId } from '@shared/utils';
import {
  HobbyCategory,
  HobbyCategoryHierarchyError,
  HobbyCategoryNotFoundError,
  HobbyCategorySlugAlreadyExistsError,
} from '../../domain';
import {
  HOBBY_CATEGORY_REPOSITORY,
  type HobbyCategoryRepository,
} from '../ports/hobby-category.repository.port';

export interface CreateHobbyCategoryInput {
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

export type UpdateHobbyCategoryInput = CreateHobbyCategoryInput;

async function assertValidParent(
  repository: HobbyCategoryRepository,
  categoryId: string | null,
  parentId: string | null,
  tx?: TxContext,
): Promise<void> {
  if (!parentId) return;

  const visited = new Set<string>();
  let cursor: string | null = parentId;

  while (cursor) {
    if (categoryId && cursor === categoryId) {
      throw new HobbyCategoryHierarchyError();
    }
    if (visited.has(cursor)) {
      throw new HobbyCategoryHierarchyError(
        'The hobby category hierarchy already contains a cycle.',
      );
    }
    visited.add(cursor);

    const category = await repository.findById(cursor, tx);
    if (!category) throw new HobbyCategoryNotFoundError(cursor);
    cursor = category.parentId;
  }
}

@Injectable()
export class CreateHobbyCategoryUseCase {
  constructor(
    @Inject(HOBBY_CATEGORY_REPOSITORY) private readonly repository: HobbyCategoryRepository,
  ) {}

  async execute(
    input: CreateHobbyCategoryInput,
    now = new Date(),
    tx?: TxContext,
  ): Promise<HobbyCategory> {
    const category = HobbyCategory.create({ id: newId(), ...input }, now);
    const conflicting = await this.repository.findBySlug(category.slug, tx);
    if (conflicting) throw new HobbyCategorySlugAlreadyExistsError(category.slug);

    await assertValidParent(this.repository, null, category.parentId, tx);
    return this.repository.create(category, tx);
  }
}

@Injectable()
export class UpdateHobbyCategoryUseCase {
  constructor(
    @Inject(HOBBY_CATEGORY_REPOSITORY) private readonly repository: HobbyCategoryRepository,
  ) {}

  async execute(
    categoryId: string,
    input: UpdateHobbyCategoryInput,
    now = new Date(),
    tx?: TxContext,
  ): Promise<HobbyCategory> {
    const current = await this.repository.findById(categoryId, tx);
    if (!current) throw new HobbyCategoryNotFoundError(categoryId);

    const category = current.update(input, now);
    const conflicting = await this.repository.findBySlug(category.slug, tx);
    if (conflicting && conflicting.id !== categoryId) {
      throw new HobbyCategorySlugAlreadyExistsError(category.slug);
    }

    await assertValidParent(this.repository, categoryId, category.parentId, tx);
    return this.repository.update(category, tx);
  }
}
