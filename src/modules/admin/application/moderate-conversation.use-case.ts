import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { SetConversationStatusUseCase } from '@modules/conversation/application';
import type { Conversation, ConversationStatus } from '@modules/conversation/domain';
import {
  AUDIT_WRITER,
  UNIT_OF_WORK,
  type AuditWriter,
  type UnitOfWork,
} from '@shared/application';
import { AdminAuthorization } from './admin-authorization';

@Injectable()
export class ModerateConversationUseCase {
  constructor(
    private readonly authorization: AdminAuthorization,
    private readonly setConversationStatus: SetConversationStatusUseCase,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(
    actor: Actor,
    conversationId: string,
    status: ConversationStatus,
    now = new Date(),
  ): Promise<Conversation> {
    await this.authorization.assertCanManagePlatform(actor);

    return this.uow.run(async (tx) => {
      const conversation = await this.setConversationStatus.execute(
        conversationId,
        status,
        now,
        tx,
      );
      await this.audit.write(
        {
          actorId: actor.id,
          action: status === 'archived' ? 'conversation.archive' : 'conversation.publish',
          resourceType: 'conversation',
          resourceId: conversationId,
          metadata: { status },
        },
        tx,
      );
      return conversation;
    });
  }
}
