import { AppError } from '@shared/errors';

export class RecommendationNotFoundError extends AppError {
  constructor(id: string) {
    super('RECOMMENDATION_NOT_FOUND', `Recommendation "${id}" was not found.`, 404);
  }
}

export class NoViableRecommendationError extends AppError {
  constructor(hobbyId: string) {
    super('NO_VIABLE_RECOMMENDATION', `No viable next step is available for hobby "${hobbyId}".`, 404);
  }
}

export class RecommendationStaleError extends AppError {
  constructor(id: string) {
    super('RECOMMENDATION_STALE', `Recommendation "${id}" can no longer be acted on.`, 409);
  }
}

export class RecommendationAccessDeniedError extends AppError {
  constructor() {
    super('RECOMMENDATION_ACCESS_DENIED', 'Recommendation access denied.', 403);
  }
}
