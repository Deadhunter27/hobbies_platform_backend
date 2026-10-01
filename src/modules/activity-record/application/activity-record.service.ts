import { Injectable } from '@nestjs/common';
import type { ActivityRecord as ActivityRecordRow } from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { Actor } from '@modules/access';
import { NotFoundError } from '@shared/errors';
import { newId } from '@shared/utils/id';
import type {
  CreateActivityRecordDto,
  UpdateActivityRecordDto,
} from '../interface/activity-record.dto';

export type ActivityRecordSource = 'manual' | 'strava' | 'share';
export type ActivityRecordVisibility = 'private' | 'followers' | 'public';

export interface ActivityRecordView {
  id: string;
  hobbyId: string;
  opportunityId: string | null;
  sportType: string;
  title: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  notes: string | null;
  source: ActivityRecordSource;
  sourceReferenceId: string | null;
  externalUrl: string | null;
  visibility: ActivityRecordVisibility;
  createdAt: Date;
  updatedAt: Date;
}

function toView(row: ActivityRecordRow): ActivityRecordView {
  return {
    id: row.id,
    hobbyId: row.hobbyId,
    opportunityId: row.opportunityId,
    sportType: row.sportType,
    title: row.title,
    startedAt: row.startedAt,
    durationSeconds: row.durationSeconds,
    distanceMeters: row.distanceMeters,
    notes: row.notes,
    source: row.source as ActivityRecordSource,
    sourceReferenceId: row.sourceReferenceId,
    externalUrl: row.externalUrl,
    visibility: row.visibility as ActivityRecordVisibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class ActivityRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(actor: Actor): Promise<ActivityRecordView[]> {
    const rows = await this.prisma.activityRecord.findMany({
      where: { userId: actor.id },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map(toView);
  }

  async getMine(actor: Actor, recordId: string): Promise<ActivityRecordView> {
    const row = await this.prisma.activityRecord.findFirst({
      where: { id: recordId, userId: actor.id },
    });
    if (!row) {
      throw new NotFoundError(
        'Activity record not found.',
        [{ recordId }],
        'ACTIVITY_RECORD_NOT_FOUND',
      );
    }
    return toView(row);
  }

  async createManual(actor: Actor, input: CreateActivityRecordDto): Promise<ActivityRecordView> {
    const row = await this.prisma.activityRecord.create({
      data: {
        id: newId(),
        userId: actor.id,
        hobbyId: input.hobbyId,
        opportunityId: input.opportunityId ?? null,
        sportType: input.sportType,
        title: input.title,
        startedAt: new Date(input.startedAt),
        durationSeconds: input.durationSeconds,
        distanceMeters: input.distanceMeters ?? null,
        notes: input.notes ?? null,
        source: 'manual',
        sourceReferenceId: null,
        externalUrl: null,
        visibility: input.visibility ?? 'private',
      },
    });
    return toView(row);
  }

  async updateMine(
    actor: Actor,
    recordId: string,
    input: UpdateActivityRecordDto,
  ): Promise<ActivityRecordView> {
    const current = await this.prisma.activityRecord.findFirst({
      where: { id: recordId, userId: actor.id },
    });
    if (!current) {
      throw new NotFoundError(
        'Activity record not found.',
        [{ recordId }],
        'ACTIVITY_RECORD_NOT_FOUND',
      );
    }
    const row = await this.prisma.activityRecord.update({
      where: { id: recordId },
      data: {
        title: input.title,
        startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
        durationSeconds: input.durationSeconds,
        distanceMeters: input.distanceMeters,
        notes: input.notes,
        visibility: input.visibility,
      },
    });
    return toView(row);
  }

  async deleteMine(actor: Actor, recordId: string): Promise<void> {
    const result = await this.prisma.activityRecord.deleteMany({
      where: { id: recordId, userId: actor.id },
    });
    if (result.count === 0) {
      throw new NotFoundError(
        'Activity record not found.',
        [{ recordId }],
        'ACTIVITY_RECORD_NOT_FOUND',
      );
    }
  }

  async upsertExternal(input: {
    userId: string;
    hobbyId: string;
    sportType: string;
    title: string;
    startedAt: Date;
    durationSeconds: number;
    distanceMeters: number | null;
    notes: string | null;
    source: Exclude<ActivityRecordSource, 'manual'>;
    sourceReferenceId: string;
    externalUrl: string | null;
  }): Promise<ActivityRecordView> {
    const row = await this.prisma.activityRecord.upsert({
      where: {
        userId_source_sourceReferenceId: {
          userId: input.userId,
          source: input.source,
          sourceReferenceId: input.sourceReferenceId,
        },
      },
      create: {
        id: newId(),
        userId: input.userId,
        hobbyId: input.hobbyId,
        opportunityId: null,
        sportType: input.sportType,
        title: input.title,
        startedAt: input.startedAt,
        durationSeconds: input.durationSeconds,
        distanceMeters: input.distanceMeters,
        notes: input.notes,
        source: input.source,
        sourceReferenceId: input.sourceReferenceId,
        externalUrl: input.externalUrl,
        visibility: 'private',
      },
      update: {
        hobbyId: input.hobbyId,
        sportType: input.sportType,
        title: input.title,
        startedAt: input.startedAt,
        durationSeconds: input.durationSeconds,
        distanceMeters: input.distanceMeters,
        notes: input.notes,
        externalUrl: input.externalUrl,
      },
    });
    return toView(row);
  }

  async deleteExternal(userId: string, source: 'strava', sourceReferenceId: string): Promise<void> {
    await this.prisma.activityRecord.deleteMany({
      where: { userId, source, sourceReferenceId },
    });
  }
}
