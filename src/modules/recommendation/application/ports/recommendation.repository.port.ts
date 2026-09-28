import type { Recommendation } from '../../domain';

export const RECOMMENDATION_REPOSITORY = Symbol('RECOMMENDATION_REPOSITORY');

export interface RecommendationRepository {
  findById(id: string): Promise<Recommendation | null>;
  findActive(userId: string, hobbyId: string): Promise<Recommendation | null>;
  save(recommendation: Recommendation): Promise<Recommendation>;
}
