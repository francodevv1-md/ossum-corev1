# Change Pack — Remito QR and Barcode

Status: **PHASE 1 IMPLEMENTATION APPROVED — T01A → T01B → T02 → STOP A ONLY**  
Change ID: `REMITO-QR-BARCODE-001`  
Risk: **T3 — product, schema, security, permissions, privacy, and multi-company access**

Preparation envelope: Product/Domain + Security proposal writer; inherited OpenCode SDD agent; documentation/proposal only; sole writable path is this file; all application, schema, migration, Auth, API, service, validator, permission, manifest/lockfile, `AGENTS.md`, worklog, and existing-spec paths are forbidden. Preparation permits read/search only—no Git mutation, install, database, Prisma, build, or test command.

Preparing this pack does not authorize implementation, schema changes, migrations, security changes, or production activation.

Approval record: Franco explicitly authorized progression to technical design on 2026-08-11. He also requested implementation afterward; because implementation paths, schema deltas, security boundaries, and validation gates are not yet exact, implementation remains blocked until the resulting design/tasks define a finite T3 envelope and receive the exact implementation gate required by this pack and root `AGENTS.md`.

Phase 1 execution approval: Franco explicitly authorized sequential `T01A → T01B → T02 → STOP A` on 2026-08-11 after independent PASS of the exact six-file envelope and executable validations. Execution may continue automatically across those three successful slices without routine confirmation. This approval excludes schema, migration, database, Auth, API, UI, configuration, dependency, deployment, production, Git publication, and every task after STOP A.

T03/T04 approval: Franco explicitly authorized T03 schema declaration followed by automatic T04 independent read-only review on 2026-08-12. T03 may modify only `prisma/schema.prisma` with the five designed models/relations and nullable `AuditEvent.entityId`, then run Prisma format/validate. Migration creation/execution, database access, seed/backfill, API/Auth/UI/config/dependency changes, generated artifacts, and Git publication remain forbidden.

T05/T06 approval: Franco explicitly authorized completing the requested T05 migration SQL artifact and T06 independent read-only review on 2026-08-12 and requested iteration closure without further routine stops. This permits only the exact T05 files from `TASKS.md` and static validation/review. Migration/SQL execution, database access, deploy/production, destructive actions, seed/backfill, T07+, and Git publication remain forbidden; the iteration closes at STOP B.

## 1. Decision requested

Approve the product/security direction and authorize later SDD specs/design only. Implementation requires a separate exact T3 approval after the open decisions in §15 are closed.

## 2. Proven current state

- `Remito` is company-scoped, optionally linked to Surgery, contains traceable items, snapshots, state, `visibleNumber`, and only integer `packageCount`; it has no per-package identity.
- Existing Remito APIs authenticate, enforce company access, use `admin/coordinador/logistica` for mutations, and audit core mutations. Current detail/list contracts expose sensitive fields and are not public contracts.
- `CajasStockScopeReference` identifies physical stock scope; `CajasAssignment` binds a physical Caja to Surgery; `CajasDispatch`/lines bind assignment evidence to Remito/items.
- Digital receipts prove a conceptual pattern: opaque random token, SHA-256 hash at rest, expiry, revocation, supersession/versioning, safe projection, audited public access, and isolated public routes. Their entities are not reusable by assumption.
- `/remitos` currently prints through browser-generated HTML (`Imprimir / PDF`). A separate authenticated React-PDF route is directly routable but is not used by the canonical UI and is not production-ready; this pack does not activate or replace the browser fallback.
- Current UI and React-PDF QR payloads embed raw Remito/company IDs and are not approved access or verification credentials. Their containment/removal is a prerequisite gate, not future cleanup.

## 3. Exact scope

**In:** two Remito-level QRs; whole-Remito Code 128; mobile internal entry; privacy-limited public verification; proposed identifier/token lifecycle; authorization, audit, threat and quality gates; future implementation slices.

