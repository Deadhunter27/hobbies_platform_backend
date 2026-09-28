import { Injectable } from '@nestjs/common';
import { PolicyService } from '@modules/access/application/policy.service';
import type { Actor } from '@modules/access/domain';
import { CommunityAccessDeniedError } from '../domain';

@Injectable()
export class CommunityAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanReadOwnMemberships(actor: Actor): Promise<void> {
    await this.assert(actor, 'community.membership.read');
  }

  async assertCanUpdateOwnMemberships(actor: Actor): Promise<void> {
    await this.assert(actor, 'community.membership.update');
  }

  private async assert(actor: Actor, action: string): Promise<void> {
    const decision = await this.policy.can(actor, action, { type: 'user', id: actor.id });
    if (!decision.allow) throw new CommunityAccessDeniedError();
  }
}
