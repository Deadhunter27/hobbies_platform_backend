import { Injectable } from '@nestjs/common';
import type { RecommendationDecision as RecommendationRecord } from '@prisma/client';
import { PrismaService } from '@infra/database';
import type { RecommendationRepository } from '../application/ports/recommendation.repository.port';
import {
  Recommendation,
  type RecommendationRejectionReason,
  type RecommendationStatus,
} from '../domain';

function toDomain(record: RecommendationRecord): Recommendation {
  return Recommendation.reconstitute({
    id: record.id,
    userId: record.userId,
    hobbyId: record.hobbyId,
    activityId: record.activityId,
    title: record.title,
    rationale: record.rationale,
    fitSignals: record.fitSignals,
    intent: record.intent,
    status: record.status as RecommendationStatus,
    rejectionReason: record.rejectionReason as RecommendationRejectionReason | null,
    rejectionNote: record.rejectionNote,
    selectedActivityId: record.selectedActivityId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

@Injectable()
export class PrismaRecommendationRepository implements RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Recommendation | null> {
    const record = await this.prisma.recommendationDecision.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findActive(userId: string, hobbyId: string): Promise<Recommendation | null> {
    const record = await this.prisma.recommendationDecision.findFirst({
      where: { userId, hobbyId, status: 'active' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return record ? toDomain(record) : null;
  }

  async save(recommendation: Recommendation): Promise<Recommendation> {
    const record = await this.prisma.recommendationDecision.upsert({
      where: { id: recommendation.id },
      create: {
        id: recommendation.id,
        userId: recommendation.userId,
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
        createdAt: recommendation.createdAt,
        updatedAt: recommendation.updatedAt,
      },
      update: {
        title: recommendation.title,
        rationale: recommendation.rationale,
        fitSignals: recommendation.fitSignals,
        intent: recommendation.intent,
        status: recommendation.status,
        rejectionReason: recommendation.rejectionReason,
        rejectionNote: recommendation.rejectionNote,
        selectedActivityId: recommendation.selectedActivityId,
        updatedAt: recommendation.updatedAt,
      },
    });
    return toDomain(record);
  }
}
