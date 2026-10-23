/**
 * ADR-0032: a Post is a Conversation shown Threads-style. Same table, so the
 * W9 contract keeps working; title becomes optional and posts gain photos,
 * likes and one level of nested replies.
 */
export const MAX_POST_MEDIA = 4;
export type LikeTarget = 'conversation' | 'reply';

export interface PostRecord {
  id: string;
  hobbyId: string;
  authorId: string;
  authorDisplayName: string;
  title: string | null;
  body: string;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
  mediaIds: string[];
  likeCount: number;
  replyCount: number;
  likedByViewer: boolean;
  createdAt: Date;
}

export interface ReplyRecord {
  id: string;
  postId: string;
  parentReplyId: string | null;
  authorId: string;
  authorDisplayName: string;
  body: string;
  mediaIds: string[];
  likeCount: number;
  likedByViewer: boolean;
  createdAt: Date;
}

export interface PostPage {
  data: PostRecord[];
  nextCursor: string | null;
}

/**
 * How many of a post's photos a viewer may open. Signed-in viewers see all;
 * signed-out viewers see a share of them (rounded up, never zero) as a
 * preview that invites them to join.
 */
export function visibleMediaCount(
  total: number,
  signedIn: boolean,
  signedOutRatio: number,
): number {
  if (signedIn || total === 0) return total;
  return Math.min(total, Math.max(1, Math.ceil(total * signedOutRatio)));
}
