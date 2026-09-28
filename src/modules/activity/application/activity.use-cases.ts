import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { newId } from '@shared/utils';
import {
  Activity,
  ActivityCommitment,
  ActivityCommitmentNotFoundError,
  ActivityNotFoundError,
  ActivityUnavailableError,
  type ActivityCommitmentState,
} from '../domain';
import { ActivityAuthorization } from './authorization';
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
  type ActivitySnapshot,
} from './ports/activity.repository.port';

export type ActivityAvailability = 'available' | 'full' | 'cancelled' | 'ended';

export interface ActivityView {
  activity: Activity;
  committedCount: number;
  spotsRemaining: number | null;
  availability: ActivityAvailability;
}

function toView(snapshot: ActivitySnapshot, now = new Date()): ActivityView {
  const { activity, committedCount } = snapshot;
  const endedAt = activity.endsAt ?? activity.startsAt;
  const availability: ActivityAvailability =
    activity.status === 'cancelled'
      ? 'cancelled'
      : activity.status === 'completed' || endedAt <= now
        ? 'ended'
        : activity.capacity !== null && committedCount >= activity.capacity
          ? 'full'
          : 'available';

  return {
    activity,
    committedCount,
    spotsRemaining:
      activity.capacity === null ? null : Math.max(activity.capacity - committedCount, 0),
    availability,
  };
}

@Injectable()
export class ListActivitiesUseCase {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository) {}

  async execute(input: { hobbyId?: string }, now = new Date()): Promise<ActivityView[]> {
    const activities = await this.repository.listPublished(now, input.hobbyId);
    return activities.map((snapshot) => toView(snapshot, now));
  }
}

@Injectable()
export class GetActivityUseCase {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository) {}

  async execute(activityId: string, now = new Date()): Promise<ActivityView> {
    const snapshot = await this.repository.findVisibleById(activityId);
    if (!snapshot) throw new ActivityNotFoundError(activityId);
    return toView(snapshot, now);
  }
}

@Injectable()
export class ListMyActivityCommitmentsUseCase {
  constructor(
    private readonly authorization: ActivityAuthorization,
    @Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository,
  ) {}

  async execute(actor: Actor): Promise<ActivityCommitment[]> {
    await this.authorization.assertCanReadOwnCommitments(actor);
    return this.repository.listCommitments(actor.id);
  }
}

@Injectable()
export class GetMyActivityCommitmentUseCase {
  constructor(
    private readonly authorization: ActivityAuthorization,
    @Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository,
  ) {}

  async execute(actor: Actor, activityId: string): Promise<ActivityCommitment> {
    await this.authorization.assertCanReadOwnCommitments(actor);
    const commitment = await this.repository.findCommitment(actor.id, activityId);
    if (!commitment) throw new ActivityCommitmentNotFoundError(activityId);
    return commitment;
  }
}

export interface UpsertMyActivityCommitmentInput {
  state: ActivityCommitmentState;
  note: string | null;
}

@Injectable()
export class UpsertMyActivityCommitmentUseCase {
  constructor(
    private readonly authorization: ActivityAuthorization,
    @Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository,
  ) {}

  async execute(
    actor: Actor,
    activityId: string,
    input: UpsertMyActivityCommitmentInput,
    now = new Date(),
  ): Promise<ActivityCommitment> {
    await this.authorization.assertCanUpdateOwnCommitments(actor);

    const snapshot = await this.repository.findVisibleById(activityId);
    if (!snapshot) throw new ActivityNotFoundError(activityId);
    const existing = await this.repository.findCommitment(actor.id, activityId);

    if (input.state === 'interested' || input.state === 'committed') {
      if (!snapshot.activity.canAcceptCommitment(now)) {
        throw new ActivityUnavailableError();
      }
    }

    if (
      (input.state === 'cancelled' || input.state === 'missed' || input.state === 'completed') &&
      !existing
    ) {
      throw new ActivityCommitmentNotFoundError(activityId);
    }

    if (input.state === 'missed' && snapshot.activity.startsAt > now) {
      throw new ActivityUnavailableError('An activity cannot be marked missed before it starts.');
    }

    if (input.state === 'completed' && snapshot.activity.startsAt > now) {
      throw new ActivityUnavailableError('An activity cannot be completed before it starts.');
    }

    const commitment = existing
      ? existing.transition(input.state, input.note, now)
      : ActivityCommitment.start(
          {
            id: newId(),
            userId: actor.id,
            activityId,
            state: input.state as 'interested' | 'committed',
            note: input.note,
          },
          now,
        );

    return this.repository.saveCommitment(commitment, snapshot.activity);
  }
}
