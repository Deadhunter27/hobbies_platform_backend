import type { TxContext } from '@shared/application';
import type { Activity, ActivityStatus } from '../../domain';

export const ACTIVITY_LIFECYCLE_REPOSITORY = Symbol('ACTIVITY_LIFECYCLE_REPOSITORY');

export interface ActivityLifecycleRepository {
  findById(activityId: string, tx?: TxContext): Promise<Activity | null>;
  updateStatus(
    input: { id: string; status: ActivityStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Activity | null>;
}
