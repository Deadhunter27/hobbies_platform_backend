import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import {
  CreateHobbyCategoryUseCase,
  CreateHobbyUseCase,
  GetHobbyUseCase,
  HOBBY_CATEGORY_REPOSITORY,
  HOBBY_REPOSITORY,
  ListHobbiesUseCase,
  ListHobbyCategoriesUseCase,
  UpdateHobbyCategoryUseCase,
  UpdateHobbyUseCase,
} from './application';
import { PrismaHobbyCategoryRepository, PrismaHobbyRepository } from './infrastructure';
import { HobbiesController, HobbyCategoriesController } from './interface';

const catalogUseCases = [
  ListHobbyCategoriesUseCase,
  ListHobbiesUseCase,
  GetHobbyUseCase,
  CreateHobbyCategoryUseCase,
  UpdateHobbyCategoryUseCase,
  CreateHobbyUseCase,
  UpdateHobbyUseCase,
];

@Module({
  imports: [PrismaModule],
  controllers: [HobbyCategoriesController, HobbiesController],
  providers: [
    ...catalogUseCases,
    { provide: HOBBY_CATEGORY_REPOSITORY, useClass: PrismaHobbyCategoryRepository },
    { provide: HOBBY_REPOSITORY, useClass: PrismaHobbyRepository },
  ],
  exports: catalogUseCases,
})
export class CatalogModule {}
