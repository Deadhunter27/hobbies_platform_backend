import type {
  Conversation,
  ConversationDetail,
  ConversationReply,
  HobbyFeedPage,
} from '../../domain';
import type {
  ConversationDetailResponseDto,
  ConversationReplyResponseDto,
  ConversationResponseDto,
  HobbyFeedPageResponseDto,
} from '../dto/conversation.dto';

export function toConversationResponse(value: Conversation): ConversationResponseDto {
  return {
    id: value.id,
    hobbyId: value.hobbyId,
    communityReferenceId: value.communityReferenceId,
    activityReferenceId: value.activityReferenceId,
    author: { personId: value.authorId, displayName: value.authorDisplayName },
    title: value.title,
    body: value.body,
    status: value.status,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export function toConversationReplyResponse(
  value: ConversationReply,
): ConversationReplyResponseDto {
  return {
    id: value.id,
    conversationId: value.conversationId,
    author: { personId: value.authorId, displayName: value.authorDisplayName },
    body: value.body,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export function toConversationDetailResponse(
  value: ConversationDetail,
): ConversationDetailResponseDto {
  return {
    ...toConversationResponse(value.conversation),
    replies: value.replies.map(toConversationReplyResponse),
  };
}

export function toHobbyFeedResponse(value: HobbyFeedPage): HobbyFeedPageResponseDto {
  return {
    data: value.data.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString(),
    })),
    nextCursor: value.nextCursor,
  };
}
