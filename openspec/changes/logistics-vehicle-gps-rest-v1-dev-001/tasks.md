# Tasks: Logistics Vehicle GPS REST V1 DEV

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 500–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | One internal auto-chain implementation slice; no commit or PR |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Tenant vehicle GPS vertical slice | Internal only | Auto-chain; do not commit or open a PR. |

## Phase 1: Scope, Locks, and Data Contract

- [x] 1.1 Ownership supplied in the approved task prompt; status `reserved → editing → review → released` for this implementation slice.
- [x] 1.2 Modify `prisma/schema.prisma` additively for `Company.vehicles`, `Vehicle`, and one-to-one `VehicleLatestPosition`, including tenant/provider/device and latest-position indexes; run `prisma format` and `generate` only.
- [x] 1.3 Create `prisma/migrations/20260914093000_logistics_vehicle_gps_rest_v1/migration.sql` with additive tables, foreign keys, indexes, and constraints only; inspect it, but do not execute `migrate`, `db push`, seed, or any DB command.

## Phase 2: Server-Only Latest Position Flow

- [x] 2.1 Create `src/lib/validators/logistics-vehicle-gps.ts` to reject malformed, non-finite, out-of-WGS84, or timestamp-less provider payloads and convert knots to km/h.
- [x] 2.2 Create `src/lib/services/logistics-vehicle-gps.server.ts` with a server-only Rastreo Bearer REST boundary reading `/devices` and `/positions`, company-scoped device mapping, and no WebSocket/provider writes.
- [x] 2.3 Update `src/lib/services/logistics-geography-read.service.ts` to project authorized vehicles without raw payloads or secrets; document the DEV presentation default: `fresh` means recorded within 15 minutes, otherwise `stale`, unless the provider result already marks it `outdated`; no position is `unknown`.
- [x] 2.4 Update `src/app/api/companies/[companyId]/logistics/map/route.ts` through its existing projection call; auth/read guards and GET read-only behavior are retained.

## Phase 3: Map Presentation

- [x] 3.1 Update `src/hooks/useLogisticsMap.ts` and `src/components/logistica/LogisticsMapPanel.tsx` for the typed vehicle projection, state summary, and non-blocking empty/unconfigured fallback while retaining one map GET.
- [x] 3.2 Update `src/components/logistica/LogisticsMapCanvas.tsx` with visually/textually separate fresh, stale, and unknown vehicle markers plus a legend; preserve `CX` persisted-address destination semantics.

## Phase 4: Tests, Validation, and Review

- [x] 4.1 Add `src/__tests__/unit/logistics-vehicle-gps*.test.ts` coverage for payload rejection, mapped-device isolation, stale preservation, missing configuration, and real REST read calls only when configured.
- [x] 4.2 Test the map route/projection for URL-company override protection, safe unavailable feed, read-only GET, and the 15-minute fresh/stale DEV presentation boundary.
- [x] 4.3 Add focused UI tests for vehicle/destination separation and fresh/stale/unknown labels; run relevant unit tests, TypeScript checks, and inspect the migration artifact without connecting to or mutating a DB.
- [ ] 4.4 Perform authenticated browser validation of destinations plus vehicle states/fallback, then review the diff for scope, secrets, tenant isolation, migration non-execution, and excluded V2 behavior; release locks and produce a Caveman handoff. Do not commit or open a PR.
