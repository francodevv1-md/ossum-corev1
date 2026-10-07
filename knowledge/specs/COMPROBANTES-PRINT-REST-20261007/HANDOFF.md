## Done
- Browser printing enabled for presupuestos, operational invoices, and cobros inside Comprobantes. Existing remito print/PDF retained.
## Changed
- Fresh authenticated exact-record GET, scope validation, escaped A4 operational financial layout, saved amounts without calculations, indirect payment links via fresh paginated surgery invoices, payment total/current-surgery allocations distinction.
- Incumbent popup/read/error/cancellation path extended, detail guidance corrected,44px affected mobile action targets; design/motion otherwise retained. PDF/Modify unchanged.
## Files
- `src/lib/comprobante-print.ts`; `src/components/expediente/{ComprobantesAsociados,ComprobanteDetail}.tsx`; new `src/__tests__/components/ComprobantesPrint.test.tsx`; one obsolete assertion in `ComprobantesAsociados.http.test.tsx`; own brief/validation/browser harness/TS config/lock.
## Validations
-64/64focused+existing tests and scoped TS PASS. Isolated minified bundle, dev+production browser across5viewports/all4types+negative paths PASS. Actual Chromium A4/parser/visual review includes100items over9pages. Independent read-only review no blockers.
## Risks
- Synthetic QA only; native OS physical printing/live authenticated DEV/full Next build not certified. Operational copies are not fiscal documents. PR/FV/CO direct PDF and all Modify remain unavailable.
## Next
- Use Comprobantes → Acciones → Imprimir for all supported types. Changes left uncommitted; no push/deploy/DB operations. User acceptance with authenticated DEV remains a separate validation.
