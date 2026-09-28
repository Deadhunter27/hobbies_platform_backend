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
