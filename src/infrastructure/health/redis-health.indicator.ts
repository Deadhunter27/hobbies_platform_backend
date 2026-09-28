import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '@infra/redis';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicator: HealthIndicatorService,
    private readonly redis: RedisService,
  ) {}

  check() {
    return this.healthIndicator
      .check('redis')
      .attempt(async () => {
        const response = await this.redis.ping();
        if (response !== 'PONG') {
          throw new Error('Redis ping failed.');
        }
      })
      .withTimeout(2_000);
  }
}
