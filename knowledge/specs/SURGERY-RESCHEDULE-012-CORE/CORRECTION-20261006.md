# 012 rescheduling — bounded continuation

## Approved outcome

Change either the surgery date or shipping date from active Coordinadores and Ficha, within one company and existing permissions. Changed dates must be today or later in Argentina. Surgery time remains optional; midnight explicitly entered is a real time, an empty time must not invent one. Preserve existing allowed state-change behavior without inventing automatic transitions.

Notifications are **simulation only**: record the intended admin/logistics recipients (the existing logistics role includes Depósito), with no delivery, email or external calls. Generate this event in the shared server save path, not independently in each screen.

## Evidence and minimal correction

- Active routes use CoordinadoresAdminClient and CoordinatorPersonalClient with DefineDateModal/CaseDetailModal. CoordinatorInboxView is not an active route dependency and is excluded.
- Both active clients substitute 08:00 UTC, omit the time marker, and fall back to local-only saves without a company. Their date modals close and announce success before awaiting persistence.
- Ficha uses ChangeDateDialog/useCirugiaActions and supports surgery date only. Extend the existing dialog to choose surgery or shipping date; preserve its stale-response protection.
- The shared updateSurgery service already provides company scoping, permissions, audit, transaction and updatedAt checking. Reuse these; no new schema, permission or generic framework.
- Validate changed dates at the shared server boundary. Unchanged historical dates must not block an unrelated management edit. Omit untouched date fields in client payloads and preserve unknown historical precision.
- Emit an audited, clearly simulated date-change event only after a successful save; no event for unchanged dates or failed/rolled-back saves. Do not change defaults of unrelated notification types.
- Ensure active modals await persistence, prevent duplicate submission, retain drafts on error, and do not apply late responses to another company/case/dialog.

## Ownership and exclusions

Franco confirmed explicit takeover from Antigravity on 2026-10-06. Current worktree HEAD is 685ef3229da012ed988388d512d91f3e3c4bad2e. Active file allowlist and resource bounds are recorded in `.opencode/locks/SURGERY-RESCHEDULE-012-CORE.lock.md`. Preserve all foreign modifications. No calendar/drag, palette, Auth/permissions, schema/migrations, real mail, external sends, database calls or Git publication.

The historical handoff is not overwritten. 25/26 of its hashes match; ExpedienteFullView changed and remains excluded. Existing DB authorization is not reused for new operations without identified target evidence. This continuation starts with offline validation only.

## Acceptance checks

- Surgery and shipping dates: today/future accepted; past/invalid rejected; Argentina day boundary independent of browser timezone.
- Optional time and explicit midnight; untouched legacy time marker preserved; changing only shipping does not change surgery date/time/state.
- Active global/personal callbacks produce the same payload and cannot silently save locally.
- Modals remain open on save failure, disable repeat save and only close after confirmed success.
- Existing company/role denial and stale response checks remain intact.
- Simulated event records changed date type, previous/new values and intended roles; no actual send, no duplicate event on unchanged retry, no event on transaction failure.
- Focused offline tests and direct TypeScript; independent source review. Report real DB/browser separately as NOT RUN/BLOCKED, not PASS.

## Validation and handoff

Implemented by one directed writer; integration owner independently reran the following offline checks on 2026-10-06 at worktree HEAD `685ef3229da012ed988388d512d91f3e3c4bad2e` with local changes preserved.

### Changed application files

- `src/lib/surgery/rescheduling.ts`: shared pure payload/date helpers; Argentine surgery timestamps and date-only shipping semantics.
- `src/lib/services/surgery.service.ts`: changed-date validation and audited simulated event; log only after transaction success.
- `src/components/coordinadores/CoordinadoresAdminClient.tsx`, `CoordinatorPersonalClient.tsx`: actual server save, correct date payloads, response mapping and honest partial-success handling.
- `src/components/coordinadores/modal/DefineDateModal.tsx`, `CaseDetailModal.tsx`, `CaseDetailModalHeader.tsx`: await/disable submission, retain errors/drafts, guard obsolete dialog responses.
- `src/hooks/useCirugiaActions.ts`, `src/components/cirugias/dialogs/ChangeDateDialog.tsx`, `src/app/cirugias/page.tsx` (dialog props only): choose surgery or shipping date from Ficha without modifying the other date.

