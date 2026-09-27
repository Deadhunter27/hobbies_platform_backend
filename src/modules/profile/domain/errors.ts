import { NotFoundError } from '@shared/errors';

export class HobbyContextNotFoundError extends NotFoundError {
  constructor(hobbyId: string) {
    super(`No hobby context exists for hobby "${hobbyId}".`, undefined, 'HOBBY_CONTEXT_NOT_FOUND');
  }
}
