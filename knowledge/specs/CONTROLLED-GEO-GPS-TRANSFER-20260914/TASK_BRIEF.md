# Controlled Geography/GPS Transfer — Task Brief

## Objective

Transfer only the current institution-geography and Logistics vehicle-route implementation from `E:\OSSUM_COR_PROJECT` into this clean worktree, preserving its independent migration history.

## Scope and ownership

- Owner: `sdd-apply / openai/gpt-5.6-terra`
- Destination-only writes. Source is read-only.
- Preserve `.gga` and `knowledge/workflow/GGA_COMMIT_ROUTINE.md`.
- Never copy secrets, storage state, `node_modules`, generated output, screenshots, logs, or unrelated dirty source changes.
- No migration/database execution, push, or deploy.

## Source fragments identified

| Capability | Source files / fragments |
| --- | --- |
| Institution location load and validation | `src/components/contactos/InstitutionGeographySection.tsx`; invocation in `src/components/contactos/ContactoFormDialog.tsx`; `src/lib/georef/georef-address.adapter.ts`; `src/lib/api/contacts.ts`; `src/lib/validators/contact.ts`; `src/app/api/companies/[companyId]/contacts/georef/lookup/route.ts` |
| Surgery + fleet map | `src/components/logistica/LogisticsGlobalInbox.tsx`; `src/components/logistica/LogisticsMapPanel.tsx`; `src/components/logistica/LogisticsMapCanvas.tsx`; `src/hooks/useLogisticsMap.ts`; `src/lib/services/logistics-vehicle-gps.server.ts`; `src/app/api/companies/[companyId]/logistics/vehicles/[vehicleId]/route/route.ts`; `src/lib/validators/logistics-vehicle-gps.ts` |
| Vehicle/hour selector and SVG route | `LogisticsMapPanel.tsx` selector/actions and `LogisticsMapCanvas.tsx` `fitBounds` + projected SVG/polyline overlay |

## Dependency and schema assessment

- Required map dependencies would be the isolated `maplibre-gl@^6.9.0` and `react-map-gl@^8.1.3` deltas only. Source lockfile combines these with unrelated PDF, QR, Playwright, and Node type updates; it must not be copied wholesale.
- The destination has neither `Vehicle`/`VehicleLatestPosition` models nor any `src/components/logistica`, `useLogisticsMap`, or Logistics API/service baseline.
- The source GPS migration `prisma/migrations/20260914093000_logistics_vehicle_gps_rest_v1/migration.sql` requires those models. Its source schema also contains unrelated, later schema history, so it cannot be adopted as compatible destination history without a new destination-specific database design/migration.
- Institution geolocation likewise requires ContactAddress geographic columns/enums absent from the destination schema and is coupled to source Contact API/service/adapter changes.

## Outcome

Blocked before application transfer: both requested capabilities require database contract changes and their source shared-file dependencies are inseparable from unrelated dirty-source functionality. No application, dependency, schema, or migration files may be transferred under this brief.

## Intended exclusions

- All source `prisma/schema.prisma` changes and migrations, including `20260910120000_contact_address_geography` and `20260914093000_logistics_vehicle_gps_rest_v1`: destination incompatibility; no DB design/migration is authorized to be invented.
- `package.json`/`package-lock.json`: source deltas are mixed with unrelated packages/version bumps; map dependencies cannot be validated without the blocked application baseline.
- Source contact API/service/adapter, map, GPS, test, screenshot, log, secret, storage-state, generated, and `node_modules` files: either depend on the blocked contracts or are explicitly outside transfer scope.
