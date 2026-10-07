# R7 handoff

## Done
- Atomic Remito return, same-command replay, shared balance serialization and precision implemented and independently re-reviewed. Ownership released; not full Remitos/live DB acceptance.
## Changed
- Existing canonical create/pending/confirm runs within1 outer transaction; parent row lock before quantities, exact Decimal aggregation, rollback across document/audit/accepted explicit Cajas effects.
- Optional durable accepted receipt key; actual actor/item-content proof. Shared hook retains failed in-view command and coalesces identical overlapping requests; success/content/context change starts fresh. Obsolete callbacks cannot corrupt current retained commands. No keyless/remount replay guarantee.
- Same-document state/rejection writers cannot overwrite a concurrent confirmed return. Existing Remito cancellation transitions unchanged, no new physical dispatch prerequisite/reversal.
- Cajas still requires explicit human accounting; generic return rejects without an orphan instead of inventing disposition.
## Files
- Remito/Devolucion services; shared Decimal validator and two consumers; return route/client/shared hook;36 new service/transport cases and5 hook checks; incumbent return/Cajas lock fixtures; R7 brief/config/evidence/lock and audit/map status.
## Validations
-16/41 initial red; supplemental2 receipt-tamper and2 writer races red→green. Independent review found overlapping-response P2;3 more hook failures reproduced and repaired. Final focused144/144 across6 files; broad502/502 across32; R7 scoped typing PASS.
- Actual Cajas accounting/command/stock-ledger functions on transaction doubles; confirmed retry once, late failure restores all effects. Independent re-review144/144 + scoped typing +3 extra in-memory checks PASS; prior P2 resolved/no new issue. Final owned whitespace PASS.
## Risks
- No PostgreSQL/real Auth resolution/browser/global build certification. Metadata receipt history lookup unindexed; key retained only in mounted view, precise strings required before transport.
- Separate9 Seguimiento route failures and intermittent printing suite excluded, not fixed. R8 stock and R9 audit/identity/global gates open.
- No UI/schema/Auth/roles/dependencies/DB/stock or accounting policy/commit/push/deploy.
## Next
- R8 single-effect transit/availability projection, then R9 audit/identity/global gates. Preserve R7 regression gates and explicit replay/DB limits.
