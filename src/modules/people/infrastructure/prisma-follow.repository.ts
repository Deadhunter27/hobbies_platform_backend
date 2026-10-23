import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database';
import type { FollowEdge, FollowRepository } from '../application';

@Injectable()
export class PrismaFollowRepository implements FollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, followeeId: string): Promise<void> {
    await this.prisma.personFollow.upsert({
      where: { followerId_followeeId: { followerId, followeeId } },
      create: { followerId, followeeId },
      update: {},
    });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await this.prisma.personFollow.deleteMany({ where: { followerId, followeeId } });
  }

  async counts(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.prisma.personFollow.count({ where: { followeeId: userId } }),
      this.prisma.personFollow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  }

  async followedAmong(followerId: string, candidateIds: string[]): Promise<Set<string>> {
    if (candidateIds.length === 0) return new Set();
    const rows = await this.prisma.personFollow.findMany({
      where: { followerId, followeeId: { in: candidateIds } },
      select: { followeeId: true },
    });
    return new Set(rows.map((row) => row.followeeId));
  }

  async followeeIds(followerId: string): Promise<string[]> {
    const rows = await this.prisma.personFollow.findMany({
      where: { followerId },
      select: { followeeId: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    return rows.map((row) => row.followeeId);
  }

  async list(
    userId: string,
    direction: 'followers' | 'following',
    limit: number,
    cursor: { createdAt: Date; id: string } | null,
  ): Promise<FollowEdge[]> {
    const mine = direction === 'followers' ? { followeeId: userId } : { followerId: userId };
    const other = direction === 'followers' ? 'followerId' : 'followeeId';
    const rows = await this.prisma.personFollow.findMany({
      where: {
        ...mine,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, [other]: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { [other]: 'desc' }],
      take: limit,
    });
    return rows.map((row) => ({ userId: row[other], createdAt: row.createdAt }));
  }
}
