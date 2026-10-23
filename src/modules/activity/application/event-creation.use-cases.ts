import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import { GetCommunityRoleUseCase } from '@modules/community';
import { CreatorEligibilityService } from '@modules/profile';
import { newId } from '@shared/utils';
import {
  Activity,
  ActivityNotFoundError,
  CommunityHostRequiredError,
  NotActivityHostError,
  type ActivityEffortLevel,
} from '../domain';
import { SetActivityStatusUseCase } from './activity-status.use-case';
import { GetActivityUseCase, type ActivityView } from './activity.use-cases';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from './ports/activity.repository.port';

export interface CreateEventInput {
  hobbyId: string;
  communityId: string | null;
  title: string;
  description: string | null;
  activityType: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  placeName: string;
  addressLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  effortLevel: ActivityEffortLevel;
  capacity: number | null;
  preparation: string;
  expectations: string;
}

/**
 * ADR-0035: people create real-world events. The creator is the host; an
 * event inside a community needs its organizer or a host.
 */
@Injectable()
export class CreateEventUseCase {
  constructor(
    private readonly eligibility: CreatorEligibilityService,
    private readonly getHobby: GetHobbyUseCase,
    private readonly getCommunityRole: GetCommunityRoleUseCase,
    @Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository,
    private readonly getActivity: GetActivityUseCase,
  ) {}

  async execute(actor: Actor, input: CreateEventInput, now = new Date()): Promise<ActivityView> {
    await this.eligibility.assertCanCreate(actor, 'event');
    const hobby = await this.getHobby.execute({ slugOrId: input.hobbyId });
    if (input.communityId) {
      const role = await this.getCommunityRole.execute(actor.id, input.communityId);
      if (role !== 'organizer' && role !== 'host') throw new CommunityHostRequiredError();
    }
    const activity = Activity.createByPerson(
      {
        id: newId(),
        hobbyId: hobby.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        activityType: input.activityType,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        placeName: input.placeName.trim(),
        addressLabel: input.addressLabel?.trim() || null,
        latitude: input.latitude,
        longitude: input.longitude,
        hostName: actor.displayName,
        hostType: 'person',
        hostReferenceId: actor.id,
        communityReferenceId: input.communityId,
        effortLevel: input.effortLevel,
        capacity: input.capacity,
        preparation: input.preparation.trim(),
        expectations: input.expectations.trim(),
        createdAt: now,
        updatedAt: now,
      },
      now,
    );
    await this.repository.create(activity);
    return this.getActivity.execute(activity.id, now);
  }
}

/** The host can cancel their own event; people who joined see it as cancelled. */
@Injectable()
export class CancelEventUseCase {
  constructor(
    private readonly getActivity: GetActivityUseCase,
    private readonly setStatus: SetActivityStatusUseCase,
  ) {}

  async execute(actor: Actor, activityId: string, now = new Date()): Promise<ActivityView> {
    const view = await this.getActivity.execute(activityId, now);
    if (view.activity.status !== 'published') throw new ActivityNotFoundError(activityId);
    if (view.activity.hostType !== 'person' || view.activity.hostReferenceId !== actor.id) {
      throw new NotActivityHostError();
    }
    await this.setStatus.execute(activityId, 'cancelled', now);
    return this.getActivity.execute(activityId, now);
  }
}
