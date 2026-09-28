export const CONVERSATION_STATUSES = ['published', 'archived'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export interface Conversation {
  id: string;
  hobbyId: string;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
  authorId: string;
  authorDisplayName: string;
  title: string;
  body: string;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationReply {
  id: string;
  conversationId: string;
  authorId: string;
  authorDisplayName: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDetail {
  conversation: Conversation;
  replies: ConversationReply[];
}

export interface ConversationPage {
  data: Conversation[];
  nextCursor: string | null;
}

export interface FeedConversationItem {
  type: 'conversation';
  sourceId: string;
  occurredAt: Date;
  title: string;
  summary: string;
  authorDisplayName: string;
}

export interface FeedActivityItem {
  type: 'activity';
  sourceId: string;
  occurredAt: Date;
  title: string;
  summary: string;
  placeName: string;
  hostName: string | null;
}

export type HobbyFeedItem = FeedConversationItem | FeedActivityItem;

export interface HobbyFeedPage {
  data: HobbyFeedItem[];
  nextCursor: string | null;
}
