# TASK BRIEF — MAIL-SIMULATION-HONESTY-010 (roadmap 010)

## Approved continuation — 2026-10-06

Franco explicitly transferred ownership from MiniMax to GPT-6.1 Sol to diagnose the hung component tests and finish the bounded validation. Workspace HEAD: `685ef3229da012ed988388d512d91f3e3c4bad2e`. Preserve all existing changes. The existing eight source/test paths in the updated lock remain the allowlist, plus this spec directory and the package lock. Fix only reproduced blockers to honest Resend response handling and test execution; serial focused mocked Vitest runs, read-only nonincremental TypeScript check and independent source review are allowed. Auth, credentials/env, DB operations, real sends, dependencies, build/deploy and Git publication remain excluded. The prior diagnostic stop is lifted only for this continuation. Current outcome and evidence are at the top of `HANDOFF.md`; the original brief below is historical.

**Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Branch / HEAD:** `ux/antigravity-redesign` @ `2138552`
**Owner:** MiniMax-M3 (MiniMax), bounded honest-communication fix.
**Lock:** `.opencode\locks\MAIL-SIMULATION-HONESTY-010-20261005.lock.md` (state: `reserved`)
**Date:** 2026-10-05

## 1. Goal

When Resend runs in DEV/simulated fallback, **no UI and no audit entry may claim the email was sent or delivered**. UI must clearly say "Correo simulado; no fue entregado". When the provider accepted the dispatch (devMode === false), UI must say "Proveedor aceptó el envío" — never assert final delivery. Errors must keep their current handling and must not show success.

## 2. Scope (allowlist)

- `src/lib/services/resend.service.ts` — read-only review; no change (the `devMode` field already exists).
- `src/app/api/companies/[companyId]/mail/send/route.ts` — honest audit copy in the `createSeguimientoEntry` call (content + summary, plus a mode line).
- `src/components/mail/SendEmailModal.tsx` — toast.success wording per mode.
- `src/components/coordinadores/CoordinatorShareDialog.tsx` — toast.success wording per mode + the `registerTrackingEvent` action label carries a `simulated` flag.
- `src/__tests__/unit/mail-send-honesty.test.ts` — new focalized test, no DB, no network, no env probe, no real Resend call.
- `knowledge/specs/MAIL-SIMULATION-HONESTY-010-20261005/*` — this brief + HANDOFF.

## 3. Out of scope (hard)

- `NewSurgeryDialog` and any Cirugía / Surgery / palette / fiscal / WhatsApp / documents file.
- Real sends, credentials, env, Auth, Prisma schema, migrations, DB writes, build, deploy.
- Other agents' locks; no new dependencies; no shared component / no global toast framework; no abstraction over "external effects".

## 4. Method

1. Keep the existing `devMode` contract on `EmailSendResult` (no API change).
2. In the route, when `result.devMode` is true, set the audit `content` header to `🧪 Correo simulado; no fue entregado.` and the `summary` to `Simulación de correo formal a <to>…`. When false, set the header to `📧 Correo aceptado por el proveedor (no se confirma entrega).` and the `summary` to `Aceptación de correo formal a <to>…`. Add a `Modo:` line that always names the id and states whether it was simulated or accepted.
3. In `SendEmailModal.tsx` and `CoordinatorShareDialog.tsx`, change the `toast.success(...)` ternary:
   - `data.devMode` true → `🧪 Correo simulado; no fue entregado.`
   - `data.devMode` false → `📨 Proveedor aceptó el envío (la entrega depende del proveedor).`
4. In `CoordinatorShareDialog.tsx`, pass `{ simulated: !!data.devMode }` to `registerTrackingEvent("email-formal", …, { simulated })`. When `simulated` is true, the action label becomes `Simulación de reporte por Correo (DEV; no entregado)`; otherwise the original label.
5. Errors: keep the existing `if (!result.success) throw …` path. The error toast continues to use the captured error message.

## 5. Test plan (smallest possible)

A single focalized test file `src/__tests__/unit/mail-send-honesty.test.ts` with three `describe()` groups:

- `sendEmailWithResend return shape`: 3 cases — simulated (`devMode: true`), provider accepted (`devMode` undefined, provider id), error (`success: false`).
- `audit entry honesty (route)`: 3 cases — DEV/simulated audit content matches `/Simulado/i` and `/no fue entregado/i` and never matches `/Correo enviado/`; provider-accepted audit content matches `/aceptado/i` and `/no se confirma entrega/i` and never matches `/Correo enviado/`; error path writes no audit entry.
- `service contract`: 1 sanity guard.

No DB, no network, no env probe. Mocks: `@/lib/services/seguimiento.service` (createSeguimientoEntry), `@/lib/surgery/resolve-company-surgery`, `@/lib/api/auth-context`, `@/lib/api/guards`, `@/lib/prisma` (empty), `@/lib/services/resend.service` (re-exports original HTML generators; replaces `sendEmailWithResend` with a vi.fn so the route does not call the real provider).

## 6. Done / Changed / Files / Validations / Risks / Next

See `HANDOFF.md` in this folder.
