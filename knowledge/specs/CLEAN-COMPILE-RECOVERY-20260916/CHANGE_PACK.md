# CLEAN-COMPILE-RECOVERY-20260916

## Task Brief
- Risk: T3; bounded DEV source recovery, approval Engram #6892 (`autorizo pa`).
- Owner: SDD apply executor, implementation/docs/test; no delegation.
- Model: runtime developer declaration `openai/gpt-6-astra`; not independently attested by a runtime API.
- Goal: recover existing contracts behind the 30 TypeScript diagnostics without changing business rules, Auth, permissions granted, or data.
- Workspace: `E:/OSSUM_COR_WORKTREES/ossum-clean`; original project is read-only reference.
- Persistence: this compact filesystem Change Pack plus Engram apply-progress.
- Allowed files: exact per-slice inventory in LOCK.md; source locks were recorded before each corresponding edit.
- Candidate recovery boundaries: missing budget API client, financial email UI/policy, Code 128/GS1 utilities, Azure OCR dependency, receipt-intake component contract, article/budget Prisma declarations, surgery date narrowing, qrcode manifest/lockfile recovery and focused tests. These are investigation boundaries, NOT a blanket edit allowlist.
- Allowed commands: read-only Git inspection, full no-emit TypeScript, subsequently reviewed non-DB tests and offline Prisma generation/format after source ownership is established.
- Forbidden: secrets/env/auth-state reads; DB connections/mutations; migration execution or SQL edits; history repair; Auth/business-rule changes; permission widening; stubs, ignored diagnostics, casts masking missing contracts; staging/commit/push/deploy; original-workspace writes.
- Preserve existing five dirty paths: geography LOCK/TASK_BRIEF/HANDOFF, forward-correction migration directory, forward-correction integration test. Applied SQL hash `78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01` is now asserted by a passing byte-hash regression; never edited.
- Validation required after implementation: focused non-DB tests, full TypeScript, Prisma format/generate if schema changes; build only after static-path safety review. Browser QA belongs to parent. No live DB certification is implied by successful generation.
- Stop conditions: ownership overlap, unsafe runtime operation, missing recoverable contract, scope expansion, unresolved SDD workload gate.
- Handoff: Done / Changed / Files / Validations / Risks / Next.

## Diagnose — cycle 1, pre-implementation
### Reproduce
`node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`

Reproduced 30 diagnostics at HEAD `90edeee`: eight unresolved imports, fourteen article Prisma delegate errors, six budget Prisma contract errors, one receipt component props error and one unknown date input error. No new diagnostic category.

### Scope / Evidence
- Actual Git status matched the parent's five pre-existing dirty paths; no application edits.
- All six `knowledge/**/LOCK*.md` files found in the clean worktree were read; all record `released`. No overlapping active owner found there. `.opencode` lock-name search found dependency/source-lock tooling only.
- Read root AGENTS and minimal Knowledge (PROJECT_BRIEF, CANONICAL_DECISIONS, CURRENT_STATE).
- Reference implementations exist: `src/lib/api/presupuestos.ts` (256 lines), `src/components/email/SendExistingFinancialDocumentDialog.tsx` (143), `src/lib/permissions/financial-document-email.ts` (13), `src/lib/code128.ts` (101). These four alone total 513 lines before tests, schema, OCR/GS1, package lock or receipt fixes.
- Clean caller search confirms budget hook/test imports, billing page email/policy imports, billing test mocks and article dialog Code 128 import. Full source dependency closure and history/spec comparison are not yet complete.

### Hypothesis
The missing-import subset is consistent with omitted source dependencies. Reference availability is proven; suitability and complete recovery closure are not yet certified. Prisma/receipt/date causes require further contract comparison before edits.

### Minimal Fix / Validate / Regression Check
Not attempted: mandatory SDD review-workload gate reached before source edits. No tests or build executed; TypeScript reproduction is not a passing validation.

## Review Workload Forecast
400-line budget risk: High
Chained PRs recommended: Yes
Decision needed before apply: No

Orchestrator resolved delivery: auto-chain internal review units A (barcode/GS1), B (budget/email), C (OCR/receipt), D (schema), E (date/validation), sequential sole ownership; no Git actions. Narrow size exceptions accepted for exact recovered files and necessary dependency closure; inventory and isolated evidence required. Previous workload blocker is resolved.

The initial missing delivery decision was resolved by the parent's continuation instruction. Internal auto-chain review units were executed; only the QR manifest/lockfile dependency closure needs the accepted narrow size exception when generated lockfile lines are counted. No Git branch, staging, commit or PR action performed.

## Tasks
- [x] 1. Read approval, rules, skills, minimal Knowledge and actual worktree status.
- [x] 2. Reproduce full TypeScript and inspect existing ownership locks.
- [x] 3. Establish reference-source availability and review-budget evidence.
- [x] 4. Resolve delivery strategy; inspect callers/reference contracts and establish exact source allowlist. Remaining runtime closure is inventoried, not silently declared recovered.
- [x] 5. Reserve exclusive source locks and implement recovered compile contracts with focused tests.
- [x] 6. Validate non-DB behavior/full TypeScript and hand off for independent review; build attempted and environment blocker recorded.

