# Design: Remito QR and Barcode

## Authority and implementation boundary

This design resolves the approved specification parameters. It does not authorize schema, migration, Auth, secret, proxy, dependency, deployment, backfill, or source changes. Delivery and return commands remain excluded. The initial mobile slice is read-only.

## 1. RM1 locator

### Canonical algorithm

- Alphabet/value map: Crockford Base32 `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, left-to-right values `0..31`.
- Body: `randomBytes(10)` interpreted as one unsigned 80-bit big-endian value and encoded as exactly 16 Base32 symbols. There is no rejection/modulo step because 80 is divisible by 5.
- Version: prefix `RM1`; the CRC message begins with exactly five bits `00001`, followed by the 16 body values as five bits each, MSB-first (85 bits total). Prefix characters and separators are not CRC input.
- CRC/check digit: CRC-5/EPC, width `5`, polynomial `0x09` (`x^5+x^3+1`, top bit omitted), init `0x09`, `refin=false`, `refout=false`, `xorout=0x00`, direct/non-augmented (append zero bits: no), standard check `0x00` for ASCII `123456789`, residue `0x00`. Exact update: for each input bit, `feedback=((remainder>>4)&1)^bit`; then `remainder=(remainder<<1)&0x1f`; if `feedback=1`, `remainder^=0x09`. The check symbol is `alphabet[remainder]`; validation recomputes and compares that symbol.
- Format: `RM1-XXXX-XXXX-XXXX-XXXX-C` (25 ASCII characters).
- Normalize: NFKC; trim leading/trailing Unicode whitespace; ASCII-uppercase; remove only ASCII space and `-`; then require either `RM1` + 17 alphabet symbols or 17 alphabet symbols. Reject all remaining non-ASCII/invalid symbols, wrong version/length, or check mismatch before any DB lookup; emit canonical grouping.
- Generation: each attempt creates fresh random body and check. PostgreSQL global uniqueness and non-reuse are authoritative; application prechecks are forbidden.

### Mandatory design-proof vectors

Commands are prohibited in this design phase, so no unverified output is asserted. Before implementation approval, a read-only proof artifact must seal these normative vectors using two independent implementations (one bit-by-bit reference, one candidate implementation):

| Vector | Fixed input | Required sealed output |
|---|---|---|
| RM1-1 | random bytes hex `00000000000000000000` | body, CRC value/symbol, canonical locator |
| RM1-2 | random bytes hex `ffffffffffffffffffff` | body, CRC value/symbol, canonical locator |
| RM1-3 | random bytes hex `0123456789abcdeffedc` | body, CRC value/symbol, canonical locator |
| RM1-4 | lowercase, ungrouped form of RM1-3 | exact normalized RM1-3 locator |

The normative outputs are sealed in `RM1-VECTORS.md` at SHA-256 `3171d9ee5090eef38c0aac483e992d558529f313886e790e88380cbaf8b71f17`. Independent Node.js and Python review reproduced every value. Any byte change invalidates the seal and re-blocks task freezing and implementation approval.

### Vector gate and permitted next work

Until the vector artifact is sealed, exactly one standalone proof task is permitted. Its sole writable file is `knowledge/specs/REMITO-QR-BARCODE-001/RM1-VECTORS.md`; it may read this design and use independent calculation tools only to produce the RM1/RF1 evidence defined above and below. It must receive an independent read-only cryptography review and an explicit `SEALED/PASS` result tied to the artifact bytes.

Before that seal, agents MUST NOT create, update, or freeze `knowledge/specs/REMITO-QR-BARCODE-001/TASKS.md`; request finite T3 implementation approval; create an implementation envelope; edit schema/source/configuration; or begin any implementation phase. After sealing, SDD tasks must be generated and frozen against the exact sealed vector artifact/hash; any later vector change invalidates those tasks and requires regeneration plus re-review.

## 2. RF1 public fingerprint

### Normalization and exact byte grammar

Values are snapshotted at issuance. Strings use Unicode NFC, trim Unicode whitespace, and collapse each non-empty Unicode whitespace run to one U+0020. `issuerTaxId` removes ASCII punctuation/whitespace and must then be non-empty ASCII digits; new RF1 issuance fails if Company.taxId is absent/invalid. `documentType` is ASCII-uppercase. `issuedDate` is the UTC date from `issuedAt`, exactly `YYYY-MM-DD`. `remitoShortCode` is canonical RM1. `verificationVersion` is positive unpadded ASCII decimal.

Canonical bytes are:

1. Header UTF-8/ASCII `OSSUM-REMITO-PUBLIC-FINGERPRINT`, then `00 0a` (33 bytes total). Header hex: `4f5353554d2d52454d49544f2d5055424c49432d46494e4745525052494e54000a`.
2. Seven records in the exact order below. A record is UTF-8 field name, byte `3d`, ASCII decimal UTF-8 byte length with no sign/leading zero, byte `3a`, normalized UTF-8 value bytes, byte `0a`.

```text
fingerprintVersion=3:RF1
issuerDisplayName=<length>:<normalized UTF-8>
issuerTaxId=<length>:<ASCII digits>
documentType=<length>:<ASCII uppercase>
issuedDate=10:YYYY-MM-DD
remitoShortCode=25:RM1-XXXX-XXXX-XXXX-XXXX-C
verificationVersion=<length>:<positive decimal>
```

The code block is grammar notation, not normative example bytes. RF1 permits no nulls. No BOM, CR, extra space, locale formatting, escaping, terminal data after the final LF, or field reordering. Hash exact bytes with SHA-256. Persist lowercase 64-hex; API format is `sha256:<64 lowercase hex>`.

### Mandatory design-proof vector

`RM1-VECTORS.md` seals RF1-1 using `fingerprintVersion=RF1` (3 bytes), `issuerDisplayName="Distribuidora Ágil S.A."` (24 UTF-8 bytes after normalization), `issuerTaxId="30-12345678-9"` (normalized `30123456789`, 11 bytes), `documentType="REMITO_SALIDA"` (13 bytes), `issuedDate="2026-08-11"` (10 bytes), sealed RM1-3 (25 bytes), and `verificationVersion=1` (1 byte). Its exact canonical payload is 255 bytes and hashes to `9c02d28682f66646a8e2d3521319d4ac5b50a20bdf9100262e0e96cc7ddcf25a`; the sealed artifact and independent review are authoritative.

RF2 or any normalization change creates a new publication/version; RF1 rows/bytes remain immutable.

## 3. Public token and print derivation

- Configuration exposes `keyring[tokenKeyVersion]`, where the index is an integer in the exact signed PostgreSQL/Prisma `Int` range `1..2147483647`; startup rejects zero, negatives, fractions, and larger values. Each value is exactly 32 secret bytes decoded from canonical 43-character unpadded base64url. One configured `activeTokenKeyVersion` in that same range must exist in the keyring.
- Generate raw `nonce=randomBytes(32)`; persist only canonical unpadded base64url nonce (43 characters), key version, and SHA-256 token hash. Decode-and-re-encode equality is mandatory.
- HMAC input is: domain bytes hex `4f5353554d2d52454d49544f2d5055424c49432d544f4b454e00` (`OSSUM-REMITO-PUBLIC-TOKEN` + NUL), then `tokenKeyVersion` as four-byte unsigned big-endian, then the raw 32 nonce bytes. Compute HMAC-SHA-256 using exactly `keyring[tokenKeyVersion]`. Token is canonical unpadded base64url of the 32-byte HMAC (43 characters; 256-bit PRF strength).
- Persist `SHA-256(ASCII token)` as lowercase 64-hex. Public lookup canonicalizes token, hashes it, selects the globally unique hash, then uses `timingSafeEqual` over decoded 32-byte hashes before lifecycle evaluation. Unknown hashes execute the same comparison against a process-fixed random 32-byte dummy before returning `invalid`; rate limiting precedes both paths.
- No fixed expiry. Rotation creates a new access, marks the previous access `replaced`, and never redirects it. Revocation marks current access `revoked`. Document replacement creates a new publication/access and replaces the old publication/access.
- A key may leave `activeTokenKeyVersion` only after a successful security rotation. It may leave the keyring only when no `current` access references it and no enabled print cohort can derive from it. Old supplied tokens remain verifiable through stored hashes after key retirement; old tokens are never re-derived. Key removal is audited and separately approved.

Authenticated printing uses `GET /api/companies/{companyId}/remitos/{remitoShortCode}/print-codes`. The audited, issued-only `RemitoPrintCodeService` loads only the current locator/publication/access, derives and hash-verifies the token, builds canonical absolute HTTPS URLs, and returns a narrow no-store projection:

```ts
type RemitoPrintCodesDto = {
  remitoShortCode: string
  internalQrDataUrl: string
  publicQrDataUrl: string
  code128Svg: string
  labels: { internal: "Internal OSSUM access"; public: "Public verification" }
}
```

It exposes neither token nor URL separately and never reuses a generic Remito DTO. The token exists transiently in server memory and inside the returned public QR data URL. The page and API invoke services directly server-side; no token-bearing server-to-server/internal HTTP request is allowed.

## 4. Proposed persistence — five new models

Five is minimal under current infrastructure:

1. `RemitoScanLocator`: independent immutable/global non-reuse identity; a nullable Remito column cannot preserve identity history safely.
2. `RemitoVerificationPublication`: immutable public snapshot/fingerprint and document replacement history.
3. `RemitoVerificationAccess`: independently rotatable/revocable token lifecycle; combining it with publication would rewrite immutable publication evidence.
4. `PublicVerificationRateBucket`: atomic, distributed pre-lookup abuse state with the approved 30-day source-fingerprint policy; AuditEvent cannot represent unknown pre-tenant sources and in-memory limits are not multi-instance safe.
5. `RemitoVerificationDailyMetric`: aggregate successful-check counts; AuditEvent is per-request/per-user and therefore violates the aggregation rule. No existing metrics store was found. If an approved durable metrics platform exists before implementation, this model must be removed through design re-review, not duplicated.

All domain catalogs remain validated `String`s, not Prisma enums. Proposed exact fields/keys are:

```text
RemitoScanLocator(locator PK varchar(25), companyId, remitoId, version, issuedAt, createdAt)
  UNIQUE(companyId,locator); UNIQUE(companyId,remitoId); UNIQUE(companyId,locator,remitoId);
  FK(companyId)->Company(id); FK(companyId,remitoId)->Remito(companyId,id);
  INDEX(companyId,issuedAt)

