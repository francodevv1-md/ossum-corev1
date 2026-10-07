# R10 handoff

## Done
- All seven remaining surgery technical-id fallback sites now use `isTechnicalId`; the local store id is no longer sent to queries, URLs or dedupe keys. Independent critical review pending.

## Changed
- `src/components/coordinadores/modal/TabPaneAdjuntos.tsx` — `useSeguimientoFeed` and document URL use the technical id or empty.
- `src/components/cirugias/SurgeryContextTray.tsx` — document URL uses the technical id or empty.
- `src/hooks/useCirugiaActions.ts` — `persistStatusChange` uses the technical id or null; existing guard still blocks when no id is available.
- `src/components/mail/SendEmailModal.tsx` — dedupe contextKey uses the technical id or empty.
- `src/components/facturacion/InvoiceHeaderCompact.tsx` — `handleSelectSurgery` persists the technical id or empty.
- `src/components/expediente/NovedadesTabContent.tsx` — `mailContextKey` uses the technical id or empty.
- `src/__tests__/unit/surgery-id-guard.test.ts` — 8 new cases covering each site.

## Files
- The six frontend files above; the extended test file; R10 brief/config/validation/handoff/worklog/lock.

## Validations
- 8 red checks before fix; 480/480 across 33 suites PASS; R10 typed/whitespace PASS. Review pending.

## Risks
- No real PostgreSQL/Auth/browser/global build certification. Existing `useSeguimientoFeed`/action guards rely on the empty/null fallback. Id guard is best-effort, not a contract change.
- No schema/Auth/roles/UI outside the seven sites/Cajas/returns/stock writers/dependencies/DB/Git mutation.

## Next
- Independent review; if PASS, release and commit. The R1–R10 audit/identity/transport seams are now closed; future global build/type gates are out of scope unless explicitly authorised.
