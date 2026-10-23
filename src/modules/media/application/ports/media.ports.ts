import type { MediaAsset } from '../../domain';

export interface MediaRepository {
  create(asset: MediaAsset): Promise<MediaAsset>;
  findById(id: string): Promise<MediaAsset | null>;
  findMany(ids: string[]): Promise<MediaAsset[]>;
  save(asset: MediaAsset): Promise<MediaAsset>;
}

export interface StoredObject {
  sizeBytes: number;
  contentType: string | null;
}

/** S3-compatible object storage (ADR-0003/0030). */
export interface ObjectStorage {
  readonly configured: boolean;
  presignUpload(key: string, contentType: string, expiresInSeconds: number): Promise<string>;
  presignDownload(key: string, expiresInSeconds: number): Promise<string>;
  head(key: string): Promise<StoredObject | null>;
  readStart(key: string, bytes: number): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
