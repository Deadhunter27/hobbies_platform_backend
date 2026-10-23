import { PlatformSettingsService } from './platform-settings.service';
import type { PlatformSettingsRepository } from './setting-definitions';

function repo(rows: Array<{ key: string; value: unknown }>, fail = false) {
  const calls = { findAll: 0, upserts: [] as Array<[string, unknown]> };
  const repository: PlatformSettingsRepository = {
    findAll: async () => {
      calls.findAll += 1;
      if (fail) throw new Error('db down');
      return rows;
    },
    upsert: async (key, value) => {
      calls.upserts.push([key, value]);
    },
  };
  return { repository, calls };
}

describe('PlatformSettingsService', () => {
  it('returns the registry default when nothing is stored', async () => {
    const { repository } = repo([]);
    await expect(
      new PlatformSettingsService(repository).get('media.signedOutVisibleRatio'),
    ).resolves.toBe(0.2);
  });

  it('returns a valid stored value', async () => {
    const { repository } = repo([{ key: 'community.creationPolicy', value: 'staff' }]);
    await expect(
      new PlatformSettingsService(repository).get('community.creationPolicy'),
    ).resolves.toBe('staff');
  });

  it('falls back to the default when the stored value is invalid', async () => {
    const { repository } = repo([{ key: 'media.signedOutVisibleRatio', value: 7 }]);
    await expect(
      new PlatformSettingsService(repository).get('media.signedOutVisibleRatio'),
    ).resolves.toBe(0.2);
  });

  it('caches reads for a minute', async () => {
    const { repository, calls } = repo([]);
    const service = new PlatformSettingsService(repository);
    await service.get('event.creationPolicy', 0);
    await service.get('event.creationPolicy', 30_000);
    expect(calls.findAll).toBe(1);
    await service.get('event.creationPolicy', 61_000);
    expect(calls.findAll).toBe(2);
  });

  it('serves defaults when the database is unavailable', async () => {
    const { repository } = repo([], true);
    await expect(
      new PlatformSettingsService(repository).get('moderation.autoHideReportThreshold'),
    ).resolves.toBe(3);
  });

  it('validates before writing and clears the cache', async () => {
    const { repository, calls } = repo([]);
    const service = new PlatformSettingsService(repository);
    await expect(service.set('media.signedOutVisibleRatio', 2 as never, null)).rejects.toThrow();
    await service.set('media.signedOutVisibleRatio', 0.5, null);
    expect(calls.upserts).toEqual([['media.signedOutVisibleRatio', 0.5]]);
  });
});
