import { ForbiddenError, NotFoundError } from '@shared/errors';

export class CommunityNotFoundError extends NotFoundError {
  constructor(reference: string) {
    super(`Community "${reference}" was not found.`, undefined, 'COMMUNITY_NOT_FOUND');
  }
}

export class CommunityMembershipNotFoundError extends NotFoundError {
  constructor(communityId: string) {
    super(
      `No membership exists for community "${communityId}".`,
      undefined,
      'COMMUNITY_MEMBERSHIP_NOT_FOUND',
    );
  }
}

export class CommunityAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Community membership access denied.', undefined, 'COMMUNITY_ACCESS_DENIED');
  }
}
