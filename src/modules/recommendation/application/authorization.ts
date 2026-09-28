import { Injectable } from '@nestjs/common';
import { PolicyService, type Actor } from '@modules/access';
import { RecommendationAccessDeniedError } from '../domain';

@Injectable()
export class RecommendationAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanRead(actor: Actor): Promise<void> {
    await this.assert(actor, 'recommendation.self.read');
  }

  async assertCanUpdate(actor: Actor): Promise<void> {
    await this.assert(actor, 'recommendation.self.update');
  }

  private async assert(actor: Actor, action: string): Promise<void> {
    const decision = await this.policy.can(actor, action, { type: 'user', id: actor.id });
    if (!decision.allow) throw new RecommendationAccessDeniedError();
  }
}
