import { Module } from '@nestjs/common';
import { ErrorTrackerService } from './error-tracker.service';

@Module({
  providers: [ErrorTrackerService],
  exports: [ErrorTrackerService],
})
export class ObservabilityModule {}
