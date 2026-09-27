import { Injectable } from '@nestjs/common';
import { PolicyService, type Actor } from '@modules/access';
import { ForbiddenError } from '@shared/errors';

@Injectable()
export class ProfileAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanRead(actor: Actor): Promise<void> {
    await this.assert(actor, 'profile.context.read');
  }

  async assertCanUpdate(actor: Actor): Promise<void> {
    await this.assert(actor, 'profile.context.update');
  }

  private async assert(actor: Actor, action: string): Promise<void> {
    const decision = await this.policy.can(actor, action, { type: 'user', id: actor.id });
    if (!decision.allow) {
      throw new ForbiddenError('You cannot access this profile context.', undefined, 'PROFILE_ACCESS_DENIED');
    }
  }
}
