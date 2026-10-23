import { Injectable } from '@nestjs/common';
import { GetActivityUseCase, SetActivityStatusUseCase } from '@modules/activity';
import { GetCommunityUseCase, SetCommunityStatusUseCase } from '@modules/community';
import { ConversationModerationSeam } from '@modules/conversation';
import { PublicIdentityService } from '@modules/identity';
import type { ModerationTargets } from '../application';
import type { ReportTarget } from '../domain';

/**
 * Reaches content through each owning module's public seam (ADR-0036).
 * Hidden communities and events go back to draft; posts and replies to
 * archived. Nothing here can undo an author's own deletion.
 */
@Injectable()
export class ModuleModerationTargets implements ModerationTargets {
  constructor(
    private readonly conversation: ConversationModerationSeam,
    private readonly getCommunity: GetCommunityUseCase,
    private readonly setCommunityStatus: SetCommunityStatusUseCase,
    private readonly getActivity: GetActivityUseCase,
    private readonly setActivityStatus: SetActivityStatusUseCase,
    private readonly identity: PublicIdentityService,
  ) {}

  async exists(target: ReportTarget): Promise<boolean> {
    switch (target.type) {
      case 'post':
        return this.conversation.postIsVisible(target.id);
      case 'reply':
        return this.conversation.replyIsVisible(target.id);
      case 'community':
        return this.getCommunity
          .execute(target.id)
          .then(() => true)
          .catch(() => false);
      case 'event':
        return this.getActivity
          .execute(target.id)
          .then((view) => view.activity.status === 'published')
          .catch(() => false);
      case 'person':
        return (await this.identity.findActive([target.id])).length > 0;
    }
  }

  async setVisible(target: ReportTarget, visible: boolean, now: Date): Promise<void> {
    switch (target.type) {
      case 'post':
        return this.conversation.setPostVisible(target.id, visible, now);
      case 'reply':
        return this.conversation.setReplyVisible(target.id, visible, now);
      case 'community':
        await this.setCommunityStatus.execute(target.id, visible ? 'published' : 'draft', now);
        return;
      case 'event':
        await this.setActivityStatus.execute(target.id, visible ? 'published' : 'draft', now);
        return;
      case 'person':
        return;
    }
  }
}
