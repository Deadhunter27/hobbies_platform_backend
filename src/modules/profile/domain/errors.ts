import { ConflictError, NotFoundError } from '@shared/errors';

export class HobbyContextNotFoundError extends NotFoundError {
  constructor(hobbyId: string) {
    super(`No hobby context exists for hobby "${hobbyId}".`, undefined, 'HOBBY_CONTEXT_NOT_FOUND');
  }
}

export class HandleTakenError extends ConflictError {
  constructor(handle: string) {
    super(
      `The handle "@${handle}" is already taken.`,
      [{ path: 'handle', message: 'taken' }],
      'HANDLE_TAKEN',
    );
  }
}
