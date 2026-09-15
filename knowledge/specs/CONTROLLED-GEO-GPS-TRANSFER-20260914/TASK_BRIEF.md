# Controlled Geography/GPS Recovery — Task Brief

## Objective

Recover the authorized institution geography and Vehicle GPS/map scopes from source into this clean worktree at `ce61937`, without touching source or executing database changes.

## Authorization

Approval record — Franco, 2026-09-14: explicitly authorized the controlled GPS/geolocation transfer to `E:\OSSUM_COR_WORKTREES\ossum-clean`, then confirmed the schema/migration/multiempresa/dependency items as one task. This finite DEV authorization covers the two listed map dependencies, unexecuted schema/migration artifacts, and the smallest ContactAddress `companyId` tenant-isolation correction required by GGA. Franco then explicitly authorized duplicating every historical `ContactAddress` for every company linked to its contact, resolving the GGA multi-company backfill blocker. It does not extend to migration execution, database/data changes, production, staging, deploy, push, additional dependencies, providers, secrets, or unrelated source changes.

## Scope and ownership

- Owner: `sdd-apply / openai/gpt-5.6-terra`
- Destination-only writes. Source is read-only.
- Preserve `.gga` and `knowledge/workflow/GGA_COMMIT_ROUTINE.md`.
- Never copy secrets, storage state, `node_modules`, generated output, screenshots, logs, or unrelated dirty source changes.
- No migration/database execution, push, or deploy.

## Authorized scope

| Capability | Destination deltas |
| --- | --- |
| Dependencies | Only `maplibre-gl@^6.9.0`, `react-map-gl@^8.1.3`, and destination `package-lock.json` resolution |
| Geography | Recovered `20260910120000_contact_address_geography` migration, amended only for authorized `companyId` tenant isolation and deterministic legacy-address duplication per `ContactCompanyLink`, plus ContactAddress schema, API/service/validator/form/map-preview and focused tests |
| GPS/map | Exact `20260914093000_logistics_vehicle_gps_rest_v1` migration plus Vehicle schema, API/service/validator/map/selector/SVG route and focused tests |

## Guardrails

- Source remains read-only. No wholesale package/schema copy.
- Do not run migrations, DB writes, push, deploy, or use secrets/storage states.
- Preserve source migration content except the explicitly authorized `companyId` tenant-isolation amendment; exclude screenshots, logs, generated output, `node_modules`, and unrelated source changes.

## Validation

Run Prisma format/generate only, focused geography/map/selector/SVG tests, then typecheck and build. GGA runs on each staged commit.
