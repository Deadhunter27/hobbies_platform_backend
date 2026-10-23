# ADR-0032: Threads-style posts on top of conversations

- **Status:** Accepted
- **Date:** 2026-10-23
- **Deciders:** Founder
- **Supersedes in part:** ADR-0026 §4 (no likes, no nesting, no media) and §1 (title required)
- **Builds on:** ADR-0026 (conversations), ADR-0030 (media), ADR-0031 (public handle), ADR-0033 (platform settings)

## Context

Founder testing (Oct 2026) found the conversation screens stiff compared to Threads and X: forum-style titled topics, boxed replies, no avatars, no likes, no photos. ADR-0026 deliberately left out likes, nesting and media for W9. The founder now asks for a familiar social posting experience, scoped to hobbies.

The prime directive still applies: posting exists to help people take part in real hobbies, not to maximise screen time.

## Decision

1. **A post is a Conversation.** Same `conversation` table, so the W9 API keeps working. The title becomes optional; untitled posts appear in the W9 API with their opening text as the title.
2. **New public API** (`/feed`, `/posts`, `/replies`), next to the frozen W9 endpoints:
   - `GET /feed?hobbyId=&authorId=` and `GET /posts/{id}`: public, optional sign-in.
   - `POST /posts`, `POST /posts/{id}/replies`, like/unlike, and delete-own.
3. **Content.**
   - Text up to 5,000 characters (replies 2,000) and/or up to **4 photos** (ADR-0030 media of purpose `conversation`).
   - Each media item attaches once.
4. **Replies nest one level** (`parentReplyId`). Replying to a nested reply attaches to its top-level parent, as Threads displays it.
5. **Likes.** One per person per post or reply, idempotent. Counts are shown. **The feed stays chronological**: likes never rank content (ADR-0026 §7 stands).
6. **Signed-out preview.** Signed-out viewers can open a share of each post's photos, `ceil(n × ratio)` and at least one. The ratio is the platform setting `media.signedOutVisibleRatio`, default 0.2. The rest come back `locked: true` with no URL.
7. **People.** Posts show display name, `@handle` and avatar through `PublicProfileService`. No other profile field leaves the profile module.
8. **Deletion.** Authors can delete their posts and replies; this is a soft delete, and attached photos are released from storage. Deleting a reply removes its nested replies. Staff moderation (ADR-0027) cannot restore a post its author deleted.
9. **Posting needs an active hobby, not a hobby context.** People can post in any hobby they explore.

## Consequences

- One content model serves both the old screens and the new feed.
- Like and reply counts are computed per page. That is fine for the Alpha; denormalised counters can come later without changing the API.
- Reporting and auto-hide (Phase 3) attach to posts and replies by id.
- Video and a "Following" feed are separate decisions (Phases 2 and 5).

## Alternatives considered

- **A new `post` table.** This would have meant migrating or duplicating W9 data and running two content models. Rejected.
- **Unlimited nesting.** Hard to read on a phone, and not what Threads does. Rejected.
- **Engagement-ranked feed.** Conflicts with the prime directive and ADR-0026 §7. Rejected.
