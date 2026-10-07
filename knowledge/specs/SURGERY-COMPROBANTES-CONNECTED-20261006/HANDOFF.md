## Done
- Connected Ficha CX Comprobantes register delivered; shared coordinator consumer benefits without edits.
## Changed
- Backend-only PR/FV/NR/CO, all pages, direct/indirect payments, search/type/state filters, loaded read-only details and reload.
- Flat responsive document register, short entrance/active-filter motion, reduced-motion support. Legacy cards/debt and fake actions removed.
## Files
- `src/components/expediente/{ComercialTabContent,ComprobantesAsociados,ComprobanteDetail}.tsx`, `comprobantes-model.ts`, `src/hooks/useSurgeryComprobantes.ts`.
- Three exact component test files; task brief/lock/validation, isolated QA fixture/config and worklog.
## Validations
- 27/27 tests; scoped source/test TypeScript; isolated component build; synthetic desktop/mobile/dark/reduced-motion QA; independent static review PASS.
## Risks
- PDF/print/edit, PE/NC/ND unavailable; no live DB acceptance. Company-wide payment scan has a documented scaling ceiling. Full app TypeScript remains blocked by unrelated files; full Next build not certified.
## Next
- Local delivery commit `93514ab`, with a bounded dark-contrast follow-up after screenshot inspection; no push. Live authenticated DEV acceptance and actual PDF/module-edit integration can be separate bounded tasks.
