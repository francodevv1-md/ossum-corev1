# Lock — AUTH-EMAIL-REAL-SEND-20261005

- task: `AUTH-EMAIL-REAL-SEND` — bounded UI entry-points ("Expediente → Más" + post-Authorize feedback) + one manual real Resend send in DEV to `sistemas@districorr.com.ar`.
- agent role: MiniMax-M3 (MiniMax), bounded UI + one-off manual browser validation.
- selected model: `MiniMax-M3` (MiniMax)
- status: `released`
- adoption: this session **adopts and preserves** the foreign hunks already present in `NovedadesTabContent.tsx` (244-line diff vs HEAD) and `ExpedienteHeader.tsx` (59-line diff vs HEAD, SHA-256 working = `6659AC97...E25` = the SHA-256 pinned by `SURGERY-PALETTE-ORDER-CORRECTION-20261005` at line 18 of that lock). The adoption is by explicit Franco authorization in this brief: "Franco autorizó adoptar y preservar hunks ajenos ya presentes en [these two files]. No revertirlos ni reescribir su comportamiento." The 24-line Novedades `M` and the Sol2-preserved 59-line Header `M` are not touched; new code is added on top of them and is committed in this lock's working file. The pre-flight diff is captured in `knowledge/specs/AUTH-EMAIL-REAL-SEND-20261005/_evidencia_pre_flight/` (HEAD vs WORKING).
- owned files (write allowlist):
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\src\components\expediente\NovedadesTabContent.tsx` (post-Authorize feedback wiring — additive on top of the adopted foreign hunks; do not revert or rewrite the adopted hunks)
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\src\components\expediente\ExpedienteHeader.tsx` ("Más" dropdown item "Enviar correo con autorizado" — additive on top of the adopted Sol2-preserved hunks; do not revert the SHA-256 pinned state of the foreign changes)
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\src\components\expediente\ExpedienteFullView.tsx` (minimal wiring: pass the Header's `onOpenAuthEmail` callback to `setExpTab("novedades")`; do not touch the surgery domain, the `Tabs` structure, the tabs other than `novedades`, or the foreign parts)
  - `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\AUTH-EMAIL-REAL-SEND-20261005\*` (HANDOFF, _evidencia_pre_flight, post-flight evidence)
  - This lockfile.
- read allowlist: the 2 callers of `SendEmailModal` (`NovedadesTabContent.tsx`, `NewSurgeryDialog.tsx`); `SendEmailModal.tsx` (read-only); `mail/send/route.ts` (read-only); `resend.service.ts` (read-only — untracked but pre-existing; not a write candidate per the brief "no ... mail service"); the 2 hung UI tests (`SendEmailModal.test.tsx`, `resend.service.test.ts`) — read-only, do not touch; the `SURGERY-PALETTE-ORDER-CORRECTION-20261005` SHA-256 pinned state of `ExpedienteHeader.tsx` — preserve; the `SURGERY-RESCHEDULE-012-CORE` surgery domain — preserve.
- excluded: `NewSurgeryDialog.tsx` (out of scope per the brief); Auth code; Prisma schema / migrations / seed; permissions; `.env.local` / `.env` / secrets / credentials; deps; CI / runner / config; `MAIL-SIMULATION-HONESTY-010-20261005` files (the 2 hung UI tests, `resend.service.ts`, `mail/send/route.ts`); the `SURGERY-RESCHEDULE-012-CORE` surgery domain (surgery.service.ts / surgery.validator.ts / useCirugiaActions.ts / ChangeDateDialog.tsx / cirugias/page.tsx + their tests); commits, pushes, PRs.
- validation: Typecheck focalizado (`npx tsc --noEmit src/components/expediente/NovedadesTabContent.tsx src/components/expediente/ExpedienteHeader.tsx` — no full project tsc); one real Resend send in DEV to `sistemas@districorr.com.ar` (typed manually at send time, never persisted, never hardcoded); 20-minute hard budget on browser.
- stop conditions (per the brief, condensed):
  1. Foreign-owned SHA-256 pinned on the file breaks → preserve the pinned state, only add code, never revert the adopted hunks.
  2. Auth / login blocks the manual path → BLOCKED, no Auth change.
  3. `RESEND_API_KEY` missing or runtime `devMode === true` → BLOCKED, no `.env` edit.
  4. Real send fails or simulates → BLOCKED, no auto-retry, no infra change.
  5. Browser budget exceeded (>20 min) → BLOCKED with partial evidence.
- close condition: lock released at end of session per the brief ("Liberar únicamente el lock propio").
