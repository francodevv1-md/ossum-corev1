# Remitos R7 — atomic returns

## Done
- Approved bounded R7 implemented and independently re-reviewed; ownership released. Existing print/PDF, R1–R6 and cancellation viability retained.
## Changed
-1 outer transaction through existing Devolucion owners, parent lock/shared exact quantities, same-key accepted receipt with actual actor/content proof, in-view failed key retry retention. Generic Cajas return requires incumbent explicit accounting before orphan creation.
- Reproduced connected-writer races fixed with conditional company/state rejection/annulation writes, write-stage stale409 only.
## Files
- R7 lock/brief/config/validation/handoff; Remito/Devolucion services, quantity validator extraction, return transport/hook and focused tests; audit/map status.
## Validations
- Initial16 failed/25 passed of41; supplemental4 failures reproduced/fixed. Independent reviewer found overlapping-response P2;3 new hook redchecks repaired with same-command shared in-flight promise and pre-cache scope guard.144/144 final focused,502/502 across32 broad tests, R7 typing/whitespace PASS. Actual canonical accounting/ledger runs on staged doubles. Independent re-review144/144+typing+3 in-memory checks PASS; prior P2 resolved/no new issue.
## Risks
- No live DB/browser/global type/build acceptance. Caller key persistence/remount and metadata lookup scale limits explicit; unrelated excluded suites remain. No schema/Auth/UI/stock policy/Git mutation.
## Next
- R8 stock/transit, R9 audit/ID/global gates with failing replays first.
