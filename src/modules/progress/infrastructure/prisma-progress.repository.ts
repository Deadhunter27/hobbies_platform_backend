import { Injectable } from '@nestjs/common';
import type { ProgressReflection as ProgressReflectionRecord } from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { ProgressRepository } from '../application';
import { ProgressReflection } from '../domain';

function toDomain(record: ProgressReflectionRecord): ProgressReflection {
  return ProgressReflection.reconstitute({
    id: record.id,
    userId: record.userId,
    hobbyId: record.hobbyId,
    activityId: record.activityId,
    rating: record.rating,
    tags: record.tags,
    note: record.note,
    occurredAt: record.occurredAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

@Injectable()
export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserActivity(userId: string, activityId: string): Promise<ProgressReflection | null> {
    const record = await this.prisma.progressReflection.findUnique({
      where: { userId_activityId: { userId, activityId } },
    });
    return record ? toDomain(record) : null;
  }

  async listByUserHobby(userId: string, hobbyId: string): Promise<ProgressReflection[]> {
    const records = await this.prisma.progressReflection.findMany({
      where: { userId, hobbyId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    return records.map(toDomain);
  }

  async save(reflection: ProgressReflection): Promise<ProgressReflection> {
    const record = await this.prisma.progressReflection.upsert({
      where: {
        userId_activityId: {
          userId: reflection.userId,
          activityId: reflection.activityId,
        },
      },
      create: {
        id: reflection.id,
        userId: reflection.userId,
        hobbyId: reflection.hobbyId,
        activityId: reflection.activityId,
        rating: reflection.rating,
        tags: reflection.tags,
        note: reflection.note,
        occurredAt: reflection.occurredAt,
        createdAt: reflection.createdAt,
        updatedAt: reflection.updatedAt,
      },
      update: {
        rating: reflection.rating,
        tags: reflection.tags,
        note: reflection.note,
        updatedAt: reflection.updatedAt,
      },
    });
    return toDomain(record);
  }
}