**Out:** code, schema/migrations, Auth changes, deployment, PDF activation, public item/document download, patient/Surgery/address exposure, per-bulto identity, per-Caja labels, new dependencies, receipt-entity reuse, and Cajas model changes.

## 4. UX flows

| Entry | Flow |
|---|---|
| Internal QR | Scan → OSSUM login if needed → explicit authorized company context → resolve a versioned non-secret internal locator only inside that company → membership and read authorization → exact Remito mobile workspace → inspect contents, Caja/dispatch evidence when present, lots/serials, quantities, logistics state, and Surgery/Record link → authorized actions only. Never search all tenants. Not-found and denied responses are uniform and reveal no record data. |
| Public QR | Scan opaque HTTPS URL → validate token/lifecycle → render minimal verification result; no login and no operational navigation. |
| Code 128 | Scan stable short Remito code in authenticated scanner/search surface → company-scoped exact-match lookup → zero/one result; ambiguity is a hard error → same authorized workspace. It identifies the whole Remito, never a bulto. |

## 5. Public exposure matrix

| Field | Public | Internal after authorization |
|---|---:|---:|
| Verification result: `valid/invalid/revoked/replaced` | Yes | Yes |
| Issuer public display name and configured issuer CUIT snapshot; document type; stable short code; issue date; verification version; fingerprint | Yes | Yes |
| Replacement fact (without private reason or target details) | Yes | Yes |
| Patient/contact; Surgery/Record; recipient; addresses; transport; declared value | No | Permission-dependent |
| Items, descriptions, SKU, quantity, Caja, package count, lot/serial/expiry, returns/consumption | No | Permission-dependent |
| Raw IDs, company ID, token/hash, actor, audit metadata | No | No direct exposure |

No public response may infer whether a patient, Surgery, address, item, Caja, or operational event exists.
Public lookup by Remito short code or fingerprint is forbidden; neither is an alternate public key.

## 6. Public verification semantics

- `valid`: token is current and unexpired; fingerprint/version match the current verification record.
- `invalid`: malformed, unknown, expired, or integrity-invalid input; use one non-enumerating response.
- `revoked`: known verification access was explicitly withdrawn; no private reason.
- `replaced`: this version was superseded; disclose only replacement fact unless a separately approved safe redirect exists.
- `version`: monotonically increasing verification publication version.
- `fingerprint`: versioned SHA-256 of a canonical, immutable verification projection; never a token hash or hash of raw sensitive fields.

Exact allowed payload: `verificationStatus`, `issuerDisplayName`, `issuerTaxId`, `documentType`, `remitoShortCode`, `issuedDate`, `verificationVersion`, `fingerprint`, `checkedAt`. No other field is allowed by default.

## 7. Authorization and audit model

- Internal access requires authentication, active company membership, tenant match, and contextual read permission. Barcode possession grants no authority.
- Delivery/return controls require separately approved atomic domain commands with explicit action permission, confirmation, expected version, idempotency key, server-side validation, and CSRF/origin protection where applicable. Scan actions must not wire directly to the current generic `/state` endpoint or legacy `/devolucion` orchestration. No action or authority may be encoded in QR/URL, and no role expansion is implied; current mutation roles are only the baseline for review.
- Audit: internal QR/barcode resolution and allowed/denied views plus token lifecycle and authenticated action attempts/results are safely audited. Public successful verification requests are aggregate metrics, not indefinite per-request AuditEvent records; bounded abuse telemetry follows the approved 30-day HMAC policy. Secrets and raw tokens are never logged.

## 8. Token and identifier lifecycle