## Implementation evidence and limits
- A: exact reference Code128/GS1 leaves; QR manifest versions match reference. Lockfile review found only dependency closure additions and five existing dependencies promoted from dev-only metadata to runtime; no existing versions/integrities replaced.
- B: reference dialog and permission helper recovered. Client narrowed to actual pending-invoice read fields rather than importing the reference's unrelated form/mutation helpers or claiming missing budget-family response fields. Budget read select now exposes the recovered slot. API role set independently matches `INVOICE_MUTATION_ROLES`.
- C: exact reference Azure transport restored; no SDK/dependency added. Component forwards recovered persist/callback options. Reference hook reset before awaiting callback would lose entered data on rejection; bounded recovery instead awaits success before reset/toast and retains data/error on rejection. Regression verifies this, local-store default, and backend mode without local writes.
- D: reference schema and historical SQL establish Article V1.1 + AI22, active partial unique indexes and eligibility projection. Only queried scalar/relationship closure recovered: Article, ArticleIdentifier, ArticleSupplierMapping, ArticleTraceabilityPolicy, StockArticleEligibility, two enums, organization/company/contact relations. Later taxonomy, stock-ledger/policy relations and normalized traceability evolution are NOT imported. Five budget fields recovered: slot/generalDiscountRate and item position/discountRate/taxRate. No migration baseline or DB certification is claimed.
- D Diagnose cycle 2: after initial generation, tsc reported six errors rooted in omitted taxRate and required item position; recovered exact taxRate declaration and source zero-based position propagation through the existing calculator. No amount formula/state transition changed. Final tsc: zero errors.
- E: timestamp failure was TypeScript's inability to narrow unknown through a conditional RegExp result; explicit string guard preserves accepted/rejected inputs with no cast. Offset and invalid-date regression tests pass.
- Reference source Git history query for the missing modules returned no tracked commits; provenance is inspected working-tree source plus reference specs/migration artifacts, not a claimed historical commit match.
- Runtime closure is NOT complete: financial email POST and receipt APIs are absent; clean budget mutations predate CURRENT/HISTORY lifecycle handling. Recovering their provider/PDF/stock and business-lifecycle implementations is not represented as done by compilation. No fabricated endpoint, success response or state translation added.
- Build preflight: no Prisma/fetch/static generation hooks found in app TSX; no instrumentation file. Runtime Prisma module constructs a pool/client but has no explicit connect/query at module evaluation. Build compiled, then stopped on missing SUPABASE_URL; Auth/environment remain untouched.

## Independent acceptance — documentation-only release
- Reviewer `tragic-aquamarine-lynx`, Engram #6909: ACCEPT bounded compile recovery; no confirmed introduced blocker or role widening. Compile acceptance YES; functional/runtime acceptance BLOCKED, not product completion.
- Reviewer and parent independently confirmed full tsc zero diagnostics and diff-check PASS. Implementer's 86/86 recovery tests (14 files) and parent's subsequent 41/41 original geo/contact regressions (8 files; `startVitest`, `envFile: false`, `envDir: false`) are distinct validation runs, not an aggregated suite.
- Budget runtime gate: legacy writes omit family/contact/commercial fields required by source authority migration, slot/state lifecycle/check and rates consumed by invoice.service. Empty pending lists are only one symptom; setting CURRENT alone does not restore mutation compatibility.
- Traceability runtime gate: historical V1.1 requires `ArticleTraceabilityPolicy.policy`; source migration `20260824180000_guided_traceability_profile` later permits NULL/normalized profiles. Intended/live baseline and runtime compatibility remain uncertified.
- Missing email/receipt APIs are pre-existing gaps. Missing SUPABASE_URL still blocks full build; parent will seek explicit bounded local environment recovery approval. No fix attempted.
- Final continuation edits only this package's three documents and the existing worklog milestone; no code/schema/env/DB changes, no new tests, prior geography artifacts preserved. Lock released.

## Handoff
- Done: all 30 initial compile diagnostics resolved; independent bounded compile acceptance confirmed (#6909).
- Changed: bounded A-E implementation; exact inventory in LOCK and HANDOFF.
- Files: source/tests/manifests/schema and this package's documentation; prior geography work untouched.
- Validations: independently confirmed full TypeScript zero diagnostics/diff-check PASS; offline Prisma format/generate pass; implementer 86/86 recovery tests and separately parent 41/41 geo/contact regressions. Pinned SQL hash matches. Build compilation passed but page-data collection failed on missing SUPABASE_URL.
- Risks: functional/runtime acceptance blocked by environment, missing pre-existing endpoints, budget authority compatibility and uncertified traceability baseline; no DB/browser certification.
- Next: parent seeks explicit bounded local environment recovery approval and delimits runtime follow-up. Exclusive lock released.
