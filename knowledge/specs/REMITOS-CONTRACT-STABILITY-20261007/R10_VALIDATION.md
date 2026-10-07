# R10 — close remaining surgery technical-id fallbacks

## Diagnose

- **Reproduce:** the FRAGILITY_MAP row 6 listed seven `backendId || surgery.id` sites the R9 unit intentionally left out. New `surgery-id-guard.test.ts` cases prove each site sent a non-persisted store id (e.g. `store-xyz-001`) to its query/URL/dedupe target when `backendId` is missing, before R10 fixed them.
- **Scope:** only the seven sites in `R10_BRIEF.md`; no `useRemitos` change, no Surgery adapter/validator (other agent chain), no schema/Auth/Cajas/returns/stock writers.
- **Evidence:** each call site produced a non-persisted id on a surgery without `backendId`. `useSeguimientoFeed` received the store id; `useCirugiaActions.persistStatusChange` proceeded to `PUT /api/.../surgeries/{storeId}/cx-status`; URLs composed `/api/.../surgeries/store-id/...`; `SendEmailModal` and `NovedadesTabContent` mail dedupe keys collided between cases; `InvoiceHeaderCompact` persisted the store id in the invoice form.
- **Hypothesis:** apply the same `isTechnicalId(surgery.backendId) ? surgery.backendId : ""` (or `null` for `useCirugiaActions.persistStatusChange`, which already short-circuits) the R9 pattern used. Empty string is honest for the URL templates and `useSeguimientoFeed` (which short-circuits on falsy); `null` is honest for the action that already has a guard against missing id.
- **Minimal Fix:** add `import { isTechnicalId } from "@/lib/api/ids"` to all seven files and apply the guard.
- **Validate:** red 8/8, then **480/480 across 33 suites PASS**; R10 scoped TypeScript and owned whitespace PASS. Independent critical review pending before release.
- **Handoff:** the seven sites no longer send non-persisted ids downstream. URL templates and dedupe keys are empty instead of leaking the store id. `useCirugiaActions.persistStatusChange` returns `{ ok: false, error }` instead of constructing a `PUT` URL with a store id. No API/DTO/schema/Auth/roles change.

## Limits

- Each site reuses the same `isTechnicalId` shape: cuid-shaped, uuid v4, or long hex. Visible numbers and short store ids are rejected.
- `useSeguimientoFeed` already short-circuits on `!surgeryId`, so passing `""` keeps the same honest-empty behaviour without an extra branch.
- `useCirugiaActions.persistStatusChange` already has a `!companyId || !backendId` guard; changing the fallback to `null` keeps the existing error path active.
- `InvoiceHeaderCompact` and `SendEmailModal` pass the value to local form/dedupe state, not a query. The empty string is a clear, type-correct value.
- No source-wide type gate; unrelated source-wide errors remain out of scope.
- Other agent's Surgery validator/adapter files are not touched.
- No new dependency, no schema change, no production claim, no live DB/Auth/browser certification.
