import type { Actor } from '@modules/access';
import type { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import type { MediaService, ViewableMedia } from '@modules/media';
import type { PublicProfileService } from '@modules/profile';
import type { PlatformSettingsService } from '@modules/settings';
import type { LikeTarget, PostRecord, ReplyRecord } from '../domain';
import type { ConversationAuthorization } from './authorization';
import type { NewPost, NewReply, PostRepository, ReplyRef } from './ports/post.repository.port';
import { PostViewAssembler } from './post-view.assembler';
import {
  CreatePostUseCase,
  DeleteOwnContentUseCase,
  GetPostUseCase,
  ReplyToPostUseCase,
  SetLikeUseCase,
} from './post.use-cases';

const HOBBY = '01HZZZZZZZZZZZZZZZZZZZZZH1';
const alice = { id: '01HZZZZZZZZZZZZZZZZZZZZZA1', displayName: 'Alice' } as Actor;
const bob = { id: '01HZZZZZZZZZZZZZZZZZZZZZB1', displayName: 'Bob' } as Actor;

class MemoryPosts implements PostRepository {
  posts = new Map<string, NewPost & { deleted?: boolean }>();
  replies = new Map<string, NewReply & { deleted?: boolean }>();
  likes = new Set<string>();

  async listPosts() {
    return { data: [], nextCursor: null };
  }
  async findPost(id: string, viewerId: string | null): Promise<PostRecord | null> {
    const post = this.posts.get(id);
    if (!post || post.deleted) return null;
    return {
      ...post,
      likeCount: [...this.likes].filter((key) => key.startsWith(`conversation:${id}:`)).length,
      replyCount: [...this.replies.values()].filter((r) => r.postId === id && !r.deleted).length,
      likedByViewer: this.likes.has(`conversation:${id}:${viewerId}`),
    };
  }
  async listReplies(postId: string, viewerId: string | null): Promise<ReplyRecord[]> {
    return [...this.replies.values()]
      .filter((reply) => reply.postId === postId && !reply.deleted)
      .map((reply) => ({
        ...reply,
        likeCount: 0,
        likedByViewer: this.likes.has(`reply:${reply.id}:${viewerId}`),
      }));
  }
  async findReply(id: string): Promise<ReplyRef | null> {
    const reply = this.replies.get(id);
    return reply && !reply.deleted ? reply : null;
  }
  async createPost(post: NewPost) {
    this.posts.set(post.id, post);
  }
  async createReply(reply: NewReply) {
    this.replies.set(reply.id, reply);
  }
  async setLike(target: LikeTarget, targetId: string, userId: string, liked: boolean) {
    const key = `${target}:${targetId}:${userId}`;
    if (liked) this.likes.add(key);
    else this.likes.delete(key);
  }
  async deletePost(id: string) {
    const post = this.posts.get(id)!;
    post.deleted = true;
    return post.mediaIds;
  }
  async deleteReply(id: string) {
    for (const reply of this.replies.values()) {
      if (reply.id === id || reply.parentReplyId === id) reply.deleted = true;
    }
    return [];
  }
}

function setup(options: { ratio?: number } = {}) {
  const repository = new MemoryPosts();
  const attachable: string[] = [];
  const discarded: string[] = [];
  const media = {
    assertAttachable: async (_owner: string, id: string) => {
      attachable.push(id);
    },
    viewable: async (ids: string[]) =>
      new Map<string, ViewableMedia>(
        ids.map((id) => [id, { id, mimeType: 'image/jpeg', url: `https://cdn.test/${id}` }]),
      ),
    discard: async (id: string | null) => {
      if (id) discarded.push(id);
    },
  } as unknown as MediaService;
  const profiles = {
    summaries: async (ids: string[]) =>
      new Map(ids.map((id) => [id, { userId: id, handle: null, avatarUrl: null }])),
  } as unknown as PublicProfileService;
  const settings = {
    get: async () => options.ratio ?? 0.2,
  } as unknown as PlatformSettingsService;
  const getHobby = {
    execute: async () => ({ id: HOBBY, name: 'Running', slug: 'running' }),
  } as unknown as GetHobbyUseCase;
  const authorization = {
    assertCanWrite: async () => undefined,
  } as unknown as ConversationAuthorization;
  const assembler = new PostViewAssembler(profiles, media, settings, getHobby);
  const getPost = new GetPostUseCase(repository, assembler);
  return {
    repository,
    attachable,
    discarded,
    getPost,
    create: new CreatePostUseCase(authorization, getHobby, media, repository, getPost),
    reply: new ReplyToPostUseCase(authorization, media, repository, assembler),
    like: new SetLikeUseCase(authorization, repository),
    remove: new DeleteOwnContentUseCase(authorization, media, repository),
  };
}

const MEDIA = [
  '01HZZZZZZZZZZZZZZZZZZZZZM1',
  '01HZZZZZZZZZZZZZZZZZZZZZM2',
  '01HZZZZZZZZZZZZZZZZZZZZZM3',
  '01HZZZZZZZZZZZZZZZZZZZZZM4',
];

function postInput(overrides: Partial<Parameters<CreatePostUseCase['execute']>[1]> = {}) {
  return {
    hobbyId: HOBBY,
    title: null,
    body: 'Long run done',
    mediaIds: [],
    communityReferenceId: null,
    activityReferenceId: null,
    ...overrides,
  };
}

describe('Threads-style posts', () => {
  it('creates a post with checked photos and returns it as the author sees it', async () => {
    const { create, attachable } = setup();
    const post = await create.execute(alice, postInput({ mediaIds: MEDIA }));
    expect(attachable).toEqual(MEDIA);
    expect(post).toMatchObject({
      isMine: true,
      likeCount: 0,
      replyCount: 0,
      hobby: { name: 'Running' },
    });
    expect(post.media.every((item) => !item.locked && item.url)).toBe(true);
  });

  it('locks most photos for signed-out viewers but shows them all once signed in', async () => {
    const { create, getPost } = setup({ ratio: 0.2 });
    const { id } = await create.execute(alice, postInput({ mediaIds: MEDIA }));

    const anonymous = await getPost.execute(null, id);
    expect(anonymous.post.media.map((item) => item.locked)).toEqual([false, true, true, true]);
    expect(anonymous.post.media[1]).toMatchObject({ url: null, mimeType: null });

    const signedIn = await getPost.execute(bob, id);
    expect(signedIn.post.media.every((item) => !item.locked)).toBe(true);
  });

  it('keeps replies one level deep: a reply to a nested reply joins the top-level thread', async () => {
    const { create, reply } = setup();
    const post = await create.execute(alice, postInput());
    const top = await reply.execute(bob, post.id, {
      body: 'Nice',
      parentReplyId: null,
      mediaIds: [],
    });
    const nested = await reply.execute(alice, post.id, {
      body: 'Thanks',
      parentReplyId: top.id,
      mediaIds: [],
    });
    const deeper = await reply.execute(bob, post.id, {
      body: 'Again',
      parentReplyId: nested.id,
      mediaIds: [],
    });
    expect(nested.parentReplyId).toBe(top.id);
    expect(deeper.parentReplyId).toBe(top.id);
  });

  it('rejects a parent reply from another post', async () => {
    const { create, reply } = setup();
    const first = await create.execute(alice, postInput());
    const second = await create.execute(alice, postInput());
    const other = await reply.execute(bob, first.id, {
      body: 'x',
      parentReplyId: null,
      mediaIds: [],
    });
    await expect(
      reply.execute(bob, second.id, { body: 'y', parentReplyId: other.id, mediaIds: [] }),
    ).rejects.toMatchObject({ code: 'REPLY_NOT_FOUND' });
  });

  it('likes are idempotent and reflected for the viewer', async () => {
    const { create, like, getPost } = setup();
    const post = await create.execute(alice, postInput());
    await like.execute(bob, 'conversation', post.id, true);
    await like.execute(bob, 'conversation', post.id, true);
    expect((await getPost.execute(bob, post.id)).post).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
    expect((await getPost.execute(alice, post.id)).post.likedByMe).toBe(false);
    await like.execute(bob, 'conversation', post.id, false);
    expect((await getPost.execute(bob, post.id)).post.likeCount).toBe(0);
  });

  it('only the author can delete a post, and its photos are released', async () => {
    const { create, remove, getPost, discarded } = setup();
    const post = await create.execute(alice, postInput({ mediaIds: MEDIA.slice(0, 2) }));
    await expect(remove.deletePost(bob, post.id)).rejects.toMatchObject({
      code: 'NOT_CONTENT_AUTHOR',
    });
    await remove.deletePost(alice, post.id);
    expect(discarded).toEqual(MEDIA.slice(0, 2));
    await expect(getPost.execute(alice, post.id)).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
  });

  it('deleting a reply also removes replies nested under it', async () => {
    const { create, reply, remove, getPost } = setup();
    const post = await create.execute(alice, postInput());
    const top = await reply.execute(bob, post.id, { body: 'a', parentReplyId: null, mediaIds: [] });
    await reply.execute(alice, post.id, { body: 'b', parentReplyId: top.id, mediaIds: [] });
    await expect(remove.deleteReply(alice, top.id)).rejects.toMatchObject({
      code: 'NOT_CONTENT_AUTHOR',
    });
    await remove.deleteReply(bob, top.id);
    expect((await getPost.execute(alice, post.id)).replies).toHaveLength(0);
  });
});
