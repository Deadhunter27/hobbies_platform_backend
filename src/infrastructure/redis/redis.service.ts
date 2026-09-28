import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { createClient } from '@redis/client';
import { APP_CONFIG, type AppConfig } from '@config/index';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: ReturnType<typeof createClient>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = createClient({
      url: config.redisUrl,
      keyPrefix: 'wayfinder:',
      socket: { connectTimeout: 5_000 },
    });

    // node-redis requires an error listener. Never log the connection URL:
    // production URLs can contain credentials.
    this.client.on('error', (error: Error) => {
      this.logger.error('Redis client error', error.stack ?? error.message);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    const response = await this.client.ping();
    if (response !== 'PONG') {
      throw new Error('Redis readiness handshake failed.');
    }
  }

  onApplicationShutdown(): void {
    if (this.client.isOpen) {
      this.client.destroy();
    }
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    return this.client.eval(script, { keys, arguments: args });
  }
}
