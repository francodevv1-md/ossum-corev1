# Handoff

## Done

- Cajas aligned with the established operational UI from Stock/Artículos and Remitos.
- Durable system and overlay rules documented in `DESIGN.md`.
- Independent review findings corrected.

## Changed

- Continuous full-height shell, compact headers/toolbars/tabs, dense semantic tables, internal scrolling and explicit states.
- Model and physical-unit details no longer use presentation-style heroes or nested card stacks.
- Maintenance dialogs now use bounded height, scrollable bodies, structured header/footer, focus states and associated labels.
- New-model article loading distinguishes loading, empty and recoverable error states.
- Tabs support keyboard navigation and stable ARIA relationships.

## Files

- `DESIGN.md`
- `src/app/cajas/page.tsx`
- `src/components/boxes/BoxesOperationalIndex.tsx`
- `src/components/boxes/BoxSkuDetail.tsx`
- `src/components/boxes/PhysicalUnitDetail.tsx`
- `src/components/compras/ArticleSearchInput.tsx`
- focused Cajas component tests

## Validations

- Focused Cajas Vitest: 44/44 PASS.
- Focused ESLint: PASS.
- `git diff --check`: PASS.
- Global TypeScript still fails only on pre-existing files outside this package; no scoped file is reported.
- Browser reached the DEV runtime on port 3001 and correctly redirected `/cajas` to login on desktop/mobile; authenticated visual smoke remains pending.

## Risks

- Authenticated desktop/mobile visual inspection was not possible without crossing the Auth boundary.
- Shared working tree remains broadly dirty from prior work; no commit was requested or created.

## Next

- Run one authenticated desktop/mobile smoke of `/cajas` when a DEV session is available.
