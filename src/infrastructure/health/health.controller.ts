import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@infra/database';
import { RedisService } from '@infra/redis';

/**
 * ADR-0014: unversioned, unauthenticated at the infra edge. Registered
 * outside the global `/api` prefix in main.ts so these routes stay exactly
 * `/health/live` and `/health/ready`.
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    // Process is up — deliberately no dependency checks (restart decisions).
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      async () => {
        try {
          await this.redis.ping();
          return { redis: { status: 'up' as const } };
        } catch (cause) {
          throw new HealthCheckError('Redis readiness check failed.', {
            redis: { status: 'down' as const },
          });
        }
      },
    ]);
  }
}
