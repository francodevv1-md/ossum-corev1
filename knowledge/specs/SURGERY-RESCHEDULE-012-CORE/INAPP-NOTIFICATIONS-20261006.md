# Rescheduling — real internal notifications

## User-approved outcome

Franco confirmed replacing the simulated rescheduling notice with real notifications **inside OSSUM COR**, for Administration and Logistics/Depósito in the same company. No emails, ntfy, WhatsApp or other external notifications.

## Bounded implementation

- Reuse the existing InternalNotification emitter and inbox; no new schema, provider, permissions or notification infrastructure.
- Trigger from the common updateSurgery path for actual surgery/shipping date changes, irrespective of initiating screen/authorized role.
- Save surgery, audit and notification rows in the same transaction. If notification persistence fails, the save must fail/roll back rather than falsely report complete success.
- Identify the actor, case, changed date type and previous/new date. Link to the existing Ficha route. Use existing surgery_rescheduled UI metadata and an audit-event source identity, not a fabricated Seguimiento entry.
- Notify only active admin/logistics recipients in the same company; Depósito maps to the existing logistics role. Preserve actor exclusion, mute and existing role-policy conventions. Never broaden unrelated notification defaults or company permissions.
- Deduplicate per committed change and recipient using existing event keys. Unchanged retries do not create another event; distinct future changes must create new events.
- Remove simulated metadata/log for this event. Report persisted notifications accurately, not emails delivered or read by recipients. No UI copy should claim external delivery.

## Validation

Exact offline suites with mocked transaction clients, including real notification selection/persistence logic: both date types, combined changes, previous/new dates and actor/link metadata, active same-company recipient filtering, no other roles, policy/mute and actor exclusions, unchanged/no-op retries, distinct event keys, conflict/rollback/failure behavior. Run existing rescheduling regressions and notification inbox/menu tests when safe. Direct tsc diagnostics remain separated from unrelated failures. Independent read-only review required.

Real DB/browser QA is pending an identified disposable DEV target, synthetic company/fixtures and authenticated session/server ownership. This approval allows writing the finite source/test package; it does not infer authorization for unidentified DB commands.

## Ownership / evidence

Current HEAD: 685ef3229da012ed988388d512d91f3e3c4bad2e. Existing rescheduling source is preserved. Relevant foreign dirty notification code is adopted only within the bounded emitter/selection change; do not overwrite it. No other lock claims these two service files. Active allowlist is in `.opencode/locks/SURGERY-RESCHEDULE-012-INAPP-20261006.lock.md`.

First implementation finished; parent replay of 19 exact offline suites passed 219/219 at 13:41:29 local. Direct TypeScript timed out at 120 seconds in the parent run; writer reported six unrelated diagnostics and none in edited files, not a parent-certified PASS.

Independent read-only source review found one blocker: the emitted `/cirugias/<id>` link has no dynamic route and overrides the consumers' valid Ficha fallback. Correct the bounded emitter to use the existing `buildNotificationExpedienteLink` helper and add a consumer test using the actual emitted notification shape. The other transactional/recipient/date/policy checks passed source review.

The broader writer replay included 14 failures in the unchanged NotificationsInbox suite. Review verified stale labels/selectors and metadata summary expectations for specific cases, not all 14. These failures must remain declared; do not silently certify the full inbox suite or rewrite unrelated availability/filter behavior. Focused actual emitted-notification navigation must pass before source acceptance.

## Final implementation

- `updateSurgery` now awaits the real scoped notification emitter within the same transaction as surgery update and audit. Notification persistence failures propagate, so the transaction cannot claim a completed save without its eligible notices.
- Actual date differences trigger one audited event; sourceEntityId is the created audit ID, and per-recipient keys are `rescheduling:<audit-id>:<user-id>` with existing duplicate protection. Unchanged retry has no new date event; distinct changes have distinct audit identities.
- Target role ceiling is limited to canonical admin/logistics and aliases for this emitter only. Existing company membership/activity, actor exclusion, role-policy opt-out and user mute behavior remain; opt-in for other roles cannot widen this event. Unrelated catalog defaults remain unchanged.
- Notice identifies actor, case, surgery/shipping date type and old/new dates. Surgery labels use Argentina timezone/explicit time precision; shipping uses its UTC date-only anchor.
- The corrected link uses `buildNotificationExpedienteLink({ surgeryId })` and existing `/expediente?id=...` route, with no fabricated Seguimiento entry parameters. The actual emitted row is consumed by the real Inbox in an offline click test, including marking read before navigation.
- Simulation metadata/log removed from this path. No email/ntfy/external send, and no assertion that a user read the notice.

