# Readiness by independent domain — 2026-10-01

**Decision: GO for local READ-ONLY dry-run of Contact, Article, Surgery; NO-GO for every DEV write today.** A status below applies to the *specified mode* and does not authorize migration. Domain boundaries follow actual `Surgery` schema: it has required Company and patient Contact, optional doctor/institution/payer Contact; NO required Article, Remito, Consumo, Invoice or StockMovement relation on create (`schema.prisma:393–457`).

| Domain | READ-ONLY dry run | DEV write test | Exact blocker for write |
|---|---|---|---|
| Contact | **READY** (source candidates and duplicate/role validation) | NOT READY | native DEV matching unknown; CLICOD 2268 duplicate; legal document validation; inactive company-link access; ledger + actor audit policy |
| Article | **READY** (independent catalogue; optional for Surgery) | NOT READY | duplicate ARTCOD 1301-T1S unlike descriptions, zero code, 3 blank descriptions; organization/SKU match + VAT/unit/traceability policy + ledger |
| Surgery | **READY** (core candidate; unresolved records as REVIEW) | NOT READY | company/Contact IDs must be resolved in disposable DEV; ledger; date-only storage; status TRA/SCO exceptions; historical audit actor and writer |
| Remito | feasible exploratory source check but **NOT READY** for candidate write dry-run | NOT READY | document identity NR/RE and number unproven |
| Consumo | NOT READY | NOT READY | effective consumed quantity/source unproven |
| Devolucion | NOT READY | NOT READY | event/line pairing, cancellation vs post-consumption |
| Invoice | NOT READY | NOT READY | draft/emitted/fiscal identity, number and type not validated |
| Payment | NOT READY | NOT READY | imputations/saldo identity unresolved |
| Stock histórico | NOT READY | NOT READY | snapshot/balance and movements would alter live stock |

**No DEV DB was queried**: read-only source dry-run reports native match as UNKNOWN; an optional DEV-only SELECT comparison requires independently verified disposable-DEV endpoint and authorization, must not inspect or use secrets in logs. Not having it does **not** block the local legacy-only dry run. Before write, explicitly approve finite DEV package (schema/actor policy, migration writer, tests), verify disposable DB and reconcile source→stage→native targets. Fiscal/stock stages are not prerequisites for core Surgery.
