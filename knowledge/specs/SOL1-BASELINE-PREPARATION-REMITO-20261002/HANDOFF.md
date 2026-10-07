# Sol 1 — bounded code implemented; incident audit pending; NOT READY

## Done
- Baseline audited and four mechanical fixtures corrected; historical evidence and foreign/ambiguous source preserved.
- After Franco's `dale metele`, implemented the exact six-file preparation contract scope using existing Cajas services/validators.
- Independent baseline, ownership and final source reviews complete; six released hashes independently match; Sol1 locks released.

## Changed
- General selection PATCH/client supports positions/quantities/physical-unit/append/remove through the existing service.
- Explicit reservation/control commands carry version/key/cause/kind unchanged; incomplete recontrol rejects safely, never silently downgrades. Bodyless reservation/ordinary legacy control remain compatible.
- Resolution transports observed sequence; malformed JSON returns400. Deprecated incomplete caller overload is compile compatibility only, not working UI recovery.
- Services/validators/roles/permissions/schema/Movimientos/foreign Stock host unchanged. No commit/staging/deploy/browser/build/server restart.

## Files
- Four baseline Presupuestos fixtures now match certified HEAD blobs.
- src/lib/api/cajas-assignments.ts
- Cajas assignments/[assignmentId] reservation/control and differences/[differenceId]/resolve routes
- New preparation-lines/[lineId]/selection route and unit/cajas-preparation-contract.test.ts
- This task directory: brief, locks, baseline/Diagnose, implementation, phase findings, validation, reviews and handoff.

## Validations
- Baseline initial291 passed/10 skipped; post-fix42/42 (overlapping suites).
- Final bounded Phase B unit-only run completed:184 passed/10 skipped across16 suites, including30 new contracts.
- Nonincremental TypeScript and diff checks passed; independent static source review found no introduced blocker; exact6 hashes matched. Combined check timeout was diagnosed by separate successful checks, not source changes.
- Pure PostgreSQL opt-in gate:1 passed/5 real cases skipped. No actual Cajas persistence proof.
- Implementation delegation timed out after writing final validation/lock release; written evidence is attributed, not an absent final response.

## Risks
- **Execution incident:** writer mistakenly included unguarded remitos-api integration at09:59:40 local/12:59:40UTC despite no-DB scope. Synthetic seed/cleanup hooks ran against the configured target; Remito POST returned403. Cleanup hook reported no failure, but current target and residual absence are not independently verified. Runtime fixture IDs were not captured. No further query/deletion/retry attempted.
- This is outside approval and not acceptance. Additional DB work stopped; no permission/Auth workaround applied. Details in IMPLEMENTATION.md/VALIDATION.md.
- Protected CajasPhysicalUnitsSection callers remain incomplete; new general-selection helper lacks an application caller. Canonical surgery-context hosting remains separately coordinated. Parent-assignment binding issue unchanged and outside security scope.
- NOT READY: actual prepared-materials→issued-remito persistent case, UI/browser and exclusive build acceptance remain pending.

## Next
- Ask Franco for explicit **read-only target/fixture-impact audit** of the accidental integration run. Do not request another routine disposability approval; verify same confirmed effective target securely if audit is approved.
- No cleanup/mutation during read-only audit; report exact discovered IDs/counts privately without secrets. Any subsequent cleanup requires scoped approval.
- Resume protected caller ownership and actual Cajas proof only after incident disposition and their prerequisites are confirmed. No shared-service/schema/Movimientos takeover.

## Final containment update
Franco-authorized last offline search finished in under3minutes as **evidencia no recuperada**. No exact marker or historical target proof found; residues/dependencies remain unknown. No DB/test/cleanup execution or secret/authenticated-session disclosure occurred. Recovery is closed, not an ongoing investigation. Package DB execution is blocked in DB_TESTS_BLOCKED.md; return to independent productive source/UI work under its exact ownership, without automatically lifting the DB hold or expanding scope.
