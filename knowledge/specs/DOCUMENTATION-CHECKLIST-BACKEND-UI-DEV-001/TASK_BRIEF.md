# Documentation checklist backend UI DEV

- Task: DOCUMENTATION-CHECKLIST-BACKEND-UI-DEV-001
- Owner: implementation owner, openai/gpt-6.1-sol; mode: implementation/testing.
- Approval: explicit user task; bounded existing documentation API integration only.
- Scope: panel reads active company + surgery.backendId; explicit initialization; canonical CAS transitions and persisted observations; backend aggregate. Preserve external props without using legacy data as fallback.
- Allowed files: DocumentacionPanel.tsx, src/lib/api/documentation.ts, src/hooks/useSurgeryDocumentation.ts, src/__tests__/components/DocumentacionPanel.backend.test.tsx, this task folder.
- Forbidden: all Presupuestos/billing/schema/Auth/shared configuration/store/types/callers and other owners' files. No database mutation, deployment, commits or dependency changes.
- Commands: read-only Git/hash/process checks, focused Vitest, non-incremental tsc, scoped eslint; build only with exclusive output ownership.
- Validation: existing documentation unit regressions, HTTP-boundary component journey tests, independent read-only review, diff check. Browser mutations require newly confirmed disposable DEV and synthetic data; absent confirmation, defer honestly.
- Stop: ownership overlap, approval boundary, unrelated expansion; preserve all pre-existing dirty files.
- Handoff: Done / Changed / Files / Validations / Risks / Next.

## Baseline
- Branch ux/antigravity-redesign; HEAD 8d8626a95bbe7524dab74fe50b801039750c3799.
- Panel clean in Git, SHA256 D9D5F8E2CBE982ED02B2136E7CF4E75996DC8E4EB7BCA14F1174E5BDD8622672.
- New client/hook/test/task folder absent. No documentation-panel lock found by independent explorer in Knowledge/.opencode/.agents/.tmp. Other locks and dirty files left untouched.
- Existing validator/service/route tests: 3 files, 31 passed.
- Reproduced in source: observation text discarded; request success without an operation; local checklist toggle; no backend read. Fix at isolated panel/client/hook boundary, not shared core.
