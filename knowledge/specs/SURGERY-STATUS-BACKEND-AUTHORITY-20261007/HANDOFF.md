# Handoff — Surgery status backend authority 2026-10-07

## Done
- All four state mutations (change/suspend/cancel/recover) now persist through the backend and only mutate the local store with the backend response.
- The Spanish/UI labels are accepted by the backend validator and canonicalized to the DB `cxStatus` codes; orphan UI states no longer reach Prisma.
- Read adapter no longer collapses `Suspendida`/`Cancelada`/`En tránsito` to `Pendiente`; preparation fallback stops pretending `frozen_with_missing`/`delivered`/`returned` are `Sin preparar`.
- Backend `updateSurgeryCxStatus` enforces compare-and-set on `(cxStatus, updatedAt)`; terminal `cancelled` and `finalized` no longer accept further changes; terminal `cancelled` is also blocked at the service level.
- `store.replaceSurgery` keeps existing fields stable when projecting the backend response and writes a single audit event when the state actually changed.
- Tablero (advance + recover) and Expediente (autorizar) now run through the same `persistStatusChange` helper exposed by `useCirugiaActions`; `runAutomations` refuses to advance terminal states and surfaces the failure instead of silently mutating the local store.
- Coordinadores (admin and personal) call `updateBackendSurgeryState` directly but now propagate the `coordinadores:gestion` source and bubble the rejection instead of swallowing it; the consumer (`CoordinatorInboxView`) keeps reusing the shared handlers.

## Changed
- `src/hooks/useCirugiaActions.ts` — new `persistStatusChange` helper reused by every status handler; failure path closes the dialog and shows the previous state.
- `src/lib/api/surgery-adapter.ts` — author-backed projection for `cxStatus` and `prepStatus`; `autorizado` no longer frozen from prior local state.
- `src/lib/api/backend-surgeries.ts` — encoder normalizes Spanish labels and accepts already-canonical codes; added `scheduled`/`programada` to `En tránsito` round-trip.
- `src/lib/validators/surgery.validator.ts` — `validateCxStatus` accepts UI Spanish labels; explicit terminal lock for `cancelled`/`finalized`; recovery from `cancelled` blocked.
- `src/lib/services/surgery.service.ts` — `updateSurgeryCxStatus` guard against terminal `cancelled`/archive + compare-and-set on `(cxStatus, updatedAt)` + 409-friendly concurrent-update error.
- `src/lib/store.ts` — new `replaceSurgery` action used by every successful status response.
- `src/lib/automations.ts` — new `TERMINAL_STATES` set, `getNextState` returns `null` for terminals, `runAutomations` no longer invokes the local `changeStatus` for terminal states.
- `src/app/tablero/page.tsx` — advance + recover use `persistStatusChange` instead of `store.changeSurgeryStatus`/`store.recoverSurgery`.
- `src/app/expediente/page.tsx` — `handleAutorizar` uses `persistStatusChange` instead of `store.authorizeSurgery`.
- `src/components/coordinadores/CoordinadoresAdminClient.tsx`, `src/components/coordinadores/CoordinatorPersonalClient.tsx` — state call carries an explicit source and now rethrows the rejection so the modal surfaces the failure instead of pretending success.

