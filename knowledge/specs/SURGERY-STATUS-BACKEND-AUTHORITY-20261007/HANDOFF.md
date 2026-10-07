# Handoff — Surgery status backend authority 2026-10-07

## Done
- All four state mutations (change/suspend/cancel/recover) now persist through the backend and only mutate the local store with the backend response.
- The Spanish/UI labels are accepted by the backend validator and canonicalized to the DB `cxStatus` codes; orphan UI states no longer reach Prisma.
- Read adapter no longer collapses `Suspendida`/`Cancelada`/`En tránsito` to `Pendiente`; preparation fallback stops pretending `frozen_with_missing`/`delivered`/`returned` are `Sin preparar`.
- Backend `updateSurgeryCxStatus` enforces compare-and-set on `(cxStatus, updatedAt)`; terminal `cancelled` and `finalized` no longer accept further changes; terminal `cancelled` is also blocked at the service level.
- `store.replaceSurgery` keeps existing fields stable when projecting the backend response and writes a single audit event when the state actually changed.

## Changed
- `src/hooks/useCirugiaActions.ts` — handlers persist before mutating; failure path closes the dialog and shows the previous state.
- `src/lib/api/backend-surgeries.ts` — encoder normalizes Spanish labels and accepts already-canonical codes; added `scheduled`/`programada` to `En tránsito` round-trip.
- `src/lib/api/surgery-adapter.ts` — author-backed projection for `cxStatus` and `prepStatus`; `autorizado` no longer frozen from prior local state.
- `src/lib/validators/surgery.validator.ts` — `validateCxStatus` accepts UI Spanish labels; explicit terminal lock for `cancelled`/`finalized`; recovery from `cancelled` blocked.
- `src/lib/services/surgery.service.ts` — `updateSurgeryCxStatus` guard against terminal `cancelled`/archive + compare-and-set on `(cxStatus, updatedAt)` + 409-friendly concurrent-update error.
- `src/lib/store.ts` — new `replaceSurgery` action used by every successful status response.
- `src/__tests__/unit/surgery-legacy-state-removal.test.ts` — extended round-trip coverage; previous 28 tests still pass.
- `src/__tests__/unit/useCirugiaActions-change-state.test.tsx` — new; covers persist-then-mutate and failure for all four handlers.

## Files
- src/hooks/useCirugiaActions.ts
- src/lib/store.ts
- src/lib/api/surgery-adapter.ts
- src/lib/api/backend-surgeries.ts
- src/lib/validators/surgery.validator.ts
- src/lib/services/surgery.service.ts
- src/app/api/companies/[companyId]/surgeries/[surgeryId]/status/route.ts (unchanged; service guards cover it)
- src/__tests__/unit/surgery-legacy-state-removal.test.ts
- src/__tests__/unit/useCirugiaActions-change-state.test.tsx
- knowledge/specs/SURGERY-STATUS-BACKEND-AUTHORITY-20261007/**
- knowledge/worklog/SURGERY_STATUS_BACKEND_AUTHORITY_20261007.md
- .opencode/locks/SURGERY-STATUS-BACKEND-AUTHORITY-20261007.lock.md

## Validations
- RED before fix: confirmed via in-memory adapter/validator and visual reproduction of the bug.
- Focused regression after each fix:
  - `useCirugiaActions-change-state.test.tsx` — 5/5 PASS.
  - `surgery-legacy-state-removal.test.ts` — 31/31 PASS.
- Scoped `tsc --noEmit` with `incremental: false` on the listed allowlist: zero diagnostics.
- Other related suites preserved (no regressions introduced by this package; the 7 pre-existing `surgeries-intake-authorization` failures are mock-only and were red before any edit).
- No live DB round-trip, no server restart, no shared `.next`/runtime touched.

## Risks
- The full global `tsc` and `next build` were not run; global tsc has been OOM-prone in the past and was explicitly excluded by Franco.
- Live authenticated `http://100.107.173.14:5000/cirugias` was not re-validated. Source correction is in place; runtime still needs the safe rebuild/restart the shared runtime owner controls.
- `SurgeriesNotIn` for the contact-correlative/integration tests are still red due to prisma mocks in foreign work; unrelated to this package.
- `replaceSurgery` performs a single audit event only when state changed; out-of-scope coordinate/invoice fields are not reaudited (per prior invariant).

## Next
- Runtime owner rebuilds/restarts DEV safely; spot-check dated authorized/pending/suspended/cancelled in the live route.
- If Franco wants literal `En tránsito` to map to a non-`scheduled` canonical code (e.g. add a new `in_transit` state in DB), this is a backend schema/ADR task outside the approved package.
