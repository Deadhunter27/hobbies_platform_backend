import { NotFoundError } from '@shared/errors';

export class CheckInNotFoundError extends NotFoundError {
  constructor(checkInId: string) {
    super(`Check-in "${checkInId}" was not found.`, undefined, 'CHECK_IN_NOT_FOUND');
  }
}
