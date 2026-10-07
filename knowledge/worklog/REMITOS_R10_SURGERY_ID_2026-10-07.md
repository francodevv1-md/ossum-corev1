# Remitos R10 — surgery technical-id fallbacks closed

## Done
- Seven remaining `backendId || surgery.id` sites now use `isTechnicalId`. Independent review pending.

## Changed
- TabPaneAdjuntos (feed + URL), SurgeryContextTray (URL), useCirugiaActions (action), SendEmailModal (dedupe key), InvoiceHeaderCompact (form value), NovedadesTabContent (dedupe key). Test suite `surgery-id-guard.test.ts` extended with 8 cases.

## Files
- Six source files, the test, and R10 docs/lock.

## Validations
- 8 red → 17/17 surgery-id-guard → 480/480 across 33 suites; R10 typed/whitespace PASS. Review pending.

## Risks
- No live DB/Auth/browser/global build certification. Id guard is best-effort. Foreign R9 and other-agent Surgery files untouched.

## Next
- Independent review then commit and release.
