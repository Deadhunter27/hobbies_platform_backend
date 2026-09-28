import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '@infra/database';
import { RedisHealthIndicator } from './redis-health.indicator';

/**
 * ADR-0014: unversioned, unauthenticated at the infra edge. Registered
 * outside the global `/api` prefix in main.ts so these routes stay exactly
 * `/health/live` and `/health/ready`.
 *
 * The global rate-limit guard intentionally bypasses `/health/*`: liveness
 * must not depend on Redis, while readiness reports Redis health directly.
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redisIndicator: RedisHealthIndicator,
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
      () => this.redisIndicator.isHealthy(),
    ]);
  }
}
