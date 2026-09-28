import { Injectable } from '@nestjs/common';
import type { CheckIn as CheckInRecord } from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { CheckInRepository } from '../application';
import type { CheckIn, CheckInKind } from '../domain';

function toDomain(record: CheckInRecord): CheckIn {
  return {
    id: record.id,
    userId: record.userId,
    activityId: record.activityId,
    kind: record.kind,
    status: record.status,
    availableAt: record.availableAt,
    actionedAt: record.actionedAt,
    dismissedAt: record.dismissedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@Injectable()
export class PrismaCheckInRepository implements CheckInRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserActivityKind(
    userId: string,
    activityId: string,
    kind: CheckInKind,
  ): Promise<CheckIn | null> {
    const record = await this.prisma.checkIn.findUnique({
      where: { userId_activityId_kind: { userId, activityId, kind } },
    });
    return record ? toDomain(record) : null;
  }

  async findByIdForUser(checkInId: string, userId: string): Promise<CheckIn | null> {
    const record = await this.prisma.checkIn.findFirst({ where: { id: checkInId, userId } });
    return record ? toDomain(record) : null;
  }

  async save(checkIn: CheckIn): Promise<CheckIn> {
    const record = await this.prisma.checkIn.upsert({
      where: { id: checkIn.id },
      create: {
        id: checkIn.id,
        userId: checkIn.userId,
        activityId: checkIn.activityId,
        kind: checkIn.kind,
        status: checkIn.status,
        availableAt: checkIn.availableAt,
        actionedAt: checkIn.actionedAt,
        dismissedAt: checkIn.dismissedAt,
        createdAt: checkIn.createdAt,
        updatedAt: checkIn.updatedAt,
      },
      update: {
        status: checkIn.status,
        availableAt: checkIn.availableAt,
        actionedAt: checkIn.actionedAt,
        dismissedAt: checkIn.dismissedAt,
        updatedAt: checkIn.updatedAt,
      },
    });
    return toDomain(record);
  }
}