RemitoVerificationPublication(id, companyId, remitoId, version, status, currentSlot?,
  issuerDisplayNameSnapshot, issuerTaxIdSnapshot, documentTypeSnapshot, issuedDateSnapshot,
  remitoShortCodeSnapshot, fingerprintVersion, fingerprintSha256, publishedAt,
  replacedAt?, replacedByPublicationId?, createdAt)
  UNIQUE(companyId,id); UNIQUE(companyId,id,remitoId); UNIQUE(companyId,remitoId,version);
  UNIQUE(companyId,remitoId,currentSlot);
  FK(companyId)->Company(id); FK(companyId,remitoId)->Remito(companyId,id);
  FK(companyId,remitoShortCodeSnapshot,remitoId)->RemitoScanLocator(companyId,locator,remitoId);
  FK(companyId,replacedByPublicationId,remitoId)->RemitoVerificationPublication(companyId,id,remitoId);
  INDEX(companyId,remitoId,status); INDEX(companyId,publishedAt)

RemitoVerificationAccess(id, companyId, remitoId, publicationId, version, status, currentSlot?,
  tokenNonce, tokenKeyVersion, tokenHash, issuedAt, replacedAt?, revokedAt?,
  supersededByAccessId?, createdAt)
  UNIQUE(tokenHash); UNIQUE(companyId,id); UNIQUE(companyId,id,publicationId);
  UNIQUE(companyId,publicationId,version); UNIQUE(companyId,publicationId,currentSlot);
  FK(companyId)->Company(id);
  FK(companyId,publicationId,remitoId)->RemitoVerificationPublication(companyId,id,remitoId);
  FK(companyId,supersededByAccessId,publicationId)->RemitoVerificationAccess(companyId,id,publicationId);
  INDEX(companyId,publicationId,status); INDEX(companyId,issuedAt)

