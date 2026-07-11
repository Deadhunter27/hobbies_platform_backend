import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '@shared/application';
import type { HobbyCategory } from '../../domain';
import {
  HOBBY_CATEGORY_REPOSITORY,
  type HobbyCategoryRepository,
} from '../ports/hobby-category.repository.port';

@Injectable()
export class ListHobbyCategoriesUseCase implements UseCase<void, HobbyCategory[]> {
  constructor(
    @Inject(HOBBY_CATEGORY_REPOSITORY) private readonly repository: HobbyCategoryRepository,
  ) {}

  async execute(): Promise<HobbyCategory[]> {
    return this.repository.findAllOrdered();
  }
}
