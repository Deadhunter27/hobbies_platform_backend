import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database';
import type { MediaRepository } from '../application';
import { MediaAsset, type MediaMimeType } from '../domain';

type MediaRow = Awaited<ReturnType<PrismaService['mediaAsset']['findUniqueOrThrow']>>;

function toDomain(row: MediaRow): MediaAsset {
  return MediaAsset.reconstitute({ ...row, mimeType: row.mimeType as MediaMimeType });
}

@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(asset: MediaAsset): Promise<MediaAsset> {
    const row = await this.prisma.mediaAsset.create({
      data: {
        id: asset.id,
        ownerUserId: asset.ownerUserId,
        purpose: asset.purpose,
        status: asset.status,
        objectKey: asset.objectKey,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<MediaAsset | null> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findMany(ids: string[]): Promise<MediaAsset[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.mediaAsset.findMany({ where: { id: { in: ids } } });
    return rows.map(toDomain);
  }

  async save(asset: MediaAsset): Promise<MediaAsset> {
    const row = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: asset.status,
        sizeBytes: asset.sizeBytes,
        deletedAt: asset.deletedAt,
      },
    });
    return toDomain(row);
  }
}