PublicVerificationRateBucket(sourceFingerprint, keyDate, firstSeenAt, windowStartedAt, checks,
  invalidChecks, blockedUntil?, expiresAt, updatedAt)
  PK(sourceFingerprint,keyDate); INDEX(expiresAt); INDEX(blockedUntil)

RemitoVerificationDailyMetric(id, companyId, day, channel, result, count, updatedAt)
  UNIQUE(companyId,day,channel,result); FK(companyId)->Company(id); INDEX(day)
```

Exact Prisma scalar mapping: every ID/FK is `String`; locator snapshots are `String @db.VarChar(25)`, `issuerDisplayNameSnapshot` is `String @db.VarChar(200)`, `issuerTaxIdSnapshot` is `String @db.VarChar(32)`, `documentTypeSnapshot` is `String @db.VarChar(64)`, statuses/results are `String @db.VarChar(16)`, channel is `String @db.VarChar(32)`, fingerprintVersion is `String @db.VarChar(8)`, tokenNonce is `String @db.Char(43)`, and SHA-256/source-fingerprint fields are `String @db.Char(64)`. Versions/counters/currentSlot/keyVersion are `Int`; `day/keyDate/issuedDateSnapshot` are `DateTime @db.Date`; lifecycle/retention timestamps are `DateTime @db.Timestamptz(6)`; created/updated timestamps use `@default(now())`/`@updatedAt`. Relation names are exactly `RemitoLocatorOwner`, `RemitoVerificationPublications`, `RemitoVerificationPublicationReplacement`, `RemitoVerificationPublicationAccesses`, `RemitoVerificationAccessSupersession`, and the matching `CompanyRemitoScanLocators`, `CompanyRemitoVerificationPublications`, `CompanyRemitoVerificationAccesses`, `CompanyRemitoVerificationDailyMetrics`.

Defaults are exact: publication/access/metric `id @default(cuid())`; locator `version @default(1)`; new publication/access `status @default("current")` and `currentSlot @default(1)`; rate `checks/invalidChecks @default(0)`; all other lifecycle/version/count values are supplied explicitly by their transaction, and a new daily metric starts at `count=1` rather than persisting zero.

Add named relations `Remito.scanLocator`, `Remito.verificationPublications`, and Company collections. Prisma schema can express fields, composite uniques/indexes/FKs, and restrictive deletes. An explicitly approved SQL migration—not Prisma alone—must add named CHECK/constraint triggers:

- locator: `version=1`, canonical RM1 regex/check function, Remito is issued, and UPDATE/DELETE denial;
- publication: version `>0`; status only `current|replaced`; `currentSlot=1 iff status=current`; replacement timestamp/target both present only for `replaced`; target same Remito and higher version; snapshots/fingerprint/version/created fields immutable; UPDATE permits only one legal `current→replaced`; DELETE denied;
- access: version `>0`; token key version `BETWEEN 1 AND 2147483647`; status only `current|replaced|revoked`; `currentSlot=1 iff current`; exactly one of replacement/revocation timestamp rules; superseding target same publication and higher version; immutable nonce/key/hash/version/ownership/created fields; legal transitions only `current→replaced|revoked`; terminal rows immutable; DELETE denied;
- rate/metric counters nonnegative, `invalidChecks<=checks`, metric count positive, immutable `firstSeenAt`, and rate `expiresAt=firstSeenAt+29 days` (one-day purge-failure safety margin under the approved 30-day maximum);
- deferred constraint triggers guarantee publication versions and access versions increase by exactly one, issuance/replacement commits exactly one current publication per code-enabled Remito, and issue/rotation commits exactly one current access; revocation alone may commit zero current access. Unique nullable `currentSlot` constraints enforce at-most-one.

`AuditEvent` remains permanent lifecycle evidence. To audit unknown/wrong-company/denied internal scans without inventing an entity ID, the same separately approved schema migration changes `AuditEvent.entityId` to nullable. Such events use `entityType="RemitoScanAttempt"`, `entityId=null`, actor/company, result/channel, and a rotating HMAC correlation in metadata; tokens, raw locator, raw IP, and inferred Remito IDs are forbidden.

## 5. Issuance and transaction retries

One Serializable transaction performs current draft lock/read, visible number, all fresh timestamps/IDs, locator, publication, access, Remito transition, and AuditEvent. The retry wrapper reruns the **whole transaction** and regenerates locator, nonce, publication/access IDs, timestamps, fingerprint, token hash, and audit payload.

Budgets are independent: preserve the existing `P2034` budget as three total transaction attempts (initial attempt plus at most two `P2034` retries); permit at most five additional whole-transaction retries after `P2002` only when Prisma metadata names the global locator constraint `pk_remito_scan_locator_locator`. Any other `P2002`, absent/ambiguous constraint metadata, validation/security error, or exhausted budget aborts immediately. Counters do not reset each other, so at most eight transaction executions can occur. Nothing from a failed attempt may be returned or reused.

## 6. Authentication, company selection, and authorization

Internal resolution contract becomes `POST /api/remitos/scan/resolve` with `{ selectedCompanyId?: string, locator: string }`.

1. New `getApiIdentity(request)` validates Supabase bearer identity and active User without accepting company input.
2. Load active memberships. `selectedCompanyId` is an untrusted client selection until exact active membership is proven. One membership + omitted selection resolves to that company; more than one + omitted selection returns `409 {error:{code:"company_selection_required",message:"Select a company before scanning"}}` before RM1 validation/lookup. Supplied inactive/nonmember selection returns `403 company_access_denied` before locator handling.
3. Apply approved Remito read roles: `admin`, `coordinador`, `logistica`, `vendedor`, `matrona`, `instrumentador`.
4. Normalize/validate RM1, exact lookup by `{companyId,locator}`, then contextual projection guards. Wrong-company, absent, and contextual denial after valid membership remain uniform `404 remito_scan_unavailable`.

`AuthProvider` must represent `availableCompanies`, `activeCompany`, and an explicit `selectActiveCompany(id)`; memory is authoritative for the session, while sessionStorage may restore only a candidate that the server revalidates. No default environment company may silently choose among multiple memberships. Existing `getApiAuthContext(request,companyId)` may remain for old routes but new scan/lifecycle/print routes compose `getApiIdentity` plus `requireSelectedCompanyMembership`; this Auth/guard change is T3-gated.

`GET /api/me/companies` authenticates with `getApiIdentity` and returns only `{data:{companies:[{id,name}],singleCompanyId:string|null}}`; it accepts no company selector and performs no domain lookup. This is the sole bootstrap for the selector. A restored client candidate becomes `activeCompany` only after it appears in this response.

Lifecycle rotate/revoke remains a proposed, separately gated `admin|coordinador` permission. `logistica` retains approved Remito read/action baseline but receives no verification-lifecycle authority from this design. All delivery/return capabilities are `false` and no mutation endpoint is added.

## 7. Exact routes and DTOs

| Method/path | Result |
|---|---|
| `GET /api/me/companies` | Identity-only active-membership projection used by AuthProvider; no locator/domain input. |
| `POST /api/remitos/scan/resolve` | Body above. `200` safe read workspace with `remitoShortCode`, document/state/date, permitted items/traceability, optional guarded Surgery/Caja projections, and `{canDeliver:false,canReturn:false}`; no raw IDs. Errors as §6. |
| `GET /api/companies/{companyId}/remitos/{remitoShortCode}/print-codes` | Identity→membership→read-role→issued/current checks; `200 RemitoPrintCodesDto`; `Cache-Control: private, no-store`; audited. |
| `POST /api/companies/{companyId}/remitos/{remitoShortCode}/verification/rotate` | Admin/coordinador; empty body; `200 {data:{verificationVersion:number}}`; no token/URL. |
| `POST /api/companies/{companyId}/remitos/{remitoShortCode}/verification/revoke` | Admin/coordinador; `{reason:string}` audit-only; `200 {data:{verificationStatus:"revoked"}}`. |
| `GET /api/public/remito-verifications/{token}` | Exact DTO below. Valid/revoked/replaced `200`; malformed/unknown/integrity-invalid `200 invalid` with nullable publication fields; untrusted/missing/ambiguous client address `503` generic before token lookup; rate block `429` generic + `Retry-After`. Never redirect. |
| `POST /api/internal/maintenance/remito-verification-retention` | Dedicated scheduler bearer secret, no cookies; atomic purge and aggregate `{deleted,oldestRemainingAgeSeconds}` only; `Cache-Control: private, no-store`; never returns fingerprints. |

Canonical public DTO property names and order are exactly:

```ts
type PublicRemitoVerificationDto = {
  verificationStatus: "valid" | "invalid" | "revoked" | "replaced"
  issuerDisplayName: string | null
  issuerTaxId: string | null
  documentType: string | null
  issuedDate: string | null
  remitoShortCode: string | null
  verificationVersion: number | null
  fingerprint: string | null
  checkedAt: string
}
```

Public API headers remain route-owned: `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`, `Cross-Origin-Resource-Policy: same-origin`, JSON content type. Internal scan/print API is `private, no-store`; CSP is not asserted on JSON. HTTPS is mandatory outside development. Ingress/application/error/analytics logs redact the token path segment before emission.

The public HTML response-header boundary is the proposed sensitive `src/proxy.ts`, using Next.js 16 `export function proxy(request: NextRequest)`. Its matcher is only `/verificar/remito/:path*` and excludes `next-router-prefetch` and `purpose: prefetch`. For every matched document request it generates a fresh cryptographically random base64 nonce, sets `x-nonce` and the normalized CSP on forwarded **request** headers through `NextResponse.next({request:{headers}})`, and sets the same CSP plus cache/robots/referrer/CORP headers on the **response**. CSP is `default-src 'none'; script-src 'self' 'nonce-{nonce}' 'strict-dynamic'; style-src 'self' 'nonce-{nonce}'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.

