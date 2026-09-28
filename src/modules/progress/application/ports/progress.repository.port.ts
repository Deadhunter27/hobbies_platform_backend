import type { ProgressReflection } from '../../domain';

export const PROGRESS_REPOSITORY = Symbol('PROGRESS_REPOSITORY');

export interface ProgressRepository {
  findByUserActivity(userId: string, activityId: string): Promise<ProgressReflection | null>;
  listByUserHobby(userId: string, hobbyId: string): Promise<ProgressReflection[]>;
  save(reflection: ProgressReflection): Promise<ProgressReflection>;
}
