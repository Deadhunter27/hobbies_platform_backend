import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import {
  GetActivityUseCase,
  ListMyActivityCommitmentsUseCase,
} from '@modules/activity';
import { newId } from '@shared/utils';
import {
  CheckInNotFoundError,
  type CheckIn,
  type CheckInKind,
  type CheckInStatus,
  type CheckInView,
} from '../domain';
import { CheckInAuthorization } from './authorization';
import {
  CHECK_IN_REPOSITORY,
  type CheckInRepository,
} from './ports/checkin.repository.port';

const HOUR_MS = 60 * 60 * 1000;
const REMINDER_LEAD_MS = 24 * HOUR_MS;
const MISSED_GRACE_MS = 6 * HOUR_MS;

function currentKind(
  startsAt: Date,
  now: Date,
): { kind: CheckInKind; availableAt: Date } | null {
  const diff = startsAt.getTime() - now.getTime();
  if (diff > 0 && diff <= REMINDER_LEAD_MS) {
    return {
      kind: 'activity_reminder',
      availableAt: new Date(startsAt.getTime() - REMINDER_LEAD_MS),
    };
  }

  const elapsed = now.getTime() - startsAt.getTime();
  if (elapsed >= 0 && elapsed < MISSED_GRACE_MS) {
    return { kind: 'post_activity', availableAt: startsAt };
  }
  if (elapsed >= MISSED_GRACE_MS) {
    return {
      kind: 'missed_plan',
      availableAt: new Date(startsAt.getTime() + MISSED_GRACE_MS),
    };
  }
  return null;
}

function copyFor(
  kind: CheckInKind,
  activityTitle: string,
): Pick<CheckInView, 'title' | 'body' | 'ctaLabel'> {
  switch (kind) {
    case 'activity_reminder':
      return {
        title: 'Your plan is coming up',
        body: `${activityTitle} is getting close. Check the details and make the plan easy to show up for.`,
        ctaLabel: 'See my plan',
      };
    case 'post_activity':
      return {
        title: 'How did it go?',
        body: `If you got to ${activityTitle}, take a moment to capture what the experience was actually like.`,
        ctaLabel: 'Reflect on it',
      };
    case 'missed_plan':
      return {
        title: 'Plans change',
        body: `You had ${activityTitle} planned. If you did not get to it, choose what makes sense next without losing the thread.`,
        ctaLabel: 'Choose what’s next',
      };
  }
}

function toView(
  checkIn: CheckIn,
  activity: { title: string; startsAt: Date; placeName: string },
): CheckInView {
  return {
    checkIn,
    ...copyFor(checkIn.kind, activity.title),
    activity,
  };
}

@Injectable()
export class ListMyCheckInsUseCase {
  constructor(
    private readonly authorization: CheckInAuthorization,
    private readonly listCommitments: ListMyActivityCommitmentsUseCase,
    private readonly getActivity: GetActivityUseCase,
    @Inject(CHECK_IN_REPOSITORY) private readonly repository: CheckInRepository,
  ) {}

  async execute(actor: Actor, now = new Date()): Promise<CheckInView[]> {
    await this.authorization.assertCanRead(actor);
    const commitments = await this.listCommitments.execute(actor);
    const views: CheckInView[] = [];

    for (const commitment of commitments) {
      if (commitment.state !== 'committed') continue;
      const activityView = await this.getActivity.execute(commitment.activityId, now);
      const activity = activityView.activity;
      if (activity.status !== 'published') continue;

      const due = currentKind(activity.startsAt, now);
      if (!due) continue;

      const existing = await this.repository.findByUserActivityKind(
        actor.id,
        activity.id,
        due.kind,
      );
      if (existing && existing.status !== 'pending') continue;

      const checkIn: CheckIn =
        existing ?? {
          id: newId(),
          userId: actor.id,
          activityId: activity.id,
          kind: due.kind,
          status: 'pending',
          availableAt: due.availableAt,
          actionedAt: null,
          dismissedAt: null,
          createdAt: now,
          updatedAt: now,
        };
      const saved = existing ? checkIn : await this.repository.save(checkIn);
      views.push(
        toView(saved, {
          title: activity.title,
          startsAt: activity.startsAt,
          placeName: activity.placeName,
        }),
      );
    }

    return views.sort(
      (a, b) => a.checkIn.availableAt.getTime() - b.checkIn.availableAt.getTime(),
    );
  }
}

@Injectable()
export class UpdateMyCheckInUseCase {
  constructor(
    private readonly authorization: CheckInAuthorization,
    @Inject(CHECK_IN_REPOSITORY) private readonly repository: CheckInRepository,
  ) {}

  async execute(
    actor: Actor,
    checkInId: string,
    status: Exclude<CheckInStatus, 'pending'>,
    now = new Date(),
  ): Promise<CheckIn> {
    await this.authorization.assertCanUpdate(actor);
    const existing = await this.repository.findByIdForUser(checkInId, actor.id);
    if (!existing) throw new CheckInNotFoundError(checkInId);
    if (existing.status !== 'pending') return existing;

    return this.repository.save({
      ...existing,
      status,
      actionedAt: status === 'actioned' ? now : null,
      dismissedAt: status === 'dismissed' ? now : null,
      updatedAt: now,
    });
  }
}
