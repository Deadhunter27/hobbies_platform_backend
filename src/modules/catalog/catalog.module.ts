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
import { HobbiesController, HobbyCategoriesController } from './interface';

@Module({
  imports: [PrismaModule],
  controllers: [HobbyCategoriesController, HobbiesController],
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