`src/app/verificar/remito/[token]/page.tsx` must call `await connection()` from `next/server` to force dynamic rendering, then read `(await headers()).get("x-nonce")`; a missing nonce fails closed with the generic 503 page before verification rendering. The page passes the nonce only to framework/script/style elements that require it. Proxy never handles `/api/**`; API security headers remain owned and tested in the public API route.

## 8. Mobile and contextual projection

UI routes are `/remitos/scan` and `/remitos/scan/[remitoShortCode]`; public page is `/verificar/remito/[token]`. Internal QR uses absolute `https://<validated-internal-origin>/remitos/scan/<encoded-RM1>`; public QR uses absolute `https://<validated-public-origin>/verificar/remito/<token>`. Origins come from server-only configuration, must parse as origin-only URLs (no credentials/path/query/fragment), and must be HTTPS outside local development.

The mobile UI is one-column, touch/keyboard/screen-reader accessible, camera plus manual input, with loading, invalid, neutral unavailable, camera-denied, offline, stale, and retry states. Offline storage may retain only a previously authorized safe projection, partitioned by user+company and visibly stale; it queues no mutation. Surgery link and Caja/dispatch evidence are queried and emitted only after their independent contextual guards pass; omission reveals no existence.

## 9. Canonical browser print and Code 128

