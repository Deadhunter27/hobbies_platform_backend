import type { LikeTarget, PostPage, PostRecord, ReplyRecord } from '../../domain';

export const POST_REPOSITORY = Symbol('POST_REPOSITORY');

export interface NewPost {
  id: string;
  hobbyId: string;
  authorId: string;
  authorDisplayName: string;
  title: string | null;
  body: string;
  communityReferenceId: string | null;
  activityReferenceId: string | null;
  mediaIds: string[];
  createdAt: Date;
}

export interface NewReply {
  id: string;
  postId: string;
  parentReplyId: string | null;
  authorId: string;
  authorDisplayName: string;
  body: string;
  mediaIds: string[];
  createdAt: Date;
}

export interface ReplyRef {
  id: string;
  postId: string;
  parentReplyId: string | null;
  authorId: string;
}

export interface PostRepository {
  listPosts(input: {
    hobbyId: string | null;
    communityId: string | null;
    authorId: string | null;
    /** Restrict to these authors (the Following feed); null = everyone. */
    authorIds: string[] | null;
    viewerId: string | null;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }): Promise<PostPage>;
  findPost(id: string, viewerId: string | null): Promise<PostRecord | null>;
  listReplies(postId: string, viewerId: string | null): Promise<ReplyRecord[]>;
  findReply(id: string): Promise<ReplyRef | null>;
  /** Inserts the post and its attachments atomically. */
  createPost(post: NewPost): Promise<void>;
  createReply(reply: NewReply): Promise<void>;
  setLike(target: LikeTarget, targetId: string, userId: string, liked: boolean): Promise<void>;
  /** Soft-deletes; returns the attached media ids so storage can be released. */
  deletePost(id: string, now: Date): Promise<string[]>;
  deleteReply(id: string, now: Date): Promise<string[]>;
  /** Moderation: hide (archived) or restore (published) one reply. False if not found. */
  setReplyVisibility(id: string, visible: boolean, now: Date): Promise<boolean>;
}
