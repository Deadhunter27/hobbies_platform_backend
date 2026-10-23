# ADR-0033: Runtime platform settings

- **Status:** Accepted
- **Date:** 2026-10-23
- **Deciders:** Founder

## Context

Several rules are product decisions that will change as Wayfinder grows. Examples:

- who may create communities and events (everyone during testing, verified users later);
- how many photos signed-out viewers see;
- how many reports hide content.

The founder wants these adjustable from a future CMS without a release.

## Decision

1. A `platform_setting` table stores `key → JSON value`, with `updatedBy` and timestamps. RLS is enabled.
2. A code registry (`SETTING_DEFINITIONS`) is the only source of keys. Each key has a Zod schema, a default and a description. A CMS lists and edits exactly these keys.
3. `PlatformSettingsService.get(key)` caches values for 60 seconds. An invalid stored value, or an unreachable table, falls back to the default and is logged. A setting can never take the API down.
4. Writes validate against the schema and clear the cache.
5. Initial keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `media.signedOutVisibleRatio` | `0.2` | Share of a post's photos signed-out viewers can open |
| `community.creationPolicy` | `everyone` | `everyone`, `verified` or `staff` |
| `event.creationPolicy` | `everyone` | `everyone`, `verified` or `staff` |
| `moderation.autoHideReportThreshold` | `3` | Distinct reports before content is hidden pending review |

## Consequences

- Rules change in about a minute without a deploy.
- Admin endpoints to edit settings come with the CMS (staff-only, audited per ADR-0019).
