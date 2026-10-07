# Surgery and budget contract stability

- Risk: T3, bounded DEV stabilization; Franco authorized implementation on 2026-10-07 ("Comenza la tarea, tenes 100% de autorizacion en las tareas").
- Outcome: Nueva Cirugía, Presupuestos, and optional budget creation during intake use persisted backend identities and truthful partial outcomes.
- Owner: orchestrator, openai/gpt-6-astra; directed implementation and independent review under explicit file ownership.
- Scope: reproduce contract failures; minimally correct intake orchestration and budget round trips; preserve existing dirty changes.
- Exclusions: schema/migrations, Auth/permissions, production, real data writes, unrelated workflows, dependencies, Git mutations, Browser QA.
- Validation: focused unit/component/API integration tests before and after each correction, TypeScript, isolated build. Database tests only against a confirmed disposable target.
- Stop conditions: overlapping active writer, ambiguous business semantics, need for excluded changes, unconfirmed database target.

## Bounded database validation
The existing value-free approved-DEV provenance verifier passed against the current configuration and saved disposable-target pin on 2026-10-07. After offline checkpoints pass, a scoped real-Prisma contract test may run on that exact confirmed target using existing verified synthetic fixtures inside one explicitly rolled-back transaction. No operational writes are committed, no Auth/membership fixtures are created, no cleanup DELETE or schema command is allowed. A mismatch stops the check. This is transactional integration evidence, not a browser or committed operational journey.

## Sequential checkpoints
1. Capture baseline and trace UI -> payload -> API -> validator -> service -> Prisma -> read projection.
2. Correct intake backend identity, optional budget backend write and truthful partial outcomes, with regressions.
3. Correct reproduced intake field or standalone budget round-trip gaps using existing contracts.
4. Run joint regression, TypeScript/build, independent review and scoped handoff.

## Initial evidence
- `useCirugiaActions.ts` creates the surgery with POST, then creates the optional budget through local `store.createBudgetForSurgery`.
- `createdSurgeryId` uses a visible reference whereas the dialog passes it to budget API calls.
- Failed authorization upload can be followed by a success toast claiming attachment persistence.
- Existing hook test expects the visible reference; standalone budget dialog already uses shared backend payload/client helpers.
- Existing dirty changes in NewSurgeryDialog and its tests are foreign work and must be preserved.
