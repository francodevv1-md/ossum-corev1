# Task Brief — Cajas Operational UI DEV

- Task: `CAJAS-OPERATIONAL-UI-DEV-001`
- Risk: T2, visual/interaction refinement only
- Objective: align the complete `/cajas` surface with the established operational language from Stock/Artículos and Remitos.
- Direction: compact full-height workspace; white header and toolbars; navy data headers; dense, scannable rows; explicit selection, state and recovery; structured dialogs with bordered header/body/footer.
- Source of truth: `src/app/stock/page.tsx`, then `src/app/remitos/page.tsx`; Facturas de compra contributes workflow conventions where consistent. Shadcn is implementation infrastructure, not the visual authority.

## Allowed files

- `src/app/cajas/page.tsx`
- `src/components/boxes/BoxesOperationalIndex.tsx`
- `src/components/boxes/BoxSkuDetail.tsx`
- `src/components/boxes/PhysicalUnitDetail.tsx`
- `src/components/compras/ArticleSearchInput.tsx`
- focused Cajas component tests for those surfaces
- `DESIGN.md`
- this Change Pack

## Forbidden

- schema, migrations, API contracts, Auth, permissions, business rules, Cirugías, production/staging, dependencies, commit/push/PR

## Validation

- focused Vitest suites
- focused ESLint
- TypeScript evidence scoped to touched files when the global baseline remains dirty
- desktop/mobile browser smoke when an authenticated DEV runtime is available

## Stop conditions

- functional behavior must change to achieve the design
- concurrent ownership appears on an allowed file
- work crosses any forbidden boundary
