# TASK BRIEF — Remito resumido + Detallado snapshot DEV

## Task

- ID: `REMITO-DETALLADO-SNAPSHOT-DEV-001`
- Risk: T3 bounded DEV package
- Owner: implementation agent / GPT-5.6
- Mode: implementation, tests, QA
- Lock: `released`

## Objective

Produce one synchronized document package where the Remito is a concise signable summary and Detallado lists every emitted Caja/Fórmula component from the immutable dispatch snapshot. Both outputs share the visible number, surgical context, verification QR and visual theme.

## Scope

- Project original `CajasDispatchLine` snapshots through Remito reads and API DTOs.
- Keep `RemitoItem` as the summary and explicit fallback for drafts, legacy and non-surgical Remitos.
- Render distinct summary/detail collections in browser A4 and emailed React-PDF.
- Preserve thermal80 as Remito-only.
- Add focused regressions.

## Allowed files

- `src/lib/services/remito.service.ts`
- `src/lib/api/remitos.ts`
- `src/lib/remito-print-template.ts`
- `src/app/remitos/page.tsx`
- `src/components/expediente/LogisticaTabContent.tsx`
- `src/components/expediente/RemitosPanel.tsx`
- `src/components/remitos/RemitoPDFDocument.tsx`
- `src/app/api/companies/[companyId]/remitos/[remitoId]/email/route.ts`
- Focused Remito tests under `src/__tests__`
- This Task Brief

## Forbidden

- Prisma schema or migrations
- Auth, roles, permissions or security behavior
- Cirugías flow refactors
- Production/staging data, deploy, commit, push or PR
- Historical backfills

## Decisions

- `CajasDispatchLine` with `recordKind = ORIGINAL` is the authoritative emitted component snapshot.
- Friendly immutable Caja labels are unavailable without schema. V1 groups by stable lineage internally but never prints raw IDs; headings use neutral `Caja / Fórmula 1..n` labels.
- Corrections/reversals and net-content policy are outside this V1.
- If no original dispatch snapshot exists, Detallado explicitly falls back to the Remito item snapshot.

## Validation

- Focused service, print-template, PDF and email tests.
- Focused UI mapping tests where present.
- ESLint/TypeScript checks scoped to changed files where possible.
- Browser QA for A4 output if the DEV application is available.

## Stop conditions

- Schema/migration becomes necessary.
- Existing unrelated edits overlap semantically.
- A business rule beyond the decisions above is required.
- The same blocker survives two Diagnose cycles.
