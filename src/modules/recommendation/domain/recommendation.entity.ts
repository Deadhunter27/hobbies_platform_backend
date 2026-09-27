import { Entity } from '@shared/domain';
import { DomainRuleViolation } from '@shared/errors';

export const RECOMMENDATION_STATUSES = ['active', 'rejected', 'superseded', 'selected'] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const REJECTION_REASONS = [
  'timing',
  'too_difficult',
  'prefer_solo',
  'learn_first',
  'social_comfort',
  'other',
] as const;
export type RecommendationRejectionReason = (typeof REJECTION_REASONS)[number];

export interface RecommendationProps {
  id: string;
  userId: string;
  hobbyId: string;
  activityId: string;
  title: string;
  rationale: string;
  fitSignals: string[];
  intent: string;
  status: RecommendationStatus;
  rejectionReason: RecommendationRejectionReason | null;
  rejectionNote: string | null;
  selectedActivityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function assertRules(props: RecommendationProps): void {
  if (props.fitSignals.length === 0) {
    throw new DomainRuleViolation(
      'A recommendation must explain at least one fit signal.',
      undefined,
      'RECOMMENDATION_MISSING_FIT_SIGNAL',
    );
  }
  if (props.status === 'rejected' && props.rejectionReason === null) {
    throw new DomainRuleViolation(
      'A rejected recommendation requires a rejection reason.',
      undefined,
      'RECOMMENDATION_MISSING_REJECTION_REASON',
    );
  }
  if (props.status === 'selected' && props.selectedActivityId === null) {
    throw new DomainRuleViolation(
      'A selected recommendation requires the selected activity.',
      undefined,
      'RECOMMENDATION_MISSING_SELECTED_ACTIVITY',
    );
  }
}

export class Recommendation extends Entity {
  private constructor(private readonly props: RecommendationProps) {
    super(props.id);
  }

  static create(
    input: Omit<RecommendationProps, 'status' | 'rejectionReason' | 'rejectionNote' | 'selectedActivityId' | 'createdAt' | 'updatedAt'>,
    now = new Date(),
  ): Recommendation {
    return new Recommendation({
      ...input,
      status: 'active',
      rejectionReason: null,
      rejectionNote: null,
      selectedActivityId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: RecommendationProps): Recommendation {
    assertRules(props);
    return new Recommendation(props);
  }

  reject(reason: RecommendationRejectionReason, note: string | null, now = new Date()): Recommendation {
    if (this.status !== 'active') {
      throw new DomainRuleViolation(
        'Only an active recommendation can be rejected.',
        undefined,
        'RECOMMENDATION_NOT_ACTIVE',
      );
    }
    return Recommendation.reconstitute({
      ...this.props,
      status: 'rejected',
      rejectionReason: reason,
      rejectionNote: note,
      updatedAt: now,
    });
  }

  select(activityId: string, now = new Date()): Recommendation {
    if (this.status !== 'active') {
      throw new DomainRuleViolation(
        'Only an active recommendation can be selected.',
        undefined,
        'RECOMMENDATION_NOT_ACTIVE',
      );
    }
    return Recommendation.reconstitute({
      ...this.props,
      status: 'selected',
      selectedActivityId: activityId,
      updatedAt: now,
    });
  }

  supersede(now = new Date()): Recommendation {
    if (this.status !== 'active') return this;
    return Recommendation.reconstitute({ ...this.props, status: 'superseded', updatedAt: now });
  }

  get userId(): string { return this.props.userId; }
  get hobbyId(): string { return this.props.hobbyId; }
  get activityId(): string { return this.props.activityId; }
  get title(): string { return this.props.title; }
  get rationale(): string { return this.props.rationale; }
  get fitSignals(): string[] { return [...this.props.fitSignals]; }
  get intent(): string { return this.props.intent; }
  get status(): RecommendationStatus { return this.props.status; }
  get rejectionReason(): RecommendationRejectionReason | null { return this.props.rejectionReason; }
  get rejectionNote(): string | null { return this.props.rejectionNote; }
  get selectedActivityId(): string | null { return this.props.selectedActivityId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}
