import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { CommunityModule } from '@modules/community';
import {
  ACTIVITY_REPOSITORY,
  ActivityAuthorization,
  GetActivityUseCase,
  GetMyActivityCommitmentUseCase,
  ListActivitiesUseCase,
  ListMyActivityCommitmentsUseCase,
  SetActivityStatusUseCase,
  UpsertMyActivityCommitmentUseCase,
} from './application';
import { PrismaActivityRepository } from './infrastructure';
import { ActivitiesController, MyActivityCommitmentsController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, CommunityModule],
  controllers: [ActivitiesController, MyActivityCommitmentsController],
  providers: [
    ActivityAuthorization,
    ListActivitiesUseCase,
    GetActivityUseCase,
    ListMyActivityCommitmentsUseCase,
    GetMyActivityCommitmentUseCase,
    UpsertMyActivityCommitmentUseCase,
    SetActivityStatusUseCase,
    { provide: ACTIVITY_REPOSITORY, useClass: PrismaActivityRepository },
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
