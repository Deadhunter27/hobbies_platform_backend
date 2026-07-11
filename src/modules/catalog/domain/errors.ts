import { NotFoundError } from '@shared/errors';

export class HobbyNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super(`Hobby "${identifier}" was not found.`, undefined, 'HOBBY_NOT_FOUND');
  }
}

export class HobbyCategoryNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super(`Hobby category "${identifier}" was not found.`, undefined, 'HOBBY_CATEGORY_NOT_FOUND');
  }
}
