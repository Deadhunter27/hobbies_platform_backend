import { Inject, Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { ConversationNotFoundError, type Conversation, type ConversationStatus } from '../domain';
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from './ports/conversation.repository.port';

@Injectable()
export class SetConversationStatusUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
  ) {}

  async execute(
    conversationId: string,
    status: ConversationStatus,
    now = new Date(),
    tx?: TxContext,
  ): Promise<Conversation> {
    const existing = await this.repository.findById(conversationId, tx);
    if (!existing) throw new ConversationNotFoundError(conversationId);
    if (existing.status === status) return existing;

    const updated = await this.repository.updateStatus(
      { id: conversationId, status, updatedAt: now },
      tx,
    );
    if (!updated) throw new ConversationNotFoundError(conversationId);
    return updated;
  }
}
