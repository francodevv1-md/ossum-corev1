# REMITO-QR-BARCODE-001 Delta Specification

## Purpose and Authority

This delta adds Remito-level identification and verification behavior. It does not approve implementation, schema, Auth, provider, dependency, or deployment choices. All requirements below are normative.

## ADDED Requirements — Current Approved Scope

### Requirement: Issuance-Gated Publication and Artifacts

Internal QR, public QR, and Code 128 MUST be generated, resolvable, and printed only after successful Remito issuance. Drafts MUST expose none. Issued browser-print artifacts SHALL contain two clearly labelled QRs—`Internal OSSUM access` and `Public verification`—plus one whole-Remito Code 128. They MUST contain no raw Remito/company IDs. Canonical browser `Imprimir / PDF` SHALL remain active until an independently approved parity gate permits replacement.

#### Scenario: Draft and issued artifacts
- GIVEN a draft and an issued Remito
- WHEN each is viewed, scanned, or printed
- THEN only the issued Remito publishes the three labelled codes, without raw IDs
- AND browser printing remains canonical

### Requirement: RM1 Locator Integrity

Issuance SHALL assign one immutable, versioned, collision-resistant `RM1-...` locator with a version-defined check digit. Malformed or check-digit-invalid input MUST fail before lookup. Uniqueness and non-reuse MUST be database-enforced across all Remitos; ambiguity MUST fail closed. The locator is an identifier only and MUST NOT encode tenant, authority, action, raw ID, or sensitive data.

#### Scenario: Concurrent generation
- GIVEN concurrent issuances produce a collision
- WHEN uniqueness is committed
- THEN at most one locator succeeds and the other is safely regenerated or rejected

#### Scenario: Locator possession
- GIVEN a valid RM1 locator held by an unauthorized actor
- WHEN it is resolved
- THEN no authority or Remito data is granted

### Requirement: Authenticated Company-Scoped Resolution

Internal QR and Code 128 resolution MUST authenticate first, require active membership, use exact normalized RM1 matching only inside an explicitly active authorized company, and apply contextual Remito read permission. Single-company users SHALL use their active company; multi-company users MUST select one before lookup. Cross-company search is forbidden. Wrong-company, denied, and absent records MUST return one uniform neutral result.

#### Scenario: Multi-company scan
- GIVEN an authenticated user with multiple companies and none selected
- WHEN a valid code is scanned
- THEN company selection is required before any lookup

#### Scenario: Neutral denial
- GIVEN wrong-company, unauthorized, and nonexistent locators
- WHEN each is resolved
- THEN externally observable status, body, and navigation reveal no distinction or record data

### Requirement: Internal Mobile Projection and Authorization

After authorization, the mobile projection SHALL expose only Remito identity/state, permitted contents, quantities, lots/serials/expiry, real Caja/dispatch evidence, and a permitted Surgery/Record link. It MUST exclude raw IDs, company ID, public token/hash, private audit metadata, and any contextual field the actor cannot read. `admin`, `coordinador`, and `logistica` are action-capable only through separately approved commands; `vendedor`, `matrona`, and `instrumentador` are read-only. Surgery and Caja permissions remain independently contextual.

#### Scenario: Contextual redaction
- GIVEN a user may read the Remito but not linked Surgery or Caja evidence
- WHEN the workspace loads
- THEN Remito-safe fields appear and forbidden contextual sections disclose neither data nor existence

#### Scenario: Read-only role
- GIVEN a vendedor, matrona, or instrumentador
- WHEN the workspace loads
- THEN no delivery or return mutation is available or accepted

### Requirement: Public Token Lifecycle and Exact Projection

The public QR MUST contain only an opaque HTTPS token with high entropy; only its hash SHALL persist. It has no fixed calendar expiry and remains current until revocation, replacement, or security rotation. Lifecycle changes MUST preserve version history, permit one current version, and never automatically redirect replacement access.

The public response MUST contain exactly: `verificationStatus`, immutable `issuerDisplayName` snapshot, immutable `issuerTaxId` snapshot, `documentType`, `issuedDate`, `remitoShortCode` containing the approved RM1 locator, `verificationVersion`, SHA-256 `fingerprint` of the versioned canonical normalization of only those immutable public fields, and `checkedAt`. Patient, contact, Surgery, recipient, address, transport, value, items, quantities, Caja/package, lot/serial/expiry, actor, raw IDs, company ID, token/hash, audit data, downloads, or operational links MUST NOT appear. Locator and fingerprint MUST NOT be public lookup keys.

#### Scenario: Valid verification
- GIVEN the current token and matching immutable fingerprint/version
- WHEN it is checked
- THEN status is `valid` and exactly the approved projection is returned

