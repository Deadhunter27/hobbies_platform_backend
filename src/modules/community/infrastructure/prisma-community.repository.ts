import { Injectable } from '@nestjs/common';
import type {
  Community as CommunityRecord,
  CommunityMembership as CommunityMembershipRecord,
} from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { CommunityRepository, SaveCommunityMembershipInput } from '../application';
import type { Community, CommunityContext, CommunityMembership } from '../domain';

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
export class PrismaCommunityRepository implements CommunityRepository {
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
}
