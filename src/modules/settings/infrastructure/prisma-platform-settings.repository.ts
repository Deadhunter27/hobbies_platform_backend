import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { PlatformSettingsRepository } from '../application';

@Injectable()
export class PrismaPlatformSettingsRepository implements PlatformSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Array<{ key: string; value: unknown }>> {
    return this.prisma.platformSetting.findMany({ select: { key: true, value: true } });
  }

  async upsert(key: string, value: unknown, updatedBy: string | null): Promise<void> {
    const json = value as Prisma.InputJsonValue;
    await this.prisma.platformSetting.upsert({
      where: { key },
      create: { key, value: json, updatedBy },
      update: { value: json, updatedBy },
    });
  }
}
