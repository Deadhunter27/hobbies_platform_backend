import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import {
  GetActivityUseCase,
  ListMyActivityCommitmentsUseCase,
  UpsertMyActivityCommitmentUseCase,
} from '@modules/activity';
import { newId } from '@shared/utils';
import {
  ProgressActivityMismatchError,
  ProgressCommitmentRequiredError,
  ProgressReflection,
} from '../domain';
import { ProgressAuthorization } from './authorization';
import { PROGRESS_REPOSITORY, type ProgressRepository } from './ports/progress.repository.port';

export interface SaveProgressReflectionInput {
  rating: number | null;
  tags: string[];
  note: string | null;
}

export interface JourneyMoment {
  reflection: ProgressReflection;
  activityTitle: string;
  activityType: string;
  placeName: string;
  hostName: string | null;
}

@Injectable()
export class SaveMyProgressReflectionUseCase {
  constructor(
    private readonly authorization: ProgressAuthorization,
    private readonly getActivity: GetActivityUseCase,
    private readonly listCommitments: ListMyActivityCommitmentsUseCase,
    private readonly upsertCommitment: UpsertMyActivityCommitmentUseCase,
    @Inject(PROGRESS_REPOSITORY) private readonly repository: ProgressRepository,
  ) {}

  async execute(
    actor: Actor,
    hobbyId: string,
    activityId: string,
    input: SaveProgressReflectionInput,
    now = new Date(),
  ): Promise<ProgressReflection> {
    await this.authorization.assertCanUpdate(actor);
    const activity = await this.getActivity.execute(activityId, now);
    if (activity.activity.hobbyId !== hobbyId) {
      throw new ProgressActivityMismatchError(activityId, hobbyId);
    }

    // A reflection is evidence that the activity happened; it is not evidence that the
    // person committed to it beforehand. Keep those states independent. If a commitment
    // exists, it still has to represent a valid path into completion. If none exists,
    // allow a post-hoc reflection once the activity has actually started.
    const commitments = await this.listCommitments.execute(actor);
    const commitment = commitments.find((item) => item.activityId === activityId) ?? null;
    if (commitment && commitment.state !== 'committed' && commitment.state !== 'completed') {
      throw new ProgressCommitmentRequiredError(activityId);
    }
    if (activity.activity.startsAt > now) {
      throw new ProgressCommitmentRequiredError(activityId);
    }

    const existing = await this.repository.findByUserActivity(actor.id, activityId);
    const reflection = existing
      ? existing.revise(input, now)
      : ProgressReflection.create(
          {
            id: newId(),
            userId: actor.id,
            hobbyId,
            activityId,
            rating: input.rating,
            tags: input.tags,
            note: input.note,
            occurredAt: now,
          },
          now,
        );

    const saved = await this.repository.save(reflection);

    if (commitment?.state === 'committed') {
      await this.upsertCommitment.execute(
        actor,
        activityId,
        { state: 'completed', note: commitment.note },
        now,
      );
    }

    return saved;
  }
}

@Injectable()
export class ListMyJourneyUseCase {
  constructor(
    private readonly authorization: ProgressAuthorization,
    private readonly getActivity: GetActivityUseCase,
    @Inject(PROGRESS_REPOSITORY) private readonly repository: ProgressRepository,
  ) {}

  async execute(actor: Actor, hobbyId: string): Promise<JourneyMoment[]> {
    await this.authorization.assertCanRead(actor);
    const reflections = await this.repository.listByUserHobby(actor.id, hobbyId);

    return Promise.all(
      reflections.map(async (reflection) => {
        const activity = await this.getActivity.execute(
          reflection.activityId,
          reflection.occurredAt,
        );
        return {
          reflection,
          activityTitle: activity.activity.title,
          activityType: activity.activity.activityType,
          placeName: activity.activity.placeName,
          hostName: activity.activity.hostName,
        };
      }),
    );
  }
}
