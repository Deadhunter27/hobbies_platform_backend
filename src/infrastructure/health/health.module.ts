import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '@infra/database';
import { RedisModule } from '@infra/redis';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, PrismaModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
