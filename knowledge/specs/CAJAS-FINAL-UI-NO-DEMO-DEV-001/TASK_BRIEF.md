# Task Brief — Cajas Final UI without Demo

- Objective: remove visible demo/presentation reports, controls and wording from Cajas, leaving only the server-backed final operational experience.
- Risk: T2 UI cleanup; no schema, migration, DB mutation, Auth, permissions or business-rule changes.

## Allowed files

- `src/app/cajas/page.tsx`
- `src/app/cajas/[id]/page.tsx`
- `src/app/cajas/presentacion/page.tsx`
- `src/components/boxes/BoxesOperationalIndex.tsx`
- `src/components/boxes/BoxSkuDetail.tsx`
- `src/components/boxes/PhysicalUnitDetail.tsx`
- focused Cajas component tests
- this Change Pack

## Validation

- Focused Vitest and ESLint.
- Independent read-only review.

## Explicit boundary

- Existing DEV database rows are not deleted or mutated. Presentation fixtures may remain as non-runtime development artifacts when shared types still depend on their module.
