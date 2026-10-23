import { Injectable } from '@nestjs/common';
import type {
  Community as CommunityRecord,
  CommunityMembership as CommunityMembershipRecord,
} from '@prisma/client';
import { PrismaService, prismaClientOf } from '@infra/database';
import type { TxContext } from '@shared/application';
import type {
  CommunityLifecycleRepository,
  CommunityRepository,
  SaveCommunityMembershipInput,
} from '../application';
import type {
  Community,
  CommunityContext,
  CommunityMembership,
  CommunityStatus,
  CommunitySummary,
} from '../domain';

function toCommunity(record: CommunityRecord): Community {
  return {
    id: record.id,
    hobbyId: record.hobbyId,
    name: record.name,
    slug: record.slug,
    description: record.description,
    city: record.city,
    countryCode: record.countryCode,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toMembership(record: CommunityMembershipRecord): CommunityMembership {
  return {
    id: record.id,
    communityId: record.communityId,
    userId: record.userId,
    displayNameSnapshot: record.displayNameSnapshot,
    role: record.role,
    state: record.state,
    joinedAt: record.joinedAt,
    leftAt: record.leftAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@Injectable()
export class PrismaCommunityRepository
  implements CommunityRepository, CommunityLifecycleRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedBySlugOrId(reference: string): Promise<Community | null> {
    const record = await this.prisma.community.findFirst({
      where: {
        status: 'published',
        OR: [{ id: reference }, { slug: reference }],
      },
    });
    return record ? toCommunity(record) : null;
  }

  async findById(id: string, tx?: TxContext): Promise<Community | null> {
    const record = await prismaClientOf(this.prisma, tx).community.findUnique({ where: { id } });
    return record ? toCommunity(record) : null;
  }

  async getContext(communityId: string): Promise<CommunityContext | null> {
    const record = await this.prisma.community.findFirst({
      where: { id: communityId, status: 'published' },
      include: {
        memberships: {
          where: { state: 'active' },
          orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!record) return null;

    const memberships = record.memberships.map(toMembership);
    return {
      community: toCommunity(record),
      people: {
        memberCount: memberships.length,
        hosts: memberships.filter(
          (membership) => membership.role === 'host' || membership.role === 'organizer',
        ),
        membersPreview: memberships.slice(0, 12),
      },
    };
  }

  async findMembership(userId: string, communityId: string): Promise<CommunityMembership | null> {
    const record = await this.prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    return record ? toMembership(record) : null;
  }

  async listMembershipsByUser(userId: string): Promise<CommunityMembership[]> {
    const records = await this.prisma.communityMembership.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return records.map(toMembership);
  }

  async saveMembership(input: SaveCommunityMembershipInput): Promise<CommunityMembership> {
    const record = await this.prisma.communityMembership.upsert({
      where: {
        communityId_userId: {
          communityId: input.communityId,
          userId: input.userId,
        },
      },
      create: input,
      update: {
        displayNameSnapshot: input.displayNameSnapshot,
        role: input.role,
        state: input.state,
        joinedAt: input.joinedAt,
        leftAt: input.leftAt,
        updatedAt: input.updatedAt,
      },
    });
    return toMembership(record);
  }

  async createWithOrganizer(
    community: Community,
    organizer: SaveCommunityMembershipInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.community.create({
        data: {
          id: community.id,
          hobbyId: community.hobbyId,
          name: community.name,
          slug: community.slug,
          description: community.description,
          city: community.city,
          countryCode: community.countryCode,
          status: community.status,
          createdAt: community.createdAt,
          updatedAt: community.updatedAt,
        },
      });
      await tx.communityMembership.create({ data: organizer });
    });
  }

  async listPublished(input: {
    hobbyId: string | null;
    query: string | null;
    limit: number;
    cursor: { name: string; id: string } | null;
  }): Promise<CommunitySummary[]> {
    const records = await this.prisma.community.findMany({
      where: {
        status: 'published',
        ...(input.hobbyId ? { hobbyId: input.hobbyId } : {}),
        ...(input.query
          ? {
              OR: [
                { name: { contains: input.query, mode: 'insensitive' } },
                { city: { contains: input.query, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(input.cursor
          ? {
              AND: [
                {
                  OR: [
                    { name: { gt: input.cursor.name } },
                    { name: input.cursor.name, id: { gt: input.cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: input.limit,
      include: { _count: { select: { memberships: { where: { state: 'active' } } } } },
    });
    return records.map((record) => ({
      community: toCommunity(record),
      memberCount: record._count.memberships,
    }));
  }

  async updateStatus(
    input: { id: string; status: CommunityStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Community | null> {
    const client = prismaClientOf(this.prisma, tx);
    const existing = await client.community.findUnique({ where: { id: input.id } });
    if (!existing) return null;
    const record = await client.community.update({
      where: { id: input.id },
      data: { status: input.status, updatedAt: input.updatedAt },
    });
    return toCommunity(record);
  }
}
