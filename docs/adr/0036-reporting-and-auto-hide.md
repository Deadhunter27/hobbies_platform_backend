# ADR-0036: Reporting and auto-hide

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** Founder
- **Builds on:** ADR-0019 (audit), ADR-0027 (staff moderation), ADR-0033 (platform settings), ADR-0035

## Context

With people creating posts, communities and events, harmful or spammy content will appear. App stores require a way to report user-generated content and to act on reports. The founder wants a report button and a threshold that can be tuned later.

## Decision

1. **Reports.**
   - Anyone signed in can report a post, reply, community, event or person through `POST /reports`.
   - Reasons: spam, inappropriate, harassment, scam, dangerous, off topic, other. An optional note can be added (500 characters).
   - **One report per person per target** (idempotent).
   - The target must exist and be visible. Reporting yourself is refused.
2. **Auto-hide.**
   - When distinct open reports on content reach `moderation.autoHideReportThreshold` (default 3, ADR-0033), the content is hidden until reviewed:
     - posts and replies → archived;
     - communities and events → draft.
   - **People are never auto-hidden.** Reports about a person always wait for a human.
3. **Review** (staff only):
   - `GET /admin/reports` groups open reports by target: count, reasons, notes, and whether the target is auto-hidden.
   - `POST /admin/reports/resolve` takes `dismiss` (restores auto-hidden content) or `remove` (keeps or makes it hidden).
   - Every decision is written to the audit trail.
   - Account suspension stays a separate, deliberate action.
4. **Boundaries.**
   - A new `moderation` module owns `content_report`.
   - It acts only through each owning module's public seam (`ConversationModerationSeam`, community/activity status use cases, identity's public read service).
   - Author-deleted content can never be restored by moderation.

## Consequences

- Meets the app-store requirement for reporting user content.
- A small group could hide legitimate content until review. The threshold and the review queue limit the impact, and dismissing restores it.
- Notifying reporters and authors about outcomes comes with notifications (a later milestone).
