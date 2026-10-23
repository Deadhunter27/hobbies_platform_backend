import type { ReportReason, ReportTarget, ReportTargetType } from '../../domain';

export interface NewReport {
  id: string;
  reporterId: string;
  target: ReportTarget;
  reason: ReportReason;
  note: string | null;
  createdAt: Date;
}

export interface ReportGroup {
  targetType: ReportTargetType;
  targetId: string;
  reportCount: number;
  reasons: Partial<Record<ReportReason, number>>;
  notes: string[];
  autoHidden: boolean;
  firstReportedAt: Date;
  lastReportedAt: Date;
}

export interface ReportRepository {
  /** Idempotent per reporter and target; returns false when it already existed. */
  create(report: NewReport): Promise<boolean>;
  countOpenReporters(target: ReportTarget): Promise<number>;
  markAutoHidden(target: ReportTarget): Promise<void>;
  listOpen(limit: number): Promise<ReportGroup[]>;
  /** Closes every open report on the target; returns whether it had been auto-hidden. */
  resolve(
    target: ReportTarget,
    status: 'dismissed' | 'actioned',
    resolvedBy: string,
    now: Date,
  ): Promise<{ resolved: number; autoHidden: boolean }>;
}
export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

/** What moderation can do to content owned by other modules. */
export interface ModerationTargets {
  exists(target: ReportTarget): Promise<boolean>;
  setVisible(target: ReportTarget, visible: boolean, now: Date): Promise<void>;
}
export const MODERATION_TARGETS = Symbol('MODERATION_TARGETS');
