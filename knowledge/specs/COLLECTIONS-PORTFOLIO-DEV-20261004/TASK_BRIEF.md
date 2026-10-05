# Collections portfolio DEV V1

- Approval: Franco requested implementation after the read-only portfolio proposal: “Dale perfecto. Actúa sobre ese aparato”. T2 finite DEV, read-only business operations.
- Outcome: `/ventas/cartera` with authoritative outstanding invoice balances per currency, issuance-age distribution, oldest/largest invoice prioritization, registered-payment trends, links to existing Cobros/Facturación.
- Owner: directed frontend implementer, host-selected model; coordinator openai/gpt-6.1-sol owns only this pack/lock. Single source writer.
- Allowed source files: new src/app/ventas/cartera/page.tsx, src/lib/collections-dashboard.utils.ts, src/__tests__/unit/collections-dashboard.utils.test.ts, src/__tests__/components/CollectionsDashboard.test.tsx.
- Reuse: useInvoices/usePayments, decimal-money and existing UI. Spanish UI matching product. No new dependency.
- Excluded: existing source edits, shared navigation, API/service/hooks/contracts/types, schema/DB mutations/migrations, Auth/permissions/security/fiscal, receiving/stock/Cajas/core Surgery, env/session/backup reads, commit/push/deploy, server restart/shared .next build.
- Semantics: authoritative backend balance, not total minus payments; no mixed-currency aggregate. Issuance age is not overdue; missing/invalid/future issue dates explicit. Cancelled/draft/paid invoices excluded from exposure. Cancelled payments excluded. No inferred payer identity. Exact decimal arithmetic via existing helpers; unknown/bad values must not silently become zero.
- Validation: exact boundary/date/money/state unit tests, component loading/error/empty/company-switch/filter/read-only tests, focused Vitest, no-incremental TypeScript, independent read-only review. Browser/build only if runtime ownership allows; otherwise report blocked, never claim runtime pass.
- Stop: source overlap, unapproved sensitive write/data mutation, same proven blocker after two Diagnose cycles. Preserve foreign dirty files.
- Handoff: Done / Changed / Files / Validations / Risks / Next, exact commands and mocked/runtime distinction.
