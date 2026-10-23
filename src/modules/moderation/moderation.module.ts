import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import { CommunityModule } from '@modules/community';
import { ConversationModule } from '@modules/conversation';
import { IdentityModule } from '@modules/identity';
import { SettingsModule } from '@modules/settings';
import {
  MODERATION_TARGETS,
  REPORT_REPOSITORY,
  ReportContentUseCase,
  ReviewReportsUseCase,
} from './application';
import { ModuleModerationTargets, PrismaReportRepository } from './infrastructure';
import { AdminReportsController, ReportsController } from './interface';

@Module({
  imports: [
    PrismaModule,
    AccessModule,
    ActivityModule,
    CommunityModule,
    ConversationModule,
    IdentityModule,
    SettingsModule,
  ],
  controllers: [ReportsController, AdminReportsController],
  providers: [
    ReportContentUseCase,
    ReviewReportsUseCase,
    { provide: REPORT_REPOSITORY, useClass: PrismaReportRepository },
    { provide: MODERATION_TARGETS, useClass: ModuleModerationTargets },
  ],
})
export class ModerationModule {}
