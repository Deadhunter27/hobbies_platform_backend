import { ConflictError, DomainRuleViolation, NotFoundError } from '@shared/errors';

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

export class HobbySlugAlreadyExistsError extends ConflictError {
  constructor(slug: string) {
    super(`A hobby with slug "${slug}" already exists.`, undefined, 'HOBBY_SLUG_ALREADY_EXISTS');
  }
}

export class HobbyCategorySlugAlreadyExistsError extends ConflictError {
  constructor(slug: string) {
    super(
      `A hobby category with slug "${slug}" already exists.`,
      undefined,
      'HOBBY_CATEGORY_SLUG_ALREADY_EXISTS',
    );
  }
}

export class HobbyCategoryHierarchyError extends DomainRuleViolation {
  constructor(message = 'A hobby category cannot be its own ancestor.') {
    super(message, undefined, 'HOBBY_CATEGORY_INVALID_HIERARCHY');
  }
}
