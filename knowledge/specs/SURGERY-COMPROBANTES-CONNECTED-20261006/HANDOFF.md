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
- PDF download/edit and printing for PR/FV/CO, PE/NC/ND unavailable; NR browser printing enabled by follow-up step 1 below. No live DB acceptance. Company-wide payment scan has a documented scaling ceiling. Full app TypeScript remains blocked by unrelated files; full Next build not certified.
## Next
- Local delivery commit `93514ab`, with a bounded dark-contrast follow-up after screenshot inspection; no push. Live authenticated DEV acceptance and actual PDF/module-edit integration can be separate bounded tasks.

## Follow-up step 1
### Done
- User-approved NR printing only completed. Step 2 not started.
### Changed
- Fresh authenticated remito GET, matching ID/company/surgery required. Document-specific escaped template opens in separate print window, with explicit popup-blocker/error feedback and late-response cancellation on reload/scope changes.
### Files
- Only `src/components/expediente/ComprobantesAsociados.tsx` product source; task brief/validation/handoff and own lock. No test/helper/API/Auth/schema/dependency edits.
### Validations
- 27/27 unchanged tests, scoped TypeScript, isolated component build and synthetic responsive QA PASS. Embedded print check verifies real popup/HTML, escaped backend fields, blockers/errors/scope rejection/reload/retry PASS.
### Risks
- Headless check observes `print()` invocation, not native print-dialog completion or a physical printer. Browser may offer Save as PDF; this is not direct PDF download. HTML Blob download must never be labeled PDF.
### Next
- Ask Franco for explicit confirmation before step 2. Verify a real PDF-generation path before proposing direct download; PR/CO module print claims remain unverified. No push.
