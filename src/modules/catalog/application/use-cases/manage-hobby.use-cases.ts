import { Inject, Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { newId } from '@shared/utils';
import {
  Hobby,
  HobbyCategoryNotFoundError,
  HobbyNotFoundError,
  HobbySlugAlreadyExistsError,
  type HobbyCostLevel,
  type HobbyDifficulty,
  type HobbySetting,
  type HobbyStatus,
} from '../../domain';
import {
  HOBBY_CATEGORY_REPOSITORY,
  type HobbyCategoryRepository,
} from '../ports/hobby-category.repository.port';
import { HOBBY_REPOSITORY, type HobbyRepository } from '../ports/hobby.repository.port';

export interface CreateHobbyInput {
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: HobbyDifficulty;
  costLevel: HobbyCostLevel;
  setting: HobbySetting;
  status?: HobbyStatus;
}

export interface UpdateHobbyInput {
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: HobbyDifficulty;
  costLevel: HobbyCostLevel;
  setting: HobbySetting;
  status: HobbyStatus;
}

@Injectable()
export class CreateHobbyUseCase {
  constructor(
    @Inject(HOBBY_REPOSITORY) private readonly hobbies: HobbyRepository,
    @Inject(HOBBY_CATEGORY_REPOSITORY) private readonly categories: HobbyCategoryRepository,
  ) {}

  async execute(input: CreateHobbyInput, now = new Date(), tx?: TxContext): Promise<Hobby> {
    const hobby = Hobby.create({ id: newId(), ...input }, now);
    const category = await this.categories.findById(hobby.categoryId, tx);
    if (!category) throw new HobbyCategoryNotFoundError(hobby.categoryId);

    const conflicting = await this.hobbies.findAnyBySlug(hobby.slug, tx);
    if (conflicting) throw new HobbySlugAlreadyExistsError(hobby.slug);

    return this.hobbies.create(hobby, tx);
  }
}

@Injectable()
export class UpdateHobbyUseCase {
  constructor(
    @Inject(HOBBY_REPOSITORY) private readonly hobbies: HobbyRepository,
    @Inject(HOBBY_CATEGORY_REPOSITORY) private readonly categories: HobbyCategoryRepository,
  ) {}

  async execute(
    hobbyId: string,
    input: UpdateHobbyInput,
    now = new Date(),
    tx?: TxContext,
  ): Promise<Hobby> {
    const current = await this.hobbies.findAnyById(hobbyId, tx);
    if (!current) throw new HobbyNotFoundError(hobbyId);

    const hobby = current.update(input, now);
    const category = await this.categories.findById(hobby.categoryId, tx);
    if (!category) throw new HobbyCategoryNotFoundError(hobby.categoryId);

    const conflicting = await this.hobbies.findAnyBySlug(hobby.slug, tx);
    if (conflicting && conflicting.id !== hobbyId) {
      throw new HobbySlugAlreadyExistsError(hobby.slug);
    }

    return this.hobbies.update(hobby, tx);
  }
}
