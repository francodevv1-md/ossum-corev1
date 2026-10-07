# Remitos — bounded contract stabilization

## Objective and scope
User requests correct Remitos operation, critical-flow review, typing/validation/frontend/API/backend contracts and reusable foundations without browser QA. Deliver small reproducible work units, not an unsupported whole-application certification.

Owner/model: GPT-6.1 Sol, implementation/testing. R1 is a bounded shared-hook lifecycle bugfix; backend/domain audit is directed read-only. No new architecture, dependencies or persistence. Canonical authority remains existing server services and validators.

## R1: stable scoped reads
- Trace: global Remitos page, CX Logistics, CX Consumption, CX Summary and coordinator Tracking → `useRemitos` → `api/remitos` → company routes.
- Reproduce: equal-valued inline filters retrigger refresh; late old company/filter/list/detail responses overwrite latest scope/selection; unmount/auth loading invalidation absent.
- Preserve return signature, page-sized pagination, refresh/mutation behavior and server authority. No changes to consumers or API payloads.
- Own only hook/new hook test/scoped config/evidence/lock. Foreign UI changes (including previous completed Comprobantes printing) untouched.
- Validate with controlled promises, mock authenticated scope/API and existing consumer regressions in Vitest/jsdom; no actual browser or DB connection.

## Follow-up work units
- R2: pin actual wire response/payload contracts and validators, including compact mutations vs hydrated reads and optimistic version handling. Scope after backend audit and focused typecheck evidence.
- R3: emission/state transitions/Cajas stock transaction and retry regression checks. Do not invent stock movement for manual lines or conflate state PATCH with issuance.
- R4: consumption/return/trace consistency, quantities/precision, duplicate request behavior and cross-module refresh.
- R5: reuse/documentation and scoped/full typing/build gates; report baseline foreign errors rather than changing unrelated modules.

Each unit needs its own explicit owned files and failing runnable check before a fix. Tests that require a real disposable DB must remain opt-in until current target is confirmed. No browser QA, commits, push, migrations, security policy changes, UI redesign or broad refactors.

## Stop conditions
Active source overlap; necessary DB/schema/Auth/security changes; unclear business rule; production/staging or real data. Report evidence and one focused question only if execution is actually blocked.
