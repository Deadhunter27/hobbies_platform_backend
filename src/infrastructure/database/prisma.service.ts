import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { APP_CONFIG, type AppConfig } from '@config/index';

/**
 * The only place `@prisma/client` is imported at the kernel level (ADR-0004
 * — Prisma is an infrastructure detail). Deliberately does NOT eagerly
 * `$connect()` in `onModuleInit`: Prisma connects lazily on first query,
 * which lets the app construct (e.g. for OpenAPI generation) without a
 * reachable database. `/health/ready`'s own query is the real liveness
 * signal for "is Postgres actually up."
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({ datasourceUrl: config.databaseUrl });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
