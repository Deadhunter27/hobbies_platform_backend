import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '@config/index';
import { MediaNotConfiguredError } from '../domain';
import type { ObjectStorage, StoredObject } from '../application';

/** Supabase Storage through its S3-compatible API (path-style addressing). */
@Injectable()
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const media = config.mediaStorage;
    this.bucket = media?.bucket ?? null;
    this.client = media
      ? new S3Client({
          endpoint: media.endpoint,
          region: media.region,
          forcePathStyle: true,
          credentials: { accessKeyId: media.accessKeyId, secretAccessKey: media.secretAccessKey },
        })
      : null;
  }

  get configured(): boolean {
    return this.client !== null;
  }

  async presignUpload(key: string, contentType: string, expiresInSeconds: number): Promise<string> {
    const { client, bucket } = this.ready();
    return getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      {
        expiresIn: expiresInSeconds,
      },
    );
  }

  async presignDownload(key: string, expiresInSeconds: number): Promise<string> {
    const { client, bucket } = this.ready();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async head(key: string): Promise<StoredObject | null> {
    const { client, bucket } = this.ready();
    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status === 404) return null;
      throw error;
    }
  }

  async readStart(key: string, bytes: number): Promise<Uint8Array> {
    const { client, bucket } = this.ready();
    const result = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
    );
    return result.Body ? await result.Body.transformToByteArray() : new Uint8Array();
  }

  async delete(key: string): Promise<void> {
    const { client, bucket } = this.ready();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  private ready(): { client: S3Client; bucket: string } {
    if (!this.client || !this.bucket) throw new MediaNotConfiguredError();
    return { client: this.client, bucket: this.bucket };
  }
}
