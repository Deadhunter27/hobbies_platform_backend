import type { Activity, ActivityCommitment } from '../../domain';

export interface ActivitySnapshot {
  activity: Activity;
  committedCount: number;
}

export interface ActivityRepository {
  listPublished(now: Date, hobbyId?: string): Promise<ActivitySnapshot[]>;
  findVisibleById(activityId: string): Promise<ActivitySnapshot | null>;
  listCommitments(userId: string): Promise<ActivityCommitment[]>;
  findCommitment(userId: string, activityId: string): Promise<ActivityCommitment | null>;
  saveCommitment(commitment: ActivityCommitment, activity: Activity): Promise<ActivityCommitment>;
}

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');
