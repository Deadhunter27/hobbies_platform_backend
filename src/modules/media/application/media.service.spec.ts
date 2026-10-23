import type { Actor } from '@modules/access';
import { MediaAsset } from '../domain';
import { MediaService } from './media.service';
import type { MediaRepository, ObjectStorage, StoredObject } from './ports/media.ports';

const owner = { id: '01HZZZZZZZZZZZZZZZZZZZZZZA' } as Actor;
const stranger = { id: '01HZZZZZZZZZZZZZZZZZZZZZZB' } as Actor;
const GPS_JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 42, 0, 8, 0, 0, 0,
  1, 0, 0x25, 0x88, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xda, 0, 2,
]);

function setup(
  stored: StoredObject | null = { sizeBytes: 1000, contentType: 'image/jpeg' },
  start = Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2]),
) {
  const rows = new Map<string, MediaAsset>();
  const deleted: string[] = [];
  const repository: MediaRepository = {
    create: async (a) => (rows.set(a.id, a), a),
    findById: async (id) => rows.get(id) ?? null,
    findMany: async (ids) =>
      ids.map((id) => rows.get(id)).filter((a): a is MediaAsset => Boolean(a)),
    save: async (a) => (rows.set(a.id, a), a),
  };
  const storage: ObjectStorage = {
    configured: true,
    presignUpload: async (key) => `https://storage.test/upload/${key}`,
    presignDownload: async (key) => `https://storage.test/read/${key}`,
    head: async () => stored,
    readStart: async () => start,
    delete: async (key) => void deleted.push(key),
  };
  return { service: new MediaService(repository, storage), rows, deleted };
}

describe('MediaService', () => {
  it('issues a direct upload URL for a pending photo under a server-generated key', async () => {
    const { service } = setup();
    const ticket = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    expect(ticket.media.status).toBe('pending');
    expect(ticket.media.objectKey).toBe(`u/${owner.id}/avatar/${ticket.media.id}.jpg`);
    expect(ticket.uploadUrl).toContain(ticket.media.objectKey);
  });

  it('rejects photos over 8 MB before issuing a URL', async () => {
    const { service } = setup();
    await expect(
      service.initiate(owner, {
        purpose: 'avatar',
        mimeType: 'image/jpeg',
        sizeBytes: 9 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_REJECTED' });
  });

  it('marks a clean upload ready and returns a signed read URL', async () => {
    const { service } = setup();
    const { media } = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    const ready = await service.complete(owner, media.id);
    expect(ready.status).toBe('ready');
    expect(await service.signedUrl(media.id)).toContain('/read/');
  });

  it('rejects and deletes a JPEG that still carries GPS metadata', async () => {
    const { service, rows, deleted } = setup(undefined, GPS_JPEG);
    const { media } = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    await expect(service.complete(owner, media.id)).rejects.toMatchObject({
      code: 'MEDIA_REJECTED',
    });
    expect(deleted).toEqual([media.objectKey]);
    expect(rows.get(media.id)?.status).toBe('deleted');
  });

  it('rejects an upload whose stored type differs from the declared type', async () => {
    const { service } = setup({ sizeBytes: 1000, contentType: 'text/html' });
    const { media } = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/png',
      sizeBytes: 1000,
    });
    await expect(service.complete(owner, media.id)).rejects.toMatchObject({
      code: 'MEDIA_REJECTED',
    });
  });

  it('reports a missing upload without deleting anything', async () => {
    const { service, deleted } = setup(null);
    const { media } = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    await expect(service.complete(owner, media.id)).rejects.toMatchObject({
      code: 'MEDIA_REJECTED',
    });
    expect(deleted).toEqual([]);
  });

  it('only lets the owner complete, delete or attach, and only for the right purpose', async () => {
    const { service } = setup();
    const { media } = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    await expect(service.complete(stranger, media.id)).rejects.toMatchObject({
      code: 'MEDIA_ACCESS_DENIED',
    });
    await expect(service.assertAttachable(owner.id, media.id, 'avatar')).rejects.toMatchObject({
      code: 'MEDIA_REJECTED',
    });
    await service.complete(owner, media.id);
    await expect(service.assertAttachable(stranger.id, media.id, 'avatar')).rejects.toMatchObject({
      code: 'MEDIA_ACCESS_DENIED',
    });
    await expect(
      service.assertAttachable(owner.id, media.id, 'conversation'),
    ).rejects.toMatchObject({
      code: 'MEDIA_REJECTED',
    });
    await expect(service.assertAttachable(owner.id, media.id, 'avatar')).resolves.toBeInstanceOf(
      MediaAsset,
    );
  });

  it('removes the object and returns no URL once discarded', async () => {
    const { service, deleted } = setup();
    const { media } = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    await service.complete(owner, media.id);
    await service.discard(media.id);
    expect(deleted).toEqual([media.objectKey]);
    expect(await service.signedUrl(media.id)).toBeNull();
  });

  it('returns signed URLs only for viewable media in a batch', async () => {
    const { service } = setup();
    const first = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    const second = await service.initiate(owner, {
      purpose: 'avatar',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    await service.complete(owner, first.media.id);
    const map = await service.viewable([first.media.id, second.media.id, 'missing']);
    expect([...map.keys()]).toEqual([first.media.id]);
    expect(map.get(first.media.id)?.url).toContain('/read/');
  });
});
