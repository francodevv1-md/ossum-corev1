# Scoped independent source attestation

Reviewer `central-cyan-orca`, 2026-10-04: PASS for exact manual Invoice create → operational `/emitir` → single-owned-invoice ARS Payment imputation chain.

- No fiscal provider/CAE, email, external push/webhook or outbound business-message dispatch found in these business service/audit/notification chains.
- Auth may call Supabase `auth.getUser`; PostgreSQL communication remains necessary. This is NOT a zero-network attestation or authorization to disable Auth.
- Invoice draft/item + emission + payment/imputation + audit are expected DEV data effects. Payment can create DB-only in-app notices to eligible DEV-company admin/billing/commercial members, excluding actor. No delivery/count promise.
- Deterministic payload: manual FV, omit surgery/source keys entirely, quantity1, specified scale4 unitPrice, discount0, NO_GRAVADO/rate0/tax0. Partial/paid payment ARS and one imputation only to checked owned ARS invoice.
- Server authority still checks company and current role. Runner must additionally enforce exact namespace ownership, case/currency/amount/source/actor, single imputation, and mutation allowlist; server alone does not enforce QA ownership or matching currencies.
- No migrations, production/real records, cancellation/delete/cleanup, outbound or provider/config mutations authorized.

Evidence: invoice routes37–55 and emit route10–17; invoice.service.ts279–342/434–479/631–663/684–714/738–752; payment.service.ts133–230; internal-notifications.service.ts305–428; audit.ts29–44; existing VAT/validators/guards. Source-only inspection; runtime instruments, database triggers and background consumers were not audited or certified.
