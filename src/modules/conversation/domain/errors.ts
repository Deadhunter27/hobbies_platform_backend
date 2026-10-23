import { ForbiddenError, NotFoundError } from '@shared/errors';

export class ConversationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Conversation "${id}" was not found.`, undefined, 'CONVERSATION_NOT_FOUND');
  }
}

export class ConversationAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Conversation write access denied.', undefined, 'CONVERSATION_ACCESS_DENIED');
  }
}

export class PostNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Post "${id}" was not found.`, undefined, 'POST_NOT_FOUND');
  }
}

export class ReplyNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Reply "${id}" was not found.`, undefined, 'REPLY_NOT_FOUND');
  }
}

export class NotContentAuthorError extends ForbiddenError {
  constructor() {
    super('Only the author can do this.', undefined, 'NOT_CONTENT_AUTHOR');
  }
}
