# ADR-0035: People create communities and events

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** Founder
- **Builds on:** ADR-0021 (activities), ADR-0024 (communities), ADR-0027 (staff curation), ADR-0033 (platform settings)

## Context

Until now, communities and activities came only from staff seeding (ADR-0027). The Alpha database has no upcoming activities, so Home and What's Next run empty. The founder wants anyone to be able to start a community or post an event, with the rule adjustable later (verified users only) from a CMS.

## Decision

1. **Creation policy.**
   - `community.creationPolicy` and `event.creationPolicy` (ADR-0033) take one of three values: `everyone` (default during testing), `verified`, or `staff`.
   - Staff can always create.
   - **Verified** currently means the person has claimed a `@username`. A stronger check can replace it without changing the API.
   - A refusal returns `403 CREATION_NOT_ALLOWED`.
2. **Communities.**
   - `POST /communities` takes hobby, name (3–80), optional description and city.
   - The community is published immediately, and the creator becomes its **organizer** in the same transaction.
   - The slug is the name plus a unique suffix.
   - `GET /communities?hobbyId=&q=` lists published communities with member counts.
3. **Events are Activities** created by a person.
   - `POST /activities` takes hobby, title, start (future, at most a year ahead), optional end, place, capacity, effort and notes.
   - The creator is the host: `hostType = person`, `hostReferenceId = creator`.
   - An event inside a community requires its organizer or a host (`403 COMMUNITY_HOST_REQUIRED`).
   - Events are published immediately and joined through the existing commitment flow, so capacity and "full" status already work.
4. **Cancellation.** The host can cancel (`POST /activities/{id}/cancel`); people who joined see it as cancelled.
5. **Listing.** `GET /activities` gains `communityId` and `hostId` filters.

## Consequences

- Real events and communities can appear without staff seeding, which feeds Home, What's Next and Explore.
- Abuse is handled by reporting and auto-hide (ADR-0036), and the policy can tighten without a release.
- Editing an event or community after creation is a follow-up; for now, cancel and recreate.