- Public URLs contain high-entropy opaque tokens only; persist hashes at rest; constant-time verification; HTTPS; `no-store`/`noindex`; `Referrer-Policy: no-referrer`; restrictive CSP; pre-lookup rate limiting; ingress/application/proxy/analytics token redaction; bounded or sampled invalid-attempt telemetry; expiry; explicit revocation; one active version; rotation supersedes prior access.
- Raw database IDs and sensitive query parameters are forbidden in public URLs, QR payloads, logs, analytics, and referrers.
- Internal QR and Code 128 carry an approved versioned non-secret locator, not an authorization token. Its immutable uniqueness must be database-enforced or formally proven from an existing immutable compound identity before implementation; application-only uniqueness is forbidden. Codes are immutable after issuance; replacement preserves history and rejects ambiguous reuse.

## 9. Mobile operational surface

One-column, touch-first, fast-loading, camera/scanner-friendly surface with prominent identity/state, offline-safe failure (no queued mutation), contents and traceability sections, Caja/dispatch evidence when real, Surgery/Record link, large permission-gated delivery/return controls, confirmation, loading/conflict/error states, and visible audit outcome. No passive PDF redirect.

## 10. Proposed implications — not approved

| Layer | Proposal |
|---|---|
| Persistence | Remito stable short-code uniqueness; separate Remito verification access/version/event records; hashes, lifecycle timestamps, fingerprint, replacement lineage. |
| API | Authenticated short-code resolver/workspace projection; narrow action endpoints or existing transition adapters; isolated public verification GET. Never expose the internal Remito contract publicly. |
| UI/document | Mobile workspace, scanner entry, distinct labelled QRs, Code 128, minimal public page. Preserve browser print fallback; React-PDF needs its own verification/activation gate. |

## 11. Phased plan

0. Franco closes §15; threat model and delta specs/design receive independent review. Before rollout, separately approve and complete containment/removal of every raw-ID QR emitted by `/remitos` or the routable React-PDF endpoint; tests must prove no printable artifact emits raw database or company IDs.
1. Approve locator format, version and tenant resolution; implement authenticated read-only scanner/internal QR slice only after immutable uniqueness is database-enforced or formally proven from an existing immutable compound identity. If schema is needed, stop for its exact T3 approval.
2. Separately approve minimal verification persistence/schema; implement public read-only verification and lifecycle.
3. Add permission-gated delivery/return actions only through separately approved atomic commands after authorization, audit, expected-version concurrency, idempotency, confirmation and CSRF/origin gates PASS. Do not adapt the current generic state route or legacy return orchestration directly.
4. Add codes to the existing browser print flow. Evaluate React-PDF separately.
5. Later Change Pack: per-physical-Caja labels identify the physical stock scope through the approved Caja identity source (for example the source behind `CajasStockScopeReference.identifiedCodeSnapshot`). Assignment and dispatch IDs remain private temporal lineage/context; never use `packageCount` ordinals.

## 12. Future ownership and lock

One orchestrated T3 chain; one writer per API/service/validator/schema/UI chain; independent read-only Product/Domain + Security reviewer. Critical/shared files require explicit `reserved → editing → review → released` locks. No parallel schema, Auth, permission, multi-company, Remito, or Cajas writes.

## 13. Quality and security gates

- Approved threat model; tenant isolation; authorization matrix; audit completeness; exact public projection tests.
- Token entropy/hash/constant-time checks; expiry/revocation/rotation/replay; enumeration, pre-lookup rate-limit, cache, CSP, referrer, ingress/proxy/application/analytics log-redaction and bounded invalid-telemetry tests.
- Stable-code uniqueness/ambiguity, Code 128 scanner normalization, wrong-company and denied-role tests.
- Internal locator tests must prove authenticate-first resolution inside an explicitly selected authorized company, no cross-tenant search, and uniform not-found/denied behavior.
- Mutation idempotency, stale-state/concurrency, invalid transition, double-scan, delivery/return regression tests.
- Artifact containment tests must prove neither canonical print nor any routable legacy/noncanonical artifact emits raw Remito/company IDs or unapproved QR payloads.
- Typecheck, focused unit/integration tests, browser/mobile camera QA, print readability, accessibility, and independent security PASS. The routable but noncanonical React-PDF path is not eligible for UI activation until its own parity, containment and security gate passes.

