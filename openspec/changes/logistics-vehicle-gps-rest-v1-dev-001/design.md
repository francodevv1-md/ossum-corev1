# Design: Logistics Vehicle GPS REST V1 DEV

## Technical Approach

Extend the existing `GET /api/companies/[companyId]/logistics/map` projection with a separate `vehicles` collection. Address destinations remain sourced exclusively from validated `ContactAddress`; GPS is a current-telemetry projection and is never merged into geographic identity. A server-only REST adapter reads Rastreo Satelital `/devices` and `/positions` with `LOGISTICS_GPS_PROVIDER_BASE_URL` and `LOGISTICS_GPS_PROVIDER_TOKEN`, normalizes the latest provider positions, and maps them to manually associated tenant vehicles. No provider data is persisted during map reads.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Map read contract | Extend the existing authorized map endpoint | New vehicle endpoint | One map request and existing `getApiAuthContext` + `requireCompanyReadAccess` guard; smaller client change. |
| Telemetry storage | `Vehicle` plus one `VehicleLatestPosition` per vehicle | Position history; JSON on `Vehicle` | V1 explicitly needs latest state only; normalized relation keeps identity and telemetry separate. |
| Provider boundary | Server-only real REST adapter | Client fetch; WebSocket | Keeps the Bearer token and provider URL off the client while using the approved current-position API. |
| Device association | Manual nullable `trackingDeviceId`, unique per company/provider | Automated matching | Avoids unsafe inference and enforces tenant device ownership. |

## Data Flow

```text
authorized map read
  -> Rastreo REST GET /devices + GET /positions (server-only Bearer)
  -> normalizeGpsPosition(payload validation, WGS84 bounds, timestamp, knots to km/h)
  -> map deviceId to tenant Vehicle metadata

browser -> existing authorized GET /logistics/map
  -> getLogisticsMapProjection(companyId)
  -> persisted address markers + vehicle latest-position markers
  -> MapLibre destination layer + vehicle-state layer
```

The provider URL and token are read only inside the server-only adapter; neither is returned by the endpoint, serialized to a hook, or prefixed `NEXT_PUBLIC_`. Provider errors and raw payloads are converted to a non-secret unavailable projection.

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `Company.vehicles`, `Vehicle`, and `VehicleLatestPosition`. |
| `prisma/migrations/<timestamp>_logistics_vehicle_gps_rest_v1/migration.sql` | Create | Additive, unapplied DEV migration artifact. |
| `src/lib/services/logistics-vehicle-gps.server.ts` | Create | Server-only Rastreo REST adapter, normalization, and sanitized latest-position projection. |
| `src/lib/services/logistics-geography-read.service.ts` | Modify | Project authorized vehicle markers alongside unchanged address markers. |
| `src/lib/validators/logistics-vehicle-gps.ts` | Create | Validate provider payload and finite latitude/longitude/timestamp/device ID. |
| `src/app/api/companies/[companyId]/logistics/map/route.ts` | Modify | Reuse current auth/read guard; expose only normalized map projection. |
| `src/hooks/useLogisticsMap.ts` | Modify | Type the added `vehicles` response field; keep one GET. |
| `src/components/logistica/LogisticsMapPanel.tsx` | Modify | Pass destination and vehicle collections plus state summary. |
| `src/components/logistica/LogisticsMapCanvas.tsx` | Modify | Render state-distinct vehicle markers/popups without changing destination semantics. |
| `src/__tests__/unit/logistics-vehicle-gps*.test.ts` | Create | Normalizer, sync, route, and map state coverage. |

## Interfaces / Contracts

```prisma
model Vehicle {
  id String @id @default(cuid()); companyId String
  name String; trackingDeviceId String?; provider String @default("mock")
  latestPosition VehicleLatestPosition?
  @@unique([companyId, provider, trackingDeviceId])
}
model VehicleLatestPosition {
  vehicleId String @id; companyId String
  latitude Decimal @db.Decimal(10, 7); longitude Decimal @db.Decimal(10, 7)
  recordedAt DateTime; receivedAt DateTime @default(now())
}
```

`GET .../logistics/map` adds:

```ts
vehicles: Array<{ id: string; name: string; state: "fresh" | "stale" | "unknown";
  position: { latitude: number; longitude: number; recordedAt: string } | null }>
```

The migration adds foreign keys to `Company`/`Vehicle`, a one-to-one `VehicleLatestPosition.vehicleId` key, and indexes on `[companyId, provider, trackingDeviceId]` and `[companyId, recordedAt]`. It MUST contain only `CREATE TABLE`, indexes, and constraints: no drops, backfill, seed, or execution. Its execution is blocked until disposable DEV confirmation.

Map states are derived at read time: `fresh` within the configured V1 freshness window, `stale` otherwise, and `unknown` when no position exists. They use a visually and textually separate vehicle marker/legend; destinations remain `CX` markers based on validated persisted addresses.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Payload rejection, coordinate bounds, newest timestamp wins, tenant/device uniqueness intent | Vitest with mock provider and Prisma-shaped spies. |
| Route/service | Authenticated company ID overrides URL ID; projection excludes another company; no write on GET | Existing route-mock pattern and service fixtures. |
| UI | Fresh/stale/unknown marker labels and destination/vehicle separation | Testing Library plus focused component props. |
| Artifact | Migration is additive and unexecuted | Read SQL like existing migration-artifact test; no DB test required for design-only phase. |

## Migration / Rollout

Create the migration artifact only. Do not run `prisma migrate`, `db push`, or seed. The real provider is called only from the server-side map projection when both configuration values are present. After explicit disposable-DEV confirmation, implementation may apply the reviewed additive migration and validate the read projection.

Rollback before execution: delete/revert the application slice and migration artifact. If later applied to DEV, use a separately reviewed rollback migration; do not manually delete telemetry. Delivery remains internal `auto-chain`, one logical slice, with no commit or PR decision.

## Open Questions

- [ ] Confirm the V1 freshness threshold and whether the future provider requires a provider identifier beyond the approved single source.
