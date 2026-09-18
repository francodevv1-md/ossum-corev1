# Design: Additive Ezequiel DEV Fixtures and Productive Inbox QA

## Approach and Decisions

Use the setup-only DEV service/CLI and authenticated productive `/coordinadores/mi-bandeja`. Preserve schema, Auth, APIs/services/permissions, bootstrap, preview, `useCoordinationView`, Remitos, and general rules. Productive edits remain limited to `CoordinatorInboxView.tsx`, `coordination-filtering.ts`, `surgery-adapter.ts`, and specific tests.

| Choice | Rejected | Rationale |
| --- | --- | --- |
| Frozen UUIDv5 Surgery identities | Runtime/random/company-derived IDs | Independent, PII-free, globally unique authority. |
| Inert DEV diagnostic from authorized `source`/`notes` | Generic inference/API field/store injection | Exact fixture transport only. |
| Conjunctive component acceptance | Checksum-only ownership | Identity, context, DB ownership, evidence, and bytes must agree. |

## Frozen A–H Identity Authority

No project UUIDv5 utility exists; installed `uuid@11` already supports `import { v5 as uuidv5 } from "uuid"`. Use standard URL namespace `6ba7b811-9dad-11d1-80b4-00c04fd430c8` and these ordered exact names:

`urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:A`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:B`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:C`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:D`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:E`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:F`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:G`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:H`.

Before APPLY, a pure generator/reviewer task must pin in TASKS: algorithm `UUIDv5/SHA-1`, namespace, all eight names/resulting lowercase UUIDs, and SHA-256 of fixed-order minified UTF-8 JSON `{algorithm,namespace,entries:[{stableKey,name,surgeryId}]}`. Any change requires new Franco approval.

These UUIDs are synthetic Surgery PKs, not company/user/contact IDs. T0b queries them globally and requires all eight absent; any preexisting ID is a collision, causes zero writes, is never adopted, and stops for approval. The overlay transaction alone creates them explicitly.

B00 remains the unchanged 21/8/8/5 authority, digest `c2221aa29cafa0cb0594da5b2a0638a892fc20ac9a9f50db9ff0929ec7d51782`. Sequence remains `T0a → T1/T2 → independent T3 GO → T0b read-only → runtime`; T0b PASS/FAIL writes only out-of-chain attestation.

## Exact DEV Envelope and UI Acceptance

The writer stores canonical `Surgery.notes` bytes: `{schemaVersion,package,stableKey,surgeryId,cxName,company,target,baselineDigest,idAuthorityDigest,matrixDigest,metrics,availabilityDate,pending,checksum}`; `source` must equal reserved `coord-ezequiel-qa-002:A..H`. Company/target carry runtime IDs and exact DEV labels but are never compiled into UI code. Prepared authority pins each exact backend Surgery ID ↔ stable key ↔ source ↔ canonical envelope bytes ↔ envelope SHA-256 ↔ expected matrix entry.

`surgery-adapter.ts` interprets this only behind `process.env.NODE_ENV === "development"`; otherwise it returns no facts. It validates canonical bytes, v1, checksums, frozen backend ID/key/source, authority/matrix/baseline digests, and allowed values, producing an inert adapter-local diagnostic. No generic source/notes inference.

Existing context is sufficient without hook/API edits: `useAuth()` provides active company; controller/response provide mode, surface, accepted context, and resolved subject. `CoordinatorInboxView.tsx` independently requires development, productive/personal (never preview/global), current accepted context, exact marker company, exact Ezequiel contact/label, exact assignment to that contact, and the complete frozen identity/envelope/matrix match. Otherwise it ignores facts, renders no category, and emits only fixed sanitized code plus A–H key. Only frozen UUIDs/digests—not dynamic tenant/contact IDs—may be DEV-gated constants.

A–H remain active under existing assignment/bucket eligibility. `coordination-filtering.ts` uses direct A–H metric memberships only after this accepted diagnostic; authorization, tenant/subject filtering, base eligibility, AND, dedupe, and non-overlay predicates remain unchanged. E–H have no metric memberships; pending is orthogonal; H has no control.

## Ownership, Evidence, Cleanup

Prepared manifest pins the eight UUIDs and ordered `{stableKey,source,canonicalEnvelopeBytes,sha256}` plus aggregate identity/matrix/fixture digests before DB work. Create rechecks global absence, then records exact company ownership, assignment, manifest, and operator audit. Applied evidence repeats observed IDs/digests. Acceptance requires exact DB PK/key/bytes, company, Ezequiel assignment, applied manifest, and audit; checksum alone never proves ownership.

No-op/reconcile/cleanup compare exact IDs, ownership, assignments, audits, and DB bytes to prepared/applied evidence. Any collision or later byte/owner drift blocks the whole operation; cleanup performs zero partial delete. Existing Serializable boundaries, LockStore, immutable chain, and independent 21/8 restoration remain.

## Tests, Build Gate, Files

Tests cover pure UUIDv5 reproducibility/pinned digest, global collision/no-adopt, envelope/context negative matrix, production-mode inert parser, active memberships, E/F/G/H, manifest/audit/byte tamper, cleanup zero-delete, and SC-01–11/REQ-01–10. After focused tests run exact `npm run build`. Inspect emitted production client/server bundles, source maps, and manifests for package marker, envelope version, A–H names/UUIDs, authority/matrix digests, and diagnostic/parser symbols. Production client occurrences must be zero; unexpected retained server/app code also fails. If Next DCE retains synthetic code, stop and redesign—never waive.

The existing eleven-path lock remains sufficient: overlay service/CLI/unit/integration/E2E/component test; three productive files; filtering and adapter tests. `uuid` is already installed; no package/type/API file is needed. Migrate the partial delta by replacing random Surgery IDs, prior finalization/eligibility flags, preview discovery, and unanchored notes. T3 reviews all before T0b. No schema/data migration; manifest cleanup restores created overlay. Ready for independent re-review and TASKS pinning/amendment.
