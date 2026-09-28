import { ConflictError, ForbiddenError, NotFoundError } from '@shared/errors';

export class ProgressReflectionNotFoundError extends NotFoundError {
  constructor(activityId: string) {
    super(
      `No progress reflection exists for activity "${activityId}".`,
      undefined,
      'PROGRESS_REFLECTION_NOT_FOUND',
    );
  }
}

export class ProgressActivityMismatchError extends ConflictError {
  constructor(activityId: string, hobbyId: string) {
    super(
      `Activity "${activityId}" does not belong to hobby "${hobbyId}".`,
      undefined,
      'PROGRESS_ACTIVITY_HOBBY_MISMATCH',
    );
  }
}

export class ProgressCommitmentRequiredError extends ConflictError {
  constructor(activityId: string) {
    super(
      `Activity "${activityId}" must be committed before progress can be recorded.`,
      undefined,
      'PROGRESS_COMMITMENT_REQUIRED',
    );
  }
}

export class ProgressAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Progress access denied.', undefined, 'PROGRESS_ACCESS_DENIED');
  }
}