`qrcode.toDataURL` is asynchronous, while `buildOperationalRemitoPrintHtml` is synchronous. Each caller must first await `fetchRemitoPrintCodes`, then pass the returned pre-rendered assets through new `printCodes?: RemitoPrintCodesDto`; the builder performs no network/crypto work. `RemitoApiRow` and the Ficha CX panel mapping may carry nullable non-secret `remitoShortCode`, but never token/access material; the print-code projection remains separate. Every actual caller/mapping is mandatory: `src/app/remitos/page.tsx`, `src/components/expediente/RemitosPanel.tsx`, and `src/components/expediente/LogisticaTabContent.tsx`. Drafts never call the service and render no code. Issued records without a complete current code projection fail closed with “codes unavailable”; print-code activation rules in §12 prevent partial production rollout. React-PDF remains noncanonical disabled `404`.

Code 128 uses a deterministic internal Code Set B module and the ISO/IEC 15417 symbol-pattern table: Start B `104`, data value `ASCII-32`, checksum `(104+Σ(value×1-based-position)) mod 103`, Stop `106`. SVG uses integer module coordinates, no antialiasing transforms, X-dimension exactly `0.40 mm` at print, bar height at least `15 mm`, and left/right quiet zones exactly `10X` minimum (`4.0 mm`); CSS must not scale below these dimensions. Human-readable canonical RM1 is mandatory.

Normative reference vectors:

| Input | Exact code values including start/check/stop |
|---|---|
| `RM1-A` | `[104,50,45,17,13,33,100,106]` |
| `CODE128` | `[104,35,47,36,37,17,18,24,26,106]` |

Tests must additionally compare every symbol pattern and full module stream against an independently reviewed ISO/IEC 15417 reference implementation, then scan printed samples at 100%, 80%, and 125% with two physical scanner/camera families. No new dependency is proposed; the small fixed encoder is defensible only if vectors and independent print QA pass.

## 10. Threat controls

| Threat | Required control |
|---|---|
| Token guessing/leakage | 256-bit PRF token, hash at rest, keyring, HTTPS, no-store, path redaction |
| Tenant enumeration | identity first, explicit membership-validated company, exact tenant lookup, uniform neutral result |
| Replay | verification GET is read-only; replaced/revoked never restore access |
| Raw-ID leakage | locator/token-only contracts; DTO/HTML/QR/SVG regression scans |
| Cache/referrer/log | distinct §7 headers; no token-bearing internal HTTP; ingress/app/error/analytics redaction |
| Forwarded-address spoofing | provenance-aware `TrustedClientAddressResolver`; trusted ingress allowlist; ambiguous/missing fail-closed 503 |
| Barcode tamper/misread | RM1 CRC, Code128 checksum, exact match, visible RM1 confirmation |
| CSRF/origin | public GET has no mutation; lifecycle POST requires bearer auth and configured-origin check |
| Stale/double scan | repeatable reads; no delivery/return command exists |
| Printed lifecycle | old token deterministically reports replaced/revoked; no redirect/deletion |

## 11. Rate, audit, telemetry, and retention

### Trusted client address boundary

`TrustedClientAddressResolver` is a provider-neutral server interface receiving `{ directPeerAddress, headers, environment, trustedIngressCidrs, trustedForwardingHeader }`. `directPeerAddress` must come from an approved runtime/deployment adapter, never an HTTP header. Production accepts the configured forwarding header (`forwarded` or `x-forwarded-for`, exactly one configured name) only when the canonical direct peer belongs to an explicitly configured `trustedIngressCidrs` entry and the ingress contract guarantees that it overwrites—not appends—client-supplied values. Untrusted provenance causes forwarding headers to be ignored, not partially trusted.

The selected header must contain exactly one address. For `x-forwarded-for`, only one bare address is legal. For `Forwarded`, only one element with one `for=` parameter is legal: IPv4 is bare canonical text; IPv6 is exactly the RFC form `for="[<lowercase-RFC5952>]"` without port. Comma lists, duplicate/conflicting headers, additional elements/`for=` parameters, escapes/obfuscated identifiers, `unknown`, ports, zone IDs (`%`), noncanonical spelling, or parse failure are ambiguous and rejected. Canonical IPv4 is dotted decimal with no leading zeros and becomes exactly four network-order bytes. Canonical IPv6 becomes exactly sixteen network-order bytes; IPv4-mapped IPv6 (`::ffff:a.b.c.d`) collapses to the four IPv4 bytes before HMAC. No subnet truncation occurs.

