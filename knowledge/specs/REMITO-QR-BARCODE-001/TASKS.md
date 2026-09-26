# Tasks: Remito QR and Barcode

Status: **FROZEN PLAN — NOT IMPLEMENTATION AUTHORIZATION**  
Change: `REMITO-QR-BARCODE-001` — T3, strictly sequential, one writer.  
Seal: every task is bound to `RM1-VECTORS.md` SHA-256 `3171d9ee5090eef38c0aac483e992d558529f313886e790e88380cbaf8b71f17`. Recompute before each slice; mismatch stops that slice and all downstream work.

## Completed evidence (not implementation tasks)

- Raw-ID QR containment, disabled React-PDF route, browser-print preservation, and focused regressions: PASS per `CHANGE_PACK.md` §16.
- RM1/RF1 proof and independent review: SEALED/PASS at the hash above.

## Review workload forecast

| Field | Value |
|---|---|
| Estimated changed lines | 2,500–4,000 across finite slices |
| Delivery strategy | ask-on-risk |
| Suggested split | One independently reviewed work unit per task below; no Git operation is authorized |

Decision needed before apply: Yes  
Chained PRs recommended: Yes  
Chain strategy: pending  
400-line budget risk: High

Every code slice targets **≤350 changed lines**; split it before editing if forecast or diff exceeds 350. Commits, staging, push, PR, amend/rebase/merge, and hook bypass are forbidden unless separately requested and authorized.

## Common controls

- **F0 forbidden in every task:** files not explicitly allowed; delivery/return mutations; `/state` or `/devolucion` wiring; backfill; Cajas/schema expansion; React-PDF activation; dependency/manifests/lockfiles; Auth/provider replacement; seed; DB/migration execution; deploy/production; destructive cleanup; Git mutation.
- **Lock protocol:** named owner exclusively holds exact writable files `reserved → editing → review → released`; next task starts only after release. No concurrent schema, migration, Auth/tenant, proxy, Remito, Surgery/Caja, API/service/validator, or print-chain writer.
- **Common commands:** seal hash with `Get-FileHash -LiteralPath "knowledge\specs\REMITO-QR-BARCODE-001\RM1-VECTORS.md" -Algorithm SHA256`, edit only allowed files, then the exact focused test command shown. No install. A failing command enters Diagnose and stops blind fixes.
- **Common stop:** seal drift; approval absent; ownership overlap; allowlist expansion; unclear domain/security behavior; secret in output/log; raw-ID/token leak; >350 changed lines without split; failed independent gate.
- **Common rollback:** revert only the current uncommitted slice and release its lock; preserve sealed/completed evidence and all history.

## Phase 1 — Cryptographic foundation (recommended initial approval)

### T01A — RM1 identifier module/tests
- **Objective/dependencies:** implement RM1 normalization, generation and CRC only; depends on sealed vectors. **Owner/lock:** Backend-Crypto; `src/lib/remito-identifiers.ts`, `src/__tests__/unit/remito-identifiers.test.ts` (sensitive identity/crypto), exclusive.
- **Allowed/forbidden:** exactly the two files above; F0. **Commands/tests:** seal hash; `.\node_modules\.bin\vitest.cmd run "src/__tests__/unit/remito-identifiers.test.ts"`. Tests reproduce RM1-1..4 plus malformed, NFKC, alphabet, length and check-digit rejection. **Accept:** exact sealed outputs, invalid input rejected before any lookup-capable API, ≤350 changed lines. **Rollback/stop:** common rollback/stop; any vector mismatch blocks T01B+.

### T01B — RF1 fingerprint module/tests
- **Objective/dependencies:** implement RF1 normalization, canonical UTF-8 bytes and SHA-256 only; T01A PASS. **Owner/lock:** Backend-Crypto; `src/lib/remito-verification/fingerprint.ts`, `src/__tests__/unit/remito-verification-fingerprint.test.ts` (sensitive fingerprint contract), exclusive after T01A release.
- **Allowed/forbidden:** exactly the two files above; F0. **Commands/tests:** seal hash; `.\node_modules\.bin\vitest.cmd run "src/__tests__/unit/remito-verification-fingerprint.test.ts"`. Tests reproduce RF1-1 byte-for-byte and cover NFC, whitespace, UTC date, CUIT and required-field rejection. **Accept:** exact 255-byte sealed payload/hash, no locale-dependent bytes, ≤350 changed lines. **Rollback/stop:** common rollback/stop; any byte drift blocks T02+.

