# ADR-0030: Media platform — photos for profiles, records, posts and communities

- **Status:** Proposed
- **Date:** 2026-10-17
- **Deciders:** Founder (review pending)
- **Builds on:** ADR-0003 (S3-compatible object storage), ADR-0018 (authorization), ADR-0019 (audit), ADR-0027 (moderation)

## Context

The founder wants users to take or pick photos inside the app. Photos are needed for:

- profile avatars;
- activity records;
- conversation posts;
- community and activity covers.

ADR-0003 already chose S3-compatible object storage for media but nothing is built. There is no table, no bucket and no endpoint.

Building upload once per feature would repeat the same security questions four times: ownership, privacy, size limits, deletion and cleanup. Photos also carry privacy risk. Phone cameras embed GPS coordinates in EXIF, and Wayfinder is about real places near the user, so a leaked home location is a real harm.

## Decision

### 1. One `media` module owns every uploaded file

It is a new bounded context. Other modules reference media only by id, through the module's public `index.ts`.

The `media_asset` table holds metadata only. Binary data never goes into PostgreSQL.

| Column | Notes |
| --- | --- |
| `id` | ULID |
| `ownerUserId` | Who uploaded it |
| `purpose` | `avatar`, `activity_record`, `conversation`, `community_cover`, `activity_cover` |
| `status` | `pending` → `ready` → `deleted` |
| `objectKey` | Server-generated, e.g. `u/{userId}/{purpose}/{mediaId}.jpg`; never the user's filename |
| `mimeType`, `sizeBytes`, `width`, `height` | Validated at finalize |
| `createdAt`, `updatedAt`, `deletedAt` | |

Attaching media to a domain object happens in the owning module. For example, `activity_record_media(recordId, mediaId, position)` lives in `activity-record`, so that module's ownership and visibility rules govern who can see the photo.

### 2. Storage: Supabase Storage through its S3-compatible API

- **One private bucket**, `media`, in the same project and region as the database (Singapore).
- Access goes through the S3 API, so the code stays provider-neutral as ADR-0003 requires.
- No public bucket. Every read goes through a short-lived signed URL, so a private record's photo can never be guessed.
- Credentials are new env vars (`MEDIA_S3_ENDPOINT`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_BUCKET`), validated fail-closed in production like every other secret (ADR-0008).

### 3. Upload lifecycle: the phone uploads straight to storage, the backend authorizes and verifies

1. **Initiate.** `POST /me/media` with `purpose`, `mimeType` and `sizeBytes`. The backend checks quota and limits, creates a `pending` asset and returns a presigned upload URL valid for 5 minutes.
2. **Upload.** The app sends the file directly to storage. It never passes through Vercel, which keeps request-size and time limits safe.
3. **Finalize.** `POST /me/media/{id}/complete`. The backend reads the stored object's real size and type and rejects anything that does not match or exceeds the limit, then marks the asset `ready`.
4. **Attach.** The owning module links the `ready` asset, e.g. in the record create/update request with `mediaIds`.
5. **Read.** API responses include a signed GET URL (15-minute expiry) for each photo the viewer is allowed to see.
6. **Delete / replace.** Deletion detaches the asset, marks it `deleted` and removes the object. Replacing an avatar is upload-new then delete-old.

### 4. Limits and privacy

- **Types:** JPEG, PNG, WebP only. HEIC is converted to JPEG on the phone.
- **Size:** max 8 MB after client compression; the app resizes to 2048 px on the long edge.
- **Location metadata is removed before upload.** The app re-encodes every image, which drops EXIF including GPS. The backend does not trust this alone: finalize rejects JPEGs that still contain a GPS EXIF block.
- **Quota:** at most 4 photos per record or post, and a per-user daily upload cap. Initiate is covered by the existing Redis `sensitive-write` limit.

### 5. Orphans, moderation and audit

- `pending` assets older than 24 hours, and `ready` assets never attached within 24 hours, are deleted by a scheduled cleanup endpoint called by the existing GitHub Actions scheduler. BullMQ workers are not live yet (ADR-0013).
- Staff can hide media through the ADR-0027 staff boundary; hidden media returns no signed URL.
- Initiate, finalize, attach, delete and staff hide actions are audited (ADR-0019).

### 6. Mobile

- New native modules `expo-image-picker` (camera + gallery) and `expo-image-manipulator` (resize, re-encode, EXIF removal).
- Permission prompts explain in Indonesian why camera or gallery access is needed, and the app works without granting them.

## Delivery

1. `media` module, table, bucket, initiate/finalize/delete, cleanup, tests.
2. Avatar on Profile — smallest end-to-end slice, proving the whole pipeline.
3. Photos on activity records.
4. Images on conversation posts (with the Threads redesign).
5. Community and activity covers.

## Consequences

- One reviewed pipeline serves every photo feature; later features only add an attach table.
- Photos never become public by accident, and a stolen URL expires within 15 minutes.
- Location leakage through EXIF is blocked twice (client strip, server check).
- Two new native modules increase APK size and require a new build, not an over-the-air update.
- Supabase free tier storage is limited (1 GB). Compression keeps typical photos around 300–600 KB; revisit before external Alpha.

## Alternatives considered

- **Upload through the backend (multipart).** Simpler client, but every byte passes through Vercel functions with request-size and timeout limits, and the API pays the bandwidth. Rejected.
- **Public bucket with unguessable names.** Faster reads and easy CDN caching, but private records' photos would be readable by anyone holding a link, forever. Rejected; avatars may move to a public path later if needed.
- **Separate image service (Cloudinary, etc.).** Strong transformations, but a new vendor, a new cost and a second place where personal photos live. Rejected for Alpha.
- **Store images in PostgreSQL.** Explicitly rejected by the founder's brief and by ADR-0003.

## Open questions for review

1. Is an 8 MB / 2048 px limit and 4 photos per record or post right for the Alpha?
2. Should avatars be visible to everyone (public profile) or only to signed-in users?
