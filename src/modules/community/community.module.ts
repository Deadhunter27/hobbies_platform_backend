import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import {
  COMMUNITY_REPOSITORY,
  CommunityAuthorization,
  GetCommunityContextUseCase,
  GetCommunityUseCase,
  ListMyCommunityMembershipsUseCase,
  ResolveCommunityContextUseCase,
  UpsertMyCommunityMembershipUseCase,
} from './application';
import { PrismaCommunityRepository } from './infrastructure';
import { CommunitiesController, MyCommunityMembershipsController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule],
  controllers: [CommunitiesController, MyCommunityMembershipsController],
  providers: [
    CommunityAuthorization,
    GetCommunityUseCase,
    GetCommunityContextUseCase,
    ResolveCommunityContextUseCase,
    ListMyCommunityMembershipsUseCase,
    UpsertMyCommunityMembershipUseCase,
    { provide: COMMUNITY_REPOSITORY, useClass: PrismaCommunityRepository },
  ],
  exports: [GetCommunityUseCase, GetCommunityContextUseCase, ResolveCommunityContextUseCase],
})
export class CommunityModule {}
