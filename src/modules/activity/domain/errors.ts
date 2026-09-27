import { ConflictError, NotFoundError } from '@shared/errors';

export class ActivityNotFoundError extends NotFoundError {
  constructor(activityId: string) {
    super(`Activity "${activityId}" was not found.`, undefined, 'ACTIVITY_NOT_FOUND');
  }
}

export class ActivityCommitmentNotFoundError extends NotFoundError {
  constructor(activityId: string) {
    super(
      `No activity commitment exists for activity "${activityId}".`,
      undefined,
      'ACTIVITY_COMMITMENT_NOT_FOUND',
    );
  }
}

export class ActivityUnavailableError extends ConflictError {
  constructor(message = 'This activity is not currently available for commitment.') {
    super(message, undefined, 'ACTIVITY_UNAVAILABLE');
  }
}

export class ActivityCapacityFullError extends ConflictError {
  constructor() {
    super('This activity has reached its known capacity.', undefined, 'ACTIVITY_CAPACITY_FULL');
  }
}
