import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@config/index';
import { LoggerModule } from '@infra/logging';
import { PrismaModule } from '@infra/database';
import { HealthModule } from '@infra/health';
import { AppExceptionFilter, AppZodValidationPipe } from '@infra/http';
import { CatalogModule } from '@modules/catalog';

@Module({
  imports: [ConfigModule, LoggerModule, PrismaModule, HealthModule, CatalogModule],
  providers: [
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_PIPE, useClass: AppZodValidationPipe },
  ],
})
export class AppModule {}
