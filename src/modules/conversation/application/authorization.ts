import { Injectable } from '@nestjs/common';
import { PolicyService, type Actor } from '@modules/access';
import { ConversationAccessDeniedError } from '../domain';

@Injectable()
export class ConversationAuthorization {
  constructor(private readonly policy: PolicyService) {}

  async assertCanWrite(actor: Actor): Promise<void> {
    const decision = await this.policy.can(actor, 'conversation.self.write', {
      type: 'user',
      id: actor.id,
    });
    if (!decision.allow) throw new ConversationAccessDeniedError();
  }
}