## 14. Stop conditions and rollback

Stop on unclear code uniqueness, public field semantics, role/action authority, retention, token TTL, replacement behavior, Cajas linkage, schema need without approval, privacy leak, ownership overlap, failed independent review, or any scope expansion. Roll back through feature flags by disabling new issuance, internal entry, and code printing while preserving audit/history and browser printing. Do not mass-revoke valid public verification tokens as generic rollback: once codes are distributed, the minimal compatibility verifier must continue returning lifecycle status. Revocation remains an explicit audited document/security decision. Printed-code versions and already distributed artifacts cannot be erased. No destructive cleanup without approval.

## 15. Open decisions requiring Franco approval

1. **APPROVED — 2026-08-11:** use a versioned, non-secret, immutable Remito scan locator concept such as `RM1-7K4M-92QX-6`: format version + collision-resistant random body + check digit. Database-enforced uniqueness is mandatory. The locator powers internal QR and Code 128 but grants no authority and is distinct from the public verification token.
2. **APPROVED — 2026-08-11:** public verification tokens have no fixed calendar expiry. Their validity follows the Remito document lifecycle until explicit revocation, replacement, or security rotation. High entropy, hash-at-rest, rate limiting, and non-enumerating invalid responses remain mandatory.
3. **APPROVED — 2026-08-11:** public `replaced` verification does not redirect or link to the replacement public URL. It reports that the version is no longer current and instructs the verifier to obtain the updated document. Authorized internal users may inspect replacement lineage and open the current version.
4. **APPROVED — 2026-08-11:** preserve the initial Remito authorization boundary. `admin`, `coordinador`, and `logistica` may read and execute separately approved delivery/return controls; `vendedor`, `matrona`, and `instrumentador` receive read-only Remito access. Surgery/Record and Caja evidence remain subject to their existing contextual permissions. Code possession grants no authority.
5. **APPROVED — 2026-08-11:** capture an immutable public issuer snapshot at issuance from `Company.name` plus configured `Company.taxId`, and publish document type, issue date, approved `RM1-...` locator, verification version, and SHA-256 fingerprint. Fingerprint V1 covers only those normalized immutable public fields and never patient, Surgery, recipient, address, item, Caja, lot/serial, transport, value, actor, or audit data.
6. **APPROVED — 2026-08-11:** never persist raw IP. IP may be used transiently for rate limiting; persist only a rotating, non-reversible HMAC source fingerprint for 30 days for abuse investigation. Business lifecycle events (issuance, revocation, replacement, delivery, return) remain permanent evidence; successful public checks become aggregate metrics rather than indefinite per-request records. Initial configurable limits: 60 checks/minute per source and 10 invalid attempts/minute before temporary blocking.
7. **APPROVED — 2026-08-11:** internal QR, public verification QR, and Code 128 appear and become active only after Remito issuance. Drafts carry no operational or verification code.
8. **DESIGN GATE — authorized to resolve in SPEC/DESIGN/TASKS:** exact later schema/API/UI allowlists and dependency need. No resulting implementation scope is preapproved before independent review and the finite T3 execution gate.
9. **APPROVED — 2026-08-11:** internal scan resolution occurs only inside an explicitly selected authorized company. Single-company users use their active company; multi-company users select company before resolution. Never search all tenants. Wrong-company, denied and nonexistent Remitos use a uniform neutral response.
10. **APPROVED AND CONTAINED — 2026-08-11:** remove the current raw-ID QR from the Remito panel; disable the experimental React-PDF route with a non-cacheable `404`; preserve canonical browser `Imprimir / PDF`; do not publish replacement QR/barcode artifacts before approved `RM1-...` and public-token contracts exist. Printable browser artifacts must not expose internal IDs.

## 16. Approved containment evidence — 2026-08-11

This evidence records only the containment explicitly approved by Franco; it does not authorize the remaining QR/barcode implementation.