#### Scenario: Replacement and rotation
- GIVEN a token is replaced or security-rotated
- WHEN the old token is checked
- THEN status is `replaced` without target, reason, link, or redirect

### Requirement: Public Status, Non-Enumeration, and Web Security

Malformed, unknown, integrity-invalid, or otherwise unsupported input SHALL produce `invalid`; explicit withdrawal SHALL produce `revoked`; supersession SHALL produce `replaced`; only the current matching version SHALL produce `valid`. Invalid responses MUST be non-enumerating. Public responses MUST be HTTPS-only, `no-store`, non-indexable, protected by restrictive CSP and `Referrer-Policy: no-referrer`, and MUST NOT leak tokens through redirects, errors, logs, analytics, proxy/ingress telemetry, referrers, or caches. Replays MAY re-check status but MUST NOT mutate business state or restore access.

#### Scenario: Abuse and replay
- GIVEN malformed, guessed, revoked, replaced, and replayed tokens
- WHEN they are requested
- THEN no secret or private existence signal leaks and no business mutation occurs

#### Scenario: Cache and referrer
- GIVEN a public verification response
- WHEN served or navigated away from
- THEN it is not cached/indexed and sends no token-bearing referrer

### Requirement: Audit, Privacy, and Rate Policy

Raw IP MUST NOT persist. IP MAY exist transiently for rate enforcement; only a rotating non-reversible HMAC source fingerprint MAY persist for 30 days. Issuance, revocation, replacement, delivery, and return events SHALL be permanent. Successful public checks SHALL be aggregate metrics, not indefinite per-request records. Internal resolve/view allow/deny and lifecycle/action attempts/results SHALL be safely auditable without tokens or sensitive request data. Configurable initial limits SHALL be 60 checks/minute/source and 10 invalid attempts/minute/source followed by a temporary block; limiting MUST occur before expensive lookup.

#### Scenario: Threshold and retention
- GIVEN one source exceeds either configured threshold
- WHEN another check arrives
- THEN it is temporarily blocked without raw-IP persistence
- AND its HMAC fingerprint expires after 30 days while lifecycle evidence remains

### Requirement: Accessible Resilient Scan Experience

The internal surface SHALL be one-column, touch-first, keyboard/screen-reader accessible, camera/scanner friendly, and expose text labels, focus, loading, conflict, denied/not-found, camera-denied, invalid-code, and retry states. Manual RM1 entry MUST be available. Offline reads SHALL show stale/offline status only when safe; no mutation may queue or imply success. Public verification SHALL remain readable without camera permission.

#### Scenario: Camera and offline failure
- GIVEN camera denial, scanner error, or lost connectivity
- WHEN the user attempts access or action
- THEN accessible recovery/manual entry is offered and no mutation is queued

### Requirement: Containment Regression

The canonical panel MUST remain free of raw-ID QR; the noncanonical React-PDF route MUST remain a non-cacheable, non-indexable `404`; browser print MUST omit internal IDs. These controls SHALL regress only through a separately approved parity, containment, and security gate.

#### Scenario: Legacy artifact request
- GIVEN any canonical or routable legacy Remito artifact
- WHEN requested or rendered
- THEN it emits no raw ID or unapproved code, and the disabled route remains `404`

## ADDED Requirements — Future Deferred Scope

### Requirement: Deferred Atomic Delivery and Return Commands

Delivery and return actions MUST NOT activate under this specification. A future separate approval MUST define atomic commands with explicit permission, expected version, idempotency key, confirmation, server validation, and CSRF/origin controls. Double scans/retries MUST yield one effect; stale versions and invalid transitions MUST yield none. Direct scan wiring to generic `/state` or legacy `/devolucion` is forbidden.

#### Scenario: Unapproved or stale action
- GIVEN a scan action lacks separate approval or has a stale expected version
- WHEN invoked, including by retry
- THEN it is rejected without state, evidence, or duplicate effect

### Requirement: Deferred Physical Caja Labels

Per-bulto and physical Caja labels are out of scope. Future labels MUST use separately approved physical Caja identity, never Remito package ordinals, assignment/dispatch IDs, or this RM1 locator as Caja identity.

#### Scenario: Caja label request
- GIVEN an issued Remito with package or Caja evidence
- WHEN physical labels are requested
- THEN this change produces none

## Unresolved Design Parameters

The RM1 alphabet/body length/check-digit algorithm, minimum public-token entropy, temporary-block duration, canonical normalization bytes/date format, aggregate metric dimensions, scanner normalization rules, and concrete schema/API/UI/dependency allowlists remain DESIGN/TASKS parameters. They MUST preserve every requirement above and require the later finite T3 implementation gate; none is an unresolved business rule.
