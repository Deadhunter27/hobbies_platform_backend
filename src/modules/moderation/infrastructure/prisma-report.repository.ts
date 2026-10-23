import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { NewReport, ReportGroup, ReportRepository } from '../application';
import type { ReportReason, ReportTarget } from '../domain';

@Injectable()
export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(report: NewReport): Promise<boolean> {
    try {
      await this.prisma.contentReport.create({
        data: {
          id: report.id,
          reporterId: report.reporterId,
          targetType: report.target.type,
          targetId: report.target.id,
          reason: report.reason,
          note: report.note,
          createdAt: report.createdAt,
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }

  countOpenReporters(target: ReportTarget): Promise<number> {
    return this.prisma.contentReport.count({
      where: { targetType: target.type, targetId: target.id, status: 'open' },
    });
  }

  async markAutoHidden(target: ReportTarget): Promise<void> {
    await this.prisma.contentReport.updateMany({
      where: { targetType: target.type, targetId: target.id, status: 'open' },
      data: { autoHidden: true },
    });
  }

  async listOpen(limit: number): Promise<ReportGroup[]> {
    const rows = await this.prisma.contentReport.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    const groups = new Map<string, ReportGroup>();
    for (const row of rows) {
      const key = `${row.targetType}:${row.targetId}`;
      const group =
        groups.get(key) ??
        ({
          targetType: row.targetType,
          targetId: row.targetId,
          reportCount: 0,
          reasons: {},
          notes: [],
          autoHidden: false,
          firstReportedAt: row.createdAt,
          lastReportedAt: row.createdAt,
        } satisfies ReportGroup);
      group.reportCount += 1;
      const reason = row.reason as ReportReason;
      group.reasons[reason] = (group.reasons[reason] ?? 0) + 1;
      if (row.note && group.notes.length < 5) group.notes.push(row.note);
      group.autoHidden ||= row.autoHidden;
      if (row.createdAt < group.firstReportedAt) group.firstReportedAt = row.createdAt;
      if (row.createdAt > group.lastReportedAt) group.lastReportedAt = row.createdAt;
      groups.set(key, group);
    }
    // Most-reported first, then most recent.
    return [...groups.values()]
      .sort(
        (a, b) =>
          b.reportCount - a.reportCount || b.lastReportedAt.getTime() - a.lastReportedAt.getTime(),
      )
      .slice(0, limit);
  }

  async resolve(
    target: ReportTarget,
    status: 'dismissed' | 'actioned',
    resolvedBy: string,
    now: Date,
  ): Promise<{ resolved: number; autoHidden: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const where = { targetType: target.type, targetId: target.id, status: 'open' as const };
      const autoHidden =
        (await tx.contentReport.count({ where: { ...where, autoHidden: true } })) > 0;
      const { count } = await tx.contentReport.updateMany({
        where,
        data: { status, resolvedAt: now, resolvedBy },
      });
      return { resolved: count, autoHidden };
    });
  }
}
