# TASK BRIEF — CAJAS-UNIT-BOARD-DEV-001

## Objective

Turn `/cajas` → Unidades físicas into a read-only control board that exposes each physical unit's use count, latest qualifying Surgery, reported problems, repair-log signal, and direct history access.

## Product rules

- One use is one distinct Surgery in `performed` or `finalized` where the unit was assigned.
- Latest Surgery uses `performedDate ?? surgeryDate ?? assignedAt`.
- Show `Problemas reportados`; the current append-only log has no problem-resolution state.
- Show repair activity as `Señal según bitácora`; repair sends/returns have no episode correlation.
- Keep full history lazy and `/cajas` read-only.

## Scope

- Extend the existing operational-index projection in one additional company-scoped query, without N+1 requests.
- Replace the SKU-centric index with one responsive, unit-centric DOM list.
- Preserve search, condition filters, loading/error/empty states, and model-detail access.
- Add focused service and component tests.

## Allowed files

- `src/lib/services/cajas-operational.service.ts`
- `src/features/boxes/presentation/boxes-presentation-fixtures.ts`
- `src/components/boxes/BoxesOperationalIndex.tsx`
- focused Cajas tests
- this Change Pack

## Exclusions

- Schema, migration, Auth, roles, permissions, production/staging/deploy, new dependencies, monetary profitability, and Cirugías refactors.
- Inventing an authoritative open-problem or current-repair state.

## Validation

- Focused service and component tests.
- Focused ESLint.
- Impeccable detector.
- Independent read-only review.

## Approval evidence

Franco explicitly requested and approved continuing the finite DEV implementation in chat on 2026-08-26.
