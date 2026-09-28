import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import {
  ListMyJourneyUseCase,
  PROGRESS_REPOSITORY,
  ProgressAuthorization,
  SaveMyProgressReflectionUseCase,
} from './application';
import { PrismaProgressRepository } from './infrastructure';
import { ProgressController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, ActivityModule],
  controllers: [ProgressController],
  providers: [
    ProgressAuthorization,
    SaveMyProgressReflectionUseCase,
    ListMyJourneyUseCase,
    { provide: PROGRESS_REPOSITORY, useClass: PrismaProgressRepository },
  ],
})
export class ProgressModule {}
