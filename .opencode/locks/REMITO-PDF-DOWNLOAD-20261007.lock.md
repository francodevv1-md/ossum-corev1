# REMITO-PDF-DOWNLOAD-20261007

- task: REMITO-PDF-DOWNLOAD-20261007
- owner: GPT-6.1 Sol / openai/gpt-6.1-sol, implementation and final QA
- status: released
- approval: Franco said "Apruebo avanzar" to change 2, a real downloadable remito PDF only.
- scope: authenticated fresh remito data; installed Takumi browser PDF generator; existing escaped document layout; no server mutations.
- owned files: src/hooks/useRemitoPdfDownload.ts; src/lib/remito-pdf.ts; exact import/hook/status/error/menu-item integration in src/components/expediente/ComprobantesAsociados.tsx; new scoped tests; knowledge/specs/REMITO-PDF-DOWNLOAD-20261007/*; this lock
- overlap: previous print/design/motion locks released. Existing uncommitted design/motion in ComprobantesAsociados belongs to user and must remain unaltered and uncommitted. Stage only this task's import/menu replacement, never the entire existing panel.
- forbidden: schema/Auth/API/provider/global config/dependencies/other documents/helper changes, existing foreign source or test edits, DB commands, server takeover, push/PR/deploy.
- validation: real binary PDF/parser/content/multipage check; UI download/error/scope/race checks; existing panel regressions; scoped TypeScript/build/browser; directed read-only final review.
- results: current-worktree42/42 and exact staged-panel42/42 tests PASS; scoped TS PASS; actual renderer/browser dev+production/PDF-parser+visual/bundle/Webpack-assets PASS; independent review no blockers. No full Next/live DB claim. Foreign panel CSS/motion left uncommitted; own staged integration only.
