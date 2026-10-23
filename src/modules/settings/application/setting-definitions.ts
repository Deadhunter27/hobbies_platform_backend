import { z } from 'zod';

const creationPolicy = z.enum(['everyone', 'verified', 'staff']);
export type CreationPolicy = z.infer<typeof creationPolicy>;

/**
 * Every runtime-tunable platform rule (ADR-0033). The registry is the single
 * source of truth for the key, its type, its default and its meaning; a CMS
 * lists and edits exactly these, and an invalid stored value falls back to
 * the default instead of breaking the API.
 */
export const SETTING_DEFINITIONS = {
  'media.signedOutVisibleRatio': {
    schema: z.number().min(0).max(1),
    default: 0.2,
    description: 'Share of a post’s photos a signed-out viewer can see (rounded up, at least one).',
  },
  'community.creationPolicy': {
    schema: creationPolicy,
    default: 'everyone' as CreationPolicy,
    description: 'Who may create a community: everyone, verified users, or staff only.',
  },
  'event.creationPolicy': {
    schema: creationPolicy,
    default: 'everyone' as CreationPolicy,
    description: 'Who may create an event: everyone, verified users, or staff only.',
  },
  'moderation.autoHideReportThreshold': {
    schema: z.number().int().min(1).max(1000),
    default: 3,
    description: 'Distinct reports after which content is hidden until staff review it.',
  },
} as const;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_DEFINITIONS)[K]['schema']>;

export const PLATFORM_SETTINGS_REPOSITORY = Symbol('PLATFORM_SETTINGS_REPOSITORY');

export interface PlatformSettingsRepository {
  findAll(): Promise<Array<{ key: string; value: unknown }>>;
  upsert(key: string, value: unknown, updatedBy: string | null): Promise<void>;
}
