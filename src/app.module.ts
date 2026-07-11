import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@config/index';
import { LoggerModule } from '@infra/logging';
import { PrismaModule } from '@infra/database';
import { HealthModule } from '@infra/health';
import { AppExceptionFilter } from '@infra/http';

@Module({
  imports: [ConfigModule, LoggerModule, PrismaModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: AppExceptionFilter }],
})
export class AppModule {}
