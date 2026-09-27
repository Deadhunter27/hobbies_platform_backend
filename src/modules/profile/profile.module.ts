import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { CatalogModule } from '@modules/catalog';
import {
  GetMyHobbyContextUseCase,
  GetMyProfileContextUseCase,
  ListMyHobbyContextsUseCase,
  PROFILE_REPOSITORY,
  ProfileAuthorization,
  UpsertMyHobbyContextUseCase,
  UpsertMyProfileContextUseCase,
} from './application';
import { PrismaProfileRepository } from './infrastructure';
import { ProfileController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CatalogModule],
  controllers: [ProfileController],
  providers: [
    ProfileAuthorization,
    GetMyProfileContextUseCase,
    UpsertMyProfileContextUseCase,
    ListMyHobbyContextsUseCase,
    GetMyHobbyContextUseCase,
    UpsertMyHobbyContextUseCase,
    { provide: PROFILE_REPOSITORY, useClass: PrismaProfileRepository },
  ],
})
export class ProfileModule {}
