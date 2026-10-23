import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PLATFORM_SETTINGS_REPOSITORY,
  SETTING_DEFINITIONS,
  type PlatformSettingsRepository,
  type SettingKey,
  type SettingValue,
} from './setting-definitions';

const CACHE_TTL_MS = 60_000;

/**
 * Reads platform rules from the database with a short in-process cache, so a
 * change made in the CMS applies within a minute without a deploy.
 */
@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);
  private cache: { values: Map<string, unknown>; loadedAt: number } | null = null;

  constructor(
    @Inject(PLATFORM_SETTINGS_REPOSITORY) private readonly repository: PlatformSettingsRepository,
  ) {}

  async get<K extends SettingKey>(key: K, now = Date.now()): Promise<SettingValue<K>> {
    const definition = SETTING_DEFINITIONS[key];
    const values = await this.values(now);
    if (!values.has(key)) return definition.default as SettingValue<K>;
    const parsed = definition.schema.safeParse(values.get(key));
    if (!parsed.success) {
      this.logger.warn({ key }, 'Stored platform setting is invalid; using the default.');
      return definition.default as SettingValue<K>;
    }
    return parsed.data as SettingValue<K>;
  }

  async set<K extends SettingKey>(key: K, value: SettingValue<K>, updatedBy: string | null) {
    const parsed = SETTING_DEFINITIONS[key].schema.parse(value);
    await this.repository.upsert(key, parsed, updatedBy);
    this.cache = null;
  }

  private async values(now: number): Promise<Map<string, unknown>> {
    if (this.cache && now - this.cache.loadedAt < CACHE_TTL_MS) return this.cache.values;
    try {
      const rows = await this.repository.findAll();
      this.cache = { values: new Map(rows.map((row) => [row.key, row.value])), loadedAt: now };
    } catch (error) {
      // Settings must never take the API down: fall back to defaults and retry soon.
      this.logger.error({ err: error }, 'Platform settings could not be loaded; using defaults.');
      this.cache = { values: new Map(), loadedAt: now - CACHE_TTL_MS + 5_000 };
    }
    return this.cache.values;
  }
}
