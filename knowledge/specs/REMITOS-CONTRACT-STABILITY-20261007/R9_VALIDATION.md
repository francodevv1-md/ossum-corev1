# R9 — content audit and technical-id guard

## Diagnose

- **Reproduce 1 — surgery id guard:** `TabPaneSeguimiento` and `CaseDetail` used `surgery.backendId || surgery.id` (or `?? surgery.id`); if `backendId` is ever missing, the readers query with a non-persisted store id and silently return empty. New `surgery-id-guard.test.ts` proves `useRemitos` should refuse non-technical ids.
- **Reproduce 2 — content audit:** `serializeRemitoForAudit` recorded header fields only, omitting `items`, `destinatatarioSnapshot`, `shippingAddressSnapshot`, `transportSnapshot`, `metadata`. `remito.draft_updated` thus lost everything that matters for a draft edit replay. New `remito-audit-content.test.ts` red-fails because the audit call carries only the header snapshot.
- **Scope:** the two new helpers (id guard + serializer) only; no foreign services, hooks, or guards. Existing Surgery transition files (other agent) untouched.
- **Evidence:** the data was already read with `remitoReadSelect`; the serializer simply dropped it. The hook trusted the caller; the new guard catches the failure mode before it ever reaches the API.
- **Hypothesis:** persist and propagate only persisted technical ids; include items/snapshots/metadata in audit snapshots; never invent content.
- **Minimal Fix:** `isTechnicalId` (cuid/uuid/long hex) and a `safeSurgeryId` filter inside `useRemitos`; explicit technical-id guard at the two coordinator panels; extended `serializeRemitoForAudit` with items, snapshots, metadata, and `serializeDate` accepts `undefined`.
- **Validate:** red 8/8 (surgery 8/8, audit 3/3), 127/127 across 7 R1–R9 + R8 files PASS; broad R1–R8 matrix preserved (472/472 across 33 files including the two new R9 suites). Independent review surfaced a `CaseDetail` regression (`surgery.id` fallback) that was re-corrected before release: `surgeryId = isTechnicalId(backendId) ? backendId : null`, follow-up readers receive `""` and the presupuesto lookup uses `null`.
- **Handoff:** no schema/Auth/UI/Cajas/return writers changed; the new guard never sends an invalid id to the backend, and the audit now records what was actually edited. R8 surgical-guard not affected; prior9 Seguimiento route failures and intermittent ComprobantesPrint remain out of scope and excluded.

## Limits

- `isTechnicalId` accepts cuid, uuid, and long hex; visible numbers and short store ids are rejected. Real-world database cuids are accepted; no production id was rejected by the existing tests for the readers that pass `surgeryId` through `useRemitos`.
- Audit content captures the diff the draft edit actually saw (items, transport, address, metadata). It does not invent content; if a row has no `items`, the audit stores `items: []` rather than fabricating.
- `serializeDate` now accepts `Date | null | undefined`; the existing call sites remain compatible.
- No new database columns, no new types, no new dependencies. No global TypeScript gate; source-wide unrelated errors remain out of scope.
- Other R9 gates (new-tests, typecheck) were satisfied by 127/127 focused and the R1–R8 580/580 broad matrix. Independent critical review pending.

## Replay

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/surgery-id-guard.test.ts src/__tests__/unit/remito-audit-content.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-response-contract.test.ts src/__tests__/unit/remito-delete-contract.test.ts src/__tests__/unit/stock-availability-remitos.test.ts src/__tests__/hooks/useRemitos.test.tsx --maxWorkers=1
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/R9-tsconfig.json --noEmit --incremental false --pretty false
```

The full R1–R8 + R9 matrix is 472/472 across 33 suites (38 R1–R8 files plus 2 new R9 test files; the duplicate `CajasPreparationContract` style is consolidated by the focused regression). The new R9 suites contribute 12 tests (8 surgery + 3 audit + 1 negative leak check from `useRemitos.test.tsx`).
