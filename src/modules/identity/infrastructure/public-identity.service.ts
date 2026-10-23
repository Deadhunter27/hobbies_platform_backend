import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database';

export interface PublicIdentity {
  id: string;
  displayName: string;
}

/**
 * The only identity data other modules may read about someone else:
 * id and display name of ACTIVE accounts. Never email, role or status.
 */
@Injectable()
export class PublicIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  findActive(ids: string[]): Promise<PublicIdentity[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.identityUser.findMany({
      where: { id: { in: ids }, status: 'active' },
      select: { id: true, displayName: true },
    });
  }

  searchActive(query: string, limit: number): Promise<PublicIdentity[]> {
    return this.prisma.identityUser.findMany({
      where: { status: 'active', displayName: { contains: query, mode: 'insensitive' } },
      select: { id: true, displayName: true },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }
}
