import { ForbiddenError } from '@shared/errors';

export class AdminAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Staff management access denied.', undefined, 'ADMIN_ACCESS_DENIED');
  }
}
