import { Injectable } from '@nestjs/common';
import { PolicyService, type Actor } from '@modules/access';
import { ProgressAccessDeniedError } from '../domain';

@Injectable()
export class ProgressAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanRead(actor: Actor): Promise<void> {
    await this.assert(actor, 'progress.self.read');
  }

  async assertCanUpdate(actor: Actor): Promise<void> {
    await this.assert(actor, 'progress.self.update');
  }

  private async assert(actor: Actor, action: string): Promise<void> {
    const decision = await this.policy.can(actor, action, { type: 'user', id: actor.id });
    if (!decision.allow) throw new ProgressAccessDeniedError();
  }
}
