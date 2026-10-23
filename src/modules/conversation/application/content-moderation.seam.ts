import { Inject, Injectable } from '@nestjs/common';
import { ReplyNotFoundError } from '../domain';
import { SetConversationStatusUseCase } from './conversation-status.use-case';
import { POST_REPOSITORY, type PostRepository } from './ports/post.repository.port';

/**
 * Public seam for the moderation module (ADR-0036): check that a post or
 * reply can be reported, and hide or restore it. Author-deleted content
 * stays deleted.
 */
@Injectable()
export class ConversationModerationSeam {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly setPostStatus: SetConversationStatusUseCase,
  ) {}

  async postIsVisible(id: string): Promise<boolean> {
    return (await this.posts.findPost(id, null)) !== null;
  }

  async replyIsVisible(id: string): Promise<boolean> {
    return (await this.posts.findReply(id)) !== null;
  }

  async setPostVisible(id: string, visible: boolean, now = new Date()): Promise<void> {
    await this.setPostStatus.execute(id, visible ? 'published' : 'archived', now);
  }

  async setReplyVisible(id: string, visible: boolean, now = new Date()): Promise<void> {
    if (!(await this.posts.setReplyVisibility(id, visible, now))) throw new ReplyNotFoundError(id);
  }
}
