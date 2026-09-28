import { Inject, Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { ActivityNotFoundError, type Activity, type ActivityStatus } from '../domain';
import {
  ACTIVITY_LIFECYCLE_REPOSITORY,
  type ActivityLifecycleRepository,
} from './ports/activity-lifecycle.repository.port';

@Injectable()
export class SetActivityStatusUseCase {
  constructor(
    @Inject(ACTIVITY_LIFECYCLE_REPOSITORY)
    private readonly repository: ActivityLifecycleRepository,
  ) {}

  async execute(
    activityId: string,
    status: ActivityStatus,
    now = new Date(),
    tx?: TxContext,
  ): Promise<Activity> {
    const existing = await this.repository.findById(activityId, tx);
    if (!existing) throw new ActivityNotFoundError(activityId);
    if (existing.status === status) return existing;

    const updated = await this.repository.updateStatus(
      { id: activityId, status, updatedAt: now },
      tx,
    );
    if (!updated) throw new ActivityNotFoundError(activityId);
    return updated;
  }
}
