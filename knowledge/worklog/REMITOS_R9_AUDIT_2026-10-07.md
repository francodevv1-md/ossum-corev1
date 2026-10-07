# Remitos R9 — content audit, technical-id guard

## Done
- Reproduced and repaired the technical-id and audit-content seams; review pending.
## Changed
- `useRemitos` filters `surgeryId` through a new cuid/uuid/long-hex guard; coordinator panels stop using the store id as a fallback.
- `serializeRemitoForAudit` includes items, snapshots and metadata; `serializeDate` accepts `undefined`.
## Files
- New `src/lib/api/ids.ts`; updated `useRemitos.ts`, the two coordinator panels, `serializeRemitoForAudit`, `serializeDate`.
- Two new test files; R9 docs/config/lock, audit/map R9 status.
## Validations
- 8 red checks before fix; 127/127 across 7 R1–R8 + R9 suites; broad 580/580 across 38 files preserved; R9 typed and whitespace PASS. Independent review pending.
## Risks
- No real DB/Auth/browser/global build certification. Id guard is best-effort; serializer increases audit size.
- No schema/Auth/roles/UI/Cajas/returns/dependencies/DB/Git mutation. Foreign R8 and other-agent Surgery files untouched.
## Next
- Independent review; then either close or carry remaining gates. Future work: any non-R9 global type/build issues are explicitly out of scope.
