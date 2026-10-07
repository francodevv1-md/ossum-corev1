# Surgery status backend authority — 2026-10-07

- User: Franco, 2026-10-07. Authorization: 100% for finite DEV state authority correction, excluding Auth/roles productive, schema/migrations, production/staging, real data, deploy, push and PR.
- Hook ownership: SURGERY-BUDGET-CONTRACT-STABILITY-20261007 reserved intake path; confirmed released at session end, status handlers free to edit. Status handler set documented in SURGERY-STATUS-BACKEND-AUTHORITY-20261007 lock.
- Backend validation accepts UI Spanish labels (validateCxStatus now maps to canonical codes) and the encoder normalizes every code (Autorizada, En tránsito, Realizada, Finalizada, Suspendida, Cancelada, Sin autorizar, Pendiente) to its canonical counterpart.
- `updateSurgeryCxStatus` now does compare-and-set on (cxStatus, updatedAt) inside the Prisma transaction, blocks archived/cancelled records and refuses terminal -> terminal transitions; cancelled is the only true terminal now (finalized kept only as historical terminal per validator; transitions still cover performed -> finalized + suspended).
- `surgery-adapter` projection no longer collapses `suspended`/`cancelled`/`in_transit` to Pendiente; `frozen_with_missing`/`delivered`/`returned` map deterministically to a single `Sin preparar` fallback (no fake state).
- `store.replaceSurgery` introduced; status handlers replace the row from backend response and emit one audit event only when the state actually changed.
- Validation evidence: 5 new tests + 31 legacy-state tests + scoped tsc clean. Pre-existing `surgeries-intake-authorization` mock failures red before any edit and not addressed by this package.
- Worklog/Handoff: knowledge/specs/SURGERY-STATUS-BACKEND-AUTHORITY-20261007/HANDOFF.md.
