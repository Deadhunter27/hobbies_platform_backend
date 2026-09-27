import { Injectable } from '@nestjs/common';
import { PolicyService, type Actor } from '@modules/access';
import { ForbiddenError } from '@shared/errors';

@Injectable()
export class ActivityAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanReadOwnCommitments(actor: Actor): Promise<void> {
    await this.assert(actor, 'activity.commitment.read');
  }

  async assertCanUpdateOwnCommitments(actor: Actor): Promise<void> {
    await this.assert(actor, 'activity.commitment.update');
  }

  private async assert(actor: Actor, action: string): Promise<void> {
    const decision = await this.policy.can(actor, action, { type: 'user', id: actor.id });
    if (!decision.allow) {
      throw new ForbiddenError(
        'You cannot access this activity commitment.',
        undefined,
        'ACTIVITY_COMMITMENT_ACCESS_DENIED',
      );
    }
  }
}
