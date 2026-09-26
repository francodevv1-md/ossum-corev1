# TASK BRIEF — ARTICLES-CAJAS-LIVE-UI-DEV-001

## Objective

Remove operational Demo fallbacks and Demo-labelled UI from Articles and Cajas now that their DEV APIs are available, while preserving honest error states and imported source data.

## Verified baseline

- DEV API: 28 Articles, 10 Box models, and 10 physical units returned successfully.
- Article list/detail and Cajas catalog/detail/operational endpoints respond with persisted data.
- Existing focused baseline: 10/10 tests PASS.

## Scope

- Make `/stock` list use API Articles only.
- Make `/stock/articulos/[id]` show API/loading/error states without `STOCK_ITEMS` fallback.
- Remove Demo-labelled banners and toasts from live Articles/Cajas surfaces.
- Preserve imported records and identifiers exactly; no data mutation.
- Keep non-persisted article editing honest instead of reporting a fake save.

## Allowed files

- `src/app/stock/page.tsx`
- `src/components/stock/StockArticleView.tsx`
- `src/components/stock/StockArticleSheet.tsx`
- `src/components/stock/BoxFicha.tsx`
- `src/app/cajas/page.tsx`
- `src/app/cajas/[id]/page.tsx`
- focused component tests
- this Change Pack

## Exclusions

- Schema, migrations, Auth, permissions, production/staging/deploy, data cleanup, record renaming, and Playwright.
- Wiring every field in the legacy Article sheet to PATCH.
- Maintenance/repair workflow; that remains a separate approved package.

## Validation

- Focused component/unit tests.
- Read-only authenticated API smoke.
- Focused ESLint and independent review.

## Approval evidence

Franco confirmed continuing with plan step 2 in chat on 2026-08-26.
