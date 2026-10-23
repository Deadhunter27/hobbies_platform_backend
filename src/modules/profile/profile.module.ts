import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { CatalogModule } from '@modules/catalog';
import { MediaModule } from '@modules/media';
import { SettingsModule } from '@modules/settings';
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
  PublicProfileService,
  CreatorEligibilityService,
} from './application';
import { PrismaProfileRepository } from './infrastructure';
import { ProfileController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CatalogModule, MediaModule, SettingsModule],
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
    PublicProfileService,
    CreatorEligibilityService,
    { provide: PROFILE_REPOSITORY, useClass: PrismaProfileRepository },
  ],
  exports: [GetMyHobbyContextUseCase, PublicProfileService, CreatorEligibilityService],
})
export class ProfileModule {}
