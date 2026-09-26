# Proposal: Logistics Vehicle GPS REST V1 DEV

**Change:** `LOGISTICS-VEHICLE-GPS-REST-V1-DEV-001`  
**Status:** Proposed DEV scope

## Intent

Add tenant-scoped vehicles and latest normalized GPS positions to the Logistics MapLibre map without making the browser a provider client.

## Scope

### In Scope
- Add tenant-scoped `Vehicle`, manual `trackingDeviceId` association, and one latest normalized position per vehicle; enforce per-company/provider `deviceId` uniqueness.
- Read the real Rastreo Satelital REST `/devices` and `/positions` endpoints through a server-only Bearer adapter; publish a company-authorized sanitized vehicle map projection.
- Add a differentiated MapLibre vehicle-state layer while preserving the existing persisted-address destination layer.
- Create an additive Prisma migration artifact only; execution waits for confirmation that the connected database is disposable DEV.

### Out of Scope
- WebSocket, position history, alerts, geofences, routes, automated association, provider writes, or provider credentials in the client.
- Surgery/remito assignment, Auth or permission-policy changes, production/staging, deployment, data writes, migration execution, commits, and PRs.

## Capabilities

### New Capabilities
- `logistics-vehicle-gps-rest`: Tenant-safe vehicle identity, latest-position ingestion/read projection, and map presentation.

### Modified Capabilities
- None. Existing logistics geography remains the address-destination projection.

## Approach

Keep provider-facing Bearer handling in a server-only boundary and normalize only the latest accepted position. The company endpoint authorizes and scopes data before the client renders state-distinct vehicle markers/layers. Reuse the existing MapLibre map integration; do not merge GPS data with address geography.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `prisma/schema.prisma` | Modified | Additive vehicle/latest-position model contract. |
| `prisma/migrations/*` | New | Unapplied DEV migration artifact. |
| `src/lib/services`, `src/lib/validators`, `src/app/api/companies/[companyId]/logistics` | New/Modified | Server-only ingestion and tenant read projection. |
| `src/components/logistica`, `src/hooks` | Modified | Vehicle state layer on the existing map. |

## Risks

| Risk | Mitigation |
| --- | --- |
| Cross-tenant device or position exposure | Composite uniqueness; authenticate and scope every read/write server-side. |
| GPS mistaken for address geography | Separate projection and state legend/layer. |
| Unapproved DB mutation | Create artifact only; require disposable-DEV confirmation before execution. |

## Rollback Plan

Revert the additive application changes and migration artifact before execution. If later applied to disposable DEV, use a reviewed rollback migration; never delete provider data ad hoc.

## Dependencies

- Existing Logistics MapLibre integration and a future server-only Bearer secret configuration.

## Delivery Decision (Internal)

- `auto-chain`; one logical implementation slice only; no commits or PRs.

## Success Criteria

- [ ] Tenant endpoint returns only authorized company vehicles and their latest normalized position.
- [ ] Map distinguishes vehicle state from persisted-address destinations.
- [ ] No provider request, WebSocket, migration execution, or client credential occurs.
