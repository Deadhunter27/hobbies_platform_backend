import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@config/index';
import { LoggerModule } from '@infra/logging';
import { PrismaModule } from '@infra/database';
import { RateLimitModule } from '@infra/rate-limit';
import { HealthModule } from '@infra/health';
import { AuditModule } from '@infra/audit';
import { AppExceptionFilter, AppZodValidationPipe } from '@infra/http';
import { AdminModule } from '@modules/admin';
import { CatalogModule } from '@modules/catalog';
import { AccessModule, AuthGuard } from '@modules/access';
import { IdentityModule } from '@modules/identity';
import { ProfileModule } from '@modules/profile';
import { ActivityModule } from '@modules/activity';
import { RecommendationModule } from '@modules/recommendation';
import { ProgressModule } from '@modules/progress';
import { CommunityModule } from '@modules/community';
import { CheckInModule } from '@modules/checkin';
import { ConversationModule } from '@modules/conversation';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    RateLimitModule,
    AuditModule,
    HealthModule,
    CatalogModule,
    AccessModule,
    IdentityModule,
    ProfileModule,
    ActivityModule,
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
    // Composition root binds the guard globally; routes opt in via
    // @RequiresAuth() (ADR-0018). Its TokenVerifier/ActorDirectory deps
    // are exported by IdentityModule.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
