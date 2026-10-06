# Image-led authorization email — approved DEV package

Date: 2026-10-06. Workspace: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`. Base HEAD: `685ef3229da012ed988388d512d91f3e3c4bad2e` plus pre-existing local changes.

## Outcome

Send a simple operational message with the actual selected authorization image prominently displayed and retained as an attachment. Use the existing logged-in user and active company for the signature; server controls identity and configured verified-domain sender. Remove sample clinical data and hardcoded sender/recipient/company defaults. Preserve the existing surgery/authorization rules and all unrelated work.

## Approved boundaries

Franco's implementation request approves the priorities explicitly described immediately before it. Scope/files/resources and exclusions are in `.opencode/locks/MAIL-AUTHORIZATION-IMAGE-20261006.lock.md`. Existing company/surgery validation is moved before the external call without changing Auth or permissions. Use existing protected document reads; no new storage or DB schema. No live provider call, real data mutation, secret handling, build/server takeover or Git publication is inferred from this approval.

## Implementation contract

- Reuse current AuthProvider context; without company/user context disable dispatch rather than assume Districorr. Do not modify startup Auth.
- No preselected hardcoded recipients. Explicit recipient entry or caller-supplied actual addresses; no sample ART, administrator, materials or authorization number derived from surgery ID.
- Open from Novedades with the exact selected evidence/source; after authorization use the returned immutable evidence/source. Opening from the existing Header can select evidence through the shared modal without editing foreign Header/FullView.
- Actual document bytes through the existing protected document endpoint; include source evidence images and original file MIME/name. No blank attachments or external image URLs. On failure, show a retryable evidence-loading error and do not send a partial email silently.
- Minimal white HTML: brief editable message, readable full-width image(s), actual case summary, user/company signature. Escape dynamic values; CID references for delivered HTML, real data URLs only for local preview. Client preview and backend body must agree on sender/company and attachment content.
- Sender comes from server configuration (`RESEND_FROM_EMAIL`, verified domain); missing real-send configuration must return a clear configuration error, not silently use an unrelated sender. Server-derived user/company signature; server-controlled reply handling (existing user email or configured company reply address).
- Validate request types/recipient/header safety, allowed image/PDF attachment data and size, source/company binding before calling Resend. Preserve service simulation honesty, but never present it as real delivery. Provider acceptance requires nonempty provider ID.
- Return tracking outcome separately from provider acceptance. Accepted-but-tracking-failed must remain accepted with an explicit warning, no automatic resend. Keep Coordinator compatibility; avoid duplicate success tracking notes where the route already records the mail.
- Preserve user edits within an open modal; reinitialize from current props on reopen or case switch, not mount-time stale refs. Async evidence requests must not overwrite a different case, newer choice or a closed modal.

## Validation and completion

Focused mocked service/route/validator/template/evidence/component checks; nonincremental TypeScript diagnostics separated from unrelated repository errors; synthetic real Chromium template rendering at desktop/mobile; independent source review. Build/app browser/DB/live send require separately verified resource ownership and current DEV target/session/recipient. Record PASS/FAIL/BLOCKED/NOT RUN and exact replay commands; do not claim full real-send acceptance from mocked or synthetic rendering evidence.
