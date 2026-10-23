# ADR-0034: People, follows and public profiles

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** Founder
- **Supersedes in part:** ADR-0024 §9 (no follows, no follower counts, no member discovery)
- **Builds on:** ADR-0018 (authorization), ADR-0031 §4 (public profile candidates), ADR-0032 (posts)

## Context

With Threads-style posts (ADR-0032), people need to find each other and keep up with those they learn from. The founder asked for "explore people", following and profile pages comparable to Threads or X. ADR-0024 §9 deliberately left all of this out of W7.

## Decision

1. **A new `people` bounded context** owns the follow graph (`person_follow`: follower, followee, time). User references are logical, with no foreign key to identity, as in ADR-0024 §8. A CHECK constraint forbids self-follows.
2. **Public profile**, `GET /people/{id | @handle}`, shows:
   - display name, `@handle`, avatar;
   - Instagram and TikTok handles;
   - the hobbies the person has set up;
   - follower and following counts;
   - whether you follow them and whether they follow you.

   This settles ADR-0031 §4: handle and social links become public. **Birth year, gender, acquisition source, email and marketing consent are never exposed.**
3. **Follows** are public and one-way (no approval), with idempotent `PUT|DELETE /people/{id}/follow`. Follower and following lists are paginated.
4. **Discovery.**
   - `GET /people?q=` searches handles and display names.
   - `GET /people/suggested?hobbyId=` lists people with the same hobby you don't follow yet, ordered by most recent activity. No popularity ranking.
5. **Following feed.** `GET /feed?following=true` is chronological, only from people you follow, and requires sign-in.
6. **Boundaries.**
   - Display names come from identity through a new read-only `PublicIdentityService`: active accounts only, id and name only. The people module adapts it to its own `PersonDirectory` port.
   - Handles, avatars and socials come from profile's `PublicProfileService`.
   - Conversation reads followee ids through `FollowGraph`.
   - No module reads another's tables.
7. **Suspended or deleted accounts** disappear from profiles, search, suggestions and lists.

## Consequences

- People can build a small network around their hobbies; posts from people they follow are one tab away.
- Blocking, muting and private accounts are not in this ADR. They come with reporting and moderation (Phase 3).
- Counts are computed per request. That is fine at Alpha scale.

## Alternatives considered

- **Mutual "friends" with approval.** Slower to grow and unusual for hobby discovery. Rejected for now; private accounts can come later.
- **Following communities or hobbies only.** Misses the "people a few steps ahead" learning that drives participation. Rejected.
