import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import {
  CHECK_IN_REPOSITORY,
  CheckInAuthorization,
  ListMyCheckInsUseCase,
  UpdateMyCheckInUseCase,
} from './application';
import { PrismaCheckInRepository } from './infrastructure';
import { MyCheckInsController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, ActivityModule],
  controllers: [MyCheckInsController],
  providers: [
    CheckInAuthorization,
    ListMyCheckInsUseCase,
    UpdateMyCheckInUseCase,
    { provide: CHECK_IN_REPOSITORY, useClass: PrismaCheckInRepository },
  ],
})
export class CheckInModule {}
