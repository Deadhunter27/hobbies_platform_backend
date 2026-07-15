import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database';
import type { GrantsRepository } from '../application/ports/grants.repository.port';

@Injectable()
export class PrismaGrantsRepository implements GrantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRole(userId: string, resourceType: string, resourceId: string): Promise<string | null> {
    const record = await this.prisma.accessResourceRole.findUnique({
      where: { userId_resourceType_resourceId: { userId, resourceType, resourceId } },
      select: { role: true },
    });
    return record?.role ?? null;
  }
}
