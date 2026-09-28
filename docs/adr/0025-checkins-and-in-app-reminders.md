# ADR-0025 — In-app reminders and check-in lifecycle

- Status: Accepted
- Date: 2026-09-28

## Context

Wayfinder now persists the whole directional loop through W7: context, recommendation, activity, commitment, real-world completion/reflection, Journey, and the minimum community/people context needed around an Activity.

The remaining gap in the core loop is return timing. A user can commit to something and later complete or miss it, but the backend has no first-class way to surface when Wayfinder should remind them before an Activity, ask for reflection after it, or offer a nonjudgmental recovery path when the plan appears to have been missed.

W8 should close that loop without prematurely introducing push-provider infrastructure or creating a notification-engagement system optimized for attention.

## Decision

1. W8 introduces an in-app `CheckIn` bounded context. A CheckIn is a directional prompt tied to one user + Activity + kind.
2. Check-in kinds are deliberately small and stable:
   - `activity_reminder` — before a committed Activity;
   - `post_activity` — shortly after the Activity starts, while the commitment is still `committed`;
   - `missed_plan` — after a grace period when the commitment is still `committed` and no completion has been recorded.
3. Check-ins are materialized deterministically from authoritative Activity + commitment state when the user reads their check-ins. W8 does not require Redis/BullMQ merely to create rows on a timer.
4. Timing policy for the Alpha is server-owned and deterministic:
   - reminder becomes available 24 hours before `startsAt` and expires when the Activity starts;
   - post-activity check-in is available from `startsAt` until 6 hours after `startsAt`;
   - missed-plan check-in becomes available 6 hours after `startsAt` while the commitment remains `committed`.
5. Only one row exists per user + Activity + kind. Materialization is idempotent.
6. A CheckIn lifecycle is `pending | actioned | dismissed`. Opening the relevant recovery/reflection path may mark it `actioned`; dismissing it only hides that CheckIn and does not mutate the underlying Activity commitment.
7. Completion remains owned by W6. W8 never marks an Activity completed merely because a check-in was opened.
8. A missed-plan check-in does not silently mark the commitment as `missed`. The user's explicit recovery choice remains separate from the reminder itself.
9. Check-in copy may contain a server-authored title/body/CTA label so clients remain consistent, but it must stay factual and nonjudgmental.
10. W8 is in-app only for the Alpha. Push, email, SMS, delivery providers, device-token registration, Redis/BullMQ scheduling, retry queues, and delivery receipts are deferred until an actual outbound channel is approved. ADR-0013 remains binding if/when that asynchronous boundary is introduced.
11. Check-in access is authenticated, self-scoped, and enforced through the existing default-deny policy engine.

## Consequences

- Wayfinder can now close the return loop after commitment without conflating reminders with real-world completion.
- The product can validate whether timely check-ins help people continue before paying infrastructure complexity for push delivery.
- Read-time materialization keeps Alpha behavior deterministic and testable; it is not intended as the final outbound-notification architecture.
- `dismissed` and `actioned` state prevents the same in-app prompt from reappearing indefinitely.
- Future outbound delivery can consume the same CheckIn records rather than redefining the product meaning of reminders.
