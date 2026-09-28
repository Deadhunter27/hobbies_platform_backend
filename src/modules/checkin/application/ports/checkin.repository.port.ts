import type { CheckIn, CheckInKind } from '../../domain';

export const CHECK_IN_REPOSITORY = Symbol('CHECK_IN_REPOSITORY');

export interface CheckInRepository {
  findByUserActivityKind(
    userId: string,
    activityId: string,
    kind: CheckInKind,
  ): Promise<CheckIn | null>;
  findByIdForUser(checkInId: string, userId: string): Promise<CheckIn | null>;
  save(checkIn: CheckIn): Promise<CheckIn>;
}