### T02 — Public-token cryptographic module/tests
- **Objective/dependencies:** implement pure keyring validation, nonce/token derivation, canonical base64url, hash and constant-time/dummy comparison; T01B PASS. **Owner/lock:** Security-Crypto; `src/lib/remito-verification/token.ts`, `src/__tests__/unit/remito-verification-token.test.ts` (sensitive secret handling), exclusive.
- **Allowed/forbidden:** exactly those files; F0; no environment/startup/config wiring. **Commands/tests:** seal hash; `.\node_modules\.bin\vitest.cmd run "src/__tests__/unit/remito-verification-token.test.ts"`. Tests cover 32-byte keys/nonces, 43-char encoding, key-version `1..2147483647`, exact domain/four-byte serialization, unknown dummy path and retirement rules. **Accept:** injected pure-module keyring contract, no raw token persistence/logging, sealed constants unchanged, ≤350 changed lines. **Rollback/stop:** common rollback/stop; stop on missing keyring contract or absent local Vitest tooling—no install.

**STOP A:** initial recommended authorization ends after T01A, T01B and T02. Franco must separately approve T03 schema declaration.

## Phase 2 — Persistence declarations and SQL artifact

### T03 — Schema models and relations — individual approval gate
- **Objective/dependencies:** declare the five exact DESIGN §4 models/relations and nullable `AuditEvent.entityId`; T01–T02 PASS plus Franco’s explicit schema approval. **Owner/lock:** Backend-DB; `prisma/schema.prisma` (**very sensitive**), exclusive.
- **Allowed/forbidden:** only `prisma/schema.prisma`; F0, especially migration creation/execution. **Commands/tests:** seal hash; `npx prisma format`; `npx prisma validate`; schema diff review only. **Accept:** exact scalars, names, uniques, indexes, restrictive relations; no unrelated diff; ≤350 lines. **Rollback/stop:** common; stop before T04 on any inferred field or provider change.

### T04 — Independent schema gate
- **Objective/dependencies:** Backend + DB + Security + Product read-only review of T03 against DESIGN/SPEC; T03 complete. **Owner/lock:** independent reviewers; no writable files/no lock.
- **Allowed/forbidden:** read exact T03 diff and authorities only; all writes/F0. **Commands/tests:** seal hash; read-only schema/diff inspection. **Accept:** four explicit PASS verdicts covering tenant FKs, immutability intent, public projection, nullable audit semantics. **Rollback/stop:** reject T03; no T05 until unanimous PASS.

### T05 — Migration SQL constraints/triggers — artifact only, individual approval gate
- **Objective/dependencies:** author the named SQL checks/functions/triggers from DESIGN §4, including non-reuse, legal transitions, monotonic/current guarantees and nullable audit column; T04 PASS plus Franco’s separate migration-artifact approval. **Owner/lock:** DB-Migration; `prisma/migrations/20260811000000_remito_qr_barcode_001/migration.sql`, `src/__tests__/integration/remito-verification-persistence.test.ts` (**very sensitive**), exclusive.
- **Allowed/forbidden:** exactly those files; F0; `prisma migrate dev/deploy/reset`, SQL execution and DB access expressly forbidden. **Commands/tests:** seal hash; static SQL/test review only; no integration execution. **Accept:** complete forward SQL and executable future assertions for every DESIGN constraint, ≤350 lines or split SQL/test before editing. **Rollback/stop:** common; stop if generated SQL, DB introspection, timestamp rename, or execution is needed.

