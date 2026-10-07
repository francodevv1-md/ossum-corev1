# Surgery Comprobantes connected register — 2026-10-06

## Done
- User-authorized scoped Ficha CX redesign and backend reconnection delivered on `ux/antigravity-redesign`.
## Changed
- Current local-authority regression reproduced (12 tests failed), repaired through existing clients. PR/FV/NR/CO linked reads, indirect invoice payments, complete pagination, loaded details, honest unavailable actions, scoped snapshots and motion accessibility.
## Files
- Exact sources/tests/QA in `knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/`; ownership in `.opencode/locks/SURGERY-COMPROBANTES-CONNECTED-20261006.lock.md`.
## Validations
- 27 tests PASS; scoped TypeScript PASS; isolated component build PASS; synthetic browser desktop/mobile/dark/reduced-motion PASS; independent review no blockers.
## Risks
- Application-wide TypeScript errors outside task remain. No full Next build/live DB/production acceptance. PDF/print/edit intentionally unavailable. Foreign working-tree changes preserved.
## Next
- Local allowlisted delivery commit `93514ab` plus dark-contrast follow-up; no push. Separate task for actual document-specific PDF/edit integration and live DEV acceptance.
