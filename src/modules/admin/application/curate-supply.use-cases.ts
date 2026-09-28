import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access/domain';
import { SetActivityStatusUseCase } from '@modules/activity/application/activity-status.use-case';
import type { Activity, ActivityStatus } from '@modules/activity/domain';
import { SetCommunityStatusUseCase } from '@modules/community/application/community-status.use-case';
import type { Community, CommunityStatus } from '@modules/community/domain';
import { AUDIT_WRITER, UNIT_OF_WORK, type AuditWriter, type UnitOfWork } from '@shared/application';
import { AdminAuthorization } from './admin-authorization';

function activityAction(status: ActivityStatus): string {
  if (status === 'published') return 'activity.publish';
  if (status === 'cancelled') return 'activity.cancel';
  if (status === 'completed') return 'activity.complete';
  return 'activity.draft';
}

function communityAction(status: CommunityStatus): string {
  if (status === 'published') return 'community.publish';
  if (status === 'archived') return 'community.archive';
  return 'community.draft';
}

@Injectable()
export class CurateActivityUseCase {
  constructor(
    private readonly authorization: AdminAuthorization,
    private readonly setActivityStatus: SetActivityStatusUseCase,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(
    actor: Actor,
    activityId: string,
    status: ActivityStatus,
    now = new Date(),
  ): Promise<Activity> {
    await this.authorization.assertCanManagePlatform(actor);
    return this.uow.run(async (tx) => {
      const activity = await this.setActivityStatus.execute(activityId, status, now, tx);
      await this.audit.write(
        {
          actorId: actor.id,
          action: activityAction(status),
          resourceType: 'activity',
          resourceId: activityId,
          metadata: { status },
        },
        tx,
      );
      return activity;
    });
  }
}

@Injectable()
export class CurateCommunityUseCase {
  constructor(
    private readonly authorization: AdminAuthorization,
    private readonly setCommunityStatus: SetCommunityStatusUseCase,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async execute(
    actor: Actor,
    communityId: string,
    status: CommunityStatus,
    now = new Date(),
  ): Promise<Community> {
    await this.authorization.assertCanManagePlatform(actor);
    return this.uow.run(async (tx) => {
      const community = await this.setCommunityStatus.execute(communityId, status, now, tx);
      await this.audit.write(
        {
          actorId: actor.id,
          action: communityAction(status),
          resourceType: 'community',
          resourceId: communityId,
          metadata: { status },
        },
        tx,
      );
      return community;
    });
  }
}
