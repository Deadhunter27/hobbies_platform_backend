# ADR-0031: Progressive profile details and marketing consent

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** Founder
- **Builds on:** ADR-0017 (registration), ADR-0020 (profile context), SECURITY.md (privacy review for personal data)


## Context

The founder wants richer user information, like other social apps: a username, social links, basic demographics and how people found Wayfinder. The goals are a better profile and, later, marketing and engagement analysis.

Three forces pull against putting all of this into registration:

- **Conversion.** Every extra required field at sign-up loses people before they ever see the product.
- **Product principle.** Registration stays minimal; context is collected when it is useful (founding blueprint).
- **Indonesian law.** UU No. 27/2022 (Pelindungan Data Pribadi) requires a clear purpose, data minimisation and explicit consent, and treats marketing consent separately.

Engagement analysis is better served by behavioural events (what people actually do) than by self-reported form fields. That is a separate, later decision.

## Decision

1. **Registration stays minimal:** name, email, password. The register screen states that signing up means agreeing to the Terms and Privacy Policy.

2. **"Kenalan dulu" — an optional step right after registration.** Every field can be skipped. Nothing blocks using the app.

   | Field | Purpose | Rules |
   | --- | --- | --- |
   | `handle` | Public username (@handle) for profile and mentions | 3–30 chars, `a–z 0–9 . _`, no leading/trailing or doubled separators, unique, stored lowercase |
   | `birthYear` | Age-appropriate suggestions, aggregate analysis | Year only, never full birth date; minimum age 13 |
   | `gender` | Aggregate analysis, community fit | `female`, `male`, `nonbinary`, `prefer_not_to_say` |
   | `instagramHandle`, `tiktokHandle` | Links shown on the user's profile | Platform handle format, stored without "@" |
   | `acquisitionSource` (+ optional `acquisitionDetail`) | Which channels bring people in | `instagram`, `tiktok`, `friend`, `community`, `search`, `event`, `other` |
   | `marketingConsent` | Permission to receive news and promotions | **Default off**, separate from account terms; every change is timestamped |
   | `introCompletedAt` | Ask once, never nag | Set when the user finishes or skips the step |

3. **Storage.**
   - A new table `profile_user_details`, owned by the `profile` module, with RLS enabled.
   - `GET /me/profile-details` and `PATCH /me/profile-details` (partial update). Omitted fields stay unchanged.
   - Handle conflicts return `409 HANDLE_TAKEN`.
   - The existing `PUT /me/profile-context` keeps its replace semantics untouched, so the profile editor cannot accidentally wipe these fields.

4. **Visibility.**
   - These details are private to the user until a public profile ADR decides what others may see.
   - The first candidates to be shown on a public profile are handle and social links.
   - Birth year, gender and acquisition source are never shown to other users.

5. **Marketing use.**
   - Only users with `marketingConsent = true` may receive promotional messages.
   - Analysis uses aggregates; no export of individual records to third parties without a separate decision.

## Consequences

- Sign-up remains fast while the profile can become as rich as users choose.
- Consent is provable: state plus the time it last changed.
- Account deletion (required by Google Play and UU PDP) must delete this table's row. It is the next item to build.
- A Privacy Policy describing these fields and purposes must be published before external testers are invited.

## Alternatives considered

- **Collect everything at registration.** More data per sign-up, far fewer sign-ups, and harder to justify under data minimisation. Rejected.
- **Extend `PUT /me/profile-context`.** Its replace semantics would wipe these fields whenever the existing editor saves the city. Rejected in favour of a PATCH resource.
- **Full birth date.** More precise than any planned use needs. Rejected; year only.
