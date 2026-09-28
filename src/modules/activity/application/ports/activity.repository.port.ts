import type { TxContext } from '@shared/application';
import type { Activity, ActivityCommitment, ActivityStatus } from '../../domain';

export interface ActivitySnapshot {
  activity: Activity;
  committedCount: number;
}

export interface ActivityRepository {
  listPublished(now: Date, hobbyId?: string): Promise<ActivitySnapshot[]>;
  findVisibleById(activityId: string): Promise<ActivitySnapshot | null>;
  findById(activityId: string, tx?: TxContext): Promise<Activity | null>;
  listCommitments(userId: string): Promise<ActivityCommitment[]>;
  findCommitment(userId: string, activityId: string): Promise<ActivityCommitment | null>;
  saveCommitment(commitment: ActivityCommitment, activity: Activity): Promise<ActivityCommitment>;
  updateStatus(
    input: { id: string; status: ActivityStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Activity | null>;
}

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');
