import { ConflictError, ForbiddenError, NotFoundError } from '@shared/errors';

export class RecommendationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Recommendation "${id}" was not found.`, undefined, 'RECOMMENDATION_NOT_FOUND');
  }
}

export class NoViableRecommendationError extends NotFoundError {
  constructor(hobbyId: string) {
    super(
      `No viable next step is available for hobby "${hobbyId}".`,
      undefined,
      'NO_VIABLE_RECOMMENDATION',
    );
  }
}

export class RecommendationStaleError extends ConflictError {
  constructor(id: string) {
    super(`Recommendation "${id}" can no longer be acted on.`, undefined, 'RECOMMENDATION_STALE');
  }
}

export class RecommendationAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Recommendation access denied.', undefined, 'RECOMMENDATION_ACCESS_DENIED');
  }
}
