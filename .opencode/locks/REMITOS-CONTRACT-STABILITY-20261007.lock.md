# Remitos contract stability

- task: REMITOS-CONTRACT-STABILITY-20261007 / R1 shared reader lifecycle then R2 hydrated response contract
- role/model: sole implementation and test owner / openai/gpt-6.1-sol
- mode: implementation
- status: released
- scope: reproduce shared-hook dependency loop and out-of-order reads; minimal lifecycle guards in useRemitos, preserving API, permissions, domain states, stock and all UI files.
- owned files: src/hooks/useRemitos.ts; src/__tests__/hooks/useRemitos.test.tsx; exact two create/state response select replacements in src/lib/services/remito.service.ts; src/__tests__/unit/remito-response-contract.test.ts; knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/*; this lock
- R2 ownership: backend auditor finished read-only; service clean and no active lock references before reserve. R2_BRIEF governs two selection blocks only; no parallel source writer.
- auxiliary ownership: exact `getByRole` assertion added by this same session in previous Comprobantes package; remove unsupported `exact` option and use anchored name regex. Global source typing reproduced TS2769 in our own prior test; no foreign assertions/source changes.
- overlap: no active hook lock found; existing foreign summary/Ficha/Comprobantes/other files preserved. Backend auditor ses_eeb7694c8ffeHryu7MUE3uYWRL read-only, no source ownership.
- approval: current user requests Remitos correctness, typed contracts, bounded reproducible tasks without browser QA. This task changes reader lifecycle only, not security or business policy.
- commands: focused Vitest tests (mock/in-memory only), TypeScript noEmit, read-only source/git inspection. No browser/DB/deploy/install/commit/push/PR.
- validation: red-before-green reproduction; same-value inline filters, list/detail races, scope/auth/unmount invalidation, mutation refresh regressions, consumer tests, scoped TypeScript.
- output/handoff: Done/Changed/Files/Validations/Risks/Next with separate proven results and pending tasks.
- stop: critical writer overlap, needed schema/Auth/permissions/stock/domain change, real DB mutation or ambiguous business behavior.
- result: R1/R2 completed;22hook/3wire tests and133focused regressions PASS, scopedTS/diff PASS; review deadlock reproduced and fixed, rereview cleared. Existing31Cajas failures baseline-proven and source-wide type failures remain documented; no full-app certification. No UI/domain/stock/Auth/schema/DB/browser/commit/push actions.
