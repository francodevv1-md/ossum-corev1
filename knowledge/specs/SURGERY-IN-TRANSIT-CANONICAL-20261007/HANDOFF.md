# Handoff — Surgery in_transit canonical state 2026-10-07

## Done
- `cxStatus = "in_transit"` is now a real canonical state in `CX_STATUS` with UI label `En tránsito` and Spanish/canonical aliases in the UI→canonical map.
- The Spanish UI label `En tránsito` and the canonical `in_transit` both round-trip through `mapUiStateToCanonicalCxStatus` and `mapUiToCanonicalCxStatus`.
- `validateCxStatus` accepts both spellings and now projects `in_transit` from the inbound UI strings.
- `surgery-adapter.normalizeSurgeryState` projects `in_transit` (and the legacy `in transit`/`en tránsito` aliases) to UI `En tránsito`. The previous default of `Pendiente` for these inputs is gone.
- `CX_STATUS_TRANSITIONS` adds `authorized → in_transit`, `pending → in_transit`, `scheduled → in_transit`, and `in_transit → performed | suspended | cancelled`. `scheduled` (Programada) remains its own canonical state with its own transition graph; it no longer doubles as `En tránsito`.
- `executeScheduledSurgery` and the `scheduled` execution gate are untouched: a `scheduled` surgery still requires a delivered Remito and the performedDate guard to be moved to `performed`.

## Changed
- `src/lib/validators/surgery.validator.ts` — `CX_STATUS`, `CX_STATUS_LABELS`, `UI_TO_CANONICAL`, `CX_STATUS_TRANSITIONS` updated; `En tránsito`/`en tránsito` accepted.
- `src/lib/api/surgery-adapter.ts` — `normalizeSurgeryState` returns `En tránsito` for `in_transit` (and the legacy aliases).
- `src/lib/api/backend-surgeries.ts` — `mapUiStateToCanonicalCxStatus` returns `in_transit` for `En tránsito`/`en transito`/`in transit`/`in_transit`; `scheduled` is preserved.
- `src/__tests__/unit/surgery-legacy-state-removal.test.ts` — `round-trips` and `preserves` tables refreshed; the `Sin fecha` preexisting TS2367 in the v0/v1 migration test is left untouched (it was red before this package and unrelated to `in_transit`).
- `src/__tests__/unit/in-transit-canonical.test.ts` — new; 17 tests covering CX_STATUS membership, UI↔canonical, validator, adapter, transitions, isolation between `scheduled` and `in_transit`.

## Files
- src/lib/validators/surgery.validator.ts
- src/lib/api/surgery-adapter.ts
- src/lib/api/backend-surgeries.ts
- src/__tests__/unit/surgery-legacy-state-removal.test.ts
- src/__tests__/unit/in-transit-canonical.test.ts
- knowledge/specs/SURGERY-IN-TRANSIT-CANONICAL-20261007/**
- knowledge/worklog/SURGERY_IN_TRANSIT_CANONICAL_20261007.md
- .opencode/locks/SURGERY-IN-TRANSIT-CANONICAL-20261007.lock.md

## Validations
- RED before fix: `mapApiSurgeryListToSurgeries([{id, cxStatus: "in_transit", surgeryDate}])[0].state` was `Pendiente`; `validateCxStatus("En tránsito")` threw `invalid_surgery_cx_status`. Both reproduced in a single tsx stdin execution before any edit.
- Focused regression after each fix:
  - `in-transit-canonical.test.ts` — 17/17 PASS.
  - `surgery-legacy-state-removal.test.ts` — 32/32 PASS (refreshed tables).
  - `automations-terminal.test.ts` — 7/7 PASS (unchanged; `in_transit` is non-terminal so the terminal guard stays correct).
- Scoped `tsc --noEmit` with `incremental: false` on the listed allowlist: zero diagnostics.
- Global `tsc` excluded (per existing project rule).
- No live DB round-trip, no server restart, no shared `.next`/runtime touched.

## Risks
- `cxStatus` is a `String` field in Prisma (not a Prisma `enum`); the validator is the authoritative contract. The migration is therefore purely code/data-mapping — no SQL change.
- The pre-existing TS2367 in `surgery-legacy-state-removal.test.ts:108` is unrelated; the v0/v1 migration test compares a string against `"Sin fecha"`, which TypeScript rejects. It was red before this package and is left untouched.
- The `scheduled` (Programada) and `in_transit` (En tránsito) canonical states are independent. Coordinadores and Tablero code that used the old shortcut `state === "En tránsito" → scheduled` is no longer correct; the explicit canonical `in_transit` is now required. The two Coordinadores client files already hydrate their cases from `mapApiSurgeryListToSurgeries`, so they benefit automatically; no Coordinadores file was modified.
- The new `in_transit` canonical state is not present in `executeScheduledSurgery` (which still only moves `scheduled → performed`). A surgery that reaches `in_transit` must first transition to `scheduled` (or be moved directly via `updateSurgeryCxStatus` to `scheduled`) before it can be `performed`. Documented in the in_transit-canonical test as a deliberate separation.

## Fragile map delta
- `src/lib/validators/surgery.validator.ts` — any future canonical state must extend `CX_STATUS`, `CX_STATUS_LABELS`, `UI_TO_CANONICAL`, and `CX_STATUS_TRANSITIONS`; `surgeries` whose inbound state is unknown now project to `Pendiente` only as a defensive default, not as a semantic answer.
- `src/lib/api/surgery-adapter.ts` — `normalizeSurgeryState` is the only place that converts backend strings to UI; never duplicate locally.
- `src/lib/api/backend-surgeries.ts` — `mapUiStateToCanonicalCxStatus` is the only outgoing encoder.
- `src/components/coordinadores/**` and `src/app/tablero/page.tsx` must keep consuming `state` as UI Spanish; never persist UI strings directly. Already enforced by the persistStatusChange helper.

## Next
- Runtime owner rebuilds/restarts DEV safely; spot-check `En tránsito` in the live route and confirm the round-trip (UI → backend → UI) does not regress.
- The `scheduled` execution gate is unchanged: a `scheduled` surgery must still go through `executeScheduledSurgery` to become `performed`. If Franco wants a shortcut from `in_transit` to `performed` to bypass the Remito requirement, that is a separate ADR (out of scope).
