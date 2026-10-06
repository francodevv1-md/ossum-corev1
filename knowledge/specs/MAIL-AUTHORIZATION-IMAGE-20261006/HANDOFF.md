# Image-led authorization email — source and live DEV acceptance complete

Date: 2026-10-06. Workspace: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`. Current HEAD: `cef953941d82fef929ba10c75eb49ee987766e3c` plus preserved uncommitted mail work. Source recovery and final live evidence: `FICHA_RECOVERY.md` and `LIVE_VALIDATION.md`.

## Final handoff

Done: One authorized real email delivered; provider and native UI acceptance complete, backend Seguimiento persisted.

Changed: QA replay uses proven native “Ver expediente” and waits for enabled upload during initial feed loading; no application navigation/Auth change.

Files: `scripts/qa/run-mail-process.mjs`; owned evidence/locks. Three recovered mail callers remain uncommitted, foreign Header/date/branch work preserved.

Validations: Current seven suites 72/72 PASS, independent caller/replay reviews PASS, actual PNG/signature preview PASS, native single-send/provider-delivered/tracking readback PASS. Provider ID `01a11291-c041-7a14-8bac-8587091edb23`.

Risks: Recipient mail-client rendering not inspected; prior global TypeScript failures outside scope remain historical/unresolved (not rerun). Build not run under runtime exclusions. Exclusive attempt receipt retained; no resend.

Next: Recipient confirmed receipt and authorized a scope-only local commit. No additional send, login redesign, push or deploy; detailed client rendering remains unreviewed.

## Source delivery details and historical pre-live evidence

## Done / changed

- Reused existing authenticated company/user initialization; no Auth/startup/provider changes. Dispatch waits for actual context instead of substituting a company name/ID.
- Removed fixed recipients/suggested corporate mailboxes, sample ART/administrator/materials, and surgery-ID-as-authorization-number from the modal/template. Explicit recipients and actual data only.
- Minimal escaped authorization HTML: editable message, full-width uncropped original image(s), brief actual case details, individual user/company signature. Local preview uses actual image bytes; outgoing HTML references matching inline CID attachments. PDFs remain original attachments, not fabricated images.
- Sender mailbox is server configuration (`RESEND_FROM_EMAIL`) with no unrelated hardcoded fallback. Authenticated backend user/company own signature and display name; replies go to the authenticated user's email. Real transport requires configured sender; simulation remains explicitly labeled.
- Novedades passes the exact selected source and original file data, including new images supplied while recording authorization. The hook returns void: the callback retains the exact source snapshot rather than guessing a new persisted entry. Header entry point selects authorization evidence through the shared modal, without editing Header/FullView or rescheduling source.
- Protected document download supplies actual bytes, original MIME and filename. Source links are followed explicitly; failed or missing source bytes reject the complete load rather than sending partial evidence. Added images can combine with a successfully loaded text-only source.
- Centralized request/header/attachment validation; 8 supported image/PDF attachments maximum, 6 MB per file, 20 MB base64 total, 22 MB bounded request stream. Source-company surgery binding is checked before provider dispatch. Dynamic template text is escaped.
- Tracking result is separate from acceptance (`auditRecorded`, warning). Accepted-but-tracking/refresh-failed does not become a retryable send error. Coordinator does not duplicate the route's tracking entry.
- Reopen/case/company changes sample current props and invalidate obsolete async callbacks. Native disabled form controls prevent attachment edits during dispatch. Old accepted callbacks cannot close a new case/modal session.

## Files

Production: existing `src/lib/services/resend.service.ts`, `src/app/api/companies/[companyId]/mail/send/route.ts`, `src/components/mail/SendEmailModal.tsx`, `src/components/expediente/NovedadesTabContent.tsx`, `src/components/coordinadores/CoordinatorShareDialog.tsx`; new `src/lib/validators/mail.validator.ts`, `src/lib/mail/authorization-evidence.ts`.

Checks: seven focused source/test files listed in `VALIDATION.md`; new isolated `playwright.mail.config.ts` and `e2e/authorization-email-template.spec.ts`. Shared framework/configuration, domain/store/schema, Auth and other session files were not edited.

## Validations

| Check | Result / meaning |
| --- | --- |
| Current focused unit/component suite | **PASS — 7 files, 72/72, exit 0, 3.16 seconds**; auth/network/audit/DB boundaries mocked |
| Real Chromium template rendering | **PASS — 2/2, 8.7 seconds**; desktop 1440 and mobile 390, synthetic original PNG, preserved aspect ratio/full image, no horizontal overflow, image before case summary, no external requests |
| Independent review | Initial **FAIL** found three uncovered mail edge cases; reproduced and fixed with eight regression checks; bounded re-review **PASS**. Final Novedades and browser-test source review **PASS**. Reviewer did not execute runtime checks |
| Direct global TypeScript | **FAIL — exit 2**, four diagnostics outside this package; no diagnostics in changed files |
| Scoped whitespace diff check | **PASS**; LF/CRLF Git warnings only |
| Actual app/browser, tracking persistence, real Resend acceptance/delivery | **PASS**, exact authorized native DEV send; mailbox visual rendering **NOT RUN**, see `LIVE_VALIDATION.md` |
| Build / shared `.next` output | **NOT RUN**; resource remains owned by DEV readiness session, unrelated type/config errors preserved |

TypeScript diagnostics left untouched: `next.config.ts:10` unsupported `eslint` option; `src/__tests__/components/CoordinationPreviewBoundary.test.tsx:53,58` missing `surgeryTimeSpecified`; `src/app/cirugias-api/page.tsx:179` possibly undefined argument. Do not disable checks or broaden this mail package to obtain a global green result.

## Risks / limits

- Source completion is not proof of real email delivery. The synthetic HTML browser test does not test CID behavior in Gmail/Outlook or persistence. Some email clients block inline images; the image bytes are still sent as attachments.
- Existing feed API returns at most 100 entries. The UI explicitly reports truncation; absent source entries are not guessed. Open an older authorization from Novedades with its source loaded, or select the actual local file.
- Supported local images: PNG/JPEG/WebP/GIF; original PDF supported. Unsupported formats, empty bytes, invalid base64, mismatched MIME/signature and oversize inputs are rejected. File-header checks do not guarantee a complete decodable image; actual file/display verification remains part of live acceptance.
- Provider retries are not automatic. If a request's provider outcome is uncertain, inspect the provider before resending; this package does not add a persistent outbox or new idempotency architecture.
- Existing raw/custom HTML request compatibility remains outside the authorization template; server owns the authorization template/signature. No new global custom-email editor was added.
- Existing Novedades broad suite was not run because its auth/client/email boundaries are not fully mocked; the dedicated new caller suite exercises the actual component safely.
- Server restart interrupted the initial writer after saving implementation/tests. Integration resumed from those files, not a clean rollback or duplicate implementation. Foreign Coordinator/Novedades changes remain preserved.

## Original operational checklist — completed under the live lock

1. Franco identifies and authorizes the disposable DEV environment and synthetic surgery, and a single real-send recipient; do not infer these from localhost or historical approval.
2. Coordinate the existing app/server owner's resource reservation; do not restart/build/take over `.next` automatically. Allow manual login and capture temporary local state outside Git; no credentials in prompts or artifacts.
3. Verify current company/user membership, sender configuration/domain and the synthetic authorization image; no key values printed or edited by this package.
4. Drive the actual modal from Novedades and Header, confirm image preview/signature/recipient, then perform exactly the authorized send. Verify provider acceptance, delivery/recipient rendering and persisted Seguimiento separately; no automatic retry.
5. Record that specific target/snapshot and close live acceptance only after evidence. Browser hard limit: 20 minutes; close owned contexts and stop on expired Auth or unresolved prerequisite.

Replay commands, safe screenshot paths and snapshot hashes: `VALIDATION.md`. Only this package's lock was released after source validation; no foreign lock, commit, push or deployment changed.
