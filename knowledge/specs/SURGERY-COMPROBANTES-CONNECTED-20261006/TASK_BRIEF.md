# Surgery comprobantes connected workspace

- Task: SURGERY-COMPROBANTES-CONNECTED-20261006. Risk: T3 bounded expediente UI; user explicitly requested implementation after selecting backend authority, scoped redesign and honest unavailable actions.
- Owner: GPT-6.1 Sol / openai/gpt-6.1-sol, frontend implementation and final validator. Directed independent read-only review after implementation.
- Scope: Ficha CX `comercial` (display label Comprobantes), existing shared panel also consumed by coordinator modal. Read existing linked budgets, invoices, remittances and payments; open loaded record details; no mutations.
- Allowed files: `src/components/expediente/{ComercialTabContent,ComprobantesAsociados}.tsx`, `src/hooks/useSurgeryComprobantes.ts`, new scoped model/detail files adjacent to panel, exact panel/parent HTTP tests (including obsolete mounted authorization expectation), this task directory and own lock/worklog.
- Forbidden files: surgery core/page/hooks/store/types/constants, schema, Auth, API/services/validators, other modules, dependencies, other agents' work.
- Commands: read-only Git; exact mocked HTTP Vitest allowlist; no-emit/no-incremental TypeScript; isolated build only without shared runtime collision; bounded browser QA with mocked reads or existing authorized DEV session; local conventional commit containing only task changes (user's initial request includes finishing and committing). No push/PR/deploy.
- Identity: active company plus surgery.backendId. Missing identity/company or failed reads must remain explicit; never fall back to legacy props, including mock surgeries. Compatibility props remain accepted but cannot determine records/debt.
- UI: one flat document register, search/type/state filters, loaded record detail, brief motion respecting reduced motion, explicit unsupported types/actions. Never sum budget/remittance/payment amounts into debt; invoice balances stay backend values per currency.
- Reproduce: exact two existing component test files produced 12 failures: parent renders retired legacy cards; panel consumes malformed legacy fixture and crashes at date.localeCompare before any backend read. Source confirms hook disconnected. This proves current regression, not who reverted it or when.
- Evidence corrections: target panel/parent are clean versus HEAD, not among current foreign modifications. Existing remito/payment clients support surgeryId; the prior V1 handoff did not prove backend rejects those types. No-op opening, global window.print, alert-as-PDF and fallback proposals are rejected.
- Validation: scoped requests/pagination for all supported types; late responses, scope mismatch, reload/missing/error states; search/filters/detail/unavailable actions; parent + full view integration; TypeScript; visual desktop/mobile/reduced-motion QA; independent read-only review.
- Stop: critical overlap, required backend mutations/schema/Auth or ambiguous fiscal/business semantics. No production data or DB commands; DB_TESTS_BLOCKED preserved.
- Handoff: Done/Changed/Files/Validations/Risks/Next. Technical evidence here; user summary plain and short.

## Directed review findings resolved
- Existing `ComercialTabAutorizar.test.tsx` mocked an incomplete hook and expected a control absent in the received parent. Updated to prove the read-only register never authorizes using legacy budgets; no actual authorization action was removed by this task.
- Added coverage for remittance/payment pagination, indirect payments, reload with open detail and honest disabled actions. Synthetic browser checks also cover reduced motion.
