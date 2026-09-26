# Task Brief — Logistics Georef Map T3 DEV

**Status:** Approved DEV 2026-09-10

## Objective

Add a read-only, mobile-first Logistics map whose markers represent only explicitly persisted, Georef-compatible address geography.

## Scope

- Add nullable geographic fields and closed Prisma enums only to `ContactAddress`.
- Create an additive migration artifact; apply it only after explicit confirmation that the connected database is disposable DEV.
- Publish portable read-only geographic marker data and a no-write audit.
- Render eligible markers with `react-map-gl/maplibre` and MapLibre GL JS.

## Boundaries

- Georef Argentina and `GEORREFERENCIACION_ARGENTINA_MASTER.md` are authoritative.
- No textual locality inference, frontend geocoding, marker dragging, writes from the map, legacy backfill, or automatic conflict correction.
- No changes to Surgery, B/C/D, E1/E2/E3, Auth, C14, production, deployment, or real data.
- A marker requires paired valid coordinates, compatible CRS, source, and `verified` or `manual_verified` validation.

## Validation

Focused unit/integration tests, Prisma format/generate, TypeScript, visual captures at 1920/1366/1024/390, and independent review.
