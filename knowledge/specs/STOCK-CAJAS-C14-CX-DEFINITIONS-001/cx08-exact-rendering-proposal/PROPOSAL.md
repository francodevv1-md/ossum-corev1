# CX08 Exact Rendering Proposal — CCT1 Refresh Candidate

Status: **CANDIDATE / INDEPENDENT REVIEW REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This directory is the refreshed byte-exact CX08 documentary rendering for the fixed 11-object inventory: three CHECKs, four functions, and four ordinary triggers. It incorporates only approved `CX08-MD01`, `CX08-MD02`, and `CX08-MD03` through the indivisible `CX08-CCT-1` design and preserves `dbObjectDelta=0`.

Every `.sqlfrag` is review text only. This package is not a migration, runner input, schema change, database instruction, authority root, implementation, deployment asset, or production approval. No fragment may be executed. Independent review and the Change Pack's later exact-byte adoption gate remain mandatory.

## 2. Exact authority bindings

| Parent | Exact binding and use |
|---|---|
| C13 | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`; physical relations, columns, enums, FKs, and unique/index structure only. |
| Canonical P01–P19 | Blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; fixed CX08 identities, P16-B, U01-A, U02-A, and P19 wrappers/capacity. |
| Binding A–D | Blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; stable-parent serialization and retry lineage. |
| J1/P3/integrated D3 | Blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; immutable evidence algebra and correlated reservation rules. |
| TEI / DT | Blobs `237c7c5e18e4a3cf22d223c3d77b117efa400014` / `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947`; diagnostics and canonical dependency targets/order. |
| Approved CX08 semantics | `CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md`, blob `714f7a14c0095de4f014375f5f09418170ac568e`, 82064 bytes, raw SHA-256 `eff3b6c5507f17e5e1f76cad738bf2a9abc8dc01dae1250a0a855d1ccd677fa7`; exactly `CX08-MD01..03`. |
| Approved rendering topology | `RENDERING_TOPOLOGY_SPLIT_ADDENDUM.md`, blob `8f822836e8a4d14140dc2eb77e77f8ca996d024b`; CX08 equations and sole C→B generated-object edge. |

No failed CX07 root, blocked CX08 root, current/latest lookup, inferred fourth decision, or future successor root is an input.

## 3. Approved MD01–MD03 rendering

### 3.1 MD01 — atomic reservation assignment correlation

`WCB-03` owns exactly `reservationRoot → reservationEvidence → reservationCorrelation`, with contracts `ISW-CX08-01`, `ISW-CX08-02`, and `ISW-CX11-01`. Reservation root/event are future rows, never anchors. The exact transactional prefix is C13 `AuditEvent → OperationalCommandAcceptance`; final validation then proves the inserted root, `RESERVE/sequence=1/replacesEvidenceId=null` event, correlation, assignment, position, identified unit, quantity/unit/scale, source checkpoint, command/result identity, and positive-live R-A coexistence before commit. Failure rolls back the complete command.

The SQL objects do not invent a deferred correlation object or claim that an ordinary BEFORE trigger can see a future correlation. They retain local row, position, sequence, fold, and ceiling guards beneath the application-owned complete-command contract.

### 3.2 MD02 — paired APPLY_TO_DISPATCH command

`WCB-06` owns exactly seven sections in order: `stockEvidenceHeader → stockEvidenceLines → reservationEvidence → dispatchHeader → dispatchLines → reservationEffect → stockEffect`. Its contracts are `ISW-CX07-01`, `ISW-CX08-02`, `ISW-CX06-01`, and `ISW-CX12-05`. The reservation event is one `APPLY_TO_DISPATCH` with null replacement; Stock and dispatch line sets are nonempty bijections; totals, Article, position, unit, scale, scalar trace, result, command, and authoritative time agree; and exactly two effects target the reservation event and Stock header. Any partial, duplicate, extra, out-of-order, or mismatched payload rolls back AuditEvent, acceptance, and every domain row.

The ceiling function keeps APPLY as a subtraction and relies on the approved atomic command/final-state validator for the paired event/effect/result proof. It adds no fourth effect, helper object, or database-wide writer claim.

### 3.3 MD03 — accepted-time trace mapping

Fragment 7 now derives eligible physical evidence through an exact `traceLine` relation:

- `ORIGINAL` and `CORRECTION` use the effective referenced position `COALESCE(fromPositionId,toPositionId)` at the owning evidence `acceptedAt`.
- `NONE` requires position lot/unit null and all four line snapshots null.
- `LOT` requires lot only, `StockLot.acceptedAt<=acceptedAt`, its primary `StockLotObservation.observedAt<=acceptedAt`, exact display lot code, null-safe expiration equality, and null serial/identified snapshots.
- `IDENTIFIED_UNIT` requires unit only and selects the unique greatest eligible `StockIdentifiedUnitConfigurationVersion` by `(effectiveAt,versionNumber,id UTF-8)` where both effective and accepted time are `<=acceptedAt`; code/serial snapshots match and lot/expiration are null.
- `CORRECTION` preserves Article, reservation, unit, scale, source line, and both position IDs and must pass the child-time trace arm.
- `REVERSAL` performs no current trace lookup and preserves quantity and all base snapshots null-safely while reversing the approved position direction.
- A base is suppressed only by one total child with nonempty equal counts, exact line-number bijection, no extras, and complete J1 pair correspondence. Invalid or partial adjustments do not suppress it.

The three new unique physical relation dependencies are `public.StockLot`, `public.StockLotObservation`, and `public.StockIdentifiedUnitConfigurationVersion`.

## 4. Complete CCT1 command, authorization, audit, and anti-bypass closure

The exact active command profile is inherited byte-for-byte from blob `714f7a14...` and is bound here rather than redefined:

- 9 payload schemas; 10 manifest entries; 8 physical relations; 18 contracts; 11 bundles.
- `completePayloadSha256` uses `C14-WRITER-COMMAND-PAYLOAD-CX08-CCT1`, closed row CJ1 bytes, row hashes, ordered contracts, ordered sections, relation/cardinality/schema hashes, and envelope/result identity.
- authorization occurs before transaction creation and binds actor, company, exact bundle/contracts, RegistryV4, ScannerV2, contract set, bundle set, and permission evidence. DENY or unavailable proof is `C14_COMPANY_DENIED/403/attemptCount=0`.
- one company is byte-identical across envelope, authorization, anchors, inserted/reread rows, transactional AuditEvent, acceptance, result, and response.
- RegistryV4 fixes 18 private contract writers plus 3 guarded writers = 21 physical-relation writers; 11 route bundle owners plus 18 non-route contract owners = 29 command entrypoints; one shared wrapper; three adapters; one DB constructor.
- ScannerV2 proves zero writer exports/imports, zero production imports of non-route owners, all 29 owners lead directly to the wrapper, relation DML occurs only at registered private writers, raw SQL only at the three adapters, one private transactional AuditEvent materializer, and no dynamic lookup/client/capability escape.
- the in-memory capability is unexportable, nonserializable, frozen, TransactionClient-bound, attempt-bound, and single-use; `finally` invalidates it.

Exact transaction order is: parse/closed schema/CJ1/hash/manifest → payload closure/cardinality/cross-reference arithmetic → authorization → durable `ATTEMPT_STARTED` → fresh READ COMMITTED transaction → existing-anchor derivation → ordered `FOR UPDATE NOWAIT` locks → reread → service fields and one `transaction_timestamp()` → all non-DML prevalidation → transactional C13 AuditEvent first → OperationalCommandAcceptance second → selected manifest sections in order → forced deferred checks → final validation/reread → commit. No savepoint, partial commit, nested/ambient transaction, DML before proof/acceptance, or post-commit repair is valid.

The AuditEvent owner is the private `materializeC13AuditEvent` declaration in `private-writer-runtime.ts`; it is not a 19th contract writer. Accepted fields, metadata, policy/registry/scanner hashes, acceptance back-reference, and authoritative timestamp are exact. Durable attempt audit remains a separate channel; no durable sink/provider is authorized by this package.

## 5. Canonical hashes, inventories, tests, and successor DAG

| Binding | Exact value |
|---|---|
| payload schema set | `e04fcbbfb019b590ab113a253e30be229cee119f769b7792197d413e0f23119f` |
| payload manifest set | `d9685f05cc5da234219b4d5c82cd0e48e2c1527c6a91a01d9ed9c467395cb13b` |
| contract set | `4b838af8fc5c64add65d09b381114811d57f92c1f1600da2c412dd86f488baf9` |
| bundle set | `206b1fb502083ddf1fdfa6329ccaa4e0af82751b7d6295f411ce24bfc50898b4` |
| union inventory V2 | `818d2bcfb14685a45921de2370eb31a48138d52b9bd0566a5d414dbf8f1087d2` |
| contract/bundle binding sets | `53eeba1fd9b888b0b5e290b35d3220b702acd4b1e9bfe9073b1ad020376e29e6` / `47614096f77b28ede3dbd142b66c29d601d471e3ee91c5a41cbd1d2706739d35` |
| WriterRegistryV4 / ScannerInputV2 | `52f8755d9bc2385f03dc0699c33e41f66e637e64adf6d8f5495d68ec6a4c2c47` / `69b3458e5d1390ef8ae87f32a0202465276c209b449cd1fc0a24e9f930493d4a` |
| policy set | `406b08dbaf852e9c9752a5ef8a7fdd52602cf0cd8977440b3f17358e541dd188` |
| profile/root bindings | `5d26199493daeb2c5018edc4f7ad7942751aa2116c2320b5518a17a186c1d1f1` / `f3fc2a574fc53751b29769260d543766d66d8ffb64aee735f2d8bbad079aebcf` |

The finite test inventory is 44 bundle tests `CX08-CCT-T01..T44`, 12 policy tests `CX08-CCT-P01..P12`, 144 active contract tests, and 134 active bundle tests. T01–T44 cover scalar/closed-schema/CJ1/hash boundaries; all schema/manifest/contract/bundle/set preimages; WCB-03 and WCB-06 happy paths and rollbacks; anchors; AuditEvent/acceptance ordering and identity; trace times and tie-break; adjustment bijection; RegistryV4/ScannerV2; both audit channels; counts; forbidden topology IDs; and the complete successor cascade.

The 25 standalone CCT1 hash domains are exactly the approved union inventory; payload schema row/set; payload manifest entry/set; contract row/set; bundle row/set; policy row/set; authorization proof; insert and bundle semantic keys; complete payload; anchor proof; contract and bundle binding sets; WriterRegistryV4; ScannerInputV2; accepted AuditEvent value and metadata; durable attempt V3; profile binding; and root binding domains. Their exact literals/preimages/order are those in blob `714f7a14...`; no convenient reserialization is permitted.

Exactly 20 downstream domains advance from ISW2 to `ISW3-CX08CCT1`: three profile domains, three fragment-inventory domains, two staged/materialized artifact-set domains, three root domains, six catalog request/query/snapshot/selection/overlay/transition domains, and the independent-PASS, Franco-approval, and final-envelope domains. The BS1 parent and unchanged proposal/object/row/fragment-byte/semantic-evidence frontier remain byte-identical.

The successor DAG remains: immutable parents → schema/manifest/contract/bundle rows and sets → union and binding sets → RegistryV4 → ScannerV2 → policies → profile binding → root binding → approved addendum → design PASS/approval → corrected CX07 plus applicable semantic seal/topology → successor profile → staged root → root PASS → root approval → final envelope → materialized roots → regenerated CX08 package. No node contains itself or downstream evidence.

## 6. Exact object, event, dependency, and error inventories

| Ordinal | Object ID | Owner |
|---:|---|---|
| 1 | `check:ck_sr_scope_key` | `public.StockReservation` |
| 2 | `check:ck_sre_qty_positive` | `public.StockReservationEvidence` |
| 3 | `check:ck_sre_scale` | `public.StockReservationEvidence` |
| 4 | `function:fn_stock_reservation_append_only` | `public.StockReservation` |
| 5 | `function:fn_stock_reservation_evidence_append_only` | `public.StockReservationEvidence` |
| 6 | `function:fn_stock_reservation_position_guard` | `public.StockReservation` |
| 7 | `function:fn_stock_reservation_ceiling` | `public.StockReservationEvidence` |
| 8 | `trigger:trg_stock_reservation_append_only` | `public.StockReservation` |
| 9 | `trigger:trg_stock_reservation_evidence_append_only` | `public.StockReservationEvidence` |
| 10 | `trigger:trg_stock_reservation_position_guard` | `public.StockReservation` |
| 11 | `trigger:trg_stock_reservation_ceiling` | `public.StockReservationEvidence` |

Events remain exactly 8: append-only root UPDATE/DELETE; append-only evidence UPDATE/DELETE; position INSERT/UPDATE; ceiling INSERT/UPDATE. Every U02-A UPDATE has `updateColumns=null`. Writes remain zero.

Dependencies are exactly 14 unique edges: four trigger `EXECUTES` generated-function edges; position guard `READS` StockPosition and StockIdentifiedUnitOccupancy; ceiling `READS` StockEvidence, StockEvidenceLine, StockIdentifiedUnitConfigurationVersion, StockLot, StockLotObservation, StockPosition, StockReservation, and StockReservationEvidence. DT order is `EXECUTES` before `READS`, then source ordinal, target-kind rank, and target UTF-8 bytes.

Raised sites remain exactly four TEI R0001 sites, one per function. Native CHECK failures have no TEI trigger binding. Explicit guard routing remains TRUE accept / ELSE reject; UPDATE in the ceiling guard remains the approved no-op return branch.

## 7. Capacity, topology, and detached root

Final fragment LF counts instantiate the approved topology as follows:

| Child | Ordinals | Fragment LFs | P19 lines | Margin |
|---|---|---:|---:|---:|
| `C14-18A` | 1–6, 8–10 | 116 | `13+116=129` | 221 |
| `C14-18B` | 7 | 273 | `5+273=278` | 72 |
| `C14-18C` | 11 | 4 | `5+4=9` | 341 |

The prior zero-margin function rendering was redistributed through formatting-equivalent statement consolidation while adding the accepted-time trace CTE. No object was split, renamed, added, removed, or paired differently. Under dependency direction `fromObject → toObject`, the sole cross-child generated-object edge remains C→B: `C14-18C/trigger:trg_stock_reservation_ceiling → C14-18B/function:fn_stock_reservation_ceiling/EXECUTES`. Edges 8→4, 9→5, and 10→6 remain internal to A.

Every file is UTF-8/NFC, LF-only, without BOM/NUL/CR/trailing horizontal whitespace, and has exactly one terminal LF. `hashes.sha256` contains 13 ordered data lines: proposal, 11 fragments, manifest. The detached root is `SHA256(ASCII("CX08-EXACT-RENDERING-PROPOSAL-ROOT-V1") || NUL || exact 13 data lines)`; its final comment is excluded. Fragment seals use `SHA256(ASCII("C14P-OBJECT-BLOCK-V2") || NUL || fragmentBytes)`.

## 8. Review and approval boundary

Independent review must recompute every byte identity, raw/V2 hash, LF/byte count, canonical manifest field, ledger line, detached root, object/event/dependency/error/branch inventory, MD01–MD03 mapping, RegistryV4/ScannerV2 binding, transaction/AuditEvent sequence, tests/domains/DAG, C→B edge, and all three capacity equations. It must also prove no path outside this 14-file package changed by this stage.

This candidate is not PASSed, adopted, or sealed. The reviewer owns the verdict; Franco's later exact-byte gate owns adoption. This package grants no SQL execution, migration, schema, database, Prisma, runtime implementation, dependency, Git staging/commit/publication, deployment, staging, production, or destructive authority.
