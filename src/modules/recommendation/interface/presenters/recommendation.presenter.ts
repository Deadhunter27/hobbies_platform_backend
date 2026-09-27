import type { Recommendation } from '../../domain';
import type { RecommendationResponseDto } from '../dto/recommendation.dto';

export function toRecommendationResponse(
  recommendation: Recommendation,
): RecommendationResponseDto {
  return {
    id: recommendation.id,
    hobbyId: recommendation.hobbyId,
    activityId: recommendation.activityId,
    title: recommendation.title,
    rationale: recommendation.rationale,
    fitSignals: recommendation.fitSignals,
    intent: recommendation.intent,
    status: recommendation.status,
    rejectionReason: recommendation.rejectionReason,
    rejectionNote: recommendation.rejectionNote,
    selectedActivityId: recommendation.selectedActivityId,
    createdAt: recommendation.createdAt.toISOString(),
    updatedAt: recommendation.updatedAt.toISOString(),
  };
}
