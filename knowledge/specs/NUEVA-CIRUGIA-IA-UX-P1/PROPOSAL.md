# Proposal — NUEVA-CIRUGIA-IA-UX-P1

Status: proposed  
Change: `NUEVA-CIRUGIA-IA-UX-P1`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)

---

## Summary

Improve the presentation quality of the existing "Nueva Cirugía" AI recognition flow by adopting selected UI patterns from the Stitch v2.2 design reference (`public/ejemplos/stitch_traumacorr_erp_v2.2/code.html`), WITHOUT touching business logic, validators, schema, services, providers, or API routes. The change is split into **Phase A** (UI-pure, presentational, approval-safe under active sequence prohibitions) and **Phase B** (business logic, deferred until GPT-027F.0A/0B close).

This proposal covers **Phase A only**. Phase B will receive its own proposal after the sequence prohibitions in AGENTS.md §5/§11 are lifted.

---

## Why this change

The current codebase already implements the core AI recognition flow end-to-end:

- Multi-step wizard "Paso 1 de 3" with progress dots (`NewSurgeryDialog.tsx`, `STEP_LABELS` L47, L757; progress dots L762-778).
- Entity resolution "IA detects → Buscar/Crear/Usar texto" with sophisticated scoring by DNI + name + tokens + role (`NewSurgeryDialog.tsx` L562-737, L843-982). `ContactLookupField` IS the "Buscar"; "Mantener texto" = "Usar texto"; "Crear contacto" = "Crear". The current implementation is MORE transparent than the mockup because it surfaces the match score.
- Confidence display + threshold: `AiResultsPanel.tsx` L50, L74-89 (% + bar + amber warning); `NewSurgeryDialog.tsx` L837; `confidenceThreshold=0.3` in `src/lib/services/ai/config.ts` L10/L61. Note: gating is WARN-only, not BLOCK.
- Material autorizado detection (`autorizacion-ai.ts` L59 schema; `AiResultsPanel.tsx` L173-207 as flat list with catalog badge).
- Bulk apply to empty fields only ("Aplicar al formulario", `AiResultsPanel.tsx` L228; `NewSurgeryDialog.tsx` L523-528).
- IA upload zone with drag & drop (`AiUploadZone.tsx`).
- OpenAI provider with `store:false` ZDR (`openai-provider.ts` L227).
- Multi-company gate on the API route (`route.ts` L84, `requireCompanyMutationAccess`, roles admin/manager/coordinator/owner/super_admin).

The gap is **presentation quality, not functionality**. The Stitch mockup offers polished UX patterns (a critical missing-fields bar, collapsible material autorizado, footer validation summary) that improve operator clarity and reduce friction. This proposal deliberately separates safe UI work from blocked business-logic work to respect the active sequence prohibitions in AGENTS.md §5/§11.

---

## In scope

Phase A — UI-pure, presentational, taken on with explicit ownership lock per AGENTS.md §10:

- **Critical Missing Bar**: amber bar at the top of the form body listing missing required fields as clickable chips that focus the relevant input. Reads the EXISTING `step0Errors` state only (`NewSurgeryDialog.tsx` L366-375). Pure presentational layer; no behavior change to `validateStep0`.
- **Confidence pill compaction in IA header**: presentational reorganization of the already-rendered confidence data (`AiResultsPanel.tsx` L50, L74-89). No change to threshold or gating semantics.
- **Material autorizado as collapsible `<details>`**: presentation of the EXISTING flat array (`AiResultsPanel.tsx` L173-207) using native `<details>`/`<summary>`. NO grouping by Implantes/Instrumental (that requires a `categoria` field → Phase B).
- **Footer informational "Faltan N obligatorios" text**: read-only display in the footer counting current `step0Errors`. The "Siguiente" button stays always enabled (`NewSurgeryDialog.tsx` L1651); validation remains on-click. NO proactive Siguiente disable.

---

## Out of scope

Business logic (deferred to Phase B / requires Franco approval):

