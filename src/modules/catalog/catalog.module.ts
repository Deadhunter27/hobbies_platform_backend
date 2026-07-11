import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import {
  GetHobbyUseCase,
  HOBBY_CATEGORY_REPOSITORY,
  HOBBY_REPOSITORY,
  ListHobbiesUseCase,
  ListHobbyCategoriesUseCase,
} from './application';
import { PrismaHobbyCategoryRepository, PrismaHobbyRepository } from './infrastructure';

@Module({
  imports: [PrismaModule],
  providers: [
    ListHobbyCategoriesUseCase,
    ListHobbiesUseCase,
    GetHobbyUseCase,
    { provide: HOBBY_CATEGORY_REPOSITORY, useClass: PrismaHobbyCategoryRepository },
    { provide: HOBBY_REPOSITORY, useClass: PrismaHobbyRepository },
  ],
  exports: [ListHobbyCategoriesUseCase, ListHobbiesUseCase, GetHobbyUseCase],
})
export class CatalogModule {}
