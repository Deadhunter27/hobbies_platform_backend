import { ConflictError, NotFoundError } from '@shared/errors';

export class PersonNotFoundError extends NotFoundError {
  constructor(ref: string) {
    super(`Person "${ref}" was not found.`, undefined, 'PERSON_NOT_FOUND');
  }
}

export class CannotFollowSelfError extends ConflictError {
  constructor() {
    super('You cannot follow yourself.', undefined, 'CANNOT_FOLLOW_SELF');
  }
}
