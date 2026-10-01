import { Module } from '@nestjs/common';
import { ActivityRecordService } from './application/activity-record.service';
import { StravaIntegrationService } from './application/strava-integration.service';
import { ActivityRecordController } from './interface/activity-record.controller';
import { MyStravaController, StravaPublicController } from './interface/strava.controller';

@Module({
  controllers: [ActivityRecordController, MyStravaController, StravaPublicController],
  providers: [ActivityRecordService, StravaIntegrationService],
  exports: [ActivityRecordService],
})
export class ActivityRecordModule {}