In non-production direct development only, an actual direct peer of canonical `127.0.0.1` or `::1` is accepted and forwarding headers are ignored unless a trusted-ingress test configuration is explicit. In production, missing direct-peer provenance, missing configured client header behind a trusted ingress, untrusted ingress, or any ambiguous/noncanonical address returns generic `503 {error:{code:"verification_temporarily_unavailable",message:"Verification temporarily unavailable"}}` before rate mutation or token lookup. Public HTML renders the equivalent generic 503 page.

Exact configuration ownership is `OSSUM_TRUSTED_INGRESS_CIDRS` (non-empty canonical CIDR list), `OSSUM_TRUSTED_FORWARDING_HEADER` (`forwarded|x-forwarded-for`), and the deployment adapter supplying direct-peer provenance. Startup fails closed on invalid/overlapping/unspecified production trust configuration. `knowledge/runbooks/REMITO_PUBLIC_PROXY_TRUST.md` must document each environment's ingress CIDRs, overwrite rule, direct-peer adapter, spoof test, rotation, emergency disablement, and evidence owner; no provider is selected by this design.

Raw IP exists only long enough to compute `HMAC-SHA-256(rateKeyring[keyDate], UTF8("OSSUM-RATE\0") || canonicalNetworkAddressBytes)` and is then discarded. Daily keys are independent, at least 32 bytes, retained at most 30 days. `sourceFingerprint` is lowercase 64-hex.

