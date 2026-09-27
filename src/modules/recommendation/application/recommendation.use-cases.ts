import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { GetActivityUseCase, ListActivitiesUseCase } from '@modules/activity';
import { GetMyHobbyContextUseCase } from '@modules/profile';
import { newId } from '@shared/utils';
import {
  NoViableRecommendationError,
  Recommendation,
  RecommendationNotFoundError,
  RecommendationStaleError,
  rankActivities,
  type RecommendationRejectionReason,
} from '../domain';
import { RecommendationAuthorization } from './authorization';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepository,
} from './ports/recommendation.repository.port';

export interface RejectRecommendationInput {
  reason: RecommendationRejectionReason;
  note: string | null;
}

@Injectable()
export class GetWhatsNextUseCase {
  constructor(
    private readonly authorization: RecommendationAuthorization,
    private readonly getContext: GetMyHobbyContextUseCase,
    private readonly listActivities: ListActivitiesUseCase,
    @Inject(RECOMMENDATION_REPOSITORY) private readonly repository: RecommendationRepository,
  ) {}

  async execute(actor: Actor, hobbyId: string, now = new Date()): Promise<Recommendation> {
    await this.authorization.assertCanRead(actor);
    const context = await this.getContext.execute(actor, hobbyId);
    const candidates = await this.listActivities.execute({ hobbyId }, now);

    const active = await this.repository.findActive(actor.id, hobbyId);
    if (active) {
      const stillViable = candidates.some(
        (candidate) =>
          candidate.activity.id === active.activityId && candidate.availability === 'available',
      );
      if (stillViable) return active;
      await this.repository.save(active.supersede(now));
    }

    const ranked = rankActivities(context, candidates);
    const best = ranked[0];
    if (!best) throw new NoViableRecommendationError(hobbyId);

    return this.repository.save(
      Recommendation.create(
        {
          id: newId(),
          userId: actor.id,
          hobbyId,
          activityId: best.view.activity.id,
          title: best.view.activity.title,
          rationale: best.rationale,
          fitSignals: best.fitSignals,
          intent: context.primaryIntent,
        },
        now,
      ),
    );
  }
}

@Injectable()
export class RejectRecommendationUseCase {
  constructor(
    private readonly authorization: RecommendationAuthorization,
    private readonly getContext: GetMyHobbyContextUseCase,
    private readonly listActivities: ListActivitiesUseCase,
    @Inject(RECOMMENDATION_REPOSITORY) private readonly repository: RecommendationRepository,
  ) {}

  async execute(
    actor: Actor,
    hobbyId: string,
    recommendationId: string,
    input: RejectRecommendationInput,
    now = new Date(),
  ): Promise<Recommendation> {
    await this.authorization.assertCanUpdate(actor);
    const existing = await this.repository.findById(recommendationId);
    if (!existing || existing.userId !== actor.id || existing.hobbyId !== hobbyId) {
      throw new RecommendationNotFoundError(recommendationId);
    }
    if (existing.status !== 'active') throw new RecommendationStaleError(recommendationId);

    await this.repository.save(existing.reject(input.reason, input.note, now));

    const context = await this.getContext.execute(actor, hobbyId);
    const candidates = await this.listActivities.execute({ hobbyId }, now);
    const ranked = rankActivities(context, candidates, {
      rejectionReason: input.reason,
      excludeActivityIds: [existing.activityId],
    });
    const best = ranked[0];
    if (!best) throw new NoViableRecommendationError(hobbyId);

    return this.repository.save(
      Recommendation.create(
        {
          id: newId(),
          userId: actor.id,
          hobbyId,
          activityId: best.view.activity.id,
          title: best.view.activity.title,
          rationale: best.rationale,
          fitSignals: best.fitSignals,
          intent: context.primaryIntent,
        },
        now,
      ),
    );
  }
}

@Injectable()
export class SelectRecommendationUseCase {
  constructor(
    private readonly authorization: RecommendationAuthorization,
    private readonly getActivity: GetActivityUseCase,
    @Inject(RECOMMENDATION_REPOSITORY) private readonly repository: RecommendationRepository,
  ) {}

  async execute(
    actor: Actor,
    hobbyId: string,
    recommendationId: string,
    activityId: string,
    now = new Date(),
  ): Promise<Recommendation> {
    await this.authorization.assertCanUpdate(actor);
    const existing = await this.repository.findById(recommendationId);
    if (!existing || existing.userId !== actor.id || existing.hobbyId !== hobbyId) {
      throw new RecommendationNotFoundError(recommendationId);
    }
    if (existing.status !== 'active' || activityId !== existing.activityId) {
      throw new RecommendationStaleError(recommendationId);
    }

    const activity = await this.getActivity.execute(activityId, now);
    if (activity.availability !== 'available' || activity.activity.hobbyId !== hobbyId) {
      throw new RecommendationStaleError(recommendationId);
    }

    return this.repository.save(existing.select(activityId, now));
  }
}
