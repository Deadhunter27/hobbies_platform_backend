import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { CatalogModule } from '@modules/catalog';
import { ProfileModule } from '@modules/profile';
import {
  COMMUNITY_LIFECYCLE_REPOSITORY,
  COMMUNITY_REPOSITORY,
  CommunityAuthorization,
  GetCommunityContextUseCase,
  GetCommunityUseCase,
  ListMyCommunityMembershipsUseCase,
  ResolveCommunityContextUseCase,
  SetCommunityStatusUseCase,
  UpsertMyCommunityMembershipUseCase,
  CreateCommunityUseCase,
  ListCommunitiesUseCase,
  GetCommunityRoleUseCase,
} from './application';
import { PrismaCommunityRepository } from './infrastructure';
import { CommunitiesController, MyCommunityMembershipsController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CatalogModule, ProfileModule],
  controllers: [CommunitiesController, MyCommunityMembershipsController],
  providers: [
    CommunityAuthorization,
    GetCommunityUseCase,
    GetCommunityContextUseCase,
    ResolveCommunityContextUseCase,
    ListMyCommunityMembershipsUseCase,
    UpsertMyCommunityMembershipUseCase,
    SetCommunityStatusUseCase,
    CreateCommunityUseCase,
    ListCommunitiesUseCase,
    GetCommunityRoleUseCase,
    PrismaCommunityRepository,
    { provide: COMMUNITY_REPOSITORY, useExisting: PrismaCommunityRepository },
    { provide: COMMUNITY_LIFECYCLE_REPOSITORY, useExisting: PrismaCommunityRepository },
  ],
  exports: [
    GetCommunityUseCase,
    GetCommunityContextUseCase,
    ResolveCommunityContextUseCase,
    SetCommunityStatusUseCase,
    GetCommunityRoleUseCase,
  ],
})
export class CommunityModule {}