No changes were needed to the validator file, TabPaneGestion, existing API routes, notification service, schema, permissions, Header/FullView source or calendar. The date rule lives in the common service where stored dates can be compared before rejecting an unchanged historical date.

### Actual validation

| Check | Result | Scope |
| --- | --- | --- |
| Final focused Vitest + direct regressions | PASS, 157/157, 15 files, exit 0 | Final corrected snapshot; offline mocks including real builder/helper/PATCH parser and real parent/form retry tests; parent replay 11:57:07 local |
| `git diff --check` | PASS, exit 0 | Existing CRLF warnings are not failures |
| Direct TypeScript | FAIL, exit 1 | Diagnostics only in unchanged next.config.ts, CoordinationPreviewBoundary.test.tsx and cirugias-api/page.tsx; no changed-file diagnostics |
| Independent source review | PASS after one corrective pass | Shipping wire format; no residual ntfy sends; unfinished drafts retained; company A→B→A invalidates generation |
| Real DB integration/browser | BLOCKED / NOT RUN | Identified disposable target, synthetic fixtures, server ownership and authenticated session not established; browser has no existing tabs |
| Build/generation/runtime restart | NOT RUN | Shared outputs and server excluded |

The TypeScript result is a global FAIL, not a scoped TypeScript PASS. Notification is simulation only; no real recipient delivery is certified. No commits or publication.

### Independent review — first pass

The reviewer found shipping payloads incorrectly encoded as full timestamps despite the existing route requiring YYYY-MM-DD. It also found inherited ntfy calls in the active callbacks, partial-save handling that reset/discarded drafts, and a company A→B→A stale-response hole in the date hook. These are in-scope blockers, not deferred unrelated issues. The same implementation writer is correcting them and adding route-contract and real-parent regression coverage; the initial green tests do not certify those defects as fixed.

Additional unchanged intake/authorization regression suite passed 11/11 (offline mocks), parent replay at 11:47:10 local. This does not replace the required corrective replay and second source review.

### Corrective closure

All four blockers were corrected and independently re-reviewed with SOURCE PASS:

1. Shipping payload now uses YYYY-MM-DD through the actual backend client and PATCH parser, verified by a new offline contract test.
2. Bounded save callbacks no longer import or dispatch ntfy. The server date-change event remains audited simulation only.
3. A generation-scoped confirmed date baseline prevents repeat date saves; failed secondary state/note work remains in the open form. Successfully saved notes are not resent when state remains pending.
4. Date-dialog generation invalidates on every company transition, including A→B→A; old success cannot hydrate, close or announce success in a new session.

The host restarted during final second review and TypeScript. The completed 157/157 test execution was retained, not repeated. Only interrupted review and TypeScript resumed. HEAD remained `685ef3229da012ed988388d512d91f3e3c4bad2e`. The final source review found no proven remaining blocker in this scope. Source ownership is released; real DB/browser validation remains pending.

### Safe replay

Run from `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/rescheduling.test.ts src/__tests__/unit/rescheduling-service.test.ts src/__tests__/components/ReschedulingForms.test.tsx src/__tests__/components/ActiveCoordinadoresRescheduling.test.tsx src/__tests__/unit/surgery-management.service.test.ts src/__tests__/unit/surgery-management-route.test.ts src/__tests__/unit/useCirugiaActions-change-date.test.tsx src/__tests__/components/ChangeDateDialog.test.tsx src/__tests__/components/CirugiasChangeDateFlow.test.tsx src/__tests__/unit/backend-active-surgeries-adapter.test.ts
node node_modules/vitest/vitest.mjs run src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx src/__tests__/components/CirugiasDataGrid.test.tsx src/__tests__/components/ExpedienteHeader.test.tsx src/__tests__/components/ExpedienteFullView.test.tsx
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Final single-command replay (the actual 157-test execution):

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/rescheduling.test.ts src/__tests__/unit/rescheduling-service.test.ts src/__tests__/components/ReschedulingForms.test.tsx src/__tests__/components/ActiveCoordinadoresRescheduling.test.tsx src/__tests__/unit/surgery-management.service.test.ts src/__tests__/unit/surgery-management-route.test.ts src/__tests__/unit/useCirugiaActions-change-date.test.tsx src/__tests__/components/ChangeDateDialog.test.tsx src/__tests__/components/CirugiasChangeDateFlow.test.tsx src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx src/__tests__/components/CirugiasDataGrid.test.tsx src/__tests__/components/ExpedienteHeader.test.tsx src/__tests__/components/ExpedienteFullView.test.tsx src/__tests__/unit/surgeries-intake-authorization.test.ts
```

