# R3 — Cajas emission client boundary

- Approval: user's `Ok realizalo` following the R1/R2 handoff authorizes this finite DEV correction. Risk T3 bounded existing integration; no new business rules.
- Owner: GPT-6.1 Sol (`openai/gpt-6.1-sol`), implementation/testing; independent reviewer read-only.
- Scope: shared assignment/intent resolution plus Workspace and CX Logistics emission preflight, context cancellation and exact retries.
- Allowed source: `src/lib/cajas-intent.ts`; `src/lib/api/cajas-assignments.ts` (type-only real wire trace fields); `src/components/remitos/OperationalRemitoWorkspace.tsx`; `src/components/expediente/LogisticaTabContent.tsx`.
- Allowed checks: the two existing Cajas HTTP component suites, focused emission regressions, scoped config in this directory. Docs: R3 brief/validation/handoff, worklog and exact lock.
- Forbidden: other source; backend services/routes/validators, schema, Auth/permissions, stock effects, persisted state, dependencies, data mutations, browser, commit/push/deploy.
- Allowed commands: read-only Git/search; focused Vitest; TypeScript diagnostics; whitespace/diff review. No real database or server.
- Baseline reproduced: 31 failed / 12 passed across 43 HTTP-backed cases on current source. Two key-format assertions alone are not proof of domain defects; new keys are justified by explicit new command after edit/reload, not by UUID spelling.
- Evidence/hypothesis: Logistics ignores persisted linkage; nullable preparation silently becomes generic emission; trace guards accept missing evidence; retries rebuild newer version under same key; obsolete preflights reach POST. Existing backend rejects these contracts and performs issuance/stock atomically. Reuse those constraints rather than changing them.
- Minimal fix: one shared resolver; retain built commands only within the observed view/document context; lock preflight synchronously; check context immediately before mutation; keep accepted mutation accepted even if subsequent refresh fails.
- Validation: red baseline → focused HTTP suites and added context/retry regressions → incumbent helper/backend ownership tests → R1/R2 regression → scoped TypeScript → independent source review. No visual/layout changes; browser/viewport checks explicitly NOT RUN by user instruction.
- Stop: active overlap, necessary backend/schema/security or domain-policy change, real-data access, scope expansion.
- Handoff: Done / Changed / Files / Validations / Risks / Next; no whole-app or database certification.
- Independent review extension: actual assignment service emits `lotNumber`/`serialNumber`, not snapshot aliases. Add failing wire-field checks and Workspace auth-only-loss/deferred-reload checks, then fix within the same client boundary. Backend API format and policies unchanged.