## Final validations

| Check | Actual result | Evidence boundary |
| --- | --- | --- |
| Final focused offline replay | PASS 47/47, 4 files, exit 0, parent 13:46:18 local | Final corrected emitter/consumer/service snapshot, mocked DB clients with actual emitter/inbox logic |
| Earlier broader offline replay | PASS 219/219, 19 files, exit 0, parent 13:41:29 local | Before final link correction; retained evidence, not another 219 independent tests or complete final-suite acceptance |
| Final independent source review | PASS | Sole previously proven link blocker resolved; earlier transaction/recipient/date checks preserved |
| Scoped whitespace | PASS, exit 0 | Six application/test files |
| Direct TypeScript after timeout retry | FAIL, exit 1 | Six diagnostics outside edited files; no edited-file diagnostics. No typecheck bypass |
| Full legacy NotificationsInbox suite | FAIL in writer broader run, 14 cases | Some stale assertions verified; not globally repaired or accepted. Focused actual emitted notice navigation separately PASS |
| Real DB integration/browser | BLOCKED / NOT RUN | Identified disposable target/fixtures/server ownership/authenticated session not established |
| Build/generation/runtime restart/publication/external sends | NOT RUN | Excluded |

TypeScript diagnostics: `next.config.ts:10` TS2353; `CoordinationPreviewBoundary.test.tsx:53,58` TS2322/TS2741; `cirugias-api/page.tsx:179` TS2345; foreign `AiLateralRail.tsx:314,328` TS2339. These were not modified to make this task green.

Start HEAD was `685ef3229da012ed988388d512d91f3e3c4bad2e`. End HEAD is `ba37dcb7b46d64d7ee7f7891371673362b34301d`; the intervening unrelated branch-selector commit changed no owned service/test file. Source review and final focused replay certify the recorded files, not unrelated work or an entire product/runtime. Source ownership released.

## Changed files and hashes

```text
e0d3a887e6d716a9050a5a0994733633785052813503fce2622ccc4f19665f2e  src/lib/services/surgery.service.ts
f7633877cb75e2226c2a4e87a050149c2c3ce6c788fcdf0e18ff72b60eb786d6  src/lib/services/internal-notifications.service.ts
a3d852cc9ef1c046879ea303db3088be059c5522c054687eef17f8c42526bd24  src/__tests__/unit/rescheduling-service.test.ts
f28fb5e48171b42f339f62d76cfe0180dfa4e7421c8f1557d695955a03c34705  src/__tests__/unit/internal-notifications.service.test.ts
dcea72c10bc3d43d41892be0b371b39cb433c9d9123c18ae2fcf719389750081  src/__tests__/unit/surgery-management.service.test.ts
a7bd2bd27967b40316db9da15c29674b1759e7478bc81b33cf2fc03cbe0e2005  src/__tests__/components/ReschedulingNotificationNavigation.test.tsx
```

## Replay

From `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`:

```powershell
# Final corrected contract/emitter/consumer checks: offline only
node node_modules/vitest/vitest.mjs run src/__tests__/components/ReschedulingNotificationNavigation.test.tsx src/__tests__/unit/rescheduling-service.test.ts src/__tests__/unit/internal-notifications.service.test.ts src/__tests__/unit/surgery-management.service.test.ts

# Direct types, currently FAIL for the unrelated diagnostics listed above
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Earlier broader replay command (not rerun unnecessarily after the focused link correction):

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/rescheduling.test.ts src/__tests__/unit/rescheduling-service.test.ts src/__tests__/components/ReschedulingForms.test.tsx src/__tests__/components/ActiveCoordinadoresRescheduling.test.tsx src/__tests__/unit/surgery-management.service.test.ts src/__tests__/unit/surgery-management-route.test.ts src/__tests__/unit/useCirugiaActions-change-date.test.tsx src/__tests__/components/ChangeDateDialog.test.tsx src/__tests__/components/CirugiasChangeDateFlow.test.tsx src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx src/__tests__/components/CirugiasDataGrid.test.tsx src/__tests__/components/ExpedienteHeader.test.tsx src/__tests__/components/ExpedienteFullView.test.tsx src/__tests__/unit/surgeries-intake-authorization.test.ts src/__tests__/unit/internal-notifications.service.test.ts src/__tests__/unit/notifications-policy-security.test.ts src/__tests__/unit/erp-notifications-policy.test.ts src/__tests__/components/NotificationMenu.test.tsx
```
