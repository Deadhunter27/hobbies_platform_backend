import { Module } from '@nestjs/common';
import { PrismaModule } from '@infra/database';
import { AccessModule } from '@modules/access';
import { ActivityModule } from '@modules/activity';
import { ProfileModule } from '@modules/profile';
import {
  GetWhatsNextUseCase,
  RECOMMENDATION_REPOSITORY,
  RecommendationAuthorization,
  RejectRecommendationUseCase,
  SelectRecommendationUseCase,
} from './application';
import { PrismaRecommendationRepository } from './infrastructure';
import { RecommendationController } from './interface';

@Module({
  imports: [PrismaModule, AccessModule, ProfileModule, ActivityModule],
  controllers: [RecommendationController],
  providers: [
    RecommendationAuthorization,
    GetWhatsNextUseCase,
    RejectRecommendationUseCase,
    SelectRecommendationUseCase,
    { provide: RECOMMENDATION_REPOSITORY, useClass: PrismaRecommendationRepository },
  ],
})
export class RecommendationModule {}
