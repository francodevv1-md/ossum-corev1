# Receipt Unit Scan Learning DEV

## Scope

One raw DataMatrix creates one `ScanEvent`. BIOPROTECE AI (22) resolves only through the existing `GS1_AI_22` identifier with BIOPROTECE context. AI 10, 21, and 17 remain unit trace data.

## Rules

- `GoodsReceiptLine` remains the commercial aggregate.
- Unknown scans persist as `PENDING` and retain raw payload and parsed traces.
- Resolving a pending scan with an existing article and aggregate increments exactly once in a transaction.
- Confirmation consumes resolved scan units, rejects pending scans and duplicate serialized units.

## DEV boundary

Additive migration only; applied to the confirmed disposable database. No Auth, Cirugías, supplier generalization, dependency, production, or deployment changes.
