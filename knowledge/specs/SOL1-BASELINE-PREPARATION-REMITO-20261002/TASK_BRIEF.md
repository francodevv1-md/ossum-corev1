# Sol 1 — Baseline and Preparation → Remito

## Approved outcome
User request dated 2026-10-02 authorizes a finite DEV implementation in `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`: reconcile baseline evidence, correct owned mechanical errors, and complete one synthetic prepared-materials → issued-Remito journey. This does not authorize unrelated Stock/Compras work, Auth/permissions, deployment, fiscal issuance, real data, commits or destructive cleanup.

## Declaration
- Task: `SOL1-BASELINE-PREPARATION-REMITO-20261002`; risk: T3 bounded integration, baseline fixture subset T2.
- Orchestrator: Sol 1, `openai/gpt-6.1-sol`; mode: coordination/docs/testing.
- Sources: AGENTS.md, Knowledge index/core, PREPARACION_REMITOS_CONSUMO.md, STOCK_CAJAS_TRAZABILIDAD.md, Cajas specification/ADR and existing Remito contract.
- Allowed orchestrator writes: this directory's TASK_BRIEF.md, LOCK.md, VALIDATION.md, PHASE_B.md, REVIEW.md and HANDOFF.md only. Baseline writer exclusively owns its four tests and BASELINE.md/BASELINE_LOCK.md.
- Allowed commands: read-only Git inspection, focused Vitest, `npx tsc --noEmit --incremental false`; no shared `.next` regeneration.
- Forbidden: staging/restore/commit/push; schema/migrations, dependencies, Auth/security, core Cirugías refactor, Movimientos files reserved by MiniMax, foreign source changes, server restarts; DB/browser/build without their prerequisites.
- Validation: focused regressions after each correction, TypeScript, independent read-only review. Persistent case acceptance requires real PostgreSQL evidence; UI acceptance requires browser evidence. Mock tests cannot confer READY.
- Handoff: Done / Changed / Files / Validations / Risks / Next, separating baseline, actual implementation and pending acceptance.

## Phase A
Read-only audit of `73e3e1b` and `2d8d617`, certified blobs and residual diffs. Correct only four pure-budget fixture regressions with explicit baseline ownership; preserve ambiguous service date/time behavior and foreign invoice/billing-gate work. Do not rewrite historic evidence.

## Phase B boundary
Active chain: Cajas client → assignment reservation/control/difference routes → existing selection/reservation/control services → Cajas intent → Remito API → existing Serializable Remito owner/dispatch services.

The existing `CAJAS-END-TO-END-DEV-001/ORCHESTRATOR_OWNERSHIP_PAUSE.md` explicitly requires coordinated exclusive ownership before critical-source/DB mutations. Released Cajas lock files alone do not clear that hold. No Cajas source is claimed or edited until the hold is reconciled.

### Current coordination approval
Franco answered `dale metele` on 2026-10-02 to: “¿Confirmás ownership exclusivo para Sol 1 sobre la cadena Cajas delimitada en el brief, levantando esa pausa y manteniendo Movimientos, Stock compartido y schema fuera del alcance?” This lifts the hold only for the exact client/API/additive-test scope below. Historical ownership records remain unchanged. Services/Stock/schema/Movimientos, Auth/permissions and separate security findings remain excluded; DB target/cleanup/auth/build prerequisites are separate evidence gates, not implied by ownership coordination.

Approved exact write scope after reconciliation:
- `src/lib/api/cajas-assignments.ts`
- `src/app/api/companies/[companyId]/cajas/assignments/[assignmentId]/reservation/route.ts`
- `src/app/api/companies/[companyId]/cajas/assignments/[assignmentId]/control/route.ts`
- `src/app/api/companies/[companyId]/cajas/assignments/[assignmentId]/differences/[differenceId]/resolve/route.ts`
- additive `src/app/api/companies/[companyId]/cajas/preparation-lines/[lineId]/selection/route.ts`
- additive `src/__tests__/unit/cajas-preparation-contract.test.ts`

Shared Stock/Cajas services, ledger, Stock host, schema and existing integration fixtures remain read-only. Actual surgery-context UI ownership must be declared separately before editing; no orphan workspace resurrection or new subsystem.

## Stop conditions
Competing writer/hash change, ambiguous domain difference, shared-service ownership hold, unsafe target, expired/missing auth, missing exclusive build window, or two minimal Diagnose cycles with the same proven blocker. Stop only affected work; continue independent safe baseline/testing.

## Current incident containment gate
Final offline recovery is closed as `evidencia no recuperada`. This package's DB tests/seed/cleanup/query execution remain blocked by DB_TESTS_BLOCKED.md. Safe QA uses exact reviewed unit/component files only, never implicit integration selection. Do not reopen or widen forensics automatically; continue independent productive work under approved ownership.
