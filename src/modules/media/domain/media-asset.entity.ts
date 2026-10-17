import { Entity } from '@shared/domain';

export const MEDIA_PURPOSES = [
  'avatar',
  'activity_record',
  'conversation',
  'community_cover',
  'activity_cover',
] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];

export type MediaStatus = 'pending' | 'ready' | 'deleted';

/** ADR-0030 limits. The bucket enforces the same size and types as a second layer. */
export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;

const EXTENSION: Record<MediaMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Server-generated storage key; never derived from the user's filename. */
export function mediaObjectKey(
  ownerUserId: string,
  purpose: MediaPurpose,
  mediaId: string,
  mimeType: MediaMimeType,
): string {
  return `u/${ownerUserId}/${purpose}/${mediaId}.${EXTENSION[mimeType]}`;
}

export interface MediaAssetProps {
  id: string;
  ownerUserId: string;
  purpose: MediaPurpose;
  status: MediaStatus;
  objectKey: string;
  mimeType: MediaMimeType;
  sizeBytes: number;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class MediaAsset extends Entity {
  private constructor(private readonly props: MediaAssetProps) {
    super(props.id);
  }

  static reconstitute(props: MediaAssetProps): MediaAsset {
    return new MediaAsset(props);
  }

  static pending(
    input: {
      id: string;
      ownerUserId: string;
      purpose: MediaPurpose;
      mimeType: MediaMimeType;
      sizeBytes: number;
    },
    now = new Date(),
  ): MediaAsset {
    return new MediaAsset({
      ...input,
      status: 'pending',
      objectKey: mediaObjectKey(input.ownerUserId, input.purpose, input.id, input.mimeType),
      hidden: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  markReady(sizeBytes: number, now = new Date()): MediaAsset {
    return new MediaAsset({ ...this.props, status: 'ready', sizeBytes, updatedAt: now });
  }

  markDeleted(now = new Date()): MediaAsset {
    return new MediaAsset({ ...this.props, status: 'deleted', updatedAt: now, deletedAt: now });
  }

  /** Readable by viewers allowed to see the owning content. */
  get isViewable(): boolean {
    return this.props.status === 'ready' && !this.props.hidden;
  }

  get ownerUserId(): string {
    return this.props.ownerUserId;
  }
  get purpose(): MediaPurpose {
    return this.props.purpose;
  }
  get status(): MediaStatus {
    return this.props.status;
  }
  get objectKey(): string {
    return this.props.objectKey;
  }
  get mimeType(): MediaMimeType {
    return this.props.mimeType;
  }
  get sizeBytes(): number {
    return this.props.sizeBytes;
  }
  get hidden(): boolean {
    return this.props.hidden;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
}
