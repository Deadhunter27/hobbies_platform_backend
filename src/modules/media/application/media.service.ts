import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { newId } from '@shared/utils';
import {
  MediaAccessDeniedError,
  MediaAsset,
  MediaNotConfiguredError,
  MediaNotFoundError,
  MediaRejectedError,
  MEDIA_MAX_BYTES,
  jpegHasGpsMetadata,
  type MediaMimeType,
  type MediaPurpose,
} from '../domain';
import {
  MEDIA_REPOSITORY,
  OBJECT_STORAGE,
  type MediaRepository,
  type ObjectStorage,
} from './ports/media.ports';

export const UPLOAD_URL_TTL_SECONDS = 5 * 60;
export const READ_URL_TTL_SECONDS = 15 * 60;
/** EXIF lives in the first segments; 128 KB covers any realistic APP1 block. */
const METADATA_SCAN_BYTES = 128 * 1024;

export interface UploadTicket {
  media: MediaAsset;
  uploadUrl: string;
  expiresAt: Date;
}

/**
 * The one pipeline every photo goes through (ADR-0030): initiate → direct
 * upload → verify → attach. Other modules use `assertAttachable`, `signedUrl`
 * and `discard`; they never touch storage themselves.
 */
@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly repository: MediaRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  get configured(): boolean {
    return this.storage.configured;
  }

  async initiate(
    actor: Actor,
    input: { purpose: MediaPurpose; mimeType: MediaMimeType; sizeBytes: number },
    now = new Date(),
  ): Promise<UploadTicket> {
    this.assertConfigured();
    if (input.sizeBytes > MEDIA_MAX_BYTES) {
      throw new MediaRejectedError('TOO_LARGE', 'Photos can be at most 8 MB.');
    }
    const media = await this.repository.create(
      MediaAsset.pending({ id: newId(), ownerUserId: actor.id, ...input }, now),
    );
    const uploadUrl = await this.storage.presignUpload(
      media.objectKey,
      media.mimeType,
      UPLOAD_URL_TTL_SECONDS,
    );
    return { media, uploadUrl, expiresAt: new Date(now.getTime() + UPLOAD_URL_TTL_SECONDS * 1000) };
  }

  async complete(actor: Actor, mediaId: string): Promise<MediaAsset> {
    this.assertConfigured();
    const media = await this.owned(actor, mediaId);
    if (media.status === 'ready') return media;
    if (media.status !== 'pending') throw new MediaNotFoundError(mediaId);

    const stored = await this.storage.head(media.objectKey);
    if (!stored) {
      throw new MediaRejectedError('MISSING_UPLOAD', 'The photo has not finished uploading yet.');
    }
    const reject = async (
      reason: 'TOO_LARGE' | 'TYPE_MISMATCH' | 'LOCATION_METADATA',
      message: string,
    ) => {
      await this.storage.delete(media.objectKey);
      await this.repository.save(media.markDeleted());
      throw new MediaRejectedError(reason, message);
    };
    if (stored.sizeBytes > MEDIA_MAX_BYTES)
      await reject('TOO_LARGE', 'Photos can be at most 8 MB.');
    if (stored.contentType && stored.contentType !== media.mimeType) {
      await reject('TYPE_MISMATCH', 'The uploaded file is not the declared image type.');
    }
    if (media.mimeType === 'image/jpeg') {
      const start = await this.storage.readStart(media.objectKey, METADATA_SCAN_BYTES);
      if (jpegHasGpsMetadata(start)) {
        await reject(
          'LOCATION_METADATA',
          'This photo still contains location data. Please try again.',
        );
      }
    }
    return this.repository.save(media.markReady(stored.sizeBytes));
  }

  /** Ensures a ready photo of the right purpose, owned by the user, before linking it. */
  async assertAttachable(
    ownerUserId: string,
    mediaId: string,
    purpose: MediaPurpose,
  ): Promise<MediaAsset> {
    const media = await this.repository.findById(mediaId);
    if (!media || media.status === 'deleted') throw new MediaNotFoundError(mediaId);
    if (media.ownerUserId !== ownerUserId) throw new MediaAccessDeniedError();
    if (media.purpose !== purpose) {
      throw new MediaRejectedError('WRONG_PURPOSE', 'This photo was uploaded for something else.');
    }
    if (media.status !== 'ready') {
      throw new MediaRejectedError('NOT_READY', 'Finish uploading the photo first.');
    }
    return media;
  }

  /** Short-lived read URL, or null when the photo is missing, hidden or storage is off. */
  async signedUrl(mediaId: string | null): Promise<string | null> {
    if (!mediaId || !this.storage.configured) return null;
    const media = await this.repository.findById(mediaId);
    if (!media || !media.isViewable) return null;
    return this.storage.presignDownload(media.objectKey, READ_URL_TTL_SECONDS);
  }

  async delete(actor: Actor, mediaId: string): Promise<void> {
    const media = await this.owned(actor, mediaId);
    await this.discardAsset(media);
  }

  /** Called by owning modules when a photo is replaced or its content is deleted. */
  async discard(mediaId: string | null): Promise<void> {
    if (!mediaId) return;
    const media = await this.repository.findById(mediaId);
    if (media) await this.discardAsset(media);
  }

  private async discardAsset(media: MediaAsset): Promise<void> {
    if (media.status === 'deleted') return;
    if (this.storage.configured) await this.storage.delete(media.objectKey);
    await this.repository.save(media.markDeleted());
  }

  private async owned(actor: Actor, mediaId: string): Promise<MediaAsset> {
    const media = await this.repository.findById(mediaId);
    if (!media || media.status === 'deleted') throw new MediaNotFoundError(mediaId);
    if (media.ownerUserId !== actor.id) throw new MediaAccessDeniedError();
    return media;
  }

  private assertConfigured(): void {
    if (!this.storage.configured) throw new MediaNotConfiguredError();
  }
}
