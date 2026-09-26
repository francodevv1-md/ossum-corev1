## Handoff

### Done
- Replaced the active Ficha CX → Logística mount with an E1-only read surface.
- Preserved `LogisticsOperationsWorkspace.tsx` unchanged and unmounted from Ficha CX.
- Added desktop table and mobile allocation-card presentations without operations controls.

### Changed
- `LogisticaTabContent` now mounts `LogisticsInformationSurface` for server-backed surgeries.
- The new surface renders authoritative E1 quantities, stage facts/mixed summaries, Caja/trace data, unavailable Remito/material identity, blockers/differences, receipt/return/reconciliation facts, and latest published event.
- No scanner, action descriptor, mutation, dialog, filter, refresh control, technical permission text, or `/logistica` link is rendered.

### Files
- `src/components/expediente/LogisticaTabContent.tsx`
- `src/components/expediente/LogisticsInformationSurface.tsx`
- `src/__tests__/components/LogisticsInformationSurface.test.tsx`
- `knowledge/specs/FICHA-CX-LOGISTICS-INFORMATION-DEV-001/{TASK_BRIEF,LOCK,HANDOFF}.md`

### Validations
- `npm test -- --run src/__tests__/components/LogisticsInformationSurface.test.tsx` — 7 passed.
- `npm run typecheck` — passed.
- Independent review — pass after responsive correction.
- Authenticated headed Playwright — CX-0044 Logística verified at desktop and 390×844; mobile scroll width equals viewport width and the tabpanel contains 0 inputs/buttons/forms/dialogs.
- Captures: `C:\Users\franc\AppData\Local\Temp\opencode\ficha-cx-0044-logistica-desktop.png` and `C:\Users\franc\AppData\Local\Temp\opencode\ficha-cx-0044-logistica-mobile.png`.

### Risks
- CX-0044 still projects dispatched `1` and consumed `3`; this pre-existing projection/data inconsistency is visible but was not modified.
- E1 does not publish article identity or a visible Remito reference, so the surface displays `No disponible`.
- Console history includes two 401 entries caused by a manual unauthenticated diagnostic fetch during browser navigation; the rendered Ficha E1 request succeeded.

### Next
- Do not start `/logistica` from this package.
