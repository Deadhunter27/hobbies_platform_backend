import { Injectable } from '@nestjs/common';
import { PolicyService, type Actor } from '@modules/access';
import { ForbiddenError } from '@shared/errors';

@Injectable()
export class CheckInAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanRead(actor: Actor): Promise<void> {
    await this.assert(actor, 'checkin.self.read');
  }

  async assertCanUpdate(actor: Actor): Promise<void> {
    await this.assert(actor, 'checkin.self.update');
  }

  private async assert(actor: Actor, action: string): Promise<void> {
    const decision = await this.policy.can(actor, action, { type: 'user', id: actor.id });
    if (!decision.allow) {
      throw new ForbiddenError(
        'You cannot access these check-ins.',
        undefined,
        'CHECK_IN_ACCESS_DENIED',
      );
    }
  }
}