- Adding `categoria` to `MaterialAutorizadoItemSchema` (`autorizacion-ai.ts` L27-34 has no `categoria` field).
- "Safe data" vs "needs-confirm" classification behind "Aplicar datos seguros (N)" button (mockup pattern). Count badge is Phase A-eligible only if it stays a plain count of browable detected fields; the safety classification is business logic.
- Confidence BLOCK gating (today is WARN-only; making it BLOCK changes behavior → Franco).
- Prompt changes, provider changes, threshold changes.

Blocked until GPT-027F.0A/0B (AGENTS.md §5/§11):

- Schema/migrations (`prisma/schema.prisma`).
- Auth changes.
- Backend/audit: the API route `ai-extract/route.ts` does `void durationMs` (L109) with no persistent audit of PHI extraction. This is an independent gap; AGENTS.md §6 requires "Auditoría para acciones críticas". It is NOT fixed by this proposal and is flagged separately.

Product decisions requiring Franco:

- Adopting the mockup blue `#003f87` design system. Phase A MUST use the existing shadcn/ui + emerald design system, NOT the mockup palette.
- Proactive "Siguiente" disable based on missing-required count (behavior change).
- Per-field date "Confirmar uso" helper (deferred).
- Provincia IA-injected dropdown option (deferred — current auto-fill comes from the institution contact).

Explicit non-touch:

- Any change to `src/lib/**`, `src/app/api/**`, `prisma/**`, validators, services, providers.
- Replicating the Stitch mockup 1:1 (it is static HTML with Tailwind CDN, not portable into the Next.js + shadcn stack).
- Installing new dependencies (AGENTS.md §11).

---

## Product shape

Phase A layers presentation onto the existing 3-step wizard WITHOUT altering behavior:

1. When the operator is on **Paso 1 de 3** and required fields are empty, an amber **Critical Missing Bar** appears at the top of the form body. Each missing field renders as a clickable chip; clicking focuses the corresponding input. The bar reads the existing `step0Errors` state — it does not introduce a new validation pass.
2. In the **IA results header**, the confidence indicator is compacted into a single pill (percentage + color), reusing the same confidence value and threshold already rendered by `AiResultsPanel`. No data model change.
3. The **Material autorizado** block becomes a collapsible `<details>`/`<summary>` region, still listing the existing flat array of detected materials with their catalog badge. No category grouping in Phase A.
4. The **footer** displays a read-only informational line "Faltan N obligatorios" derived from `step0Errors.length`. "Siguiente" remains always enabled; on-click validation behavior is unchanged.

No user flow changes, no new submits, no new API calls, no new persistence, no new auto-apply paths.

---

## Implementation direction

Additive UI-only changes behind explicit ownership lock on the three high-risk files (AGENTS.md §10). Prefer minimal-change presentation wrappers over restructuring.

- **Ownership lock** (per AGENTS.md §9.3/§10) over `src/components/cirugias/NewSurgeryDialog.tsx`, `src/components/cirugias/AiResultsPanel.tsx`, `src/components/cirugias/AiUploadZone.tsx`. The lock declares task, agent role, selected model, owned files, status. No two agents may edit the same file concurrently.
- **Minimal-change principle**: introduce small presentational sub-components (e.g. `MissingFieldsBar`, `MaterialAutorizadoDetails`, footer `MissingCountText`) that consume existing state. Avoid restructuring the 1710-line `NewSurgeryDialog.tsx`.
- **Design system**: use existing shadcn/ui primitives + emerald palette. DO NOT adopt the mockup blue `#003f87` palette.
- **No new dependencies.** No Prisma format/generate, no build pipeline changes, no Tailwind CDN.
- **No validator/service/schema/auth/API touches.**
- **Validation**: TypeScript clean; minimal snapshot/render tests for the three components added as part of Phase A validation (see R2), since zero tests currently cover the AI stack.

This stage should prefer additive work over refactors and avoid touching blocked files such as `prisma/schema.prisma`, `src/lib/**`, and `src/app/api/**`.

---

## Expected repo impact

High-risk / locked files (AGENTS.md §10 — "Lock obligatorio / muy alto riesgo"). Each requires ownership lock, change-minimum, validation, and documentation:

