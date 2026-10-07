# SURGERY-COMPROBANTES-CONNECTED-20261006

- task: SURGERY-COMPROBANTES-CONNECTED-20261006
- agent role: frontend implementation / final QA
- selected model: openai/gpt-6.1-sol
- status: released
- change 1 scope: completed "Imprimir" for `NR` rows using existing `buildOperationalRemitoPrintHtml` + `fetchRemito`; PR/FV/CO printing and all PDF downloads remain unavailable. Step 2 requires new confirmation; never disguise HTML as PDF.
- change 1 allowed files: `src/components/expediente/ComprobantesAsociados.tsx`; `knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/{TASK_BRIEF,HANDOFF,VALIDATION}.md`; this lock. Step 1 must not touch tests, schema, Auth, API, helper, dependencies or other components.
- owned files: src/components/expediente/ComercialTabContent.tsx; src/components/expediente/ComprobantesAsociados.tsx; src/components/expediente/comprobantes-model.ts; src/components/expediente/ComprobanteDetail.tsx; src/hooks/useSurgeryComprobantes.ts; src/__tests__/components/ComprobantesAsociados.http.test.tsx; src/__tests__/components/ComercialTabContent.test.tsx; src/__tests__/components/ComercialTabAutorizar.test.tsx; knowledge/specs/SURGERY-COMPROBANTES-CONNECTED-20261006/*; knowledge/worklog/SURGERY_COMPROBANTES_CONNECTED_20261006.md; this lock
- overlap check: previous exact panel/parent locks released; current .opencode locks do not own these sources. Existing DEV5000/shared .next ownership belongs elsewhere, no server takeover or shared build.
- excluded: all other source/config files; DB/Auth/API/core surgery changes; unrelated uncommitted/untracked files; push/PR/deploy.
- validation: 27/27 final tests PASS; scoped source/test TypeScript PASS; isolated component build PASS; synthetic browser desktop/mobile/dark/reduced-motion PASS; independent read-only review PASS. Full application errors remain outside task. Local commit restricted to exact owned sources/tests/task artifacts.
- change 1 validation: 27/27 unchanged tests PASS; scoped TypeScript PASS; isolated component build PASS; original synthetic visual checks PASS; runnable embedded print check PASS; independent read-only review no blockers. This delta commits only panel/TASK_BRIEF/HANDOFF/VALIDATION/own lock. Native OS print completion not claimed.
