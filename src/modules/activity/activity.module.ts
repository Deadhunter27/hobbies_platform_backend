import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { CatalogModule } from '@modules/catalog';
import { CommunityModule } from '@modules/community';
import { ProfileModule } from '@modules/profile';
import {
  ACTIVITY_LIFECYCLE_REPOSITORY,
  ACTIVITY_REPOSITORY,
  ActivityAuthorization,
  GetActivityUseCase,
  GetMyActivityCommitmentUseCase,
  ListActivitiesUseCase,
  ListMyActivityCommitmentsUseCase,
  SetActivityStatusUseCase,
  UpsertMyActivityCommitmentUseCase,
  CreateEventUseCase,
  CancelEventUseCase,
} from './application';
import { PrismaActivityRepository } from './infrastructure';
import { ActivitiesController, MyActivityCommitmentsController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CatalogModule, CommunityModule, ProfileModule],
  controllers: [ActivitiesController, MyActivityCommitmentsController],
  providers: [
    ActivityAuthorization,
    ListActivitiesUseCase,
    GetActivityUseCase,
    ListMyActivityCommitmentsUseCase,
    GetMyActivityCommitmentUseCase,
    UpsertMyActivityCommitmentUseCase,
    SetActivityStatusUseCase,
    CreateEventUseCase,
    CancelEventUseCase,
    PrismaActivityRepository,
    { provide: ACTIVITY_REPOSITORY, useExisting: PrismaActivityRepository },
    { provide: ACTIVITY_LIFECYCLE_REPOSITORY, useExisting: PrismaActivityRepository },
  ],
  exports: [
    ListActivitiesUseCase,
    GetActivityUseCase,
    ListMyActivityCommitmentsUseCase,
    GetMyActivityCommitmentUseCase,
    UpsertMyActivityCommitmentUseCase,
    SetActivityStatusUseCase,
  ],
})
export class ActivityModule {}
