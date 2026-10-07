# Remitos R6 — draft deletion and fragility map

## Done
- End-to-end existing API chain corrected and independently reviewed. Ranked fragility map current-source and independent factual/overclaim verification PASS; ownership released.
## Changed
- Required authenticated deleting actor, conditional draft/version claim before children, tenant-scoped unreferenced child and parent deletion, local FK409 mapping, atomic deleting-actor audit. Existing cancellation remains viable; no stock compensation.
## Files
- Remito service deletion interface/function; DELETE route forwarding;25 new contract cases; incumbent deletion mocks; R6 docs/config/lock; fragility map/audit status.
## Validations
-17 red/8 green →79/79 first focused and R6 tsc PASS. Final461/461 across31 files PASS; independent90/90+typing and owned diff whitespace PASS. Numeric precision/sum probes reproduced; open R7–R9 remain distinguished from executed cases.
## Risks
- No live DB/browser/global build acceptance; dependency-insertion isolation not verified. Auth mocked, real canonical guard exercised. Prior unrelated9 route fixture failures/printing intermittency excluded. Foreign diffs and R1–R5 preserved; no Git mutation.
## Next
- R7 returns, R8 stock, R9 audit/identity/global gates with their own failing replays, no automatic stock reversal or new cancellation prerequisites.
