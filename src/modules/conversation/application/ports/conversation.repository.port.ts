import type {
  Conversation,
  ConversationDetail,
  ConversationPage,
  ConversationReply,
} from '../../domain';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface ConversationRepository {
  listPublished(input: {
    hobbyId: string;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }): Promise<ConversationPage>;
  findPublishedById(id: string): Promise<ConversationDetail | null>;
  createConversation(input: Conversation): Promise<Conversation>;
  createReply(input: ConversationReply): Promise<ConversationReply>;
}