Before expensive token lookup, one PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE` keyed by `(sourceFingerprint,keyDate)` atomically (a) preserves/enforces an existing `blockedUntil`, (b) resets `windowStartedAt/checks/invalidChecks` when the UTC minute changes, or (c) increments `checks`; invalid outcome performs a second atomic increment and sets `blockedUntil` when the threshold is reached. Defaults: 60 checks/minute/source, 10 invalid/minute/source, 15-minute block. Config bounds are checks `1..600`, invalid `1..checks`, block minutes `1..1440`; startup fails closed outside bounds. Insert sets immutable `firstSeenAt=now` and `expiresAt=now+29 days`; conflict updates never extend `expiresAt`.

An owned scheduler calls the dedicated maintenance route at least hourly; `src/lib/remito-verification/rate-retention.ts` deletes `expiresAt<=now` atomically, emits count/oldest-age telemetry, and alerts/fails the retention gate if any row approaches 30 days. The scheduler secret is independent, at least 32 random bytes, accepted only in Authorization, timing-safe checked, redacted, and never cookie-accessible. Deployment is blocked until scheduler ownership, missed-run alert, emergency purge runbook, and a read-only proof query showing no row age `>=30 days` all PASS. Daily successful metrics atomically upsert only `{companyId,day,channel="public_qr",result}` counts; invalid unknowns are bounded global counters, not indefinite request rows.

AuditEvent permanently records issuance/rotation/revocation/replacement and authenticated resolve/view allow/deny. Denied/unknown scans use nullable entityId and `correlation=hex(HMAC-SHA-256(auditCorrelationKeyring[keyDate], UTF8("OSSUM-SCAN-AUDIT") || 00 || UTF8(selectedCompanyId) || 00 || UTF8(normalizedRM1)))`; the independent daily key is retained at most 30 days. This is never a fabricated Remito ID. Public successful checks are metrics, not AuditEvent rows. No raw IP, locator, token/nonce/hash, referrer, user-agent, or sensitive query data enters audit.

This wording intentionally matches the amended Change Pack §7: authenticated internal resolve/view and lifecycle/action attempts/results use AuditEvent; successful public verification uses aggregate metrics; bounded public abuse telemetry uses only the rotating HMAC source fingerprint. The previous implication that every public check required an AuditEvent is rejected and the audit contradiction is resolved.

## 12. Flags, cohort, compatibility, backfill, rollback

Flags default off and depend in this order:

1. `remitoLocatorIssuanceWrites` requires approved schema/SQL constraints, keyrings, origins, and issuance tests.
2. `remitoInternalScanRead` requires locator issuance plus Auth/company-selection and contextual-guard PASS.
3. `remitoPublicPublicationWrites` requires publication/access lifecycle and issuance PASS; it controls new publication/rotation/revocation writes, not compatibility reads.
4. `remitoPublicCompatibilityRead` requires publication/access, trusted-address rate/retention, proxy/page/API headers/redaction, and public security PASS.
5. `remitoPrintCodes` requires all prior flags, both callers migrated, print QA, and **every issued Remito in the enabled cohort** having a complete current locator/publication/access.

The cohort is explicit server configuration (`issuedAt >= cohortStart` plus approved company IDs). Activation runs a read-only completeness gate and fails if any eligible row lacks codes. Existing earlier issued Remitos remain legacy and cannot receive code-bearing print unless either (a) a separately approved transactional idempotent backfill completes for all of them, or (b) Franco approves an exact legacy omission exception. Neither backfill nor exception is included here. Backfill must be a future T3 Change Pack with deterministic eligibility, per-Remito transaction, idempotent “already complete” result, collision retries, audit, dry-run/count reconciliation, and rollback-by-flags—not deletion.

Every successful print-code projection records permanent `remito.print_codes_distributed` AuditEvent evidence in the same company/Remito transaction boundary before returning assets. Startup checks this evidence. Before the first distribution, compatibility read may be disabled. After any distribution, `remitoPublicCompatibilityRead=false` is invalid configuration: the deployment gate rejects it and the runtime effective value is forced `true` with a critical alert, so the compatibility verifier stays available. Operators cannot use a feature flag to erase printed-document semantics.

Rollback may disable, in order, `remitoPrintCodes`, `remitoPublicPublicationWrites`, `remitoInternalScanRead`, and `remitoLocatorIssuanceWrites`, stopping new prints/publications/internal scans/issuance. It MUST NOT disable the minimal public compatibility page/API once distribution exists. That verifier, trusted-address/rate controls, exact DTO statuses `valid|replaced|revoked|invalid`, required proxy/API headers, lifecycle records, token hashes, metrics, retention job, and keys needed by current printable accesses remain operated for as long as records/keys are retained. Rollback does not mass-revoke valid accesses; revocation remains an explicit audited security/domain decision. Browser printing may continue only without new code projection when its cohort flag is off, and previously distributed paper remains compatible.

## 13. Phased exact file allowlists and locks

### T21 bounded DEV amendment (2026-08-12)

The previously intentional absence of a flag/config file blocked T21. The approved bounded DEV deviation adds one pure, injected activation gate at `src/lib/remito-verification/activation.ts`, one focused unit test, and minimal composition edits to issuance, internal scan, public compatibility/lifecycle, and print-code boundaries. This does not add environment parsing, real configuration, secrets, database execution, mutation, deployment, or production activation.

The gate accepts only explicit `{ flags, cohort: { companyIds, cohortStart } }`; missing or invalid configuration resolves to all flags off. Dependencies are monotonic in the exact §12 order. Issuance and print require both company membership in the configured cohort and `issuedAt >= cohortStart`. An injected distributed-evidence reader forces the effective compatibility-read flag on after evidence; reader failure conservatively assumes evidence. The injected completeness repository exposes a read-only count contract but the gate executes no database query itself.

1. **Containment complete:** `src/app/remitos/page.tsx`; `src/lib/remito-print-template.ts`; `src/app/api/companies/[companyId]/remitos/[remitoId]/pdf/route.tsx`; `src/__tests__/unit/remito-print-template.test.ts`; `src/__tests__/unit/remito-pdf-route-disabled.test.ts`.
2. **Vector proof complete:** `knowledge/specs/REMITO-QR-BARCODE-001/RM1-VECTORS.md` is independently sealed at SHA-256 `3171d9ee5090eef38c0aac483e992d558529f313886e790e88380cbaf8b71f17`. Downstream tasks must bind these exact bytes; any change re-blocks them.
3. **Persistence/issuance, only after vector seal and frozen tasks:** `prisma/schema.prisma`; `prisma/migrations/20260811000000_remito_qr_barcode_001/migration.sql`; `src/lib/remito-identifiers.ts`; `src/lib/remito-verification/fingerprint.ts`; `src/lib/remito-verification/token.ts`; `src/lib/remito-verification/repository.ts`; `src/lib/services/remito.service.ts`; `src/__tests__/unit/remito-identifiers.test.ts`; `src/__tests__/unit/remito-verification-fingerprint.test.ts`; `src/__tests__/unit/remito-verification-token.test.ts`; `src/__tests__/unit/remito-issuance-retry.test.ts`; `src/__tests__/integration/remito-verification-persistence.test.ts`.
4. **Internal read-only scan/Auth:** `src/lib/api/identity-context.ts`; `src/lib/api/auth-context.ts`; `src/lib/api/guards.ts`; `src/lib/api/remito-scan.ts`; `src/lib/services/remito-scan.service.ts`; `src/lib/validators/remito-scan.ts`; `src/app/api/me/companies/route.ts`; `src/app/api/remitos/scan/resolve/route.ts`; `src/components/auth/AuthProvider.tsx`; `src/components/auth/CompanySelector.tsx`; `src/app/remitos/scan/page.tsx`; `src/app/remitos/scan/[remitoShortCode]/page.tsx`; `src/components/remitos/RemitoScanWorkspace.tsx`; `src/__tests__/unit/remito-scan-service.test.ts`; `src/__tests__/unit/remito-scan-route.test.ts`; `src/__tests__/components/RemitoScanWorkspace.test.tsx`; `src/__tests__/components/AuthCompanySelector.test.tsx`.
5. **Public verification/lifecycle/CSP/trusted ingress:** phase-3 schema/migration only; `src/proxy.ts`; `src/lib/security/trusted-client-address.ts`; `src/lib/security/trusted-client-address.config.ts`; `src/lib/remito-verification/service.ts`; `src/lib/remito-verification/rate-limit.ts`; `src/lib/remito-verification/rate-retention.ts`; `src/lib/remito-verification/metrics.ts`; `src/app/api/public/remito-verifications/[token]/route.ts`; `src/app/verificar/remito/[token]/page.tsx`; `src/app/api/companies/[companyId]/remitos/[remitoShortCode]/verification/rotate/route.ts`; `src/app/api/companies/[companyId]/remitos/[remitoShortCode]/verification/revoke/route.ts`; `src/app/api/internal/maintenance/remito-verification-retention/route.ts`; `knowledge/runbooks/REMITO_PUBLIC_PROXY_TRUST.md`; `src/__tests__/unit/remito-public-proxy.test.ts`; `src/__tests__/unit/remito-public-page-nonce.test.tsx`; `src/__tests__/unit/remito-public-api-headers.test.ts`; `src/__tests__/unit/trusted-client-address.test.ts`; `src/__tests__/unit/remito-public-verification.test.ts`; `src/__tests__/unit/remito-verification-rate-limit.test.ts`; `src/__tests__/unit/remito-verification-retention.test.ts`; `src/__tests__/integration/remito-trusted-ingress.test.ts`; `src/__tests__/integration/remito-public-verification.test.ts`; `src/__tests__/e2e/remito-public-verification.spec.ts`.
6. **Print codes:** `src/lib/code128.ts`; `src/lib/remito-print-template.ts`; `src/lib/services/remito-print-code.service.ts`; `src/lib/api/remito-print-codes.ts`; `src/lib/api/remitos.ts`; `src/app/api/companies/[companyId]/remitos/[remitoShortCode]/print-codes/route.ts`; `src/app/remitos/page.tsx`; `src/components/expediente/RemitosPanel.tsx`; `src/components/expediente/LogisticaTabContent.tsx`; `src/__tests__/unit/code128.test.ts`; `src/__tests__/unit/remito-print-code-service.test.ts`; `src/__tests__/unit/remito-print-template.test.ts`; `src/__tests__/components/RemitosPage.test.tsx`; `src/__tests__/components/RemitosPanel.test.tsx`; `src/__tests__/e2e/remito-print-codes.spec.ts`.
7. **Deferred mobile actions/backfill:** empty allowlist; each requires a separate Change Pack. Existing `/state` and `/devolucion` are forbidden.
8. **T21 DEV activation gate:** `knowledge/specs/REMITO-QR-BARCODE-001/DESIGN.md`; `knowledge/specs/REMITO-QR-BARCODE-001/TASKS.md`; `src/lib/remito-verification/activation.ts`; `src/__tests__/unit/remito-verification-activation.test.ts`; and minimal composition edits in `src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts`, `src/app/api/remitos/scan/resolve/route.ts`, `src/app/api/public/remito-verifications/[token]/route.ts`, lifecycle rotate/revoke routes, `src/app/api/companies/[companyId]/remitos/[remitoShortCode]/print-codes/route.ts`, `src/lib/services/remito-print-code.service.ts`, plus focused existing test composition updates required by default-off behavior.

The allowlists above are literal; additions require re-review. The migration name is reserved design intent and must be re-frozen if its timestamp changes before approval. Exclusive locks: vector artifact during proof/seal; schema+migration; Remito issuance service; Auth/guards/AuthProvider; `src/proxy.ts` plus trusted-ingress configuration/runbook; each API/service/validator chain; both sensitive print callers plus Ficha mapping/template; Cajas/Surgery projection queries. One writer, `reserved→editing→review→released`; no parallel schema/Auth/proxy/tenant/Remito/Cajas edits.

## 14. Verification evidence

- Unit: sealed RM1/RF1 vectors, normalization rejection, token/key retirement, Code128 vectors/patterns/dimensions, exact DTO keys/order/nulls.
- Integration: composite tenant FKs, SQL checks/triggers, immutable/delete denial, monotonic/current constraints, named-locator P2002 vs unrelated P2002, independent P2034 budgets, whole-transaction regeneration/rollback, atomic rate races/purge age.
- Route/security: identity-first ordering, multi-company 409, membership denial before locator handling, uniform 404, roles, issued-only print, lifecycle gating, exact route-owned API headers, exact proxy matcher exclusions, unique request/response nonce equality, forced dynamic public page reading `x-nonce`, CSP enforcement, no token-bearing internal HTTP/logs.
- Trusted address: trusted/untrusted direct peers, CIDR boundaries, ingress overwrite contract, XFF/Forwarded canonical IPv4/IPv6 vectors, mapped-IPv6 collapse, duplicate/list/zone/port/noncanonical rejection, development loopback, generic pre-lookup 503, spoof runbook evidence.
- Component/browser/mobile: camera/manual/a11y/offline states; both actual print callers; draft exclusion; absolute QR origins; QR/Code128 physical scans and dimensions; raw-ID/token regression scans.
- Rollout: tasks bind sealed vector artifact hash; any vector drift blocks approval/apply; flag dependency and cohort completeness dry-run; distributed-evidence forces compatibility read on; rollback stops writes/print/internal scan while valid/replaced/revoked/invalid compatibility remains; legacy blocked without approved exception; independent Product/Domain + Security PASS.

## 15. Rejected alternatives and blockers

Rejected: existing `R-####`, raw IDs, JWT/public claims, encrypted raw token, non-reprintable random hash-only token, DigitalReceipt entity reuse, per-bulto identity, React-PDF activation, in-memory-only rate limits, AuditEvent per public request, generic Remito print DTO, new Code128 dependency, and initial delivery/return wiring.

The vector proof is complete and independently sealed. TASKS may now be generated only if they bind artifact SHA-256 `3171d9ee5090eef38c0aac483e992d558529f313886e790e88380cbaf8b71f17`. Remaining blockers are: finite T3 approval for five models plus nullable AuditEvent.entityId and named SQL migration/triggers; token/rate/audit keyrings and origins; Auth multi-company representation; contextual Surgery/Caja guards; `TrustedClientAddressResolver`, trusted-ingress CIDRs/direct-peer adapter and runbook evidence; sensitive Next.js 16 proxy nonce boundary; scheduler/retention alert; ingress/proxy token log redaction; compatibility-read operational commitment; cohort/backfill or exact legacy decision; independent implementation-envelope review PASS. No new package is required or authorized.
