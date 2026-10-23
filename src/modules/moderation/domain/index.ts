import { ConflictError, NotFoundError } from '@shared/errors';

export const REPORT_TARGET_TYPES = ['post', 'reply', 'community', 'event', 'person'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  'spam',
  'inappropriate',
  'harassment',
  'scam',
  'dangerous',
  'off_topic',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportDecision = 'dismiss' | 'remove';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
}

/** People are never auto-hidden; their reports always wait for a person to review. */
export function canAutoHide(type: ReportTargetType): boolean {
  return type !== 'person';
}

export class ReportTargetNotFoundError extends NotFoundError {
  constructor(target: ReportTarget) {
    super(
      `Nothing to report at ${target.type} "${target.id}".`,
      undefined,
      'REPORT_TARGET_NOT_FOUND',
    );
  }
}

export class CannotReportSelfError extends ConflictError {
  constructor() {
    super('You cannot report yourself.', undefined, 'CANNOT_REPORT_SELF');
  }
}
