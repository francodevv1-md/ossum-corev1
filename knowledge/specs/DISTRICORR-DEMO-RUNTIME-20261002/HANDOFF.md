# Synthetic DEV browser rehearsal — 2026-10-02

## Done
- Real browser/API acceptance executed on Franco-confirmed disposable DEV using fresh manual login; session saved outside Git without inspecting or disclosing its contents.
- Authorization with synthetic image: upload POST201, status PATCH200, full reload retained Autorizada and the authorization entry in Seguimiento.
- Explicit no-image exception on a genuinely pending case: note POST201, status PATCH200, full reload retained Autorizada and the exact backend-attributed exception text.
- Comprobantes: real backend budgets/invoices rendered; Recargar executed; switching to another surgery showed zero linked records without retaining prior rows.
- Browser opened16:53:12UTC and closed around17:10:33UTC, approximately17m21s including login wait, below20minutes. Its own watchdog was stopped only after explicit browser closure. No browser remains owned by this task.

## Changed
- Only runtime setup and approved synthetic authorization records; no application source changes.
- Verified old workspace next-start PID19908 replaced under explicit approval by current-source Next DEV launcher1904/listener17156 onlocalhost:5000. Server remains running for Franco's demo; coordinate before any shared-output build/restart.
- Synthetic case sgdevsurgery1000000000000 / CX-DEV-2026-0001 now authorized with uploaded synthetic screenshot evidence.
- Synthetic case sgdevmockcx40000000000000 / CX-0004 now authorized with explicit no-image exception.
- Earlier attempted exception on sgdevmockcx80000000000000 / CX-0008 stored a note (POST201), but status PATCH400 rejected the invalid scheduled→authorized transition; its backend status remains scheduled. No cleanup or state forcing performed.

## Files
- This task's TASK_BRIEF.md, LOCK.md and HANDOFF.md only; MiniMax/Sol/Antigravity documents untouched.
- Temporary screenshots under the approved Temp/opencode directory:
  - districorr-runtime-20261002-comprobantes-before.png
  - districorr-runtime-20261002-authorization-reloaded.png
  - districorr-runtime-20261002-exception-reloaded.png
  - districorr-runtime-20261002-comprobantes-other-case.png
- Fresh storageState remains local outside Git, resolved by CORE_FLOW_STORAGE_STATE. Never copy its contents into reports/prompts/repository.

## Validations
- Public login HTTP200; authenticated existing browser-generated GET company/surgeries HTTP200. No fabricated authentication headers or identity.
- Case with image: actual operational storage upload completed and POST201; PATCH200; fresh backend read returned authorized; Seguimiento after reload displayed persisted authorization entry, filename and actor.
- Case without image: actual POST201/PATCH200; fresh reload returned Autorizada; persisted text: `El usuario Admin DEV: confirma que no tiene una imagen de autorización`.
- Existing baseline case displayed nine linked backend records: six budgets and three draft invoices, including approved budgets and real amounts. Missing invoice numbering and budget balance No aplica remained distinct.
- Another case displayed `0 visibles` and no linked budgets/invoices, without leakage from the baseline case.
- No tests/build/typegen/direct SQL/DB scripts, seed, cleanup, Auth/security changes, fiscalization, deployment, Git mutation or incident investigation. Prior unchanged unit evidence reused.
- Browser guard aborted Cajas endpoints and excluded mutation paths rather than mocking successful responses. Cajas UI/actions were never selected.
- Post-run blobs:
  - ComprobantesAsociados.tsx: 36df47e893319626fc1696294a4f13636fd8b892
  - useSurgeryComprobantes.ts: 34b069aa5fe26d1c07a83238a0b8e0427b2bf5bc
  - ChangeStateDialog.tsx: 5100a33bc3aff75f30b2f1e4d475a50806b6a02d
  - useCirugiaActions.ts: cef9f91961d547b2939594e84da18a9f32d53ede
  - operational-document-upload.service.ts: 2397063428e2071cc0ace75ab77217f2ef9276f9
  - surgery.service.ts: ef0feb2aaf46572ee6254dbb05fe362ffc1f3039

## Risks
- PARTIAL overall: targeted coordinator notification not accepted in browser. Selected synthetic cases had no coordinator assignment in the observed API response; no account/contact mapping was invented and no extra login was attempted.
- Runtime UI integration gap: the mounted PresupuestoPanel displayed `Sin presupuesto generado` while the backend Comprobantes panel for the same baseline surgery displayed six budgets, four approved. Therefore the approved-budget→Autorizar CX entrypoint was not accepted; successful authorization used the existing Estado CX modal instead.
- Source trace: useCirugiaSelection reads budgets from legacy store; ExpedienteFullView passes those props into ComercialTabContent/PresupuestoPanel, while Comprobantes reads its own backend data. Fix requires owner-controlled source work, not another status-document rewrite.
- Runtime state mismatch: CX-0008 displayed Pendiente while fresh API cxStatus was scheduled. surgery-adapter.ts:389–397 intentionally collapses scheduled into Pendiente; surgery.validator.ts:118 does not allow scheduled→authorized. Backend rejection was correct; UI allowed an unsuitable action and the exception note remained stored before that rejection.
- CLI retry after one early reload click was waiting for asynchronous hydration, not an application fix. A harmless URL-global inspection error and unobserved /api/me/companies on root reload were replaced by protected-route real backend200 preflight, with no Auth modifications.
- Synthetic uploaded image was an explicit rehearsal screenshot, not clinical authorization evidence for a real patient. Existing synthetic cases were modified only under the approved rehearsal scope.

## Next
- Reuse the three accepted runtime paths for the demo at localhost:5000; use Estado CX for authorization until the mounted budget panel is backend-connected.
- Antigravity owns the narrow parent budget-read/current-state action corrections. Preserve validated Comprobantes files; no blanket store or state-machine refactor.
- To finish targeted notification acceptance, obtain an existing safe DEV coordinator contact/user pairing and a suitable synthetic assigned surgery; then a separately bounded browser session with fresh preflight and20minute cap.
- No Preparation/Cajas DB execution or deployment inferred from this rehearsal. Cajas hold and closed incident investigation remain unchanged.
