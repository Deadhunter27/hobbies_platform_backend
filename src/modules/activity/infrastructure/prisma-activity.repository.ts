import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Activity as ActivityRecord,
  type ActivityCommitment as CommitmentRecord,
} from '@prisma/client';
import { PrismaService, prismaClientOf } from '@infra/database';
import type { TxContext } from '@shared/application';
import type {
  ActivityLifecycleRepository,
  ActivityRepository,
  ActivitySnapshot,
} from '../application';
import {
  Activity,
  ActivityCapacityFullError,
  ActivityCommitment,
  type ActivityCommitmentState,
  type ActivityEffortLevel,
  type ActivityStatus,
} from '../domain';

function toActivity(record: ActivityRecord): Activity {
  return Activity.reconstitute({
    id: record.id,
    hobbyId: record.hobbyId,
    title: record.title,
    description: record.description,
    activityType: record.activityType,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    timezone: record.timezone,
    placeName: record.placeName,
    addressLabel: record.addressLabel,
    latitude: record.latitude,
    longitude: record.longitude,
    hostName: record.hostName,
    hostType: record.hostType,
    hostReferenceId: record.hostReferenceId,
    communityReferenceId: record.communityReferenceId,
    effortLevel: record.effortLevel as ActivityEffortLevel,
    capacity: record.capacity,
    status: record.status as ActivityStatus,
    preparation: record.preparation,
    expectations: record.expectations,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function toCommitment(record: CommitmentRecord): ActivityCommitment {
  return ActivityCommitment.reconstitute({
    id: record.id,
    userId: record.userId,
    activityId: record.activityId,
    state: record.state as ActivityCommitmentState,
    committedAt: record.committedAt,
    cancelledAt: record.cancelledAt,
    missedAt: record.missedAt,
    completedAt: record.completedAt,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

@Injectable()
export class PrismaActivityRepository implements ActivityRepository, ActivityLifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(now: Date, hobbyId?: string): Promise<ActivitySnapshot[]> {
    const records = await this.prisma.activity.findMany({
      where: {
        status: 'published',
        startsAt: { gt: now },
        ...(hobbyId ? { hobbyId } : {}),
      },
      include: {
        _count: { select: { commitments: { where: { state: 'committed' } } } },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => ({
      activity: toActivity(record),
      committedCount: record._count.commitments,
    }));
  }

  async findVisibleById(activityId: string): Promise<ActivitySnapshot | null> {
    const record = await this.prisma.activity.findFirst({
      where: { id: activityId, status: { in: ['published', 'cancelled', 'completed'] } },
      include: {
        _count: { select: { commitments: { where: { state: 'committed' } } } },
      },
    });
    return record
      ? { activity: toActivity(record), committedCount: record._count.commitments }
      : null;
  }

  async findById(activityId: string, tx?: TxContext): Promise<Activity | null> {
    const record = await prismaClientOf(this.prisma, tx).activity.findUnique({
      where: { id: activityId },
    });
    return record ? toActivity(record) : null;
  }

  async listCommitments(userId: string): Promise<ActivityCommitment[]> {
    const records = await this.prisma.activityCommitment.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return records.map(toCommitment);
  }

  async findCommitment(userId: string, activityId: string): Promise<ActivityCommitment | null> {
    const record = await this.prisma.activityCommitment.findUnique({
      where: { userId_activityId: { userId, activityId } },
    });
    return record ? toCommitment(record) : null;
  }

  async saveCommitment(
    commitment: ActivityCommitment,
    activity: Activity,
  ): Promise<ActivityCommitment> {
    if (commitment.state !== 'committed' || activity.capacity === null) {
      return toCommitment(await this.upsert(commitment));
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const current = await tx.activityCommitment.findUnique({
              where: {
                userId_activityId: {
                  userId: commitment.userId,
                  activityId: commitment.activityId,
                },
              },
            });
            const count = await tx.activityCommitment.count({
              where: { activityId: commitment.activityId, state: 'committed' },
            });
            if (current?.state !== 'committed' && count >= activity.capacity!) {
              throw new ActivityCapacityFullError();
            }
            return toCommitment(
              await tx.activityCommitment.upsert({
                where: {
                  userId_activityId: {
                    userId: commitment.userId,
                    activityId: commitment.activityId,
                  },
                },
                create: this.createData(commitment),
                update: this.updateData(commitment),
              }),
            );
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (retryable && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error('Unreachable activity commitment retry state.');
  }

  async updateStatus(
    input: { id: string; status: ActivityStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Activity | null> {
    const client = prismaClientOf(this.prisma, tx);
    const existing = await client.activity.findUnique({ where: { id: input.id } });
    if (!existing) return null;
    const record = await client.activity.update({
      where: { id: input.id },
      data: { status: input.status, updatedAt: input.updatedAt },
    });
    return toActivity(record);
  }

  private upsert(commitment: ActivityCommitment): Promise<CommitmentRecord> {
    return this.prisma.activityCommitment.upsert({
      where: {
        userId_activityId: { userId: commitment.userId, activityId: commitment.activityId },
      },
      create: this.createData(commitment),
      update: this.updateData(commitment),
    });
  }

  private createData(commitment: ActivityCommitment) {
    return {
      id: commitment.id,
      userId: commitment.userId,
      activityId: commitment.activityId,
      state: commitment.state,
      committedAt: commitment.committedAt,
      cancelledAt: commitment.cancelledAt,
      missedAt: commitment.missedAt,
      completedAt: commitment.completedAt,
      note: commitment.note,
      createdAt: commitment.createdAt,
      updatedAt: commitment.updatedAt,
    };
  }

  private updateData(commitment: ActivityCommitment) {
    return {
      state: commitment.state,
      committedAt: commitment.committedAt,
      cancelledAt: commitment.cancelledAt,
      missedAt: commitment.missedAt,
      completedAt: commitment.completedAt,
      note: commitment.note,
      updatedAt: commitment.updatedAt,
    };
  }
}
