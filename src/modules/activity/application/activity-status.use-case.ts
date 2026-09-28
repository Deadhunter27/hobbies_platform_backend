import { Inject, Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { ActivityNotFoundError, type Activity, type ActivityStatus } from '../domain';
import { ACTIVITY_REPOSITORY, type ActivityRepository } from './ports/activity.repository.port';

@Injectable()
export class SetActivityStatusUseCase {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly repository: ActivityRepository) {}

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