- `src/components/cirugias/NewSurgeryDialog.tsx` (1710 lines) — Critical Missing Bar placement (reads `step0Errors` L366-375); footer "Faltan N" count text; Siguiente stays enabled at L1651.
- `src/components/cirugias/AiResultsPanel.tsx` — Confidence pill compaction (L50, L74-89); material autorizado as `<details>` (L173-207); apply button (L228) untouched in semantics.
- `src/components/cirugias/AiUploadZone.tsx` — likely unchanged in Phase A; protected by lock if any adjacent presentational tweak is needed.

Possibly added (additive, low-risk, same domain folder):

- new small presentational sub-components under `src/components/cirugias/` (e.g. `MissingFieldsBar.tsx`, `MaterialAutorizadoDetails.tsx`, `MissingCountText.tsx`).
- minimal render/snapshot tests alongside the three components.

Explicitly NOT touched in this change:

- `prisma/schema.prisma`
- `src/lib/validators/**`, including `src/lib/validators/autorizacion-ai.ts`
- `src/lib/services/**`, including `src/lib/services/ai/config.ts` and `src/lib/services/ai/providers/openai-provider.ts`
- `src/app/api/**`, including `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts`
- `src/types/index.ts`
- `src/app/cirugias/page.tsx`

---

## Risks and open design points

- **R1 — Phase A scope creep into business logic.** Risk that "Critical Missing Bar" or "Faltan N" drift into changing validation behavior. Mitigation: explicit ownership lock + change-minimal wrappers that only READ `step0Errors`; no new validation passes; Siguiente stays enabled.
- **R2 — No regression net.** Zero of the 31 test files touch the AI stack. Any UI change has no regression coverage. Mitigation: include minimal snapshot/render tests for `NewSurgeryDialog.tsx`, `AiResultsPanel.tsx`, `AiUploadZone.tsx` as part of Phase A validation.
- **R3 — A-Q1 compliance ("safe data" classification).** "Aplicar datos seguros (N)" is ambiguous: if it means more PHI auto-flowing without per-field confirmation, it is WORSE for compliance; if it means identity/PHI fields require explicit confirm while admin data auto-applies, it is BETTER than today's bulk-apply (which fills patient/medico text without per-field confirm). Defining the classification is a business rule → Franco. Phase A MUST NOT add new auto-apply paths; the count, if shown, is a plain count only.
- **R4 — IA audit gap (independent of this proposal).** `ai-extract/route.ts` L109 (`void durationMs`) performs no persistent audit of PHI extraction, contrary to AGENTS.md §6. Flagged for the backend phase; NOT fixed here.
- **R5 — Mockup palette conflict.** The Stitch mockup uses blue `#003f87`; the repo uses emerald. Adopting the mockup palette is a product decision → Franco. Phase A explicitly rejects the blue palette and stays on the existing emerald design system.
- **R6 — Confidence gating semantics.** Today confidence is WARN-only (threshold 0.3). Phase A must preserve this semantics; turning the warn into a block is a behavior change → Phase B / Franco.

---

## Success criteria for the next phases

- This proposal cleanly separates Phase A (UI, approval-safe with ownership lock) from Phase B (business logic, post-GPT-027F.0A/0B).
- No Phase A item touches validators, services, schema, auth, providers, or API routes.
- Each Phase A change is additive, presentational, reads existing state, and introduces no new submit, persistence, auto-apply, or gating path.
- Franco approval is recorded for the four Phase A UI items (Critical Missing Bar, confidence pill compaction, collapsible material autorizado, footer "Faltan N" text) before proceeding to `sdd-spec`.
- Minimal render/snapshot tests exist for the three high-risk components before Phase A implementation is considered complete.

---

## Proposed next step

Proceed to `sdd-spec` ONLY for the Phase A scope, and ONLY after Franco confirms the four UI items are acceptable. Phase B (categoria grouping, safe-data classification, confidence BLOCK gating, IA audit, prompt/provider changes) gets its own proposal after GPT-027F.0A/0B close.