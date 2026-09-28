import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '@infra/redis';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redis: RedisService,
    private readonly indicators: HealthIndicatorService,
  ) {}

  async isHealthy() {
    const indicator = this.indicators.check('redis');

    try {
      await this.redis.ping();
      return indicator.up();
    } catch {
      return indicator.down({ reason: 'unavailable' });
    }
  }
}
