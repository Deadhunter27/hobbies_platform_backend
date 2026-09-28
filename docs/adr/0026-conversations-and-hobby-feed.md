# ADR-0026 — Conversations and hobby feed read model

- Status: Accepted
- Date: 2026-09-28

## Context

Wayfinder now persists the directional loop through W8: user context, explainable next steps, activity commitment, real-world completion/reflection, Journey, community trust context, and in-app check-ins. The next product gap is discussion around a hobby: users need a place to ask, answer, and understand what is happening without turning Wayfinder into an attention-maximizing social network.

The product model distinguishes these concepts deliberately:

- **Conversation** answers “What do other people think / how would they approach this?”
- **Feed** answers “What is happening around this hobby?”
- **Community** answers “Who are my people?”
- **Activity** answers “When can we do something in the real world?”

Conversation is therefore not an Activity subtype, and Feed should not become an independently mutable post stream optimized for engagement.

## Decision

1. W9 introduces a `Conversation` bounded context for hobby-scoped discussion.
2. A Conversation belongs to one hobby and may optionally reference a Community or Activity logically. It stores a title, body, author reference, author display-name snapshot, lifecycle status, and timestamps.
3. Authenticated users may create Conversations for an active hobby context. W9 does not require Community membership merely to participate in a hobby Conversation unless a later community-specific policy explicitly introduces that rule.
4. W9 supports flat `ConversationReply` records only. Deep reply trees, quote chains, mentions, reactions, likes, reposts, follows, direct messages, and reputation scoring are out of scope.
5. Conversation and reply author display names are public-facing snapshots captured from the authenticated actor. Identity remains canonical account ownership; Conversation does not import Identity repositories.
6. A hobby **Feed is a read model**, not a separately authored content aggregate. In W9 it combines published Conversations and upcoming published Activities for one hobby.
7. Feed ordering is deterministic and chronological/contextual. W9 introduces no engagement score, personalized virality ranking, infinite-scroll optimization, or screen-time objective.
8. Feed items preserve their source type and source identifier so clients can route to Conversation or Activity detail instead of flattening different objects into generic posts.
9. Pagination uses keyset/cursor semantics. Feed and Conversation list APIs return bounded pages.
10. Cross-context hobby/community/activity/user references remain logical. Conversation persistence owns only its Conversation and Reply relations.
11. Protected write operations are authenticated, self-scoped where applicable, and enforced through the existing default-deny policy engine.
12. W9 does not introduce moderation/admin write tooling beyond lifecycle fields required for future W10 integration. Staff moderation workflows remain W10.

## Consequences

- Discussion becomes a first-class object without redefining Activities or Communities.
- The Feed can show useful ecosystem movement while remaining a navigational read model rather than a generic social-media post surface.
- Later feed sources can be added without changing the meaning of existing Conversation records.
- W10 can later add moderation/curation on top of explicit Conversation status rather than retrofitting a generic post model.
- The Alpha can test whether discussion helps users move through hobbies without optimizing for passive consumption.