| Gate | Result |
|---|---|
| Raw-ID QR removed from canonical `/remitos` panel | PASS |
| Experimental React-PDF route returns non-cacheable, non-indexable `404` | PASS |
| Canonical browser `Imprimir / PDF` remains the active action | PASS |
| Browser print template no longer renders `ID interno` | PASS |
| Focused disabled-route and no-raw-ID print tests | PASS — 2/2 |
| Focused TypeScript scan for affected paths | PASS |
| Focused ESLint | PASS after removal of unused Remito-page declarations |

Containment files:

- `src/app/remitos/page.tsx`
- `src/lib/remito-print-template.ts`
- `src/app/api/companies/[companyId]/remitos/[remitoId]/pdf/route.tsx`
- `src/__tests__/unit/remito-pdf-route-disabled.test.ts`
- `src/__tests__/unit/remito-print-template.test.ts`

## 17. Cryptographic design proof — 2026-08-11

`RM1-VECTORS.md` is independently sealed at SHA-256 `3171d9ee5090eef38c0aac483e992d558529f313886e790e88380cbaf8b71f17`. Independent Node.js and Python implementations reproduced RM1-1/2/3/4 and RF1-1 exactly. Any byte change invalidates the seal and re-blocks task freezing and implementation approval.

## 18. Phase 1 implementation evidence — 2026-08-12

Franco authorized sequential `T01A → T01B → T02 → STOP A`. One writer executed each exclusive two-file slice and released its lock before the next.

| Slice | Changed lines | Focused tests | Independent verification |
|---|---:|---:|---|
| T01A — RM1 | 149 | 15/15 PASS | PASS |
| T01B — RF1 | 164 | 9/9 PASS | PASS |
| T02 — public-token crypto | 234 | 7/7 PASS | PASS |

Additional gates: seal PASS before every slice; focused ESLint PASS; limited `git diff --check` PASS; no schema, migration, DB, Auth, API, UI, config, dependency, Git publication, or downstream implementation occurred. STOP A is active.

## 19. T03/T04 schema declaration evidence — 2026-08-12

Franco authorized T03 schema declaration followed by T04 independent review. `prisma/schema.prisma` changed from Git blob `a92e6c2a42b70685e8d2e9076313f1b064858034` to `269433b06067ca2b2525efbbc5400ce01f6eea45` with 193 changed lines.

| Gate | Result |
|---|---|
| Five designed models and Remito/Company relations | PASS |
| `AuditEvent.entityId` nullable declaration | PASS |
| Prisma format / validate | PASS |
| Diff check / no migration path | PASS |
| Independent Backend review | PASS |
| Independent DB review | PASS |
| Independent Security review | PASS |
| Independent Product review | PASS |

T03 is accepted. T05 migration SQL artifact and every database/migration execution remain unauthorized.

## 20. T05/T06 migration-artifact evidence — 2026-08-12

Franco authorized T05 artifact authoring and T06 static review only. The independently accepted final artifacts are:

- SQL SHA-256: `451ee5cfe54e8004e9dfcc563958b5a4a4182c9e31ba30e6e7342affbf55aeb1`
- Future integration test SHA-256: `60986a957ade288f92c94d0566e2b0ec86c18fae7dcda69b22d3f248932f0f75`
- Combined changed lines: 320, below the 350-line gate.

Static/disconnected validation: 62 tests PASS, 4 explicitly DB-gated cases SKIPPED, focused ESLint PASS, diff check PASS. Independent Backend, DB, and Security reviews all PASS after Diagnose corrections for lifecycle forgery, canonical token material, and executable future lifecycle fixtures.

**STOP B ACTIVE:** the migration artifact has not been executed. No SQL or database access, Prisma migration command, seed/backfill, T07+, deployment, production action, or Git publication is authorized or claimed.

**This proposal is non-executable. Franco's approval of product direction alone does not authorize implementation; a later exact T3 implementation envelope is mandatory.**
