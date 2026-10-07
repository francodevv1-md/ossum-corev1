# Surgery legacy state removal — finite DEV task

## Approval and owner
Franco explicitly requested real removal of `Sin fecha` as a surgery state after the approved guide-only grouping (reported by parent). Sole source writer: implementation subagent, GPT-6.1 Sol (`openai/gpt-6.1-sol`). Parent owns independent review and final HANDOFF. Risk T3 because base types/store/surgery constants require a scoped protective lock, not a domain redesign.

## Outcome
Nine actual surgery states, in the existing order minus `Sin fecha`. Remove that state's option/filter/pipeline/automation membership. Keep missing-date predicates, labels and white presentation-only color key unchanged. Guide labels only `Sin autorizar`, explaining pending authorization can also lack a surgery date.

Only exact legacy local surgery.state `Sin fecha` becomes `Sin autorizar`; preserve IDs, dates, history and every other field. Backend inbound `unauthorized` and legacy alias map to `Sin autorizar`; outbound legacy alias maps to `unauthorized`. Canonical pending/authorized records remain unchanged even without dates. No DB normalization or added inbound transition.

## Allowed files
Source: src/types/index.ts; src/lib/cirugias.constants.ts; src/lib/shared-constants.ts; src/lib/constants.ts; src/lib/automations.ts; src/lib/statusHelpers.ts; src/lib/api/backend-surgeries.ts; src/lib/api/surgery-adapter.ts; src/lib/store.ts; src/components/shared/selectors/SurgeryStateSelect.tsx; src/components/cirugias/CirugiasOpTabs.tsx; src/app/tablero/page.tsx; src/components/cirugias/view-customization/ColorReferenceDialog.tsx. One small pure normalization helper only if necessary to prevent duplicate legacy conversion logic.

Tests: existing SurgeryPalette, cirugias-estado-prep-separation, cirugias-optabs, backend-active-surgeries-adapter, SurgeryStateSelect, supplier-remittance-store-migration; one focused new src/__tests__/unit/surgery-legacy-state-removal.test.ts.

## Exclusions and commands
No backend service/validator/transition policy/schema, API routes, hooks, Cirugías page, Auth/security, dependencies, seeds, DB reads/writes, email/provider, build/server/Prisma or Git writes. No whole-file restoration or unrelated fixes. Read-only inspection/status/diff/hash, local external snapshots and exact inspected offline Vitest files permitted. No global tsc/build/full test suite.

## Validation
- Baseline inspected existing exact offline suites before editing; repeat after changes.
- Nine states/options/order; no legacy option even through supplied allowedStates.
- Inbound unauthorized/legacy, outbound legacy and unchanged other statuses.
- Immutable synthetic v0/v1 local migration, version2 writeback and subsequent hydration; retain v0 supplier cleanup, v1 legitimate receipts and missing-surgeries merge defaults.
- Unknown/local states and pending/authorized undated records preserved; date condition/filter retained.
- Supplier migration, palette, tabs, selector, adapter, ChangeStateDialog and ExpedienteHeader regression tests. Known pre-existing two ChangeStateDialogEvidence failures must not be fixed.
- Changed-source syntax diagnostics, diff --check, foreign hash comparison and scoped byte-diff review.

## Stop and delivery
Stop on overlap, need for excluded/protected changes, ambiguous unsafe conversion or broader transition redesign. Preserve all dirty/untracked work (878 baseline SHA256 hashes and 19 scoped snapshots retained in approved external temp directory). Freeze source at lock review; return Done/Changed/Files/Validations/Risks/Next with exact counts and limits. Parent writes final HANDOFF; no commit.

## Bounded Diagnose evidence
- Baseline command: installed Vitest runner with nine explicit suites and --maxWorkers=2. Result: 82 PASS / 2 FAIL. Both failures already reported by parent: ChangeStateDialogEvidence expects persisted evidence to enable confirmation and an obsolete checkbox label. No product/test fixes to that excluded suite.
- First post-change command: same focused set, excluding known-failing Evidence and adding surgery-legacy-state-removal. All 99 assertions passed, but two uncaught Radix errors occurred when the newly added selector tests opened options: candidate.scrollIntoView is not a function. Scope: jsdom test environment only; evidence stack @radix-ui/react-select/dist/index.mjs:321. Hypothesis: missing jsdom scrolling method (existing nearby suites use the same no-op polyfill). Minimal fix: suite-local conditional Element.prototype.scrollIntoView stub, no shared setup or product change. Rerun targeted selector then full bounded regression set required.

## Frozen validation evidence
- Targeted selector rerun: 5/5 PASS, 1.36s. Final finite regression command below: 99/99 PASS across 9 files, 6.49s, no uncaught errors.
- Separate `node node_modules/vitest/vitest.mjs run src/__tests__/components/ChangeStateDialogEvidence.test.tsx --maxWorkers=1`: same baseline 2 FAIL / 1 PASS, 1.65s. No changes to this suite or its source.
- 18 changed TS/TSX files passed TypeScript transpile syntax diagnostics. Separate bounded compiler program using actual src/types/index.ts, src/lib/automations.ts and the extracted actual immutable store helper passed strict semantic checks, including an expected error for removed SurgeryState `Sin fecha`. This is NOT a full application typecheck.
- git diff --check PASS. 873 foreign baseline dirty/untracked hashes unchanged; none missing. External before/after scope diff shows 12 source changes, 5 existing tests changed, 1 new focused test. statusHelpers and backend-active-surgeries-adapter test remain unchanged.
- All remaining source occurrences are date presentation/filter labels, presentation-only color keys, or explicit compatibility guards; no actual legacy membership remains. Default selector's existing eight-state subset is unchanged; supplied ALL_STATES exposes nine without Sin fecha. No new transitions or dates-based inference.
- No real browser/server/build/full-tsc/Prisma/DB/provider/Git write actions. Parent owns final HANDOFF and independent review; lock status review freezes source.

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/surgery-legacy-state-removal.test.ts src/__tests__/components/SurgeryPalette.test.tsx src/__tests__/unit/cirugias-estado-prep-separation.test.ts src/__tests__/unit/cirugias-optabs.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/components/SurgeryStateSelect.test.tsx src/__tests__/unit/supplier-remittance-store-migration.test.ts src/__tests__/components/ChangeStateDialog.test.tsx src/__tests__/components/ExpedienteHeader.test.tsx --maxWorkers=2
```