### T06 — Independent migration-artifact gate
- **Objective/dependencies:** Backend + DB + Security read-only review of T05; T05 complete. **Owner/lock:** independent reviewers; no writes/no lock.
- **Allowed/forbidden:** T05 diff and authorities only; all writes/F0. **Commands/tests:** seal hash; static SQL adversarial review. **Accept:** three PASS verdicts and explicit statement “artifact only; not executed.” **Rollback/stop:** reject T05; DB execution remains blocked and T07 cannot start.

**STOP B:** no migration/DB execution is authorized. T07 requires a later explicit DB execution approval and proven successful migration evidence; this plan does not grant either.

## Phase 3 — Issuance and authenticated internal read

### T07 — Issuance transaction and retry integration
- **Objective/dependencies:** integrate one Serializable issuance transaction and independent bounded P2034/P2002 whole-transaction retries; T06 PASS and separately approved/executed migration evidence. **Owner/lock:** Backend-Remito; `src/lib/remito-verification/repository.ts`, `src/lib/services/remito.service.ts`, `src/__tests__/unit/remito-issuance-retry.test.ts` (**sensitive Remito service**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/no backfill. **Commands/tests:** seal hash; focused retry tests for named locator collision, unrelated P2002 abort, eight-attempt ceiling, regeneration and rollback. **Accept:** issued-only atomic locator/publication/access/audit; drafts unchanged; ≤350 lines. **Rollback/stop:** common; stop on existing issuance semantics ambiguity.

### T08 — Identity and explicit company selection
- **Objective/dependencies:** add identity-first membership bootstrap and explicit session company selection; T07 PASS and Franco’s Auth/multi-company approval. **Owner/lock:** Auth-Tenant; `src/lib/api/identity-context.ts`, `src/lib/api/auth-context.ts`, `src/lib/api/guards.ts`, `src/app/api/me/companies/route.ts`, `src/components/auth/AuthProvider.tsx`, `src/components/auth/CompanySelector.tsx`, `src/__tests__/components/AuthCompanySelector.test.tsx` (**sensitive Auth/tenant**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/no provider change. **Commands/tests:** seal hash; focused component/API tests for one/many memberships, untrusted restored candidate, no environment default. **Accept:** server-revalidated active company and exact narrow DTO, ≤350 lines. **Rollback/stop:** common; split identity server/client if >350.

### T09 — Read-only scan resolver
- **Objective/dependencies:** implement normalize-before-company-scoped lookup after identity/membership and safe contextual projection; T08 PASS. **Owner/lock:** Backend-Scan; `src/lib/api/remito-scan.ts`, `src/lib/services/remito-scan.service.ts`, `src/lib/validators/remito-scan.ts`, `src/app/api/remitos/scan/resolve/route.ts`, `src/__tests__/unit/remito-scan-service.test.ts`, `src/__tests__/unit/remito-scan-route.test.ts` (**high-risk API/service/validator**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/no mutations. **Commands/tests:** seal hash; focused tests for 409 selection, membership-first 403, exact tenant lookup, uniform 404, roles and contextual Surgery/Caja omission. **Accept:** no cross-tenant search/raw IDs; capabilities always false; ≤350 lines. **Rollback/stop:** common; stop if contextual guards are unknown.

### T10 — Mobile scan UI
- **Objective/dependencies:** build camera/manual, accessible one-column read-only scan experience and safe stale/offline behavior; T09 PASS. **Owner/lock:** Frontend-Mobile; `src/app/remitos/scan/page.tsx`, `src/app/remitos/scan/[remitoShortCode]/page.tsx`, `src/components/remitos/RemitoScanWorkspace.tsx`, `src/__tests__/components/RemitoScanWorkspace.test.tsx`, exclusive.
- **Allowed/forbidden:** exactly those files; F0/no queued mutation/new dependency. **Commands/tests:** seal hash; focused component tests and browser/mobile QA for loading, invalid, neutral 404, camera denied, manual entry, offline/stale, focus and screen reader. **Accept:** no action controls or PDF redirect; ≤350 lines. **Rollback/stop:** common; stop if camera support needs a dependency.

## Phase 4 — Public verification boundary

### T11 — Public publication/access lifecycle services
- **Objective/dependencies:** implement exact public projection, current/replaced/revoked lifecycle, metrics and admin/coordinator rotate/revoke service behavior; T07 PASS and keyring/origin secrets supplied. **Owner/lock:** Backend-Public; `src/lib/remito-verification/service.ts`, `src/lib/remito-verification/metrics.ts`, `src/app/api/companies/[companyId]/remitos/[remitoShortCode]/verification/rotate/route.ts`, `src/app/api/companies/[companyId]/remitos/[remitoShortCode]/verification/revoke/route.ts`, `src/__tests__/unit/remito-public-verification.test.ts` (**security lifecycle**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/no delivery/return. **Commands/tests:** seal hash; focused lifecycle/projection tests including no redirect/target/reason/token. **Accept:** exact DTO semantics, permanent lifecycle audit, log-safe behavior, ≤350 lines. **Rollback/stop:** common; stop without approved keyring ownership.

### T12 — Trusted client-address boundary
- **Objective/dependencies:** implement provider-neutral provenance, CIDR/config validation and canonical address parsing; T11 PASS plus deployment adapter/CIDR/overwrite contract fixed. **Owner/lock:** Security-Network; `src/lib/security/trusted-client-address.ts`, `src/lib/security/trusted-client-address.config.ts`, `src/__tests__/unit/trusted-client-address.test.ts`, `src/__tests__/integration/remito-trusted-ingress.test.ts` (**sensitive ingress trust**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/no provider selection. **Commands/tests:** seal hash; focused canonical IPv4/IPv6, mapped address, spoof/list/duplicate/port/zone/untrusted/missing provenance tests. **Accept:** ambiguous production input fails 503 before lookup; ≤350 lines. **Rollback/stop:** common; stop without direct-peer adapter evidence.

### T13 — Rate, retention, and scheduler boundary
- **Objective/dependencies:** implement pre-lookup atomic buckets, 15-minute block, 29-day expiry, aggregate metrics retention and scheduler-secret route/runbook; T12 PASS plus keys/scheduler owner/alert defined. **Owner/lock:** Security-Operations; `src/lib/remito-verification/rate-limit.ts`, `src/lib/remito-verification/rate-retention.ts`, `src/app/api/internal/maintenance/remito-verification-retention/route.ts`, `knowledge/runbooks/REMITO_PUBLIC_PROXY_TRUST.md`, `src/__tests__/unit/remito-verification-rate-limit.test.ts`, `src/__tests__/unit/remito-verification-retention.test.ts`, exclusive.
- **Allowed/forbidden:** exactly those files; F0/no raw-IP persistence/DB execution during planning. **Commands/tests:** seal hash; focused race/threshold/expiry/secret/redaction tests; DB integration only after separate DB-test authorization. **Accept:** 60/10 bounds, purge telemetry, no fingerprints returned, ≤350 lines. **Rollback/stop:** common; stop without hourly owner/missed-run alert/emergency purge evidence.

### T14 — Public API and lifecycle contract
- **Objective/dependencies:** implement isolated public GET with exact DTO/status/header order and rate-before-lookup; T11–T13 PASS. **Owner/lock:** Backend-Public-API; `src/app/api/public/remito-verifications/[token]/route.ts`, `src/__tests__/unit/remito-public-api-headers.test.ts`, `src/__tests__/integration/remito-public-verification.test.ts` (**high-risk public API**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/no redirects/public locator lookup. **Commands/tests:** seal hash; focused route tests for invalid/revoked/replaced/valid, 429/503, exact keys/nulls/headers, replay and log redaction. **Accept:** no private existence signal or cache/referrer leak; ≤350 lines. **Rollback/stop:** common.

### T15 — Public page and proxy CSP
- **Objective/dependencies:** implement dynamic public page and nonce-bearing Next.js proxy boundary; T14 PASS. **Owner/lock:** Security-Web; `src/proxy.ts`, `src/app/verificar/remito/[token]/page.tsx`, `src/__tests__/unit/remito-public-proxy.test.ts`, `src/__tests__/unit/remito-public-page-nonce.test.tsx`, `src/__tests__/e2e/remito-public-verification.spec.ts` (`src/proxy.ts` **sensitive**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/proxy must not match `/api/**`. **Commands/tests:** seal hash; focused proxy/page/e2e tests for matcher exclusions, fresh equal request/response nonce, missing-nonce 503, CSP/no-store/noindex/no-referrer and HTTPS. **Accept:** no token-bearing internal HTTP or navigation; ≤350 lines. **Rollback/stop:** common; stop on framework contract uncertainty or log-redaction gap.

### T16 — Independent public-boundary gate
- **Objective/dependencies:** Backend + DB + Security + Product read-only review of T11–T15; all PASS. **Owner/lock:** independent reviewers; no writes/no lock.
- **Allowed/forbidden:** exact diffs/evidence and authorities only; all writes/F0. **Commands/tests:** seal hash; read-only adversarial evidence review. **Accept:** four PASS verdicts for projection/privacy, tenant boundary, token lifecycle, trusted address, rate/retention, CSP/log/cache controls. **Rollback/stop:** reject affected slice; no print work.

## Phase 5 — Print codes and callers

### T17 — Code 128 module/tests
- **Objective/dependencies:** implement deterministic Code Set B encoder/SVG dimensions and full symbol table; T16 PASS. **Owner/lock:** Backend-Barcode; `src/lib/code128.ts`, `src/__tests__/unit/code128.test.ts`, exclusive.
- **Allowed/forbidden:** exactly those files; F0/no dependency. **Commands/tests:** seal hash; focused vectors `RM1-A`/`CODE128`, every symbol pattern, module stream, checksum, dimensions/quiet zones. **Accept:** independent ISO reference agreement; ≤350 lines. **Rollback/stop:** common; stop if reference evidence is absent.

### T18 — Print-code service and API
- **Objective/dependencies:** implement issued/current audited service, server-only derivation, absolute HTTPS origins, DTO and no-store route; T17 PASS. **Owner/lock:** Backend-Print; `src/lib/services/remito-print-code.service.ts`, `src/lib/api/remito-print-codes.ts`, `src/app/api/companies/[companyId]/remitos/[remitoShortCode]/print-codes/route.ts`, `src/__tests__/unit/remito-print-code-service.test.ts` (**high-risk service/API**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/no generic DTO/token URL fields/internal HTTP. **Commands/tests:** seal hash; focused issued/draft/current/hash-verification/origin/authorization/audit/no-store tests. **Accept:** exact `RemitoPrintCodesDto`, distributed evidence before return, ≤350 lines. **Rollback/stop:** common; stop without valid origins/key access.

### T19 — Canonical print integration in both callers
- **Objective/dependencies:** await codes before synchronous HTML build in Remitos page and Expediente caller, including Ficha/Logistica mapping; T18 PASS. **Owner/lock:** Frontend-Print; `src/lib/remito-print-template.ts`, `src/lib/api/remitos.ts`, `src/app/remitos/page.tsx`, `src/components/expediente/RemitosPanel.tsx`, `src/components/expediente/LogisticaTabContent.tsx`, `src/__tests__/unit/remito-print-template.test.ts`, `src/__tests__/components/RemitosPage.test.tsx`, `src/__tests__/components/RemitosPanel.test.tsx`, `src/__tests__/e2e/remito-print-codes.spec.ts` (**sensitive Remito/Expediente callers**), exclusive.
- **Allowed/forbidden:** exactly those files; F0/React-PDF stays 404. **Commands/tests:** seal hash; focused unit/component/e2e tests for both callers, mapping, labels, drafts, unavailable fail-closed, no IDs/token and canonical browser print. **Accept:** all real callers covered; ≤350 lines or split caller integration before editing. **Rollback/stop:** common.

### T20 — Independent print-activation gate
- **Objective/dependencies:** Backend + Security + Product read-only review plus independent physical QA; T17–T19 PASS. **Owner/lock:** independent reviewers/QA; no writes/no lock.
- **Allowed/forbidden:** evidence and rendered samples only; all writes/F0. **Commands/tests:** seal hash; scan at 100%, 80%, 125% with two scanner/camera families; inspect X=0.40mm, bar≥15mm, quiet zones≥4mm and raw-ID/token absence. **Accept:** three PASS verdicts plus physical evidence; otherwise `remitoPrintCodes` stays off. **Rollback/stop:** disable print cohort before first distribution; never disable compatibility after distribution.

## Phase 6 — Rollout and final gate

### T21 — Flags and cohort completeness gate
- [x] **Objective/dependencies:** implement and verify ordered default-off flags, explicit `issuedAt + companyIds` cohort, injectable read-only completeness evaluation, distribution evidence and forced compatibility-read behavior; T20 PASS. **Owner/lock:** Release-Gate, bounded DEV amendment approved in the implementation request.
- **Allowed/forbidden:** exact DESIGN §13 item 8 only; F0 remains, especially no env/real config, DB query execution, mutation, backfill, Git, deploy, or production activation. **Commands/tests:** seal hash; focused activation/composition tests, lint, typecheck and build. **Accept:** missing/invalid config fails closed; dependencies are monotonic; issuance/print require company/date eligibility; legacy excluded; compatibility cannot turn off after distributed evidence; completeness repository remains injectable/read-only. **Rollback/stop:** remove DEV injection or keep every flag off; compatibility remains forced after evidence.
- **Apply progress:** minimal DEV slice implemented 2026-08-12. No runtime activation configuration was installed; production remains default-off. Focused Diagnose corrected stale tests that had not injected the now-required gate.

### T22 — Final independent verification
- **Objective/dependencies:** Backend + DB + Security + Product final read-only verification of SPEC/DESIGN/tasks and all prior evidence; T21 PASS. **Owner/lock:** independent reviewers; no writes/no lock.
- **Allowed/forbidden:** exact authorized diffs/evidence only; all writes/F0. **Commands/tests:** seal hash; approved focused suite, typecheck/build/browser QA only under a separate validation authorization; never DB/migration execution under this plan. **Accept:** four independent PASS verdicts; zero delivery/return mutation, backfill, raw-ID/token leak or unapproved file; all slices ≤350. **Rollback/stop:** keep flags off or follow DESIGN rollback while preserving public compatibility/history.

## Finite T3 implementation envelope requested from Franco

**Recommended initial approval:** only Phase 1 slices T01A, T01B and T02, exact files and executable validations above. It writes no schema, migration, Auth, API, UI, config or DB state. Execution must stop at **STOP A**.

Later approvals are deliberately separate:

1. T03 schema declaration only; then T04 independent gate.
2. T05 SQL migration artifact only; then T06 independent gate. **No migration/DB execution is requested or authorized.**
3. A future explicit DB execution approval and evidence is required before T07.
4. T07–T10 require issuance plus Auth/multi-company/contextual-guard approval.
5. T11–T16 require security/lifecycle, secrets, trusted-ingress/proxy and operational-retention approval.
6. T17–T20 require print activation approval and independent physical QA.
7. T21 activation requires cohort/config/operations approval; T22 verifies only.

**Secrets/config blockers:** token keyring and active version; independent daily rate and audit-correlation keyrings with rotation/retention owners; validated internal/public HTTPS origins; trusted ingress CIDRs and exactly one forwarding header; approved direct-peer adapter and overwrite evidence; scheduler bearer secret/owner/hourly schedule/missed-run alert/emergency purge; ingress/application/error/analytics token-path redaction; compatibility-read operational commitment.

**Explicit exclusions:** migration/DB execution, backfill or legacy omission exception, delivery/return actions, Caja labels, React-PDF activation, dependencies, provider/Auth replacement, deployment/production, destructive cleanup, and all Git publication operations. Any required file outside DESIGN §13 stops execution for design re-review and Franco approval.
