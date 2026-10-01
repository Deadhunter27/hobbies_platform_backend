import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@config/index';
import { LoggerModule } from '@infra/logging';
import { ObservabilityModule } from '@infra/observability';
import { PrismaModule } from '@infra/database';
import { RedisModule } from '@infra/redis';
import { RateLimitGuard } from '@infra/rate-limit';
import { HealthModule } from '@infra/health';
import { AuditModule } from '@infra/audit';
import { AppExceptionFilter, AppZodValidationPipe } from '@infra/http';
import { AdminModule } from '@modules/admin';
import { CatalogModule } from '@modules/catalog';
import { AccessModule, AuthGuard } from '@modules/access';
import { IdentityModule } from '@modules/identity';
import { ProfileModule } from '@modules/profile';
import { ActivityModule } from '@modules/activity';
import { ActivityRecordModule } from '@modules/activity-record';
import { RecommendationModule } from '@modules/recommendation';
import { ProgressModule } from '@modules/progress';
import { CommunityModule } from '@modules/community';
import { CheckInModule } from '@modules/checkin';
import { ConversationModule } from '@modules/conversation';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    ObservabilityModule,
    PrismaModule,
    RedisModule,
    AuditModule,
    HealthModule,
    CatalogModule,
    AccessModule,
    IdentityModule,
    ProfileModule,
    ActivityModule,
    ActivityRecordModule,
    RecommendationModule,
    ProgressModule,
    CommunityModule,
    CheckInModule,
    ConversationModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_PIPE, useClass: AppZodValidationPipe },
    // Auth runs before rate limiting so protected mutations can key by actor
    // rather than putting every user behind one shared NAT/IP bucket.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
