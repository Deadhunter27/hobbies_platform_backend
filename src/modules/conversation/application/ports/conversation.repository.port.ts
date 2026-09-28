import type { TxContext } from '@shared/application';
import type {
  Conversation,
  ConversationDetail,
  ConversationPage,
  ConversationReply,
  ConversationStatus,
} from '../../domain';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface ConversationRepository {
  listPublished(input: {
    hobbyId: string;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }): Promise<ConversationPage>;
  findPublishedById(id: string): Promise<ConversationDetail | null>;
  findById(id: string, tx?: TxContext): Promise<Conversation | null>;
  createConversation(input: Conversation): Promise<Conversation>;
  createReply(input: ConversationReply): Promise<ConversationReply>;
  updateStatus(
    input: { id: string; status: ConversationStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Conversation | null>;
}