### Focused test files changed/added

- `src/__tests__/unit/rescheduling.test.ts`
- `src/__tests__/unit/rescheduling-service.test.ts`
- `src/__tests__/unit/surgery-management.service.test.ts`
- `src/__tests__/unit/surgery-management-route.test.ts`
- `src/__tests__/unit/useCirugiaActions-change-date.test.tsx`
- `src/__tests__/components/ReschedulingForms.test.tsx`
- `src/__tests__/components/ActiveCoordinadoresRescheduling.test.tsx`
- `src/__tests__/components/ChangeDateDialog.test.tsx`

### Final application/test hashes

Computed after independent source review and final TypeScript recovery; scoped whitespace check exit 0. These hashes describe current files, not a commit or proof of DB/browser execution.

```text
27c533716a393c113e5cbebe9ce7421d9b583f6e436a49460250a197eafb2b06  src/lib/surgery/rescheduling.ts
7382ffd1e4df4e94073be69c2f0ae7914696c3af3cf50a2812d020325a6dc48c  src/lib/services/surgery.service.ts
d3fee876b8f658fbbaa70ca739b45654d3195a8dd0180a541c91086a56ac3e4d  src/components/coordinadores/CoordinadoresAdminClient.tsx
4a93005fb5f19965c92b94f498f7d29b6aa2c34d5c427aab299cdc557dd23148  src/components/coordinadores/CoordinatorPersonalClient.tsx
5902b81a5fbe87c2132ee6adea9212af1204cd8da0d14229967e875119c02ee0  src/components/coordinadores/modal/DefineDateModal.tsx
4c9479dd0dee2b223dd88e802e517146d0305c99d6ec1791fdbb068ae1769e5e  src/components/coordinadores/modal/CaseDetailModal.tsx
55fb102507574928ff848dc976869f0e3c1a1dd0381c936a72eb2aebcb317f3b  src/components/coordinadores/modal/CaseDetailModalHeader.tsx
a99750c320a0f4282feea09a809be77c7cae94b308aa90ec5232fe79fc390deb  src/hooks/useCirugiaActions.ts
bbc3c99ca3af2cba5bf72799c998895f9ea16bbaa1fec86fef83159255096d51  src/components/cirugias/dialogs/ChangeDateDialog.tsx
fba3613fe97041ab0e7d680aba882acf98bad8ceb0c9c70545c8aaa2fd9cf33a  src/app/cirugias/page.tsx
33d31bdb73cbfd6c8bf22e75e8a5b0f6e183e69e8803e842c529a257d5b74b9a  src/__tests__/unit/rescheduling.test.ts
e73367c9fc5b2312106bcb466d422b5c08b399904f01d3cdbd1cf5cfbb469eb4  src/__tests__/unit/rescheduling-service.test.ts
f6e301296938f0a4c5bccc56464e436f862c850cdff5c273f8ba6fe7b1d697b9  src/__tests__/unit/surgery-management.service.test.ts
53e7ee1f5ffeaacdcaa669f18ede4af5efed101ad55ac247bf33c62d989e0b21  src/__tests__/unit/surgery-management-route.test.ts
389eac4b7e696990b39c3b006e63d90b7fb27f78a433d6dbd2b2fb59a18ff645  src/__tests__/unit/useCirugiaActions-change-date.test.tsx
bbd2836c2d87026273b5d1d76801b762df3e1c94f63bfd97b7d4cc0a21fd75cc  src/__tests__/components/ReschedulingForms.test.tsx
b73f5f064ab9addda7c3912b537d64150f199df4926d2aa53b6ab63e88db10ae  src/__tests__/components/ActiveCoordinadoresRescheduling.test.tsx
7253c34ab7ea4a5b8ffbdb887cc8353b1f99041fdba8fa78e24de7755dabbec6  src/__tests__/components/ChangeDateDialog.test.tsx
```
