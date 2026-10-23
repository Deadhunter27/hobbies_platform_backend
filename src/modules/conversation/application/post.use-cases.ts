import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import { MediaService } from '@modules/media';
import { FollowGraph } from '@modules/people';
import { InvalidCursorError, UnauthorizedError } from '@shared/errors';
import { decodeCursor, newId } from '@shared/utils';
import {
  NotContentAuthorError,
  PostNotFoundError,
  ReplyNotFoundError,
  type LikeTarget,
} from '../domain';
import { ConversationAuthorization } from './authorization';
import { POST_REPOSITORY, type PostRepository } from './ports/post.repository.port';
import { PostViewAssembler, type PostView, type ReplyView } from './post-view.assembler';

function pageCursor(raw?: string): { createdAt: Date; id: string } | null {
  if (!raw) return null;
  const decoded = decodeCursor(raw);
  const createdAt = new Date(decoded.name);
  if (Number.isNaN(createdAt.getTime())) throw new InvalidCursorError();
  return { createdAt, id: decoded.id };
}

export interface FeedPage {
  data: PostView[];
  nextCursor: string | null;
}

/** Chronological feed of posts (ADR-0032: no engagement ranking). */
@Injectable()
export class ListPostFeedUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly repository: PostRepository,
    private readonly assembler: PostViewAssembler,
    private readonly getHobby: GetHobbyUseCase,
    private readonly follows: FollowGraph,
  ) {}

  async execute(
    viewer: Actor | null,
    input: {
      hobbyId?: string;
      authorId?: string;
      following?: boolean;
      limit: number;
      cursor?: string;
    },
  ): Promise<FeedPage> {
    if (input.hobbyId) await this.getHobby.execute({ slugOrId: input.hobbyId });
    let authorIds: string[] | null = null;
    if (input.following) {
      if (!viewer) throw new UnauthorizedError('Sign in to see posts from people you follow.');
      authorIds = await this.follows.followeeIds(viewer.id);
    }
    const page = await this.repository.listPosts({
      hobbyId: input.hobbyId ?? null,
      authorId: input.authorId ?? null,
      authorIds,
      viewerId: viewer?.id ?? null,
      limit: input.limit,
      cursor: pageCursor(input.cursor),
    });
    return {
      data: await this.assembler.posts(page.data, viewer?.id ?? null),
      nextCursor: page.nextCursor,
    };
  }
}

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly repository: PostRepository,
    private readonly assembler: PostViewAssembler,
  ) {}

  async execute(
    viewer: Actor | null,
    postId: string,
  ): Promise<{ post: PostView; replies: ReplyView[] }> {
    const viewerId = viewer?.id ?? null;
    const record = await this.repository.findPost(postId, viewerId);
    if (!record) throw new PostNotFoundError(postId);
    const replies = await this.repository.listReplies(postId, viewerId);
    const [post] = await this.assembler.posts([record], viewerId);
    return { post: post!, replies: await this.assembler.replies(replies, viewerId) };
  }
}

export interface CreatePostInput {
  hobbyId: string;
  title: string | null;
  body: string;
  mediaIds: string[];
  communityReferenceId: string | null;
  activityReferenceId: string | null;
}

@Injectable()
export class CreatePostUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    private readonly getHobby: GetHobbyUseCase,
    private readonly media: MediaService,
    @Inject(POST_REPOSITORY) private readonly repository: PostRepository,
    private readonly getPost: GetPostUseCase,
  ) {}

  async execute(actor: Actor, input: CreatePostInput, now = new Date()): Promise<PostView> {
    await this.authorization.assertCanWrite(actor);
    const hobby = await this.getHobby.execute({ slugOrId: input.hobbyId });
    for (const mediaId of input.mediaIds) {
      await this.media.assertAttachable(actor.id, mediaId, 'conversation');
    }
    const id = newId();
    await this.repository.createPost({
      id,
      hobbyId: hobby.id,
      authorId: actor.id,
      authorDisplayName: actor.displayName,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      communityReferenceId: input.communityReferenceId,
      activityReferenceId: input.activityReferenceId,
      mediaIds: input.mediaIds,
      createdAt: now,
    });
    return (await this.getPost.execute(actor, id)).post;
  }
}

@Injectable()
export class ReplyToPostUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    private readonly media: MediaService,
    @Inject(POST_REPOSITORY) private readonly repository: PostRepository,
    private readonly assembler: PostViewAssembler,
  ) {}

  async execute(
    actor: Actor,
    postId: string,
    input: { body: string; parentReplyId: string | null; mediaIds: string[] },
    now = new Date(),
  ): Promise<ReplyView> {
    await this.authorization.assertCanWrite(actor);
    const post = await this.repository.findPost(postId, actor.id);
    if (!post) throw new PostNotFoundError(postId);

    // Threads-style: one visible level of nesting. Replying to a nested reply
    // attaches to its top-level parent so threads never grow sideways.
    let parentReplyId: string | null = null;
    if (input.parentReplyId) {
      const parent = await this.repository.findReply(input.parentReplyId);
      if (!parent || parent.postId !== postId) throw new ReplyNotFoundError(input.parentReplyId);
      parentReplyId = parent.parentReplyId ?? parent.id;
    }
    for (const mediaId of input.mediaIds) {
      await this.media.assertAttachable(actor.id, mediaId, 'conversation');
    }

    const id = newId();
    await this.repository.createReply({
      id,
      postId,
      parentReplyId,
      authorId: actor.id,
      authorDisplayName: actor.displayName,
      body: input.body.trim(),
      mediaIds: input.mediaIds,
      createdAt: now,
    });
    const replies = await this.repository.listReplies(postId, actor.id);
    const created = replies.filter((reply) => reply.id === id);
    const [view] = await this.assembler.replies(created, actor.id);
    return view!;
  }
}

@Injectable()
export class SetLikeUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    @Inject(POST_REPOSITORY) private readonly repository: PostRepository,
  ) {}

  async execute(actor: Actor, target: LikeTarget, targetId: string, liked: boolean): Promise<void> {
    await this.authorization.assertCanWrite(actor);
    if (target === 'conversation') {
      if (!(await this.repository.findPost(targetId, actor.id)))
        throw new PostNotFoundError(targetId);
    } else if (!(await this.repository.findReply(targetId))) {
      throw new ReplyNotFoundError(targetId);
    }
    await this.repository.setLike(target, targetId, actor.id, liked);
  }
}

@Injectable()
export class DeleteOwnContentUseCase {
  constructor(
    private readonly authorization: ConversationAuthorization,
    private readonly media: MediaService,
    @Inject(POST_REPOSITORY) private readonly repository: PostRepository,
  ) {}

  async deletePost(actor: Actor, postId: string, now = new Date()): Promise<void> {
    await this.authorization.assertCanWrite(actor);
    const post = await this.repository.findPost(postId, actor.id);
    if (!post) throw new PostNotFoundError(postId);
    if (post.authorId !== actor.id) throw new NotContentAuthorError();
    await this.release(await this.repository.deletePost(postId, now));
  }

  async deleteReply(actor: Actor, replyId: string, now = new Date()): Promise<void> {
    await this.authorization.assertCanWrite(actor);
    const reply = await this.repository.findReply(replyId);
    if (!reply) throw new ReplyNotFoundError(replyId);
    if (reply.authorId !== actor.id) throw new NotContentAuthorError();
    await this.release(await this.repository.deleteReply(replyId, now));
  }

  private async release(mediaIds: string[]): Promise<void> {
    for (const mediaId of mediaIds) await this.media.discard(mediaId);
  }
}
