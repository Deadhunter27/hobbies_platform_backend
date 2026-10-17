import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@shared/errors';

export class MediaNotConfiguredError extends ConflictError {
  constructor() {
    super(
      'Photo upload is not configured on this Wayfinder environment yet.',
      [],
      'MEDIA_NOT_CONFIGURED',
    );
  }
}

export class MediaNotFoundError extends NotFoundError {
  constructor(mediaId: string) {
    super(`No media "${mediaId}" exists.`, undefined, 'MEDIA_NOT_FOUND');
  }
}

export class MediaAccessDeniedError extends ForbiddenError {
  constructor() {
    super('You can only manage your own photos.', undefined, 'MEDIA_ACCESS_DENIED');
  }
}

export type MediaRejectionReason =
  | 'MISSING_UPLOAD'
  | 'TOO_LARGE'
  | 'TYPE_MISMATCH'
  | 'LOCATION_METADATA'
  | 'WRONG_PURPOSE'
  | 'NOT_READY';

export class MediaRejectedError extends ValidationError {
  constructor(reason: MediaRejectionReason, message: string) {
    super(message, [{ path: 'media', message: reason }], 'MEDIA_REJECTED');
  }
}