## Files
- src/hooks/useCirugiaActions.ts
- src/lib/store.ts
- src/lib/api/surgery-adapter.ts
- src/lib/api/backend-surgeries.ts
- src/lib/validators/surgery.validator.ts
- src/lib/services/surgery.service.ts
- src/lib/automations.ts
- src/app/tablero/page.tsx
- src/app/expediente/page.tsx
- src/components/coordinadores/CoordinadoresAdminClient.tsx
- src/components/coordinadores/CoordinatorPersonalClient.tsx
- src/app/api/companies/[companyId]/surgeries/[surgeryId]/status/route.ts (unchanged; service guards cover it)
- src/__tests__/unit/surgery-legacy-state-removal.test.ts
- src/__tests__/unit/useCirugiaActions-change-state.test.tsx
- src/__tests__/unit/automations-terminal.test.ts
- knowledge/specs/SURGERY-STATUS-BACKEND-AUTHORITY-20261007/**
- knowledge/worklog/SURGERY_STATUS_BACKEND_AUTHORITY_20261007.md
- .opencode/locks/SURGERY-STATUS-BACKEND-AUTHORITY-20261007.lock.md

## Validations
- RED before fix: confirmed via in-memory adapter/validator and visual reproduction of the bug.
- Focused regression after each fix:
  - `useCirugiaActions-change-state.test.tsx` — 5/5 PASS.
  - `surgery-legacy-state-removal.test.ts` — 31/31 PASS.
  - `automations-terminal.test.ts` — 7/7 PASS.
- Scoped `tsc --noEmit` with `incremental: false` on the listed allowlist: zero diagnostics.
- Other related suites preserved (no regressions introduced by this package; the 7 pre-existing `surgeries-intake-authorization` failures are mock-only and were red before any edit).
- No live DB round-trip, no server restart, no shared `.next`/runtime touched.

## Risks
- The full global `tsc` and `next build` were not run; global tsc has been OOM-prone in the past and was explicitly excluded by Franco.
- Live authenticated `http://100.107.173.14:5000/cirugias` was not re-validated. Source correction is in place; runtime still needs the safe rebuild/restart the shared runtime owner controls.
- `replaceSurgery` performs a single audit event only when state changed; out-of-scope coordinate/invoice fields are not reaudited (per prior invariant).
- `CoordinatorInboxView` keeps reusing `actions.handleRecover/handleChangeState/handleSuspend/handleCancel` from `useCirugiaActions`, so it now benefits automatically from the persist-first flow. No new test added for that page; it is not the failure surface.

## Fragile map (knowledge)
- Read carefully before any future surgery-state change:
  - `src/hooks/useCirugiaActions.ts` (`persistStatusChange` is the only path that should mutate state from a backend response; legacy `store.changeSurgeryStatus`/`store.suspendSurgery`/`store.cancelSurgery`/`store.recoverSurgery`/`store.authorizeSurgery` are kept for legacy non-status flows; do not use them for state changes).
  - `src/lib/api/surgery-adapter.ts` (`normalizeSurgeryState` and `normalizePreparationState` are the canonical Spanish↔canonical mapping; do not duplicate locally).
  - `src/lib/api/backend-surgeries.ts` (`mapUiStateToCanonicalCxStatus` is the only outgoing encoder for `cxStatus`).
  - `src/lib/validators/surgery.validator.ts` (`validateCxStatusTransition` is authoritative for both UI Spanish and canonical labels; terminal `cancelled` is immutable).
  - `src/lib/services/surgery.service.ts` (`updateSurgeryCxStatus` does compare-and-set on `(cxStatus, updatedAt)`; never bypass it).
  - `src/lib/automations.ts` (`getNextState`/`runAutomations` must refuse terminals; never feed them a `changeStatus` callback that mutates the local store).
  - `src/lib/store.ts` (`replaceSurgery` is the only action that should write a backend-projected surgery; `replaceSurgeries`/`hydrateBackendSurgeries` are full-list setters used by hydration).
  - `src/app/tablero/page.tsx` and `src/app/expediente/page.tsx` (must use `useCirugiaActions().persistStatusChange` for any state change).
  - `src/components/coordinadores/CoordinadoresAdminClient.tsx` and `src/components/coordinadores/CoordinatorPersonalClient.tsx` (state call carries `coordinadores:gestion` source and must surface the rejection to the modal).
  - `src/components/coordinadores/CoordinatorInboxView.tsx` (delegated handlers; do not bypass them).
  - `src/lib/cirugias.utils.ts`, `src/components/cirugias/*`, and `src/components/expediente/*` must keep consuming `state` as UI Spanish; never persist UI strings directly.
- Common breakers:
  - Direct call to `store.changeSurgeryStatus/suspendSurgery/cancelSurgery/recoverSurgery/authorizeSurgery` for any user-visible change. The store writes locally and will not reach the backend.
  - `apiFetch` with the raw `status: newState` payload to `/api/.../surgeries/:id/status`. The backend rejects anything outside the canonical codes.
  - Mapping `cxStatus: "scheduled"` to UI `En tránsito` and back, or treating `Sin consumo` as a backend state. Both are presentation-only.
  - Adding a new state without extending `CX_STATUS`, `CX_STATUS_LABELS`, `CX_STATUS_TRANSITIONS`, the adapter normalizer, the encoder, the store action and the relevant test suites.
  - Sending `recovery` to a `cancelled` surgery: the backend refuses; the UI must surface the error and never fall back to local mutation.
  - Any change to `useBackendActiveSurgeries` or `fetchBackendActiveSurgeries` that returns only a partial payload will re-introduce the `autorizado: false` regression (mitigated today by `replaceSurgery` + the `autorizado` projection rule).
  - Opening a second mutation while a previous one is in flight: the compare-and-set guard in `updateSurgeryCxStatus` will return `cx_status_concurrent_update`. Surface the previous state and re-fetch.

## Next
- Runtime owner rebuilds/restarts DEV safely; spot-check dated authorized/pending/suspended/cancelled in the live route.
- If Franco wants literal `En tránsito` to map to a non-`scheduled` canonical code (e.g. add a new `in_transit` state in DB), this is a backend schema/ADR task outside the approved package.
