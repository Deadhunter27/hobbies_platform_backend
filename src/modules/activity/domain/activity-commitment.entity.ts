import { Entity } from '@shared/domain';
import { DomainRuleViolation } from '@shared/errors';

export const ACTIVITY_COMMITMENT_STATES = [
  'interested',
  'committed',
  'cancelled',
  'missed',
  'completed',
] as const;
export type ActivityCommitmentState = (typeof ACTIVITY_COMMITMENT_STATES)[number];

export interface ActivityCommitmentProps {
  id: string;
  userId: string;
  activityId: string;
  state: ActivityCommitmentState;
  committedAt: Date | null;
  cancelledAt: Date | null;
  missedAt: Date | null;
  completedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ActivityCommitment extends Entity {
  private constructor(private readonly props: ActivityCommitmentProps) {
    super(props.id);
  }

  static reconstitute(props: ActivityCommitmentProps): ActivityCommitment {
    return new ActivityCommitment(props);
  }

  static start(
    input: {
      id: string;
      userId: string;
      activityId: string;
      state: 'interested' | 'committed';
      note: string | null;
    },
    now = new Date(),
  ): ActivityCommitment {
    return new ActivityCommitment({
      ...input,
      committedAt: input.state === 'committed' ? now : null,
      cancelledAt: null,
      missedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  transition(
    state: ActivityCommitmentState,
    note: string | null,
    now = new Date(),
  ): ActivityCommitment {
    if (state === 'cancelled' && !['interested', 'committed'].includes(this.state)) {
      throw new DomainRuleViolation(
        'Only an interested or committed activity can be cancelled.',
        undefined,
        'ACTIVITY_COMMITMENT_INVALID_CANCELLATION',
      );
    }
    if (state === 'missed' && this.state !== 'committed') {
      throw new DomainRuleViolation(
        'Only a committed activity can be marked missed.',
        undefined,
        'ACTIVITY_COMMITMENT_INVALID_MISSED_STATE',
      );
    }
    if (state === 'completed' && this.state !== 'committed') {
      throw new DomainRuleViolation(
        'Only a committed activity can be marked completed.',
        undefined,
        'ACTIVITY_COMMITMENT_INVALID_COMPLETED_STATE',
      );
    }

    return new ActivityCommitment({
      ...this.props,
      state,
      note,
      committedAt:
        state === 'committed'
          ? this.state === 'committed' && this.props.committedAt
            ? this.props.committedAt
            : now
          : this.props.committedAt,
      cancelledAt:
        state === 'cancelled'
          ? now
          : state === 'interested' || state === 'committed'
            ? null
            : this.props.cancelledAt,
      missedAt:
        state === 'missed'
          ? now
          : state === 'interested' || state === 'committed'
            ? null
            : this.props.missedAt,
      completedAt:
        state === 'completed'
          ? now
          : state === 'interested' || state === 'committed'
            ? null
            : this.props.completedAt,
      updatedAt: now,
    });
  }

  get userId(): string {
    return this.props.userId;
  }
  get activityId(): string {
    return this.props.activityId;
  }
  get state(): ActivityCommitmentState {
    return this.props.state;
  }
  get committedAt(): Date | null {
    return this.props.committedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }
  get missedAt(): Date | null {
    return this.props.missedAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get note(): string | null {
    return this.props.note;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
