# Logistics Vehicle GPS REST Specification

## Purpose

Define tenant-safe vehicle identity, latest-position projection from the approved Rastreo Satelital REST API, and a distinct vehicle layer in Logistics. This V1 contains no operational assignment behavior.

## Requirements

### Requirement: Additive Tenant Vehicle Identity

The system MUST represent each Vehicle within exactly one company. A Vehicle MAY be manually associated with one `trackingDeviceId`, provider, and provider device identifier. The `(company, provider, deviceId)` combination MUST be unique when a device identifier is associated, and MUST NOT constrain matching device identifiers in different companies or providers. This contract MUST be additive and MUST NOT alter existing logistics geography.

#### Scenario: Associate a device manually
- GIVEN a company vehicle and an unclaimed provider device identifier
- WHEN an authorized server workflow records the association
- THEN the vehicle retains the company, provider, and device identifier

#### Scenario: Reject duplicate company-provider device
- GIVEN a company already has an associated `(provider, deviceId)`
- WHEN another vehicle in that company is associated with the same pair
- THEN the association is rejected without replacing the original

#### Scenario: Permit isolated identifiers
- GIVEN the same device identifier exists under a different company or provider
- WHEN a vehicle is associated in that separate scope
- THEN the association is accepted

### Requirement: Latest Normalized Position Only

The system MUST retain at most one latest normalized position per Vehicle. An accepted position MUST contain a valid coordinate pair and observation time; it MAY contain normalized provider metadata. A position older than the stored latest observation MUST NOT replace it. Invalid, malformed, unmapped, or stale payloads MUST NOT change a stored position and MUST yield a machine-readable rejected or outdated state.

#### Scenario: Accept a newer valid position
- GIVEN a mapped vehicle and a valid newer position payload
- WHEN server-side ingestion receives the payload
- THEN its normalized position becomes that vehicle's only latest position

#### Scenario: Preserve a newer stored position
- GIVEN a vehicle has a latest position observed at time T2
- WHEN a valid payload observed at T1 before T2 is ingested
- THEN T2 remains the latest position and the result is outdated

#### Scenario: Reject invalid input safely
- GIVEN a payload has invalid coordinates, no observation time, or no mapped device
- WHEN it is ingested
- THEN no vehicle position changes and the result is rejected

### Requirement: Server-Only Provider REST Read and Secrets

The system MUST read the Rastreo Satelital `/devices` and `/positions` REST endpoints with a server-only Bearer adapter in V1. Provider selection and outbound provider communication MUST remain isolated behind the server boundary. Browser code MUST NOT receive provider credentials, Bearer secrets, raw provider payloads, provider URLs, or request errors. If required provider configuration is absent or the provider is unavailable, the projection MUST fail closed to a non-secret operational state. V1 MUST NOT open WebSocket connections or issue provider writes.

#### Scenario: Read mapped provider positions
- GIVEN provider configuration and mapped tenant vehicle devices
- WHEN the authorized server projection reads `/devices` and `/positions`
- THEN valid normalized positions are mapped by `deviceId` to the matching vehicle metadata

#### Scenario: Refuse missing or invalid secret
- GIVEN the secret is absent or the Bearer credential is invalid
- WHEN a position is submitted
- THEN the request is denied without exposing configured secret values

#### Scenario: Keep excluded provider traffic disabled
- GIVEN V1 runs with any provider configuration state
- WHEN map reads occur
- THEN it uses only the approved REST reads and never opens WebSocket connections or makes provider writes

### Requirement: Tenant-Safe Vehicle Map Projection

The system MUST provide an authenticated company-scoped read endpoint returning only vehicles authorized for the requested company and their latest normalized position or explicit unavailable/outdated state. It MUST NOT return raw provider payloads, credentials, or vehicles from another company. A company with no configured provider MUST return a safe empty or unconfigured vehicle projection while preserving normal endpoint behavior.

#### Scenario: Return only company vehicles
- GIVEN an authorized user requests company A's vehicle projection
- WHEN company B has vehicles and positions
- THEN the response contains no company B vehicle data

#### Scenario: Handle unconfigured provider
- GIVEN the requested company has no provider configuration
- WHEN its map projection is requested
- THEN the response is safe, non-secret, and indicates no active vehicle feed

### Requirement: Differentiated MapLibre Vehicle Presentation

The Logistics map MUST render vehicle positions in a layer and legend visually distinct from persisted-address destinations. It MUST represent valid latest positions and unavailable, invalid, or outdated vehicle states without converting them into destination markers. When the vehicle projection is empty or unconfigured, the map MUST preserve the existing destination layer and show a non-blocking vehicle fallback.

#### Scenario: Render distinct map entities
- GIVEN a projection has an eligible vehicle position and persisted destinations
- WHEN the map renders
- THEN vehicle and destination markers are distinguishable by layer or legend

#### Scenario: Preserve map on unavailable vehicle feed
- GIVEN vehicle projection is empty, unconfigured, or contains only unavailable states
- WHEN the map renders
- THEN destinations remain visible and the vehicle fallback is shown

### Requirement: V1 Scope Boundary

The system MUST NOT add WebSocket integration, position history, alerts, geofences, routing, automated device association, surgery/remito assignment, provider writes, or other V2 operational features. It MUST NOT execute a database migration as part of this change.

#### Scenario: Reject excluded V2 behavior
- GIVEN a request attempts an assignment, history, or live provider feature
- WHEN evaluated against V1
- THEN it is not exposed by this capability
