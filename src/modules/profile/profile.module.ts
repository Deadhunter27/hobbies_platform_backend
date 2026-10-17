import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { CatalogModule } from '@modules/catalog';
import { MediaModule } from '@modules/media';
import {
  GetMyHobbyContextUseCase,
  GetMyProfileContextUseCase,
  ListMyHobbyContextsUseCase,
  PROFILE_REPOSITORY,
  ProfileAuthorization,
  UpsertMyHobbyContextUseCase,
  UpsertMyProfileContextUseCase,
  GetMyProfileDetailsUseCase,
  UpdateMyProfileDetailsUseCase,
  ProfileAvatarUrlResolver,
} from './application';
import { PrismaProfileRepository } from './infrastructure';
import { ProfileController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CatalogModule, MediaModule],
  controllers: [ProfileController],
  providers: [
    ProfileAuthorization,
    GetMyProfileContextUseCase,
    UpsertMyProfileContextUseCase,
    ListMyHobbyContextsUseCase,
    GetMyHobbyContextUseCase,
    UpsertMyHobbyContextUseCase,
    GetMyProfileDetailsUseCase,
    UpdateMyProfileDetailsUseCase,
    ProfileAvatarUrlResolver,
    { provide: PROFILE_REPOSITORY, useClass: PrismaProfileRepository },
  ],
  exports: [GetMyHobbyContextUseCase],
})
export class ProfileModule {}
