# C14 Topology Amendment Change Pack

Status: **APPROVED DOCUMENTARY TOPOLOGY — NON-EXECUTABLE**
Change ID: `STOCK-CAJAS-C14-TOPOLOGY-AMENDMENT-001`
Risk: **T3 — migration architecture and canonical persistence topology**
Mode: **docs/design only; non-executable**

Preparing or approving this topology is **not migration authoring or execution authority**. This Change Pack creates no authority to generate, accept, write, stage, or execute migration SQL; access a database; or begin C14 implementation. Franco authorized preparation in Engram #4723 and substantively approved the four documentary decisions in §6 on the independently reviewed draft blob `a89c1a5a619766d302e0c436dad65cc3491b36b6`; Engram #4728.

## 1. Purpose and amendment boundary

This documentary amendment updates the approved C05/C14 topology in C05 design #4324 revision 3 and approval closure #4329 to the final accepted C13 chain `S00..S24`. It preserves all prior fail-closed, immutable-history, transaction, review, provenance, no-backfill, no-hand-pruning, and non-transitive-authority controls except where this document explicitly corrects topology, snapshot count, customized-child attachment, baseline derivation, and stale forecasts.

The old topology is obsolete:

- old: `S00..S23`, 23 Prisma-structural children (PS), 13 customized-SQL children (CX), and two evidence gates;
- final: `S00..S24`, **24 PS + 13 CX = 37 migration-bearing children**, plus `C14-00` and `C14-38` evidence gates, **39 C14 children total**.

No blanket execution approval is requested or granted.

## 2. Authoritative final C13 binding

| Evidence | Exact identity |
| --- | --- |
| Final C13 commit | `0faf2f55e178f1b111c5ae108380a505a68c8feb` |
| Parent commit | `609aea48ccc6910aa864b09f324030f06010d4aa` |
| Final tree | `a967f808fdc0a7662d7ce45b472301422210038a` |
| Final schema blob | `47313a8a85ac71ac56df93ce212593820cb95a13` |
| Final C13 Change Pack blob | `91163a28ef3992898a99b89b06cd0811aefe7492` |
| Final worklog blob | `5e2915e33761a1d7715f9a88f80e7c422a9e0063` |
| Canonical migration tree | `5c6e4b9e6e4e7fd5a632d3fb68a2dc161f62ad9c` |
| Canonical migration truth | Exactly 18 immutable migrations; zero Stock/Cajas objects |
| Final inventory | 50 models / 20 enums / 206 FKs / 159 inverses / 151 uniques / 63 indexes |
| Closure evidence | Engram #4720 |
| Independent final verification | Engram #4721 — PASS |

Any stale or missing hash, non-linear snapshot, different canonical migration count/tree, or Stock/Cajas object found in canonical migrations invalidates this amendment and stops all downstream preparation.

## 3. Baseline correction: provenance is not replay truth

`S00` commit `02a50044d879248236805bb47b5782845a5f5bd8` and schema blob `a92e6c2a42b70685e8d2e9076313f1b064858034` are immutable **documentary authoring provenance only**. They are not an executable replay baseline. The canonical 18 migrations contain no Stock/Cajas objects, and materializing quarantined `S00` declarations in a database is forbidden.

Therefore, raw `S00→S01` SQL, and potentially later raw adjacent-snapshot SQL, cannot be executed directly against the canonical baseline. Such SQL may assume, alter, or drop quarantined objects that existed only in schema evidence and were never migrated. Executing it would fabricate history and violate the approved quarantine boundary.

Before any PS authoring, `C14-00` must design, bind, and receive independent approval for an **executable baseline/projection manifest** derived from the canonical 18-migration truth:

1. Bind the canonical migration tree and prove its 18 migrations contain zero Stock/Cajas objects.
2. Treat immutable `S00..S24` as provenance inputs, never as directly replayable database states.
3. Define projected executable snapshots `P00..P24`, where `P00` is canonical migration truth and each `Pn` introduces only the approved net supported delta attributable through `Sn` without materializing quarantined-only history.
4. Bind every projection to its source snapshot commit/schema blob, inclusion/exclusion rationale, supported-object inventory, legacy-absence proof, and independent review evidence.
5. Permit future replayable PS diffs only between adjacent approved projected snapshots.

No projected snapshot may silently rewrite C13 provenance. Projection ambiguity or disagreement between canonical truth and a snapshot is a hard stop.

## 4. Exact ordered C14 topology

The following order is normative. PS target hashes are expanded from Git evidence; no missing full hash is invented.

| C14 child | Kind | Provenance transition / attachment | Target commit | Target schema blob | Exact purpose |
| --- | --- | --- | --- | --- | --- |
| `C14-00` | Gate | canonical 18 migrations + `S00..S24` | — | — | Executable baseline/projection manifest; independent evidence approval before authoring |
| `C14-01` | CX01 | baseline prerequisite | — | — | Deterministic, catalog-verifiable `btree_gist` prerequisite design |
| `C14-02` | PS01 | `S00→S01` | `c93119f21fb90e7eed8c96152c85667b2cccdea7` | `163f0ebce9623a2bdd47b347ede7cc57f58b2d5c` | Projected structural delta to S01 |
| `C14-03` | PS02 | `S01→S02` | `bac87f4edad8e8f6735377abe7d62739200de5c1` | `99f0841bb77a10993c679d715d24da9e6b4ce203` | Projected structural delta to S02 |
| `C14-04` | PS03 | `S02→S03` | `2b8285584c12d8e8fcc9726dd88601c162523990` | `430d74f3697ec9e39abbeae27bb3894753f8acfc` | Projected structural delta to S03 |
| `C14-05` | PS04 | `S03→S04` | `604347ecd7859bd316d036f60a69777734d4b4b5` | `afe5e552387fc801bfe7fc23db86fbac4de7e125` | Projected structural delta to S04 |
| `C14-06` | CX02 | post-S04 lot family | — | — | Lot correction and append-only custom guards |
| `C14-07` | PS05 | `S04→S05` | `cf85099786c5839d24a7e64149daa2f7c3acfe24` | `0f751eaf9eab6ccb2a016a235ad59ef4867eff04` | Projected structural delta to S05 |
| `C14-08` | CX03 | post-S05 identified-unit configuration | — | — | Configuration custom guards |
| `C14-09` | PS06 | `S05→S06` | `66165aefa077073335e9821fd10752cfc1c37e59` | `2433f98922be3684efd512ad0515adbd4621dc73` | Projected structural delta to S06 |
| `C14-10` | CX04 | post-S06 position/occupancy | — | — | Position, trace, and occupancy custom guards |
| `C14-11` | PS07 | `S06→S07` | `0fc8f326345bc5b477c28e7dfc9095c5a8f9fc44` | `eeb2d8510dced1e51a6922e62657204d3020395e` | Projected structural delta to S07 |
| `C14-12` | CX05 | post-S07 opening | — | — | Opening row-local custom checks |
| `C14-13` | PS08 | `S07→S08` | `1a116002c83adaee1e9864ab0e34e4212ff390ee` | `17cef1f796f8bba68330de0b3c3880164cb5c137` | Projected structural delta to S08 |
| `C14-14` | CX06 | post-S08 command family | — | — | Effect-target and semantic-intent custom behavior |
| `C14-15` | PS09 | `S08→S09` | `2ffb60aae18985d1f1d13094c290906c3105de99` | `7224292c3c34f094fa8eed617f37291675ed35d9` | Projected structural delta to S09 |
| `C14-16` | CX07 | post-S09 Stock evidence | — | — | Evidence append-only, scale, correction, and reversal guards |
| `C14-17` | PS10 | `S09→S10` | `ee8d9e4fb4465984b2832fb4b044f4c73eab13ae` | `e920c20a69e249c10a3cab5c76185501225a1446` | Projected structural delta to S10 |
| `C14-18` | CX08 | post-S10 reservations | — | — | Reservation append-only, ceiling, and source-scope guards |
| `C14-19` | PS11 | `S10→S11` | `849f4938d6e62e5e0b5a41e2fcaa241e4c2980c2` | `e770fe98de1439e963175b24512c14abe4ed39d7` | Projected structural delta to S11 |
| `C14-20` | CX09 | post-S11 projections/compatibility | — | — | Projection custom guard skeleton; no fold/rebuild algorithm |
| `C14-21` | PS12 | `S11→S12` | `93c9b72758954ad5f1ac9ed8567fc3462fa847cf` | `ed45d81b89c7ea448497a4cde01539c2f7d91490` | Projected structural delta to S12 |
| `C14-22` | CX10 | post-S12 formula family | — | — | Formula pointer, append-only, and minimum-line custom guards |
| `C14-23` | PS13 | `S12→S13` | `77326b249cfe8ba580a39b2b2011b7d68bcb3599` | `988f72cb688b5aa6d1c4de5340ec9887dcfffad0` | Projected structural delta to S13 |
| `C14-24` | PS14 | `S13→S14` (`E3A`) | `156d82d2916c43f878782cabb17d4623aba5bee1` | `df5a2ab5ec94027a2a873b0a4a97e12dd2405e05` | Projected structural delta to S14 |
| `C14-25` | PS15 | `S14→S15` (`E3B`) | `980194449633c927eb22e20dec4467aba7f1c95b` | `b68cb2676253636234e2ef2d7a6aa47d659f01e5` | Projected structural delta to S15 |
| `C14-26` | CX11 | post-S15; covers S13–S15 | — | — | Assignment, preparation, correlation, and control custom rules, including nullable correlation shape |
| `C14-27` | PS16 | `S15→S16` | `b8fc9e667ec6901178ba1274d897c007a698482a` | `ec170b6fbd65238d0e465ab105458bf472e4372e` | Projected structural delta to S16 |
| `C14-28` | PS17 | `S16→S17` | `ab444b61b585a49149994acb4338f44a16996365` | `6a2fa2f6c1a6044a2fa3bcc9cfa455719638bb76` | Projected structural delta to S17 |
| `C14-29` | PS18 | `S17→S18` | `abf1bd27a86a44facde580b39496c1bfb655fa91` | `4bf945809f476d20ed8303dff30bb6fa1778853a` | Projected structural delta to S18 |
| `C14-30` | PS19 | `S18→S19` | `cb4b0e5c9bd19dada42a1fcd9c8d29be89e56f19` | `d08d3a35ae3fec4cf1641255b51adbdd672b0806` | Projected structural delta to S19 |
| `C14-31` | PS20 | `S19→S20` | `406c86b33750e76cba937f305725b4960fdbfa5f` | `0697da95236ccfc35128db626c0ac82c2cf637b3` | Projected structural delta to S20 |
| `C14-32` | PS21 | `S20→S21` | `53f9d0ff5863224856ed9871f5986663cfbf4713` | `751ef97e7e41d16dc7976ac544e0be97159b5e1c` | Projected structural delta to S21 |
| `C14-33` | CX12 | post-S21; covers S16–S21 | — | — | Operational Cajas custom rules across dispatch, return, consumption, disposition, and condition families |
| `C14-34` | PS22 | `S21→S22` | `fa6a200783f451ff6b61218987c22188d5341766` | `48ac493f53e12bd672d0f9d9aae0e257ed2638d3` | Legacy-model removal provenance; reviewed structural no-op identity when projection proves absence |
| `C14-35` | PS23 | `S22→S23` | `609aea48ccc6910aa864b09f324030f06010d4aa` | `af7e0c6ca32bf5efba3f11f42e92c55dab8944ca` | Final inverse/composite structural reconciliation |
| `C14-36` | PS24 | `S23→S24` | `0faf2f55e178f1b111c5ae108380a505a68c8feb` | `47313a8a85ac71ac56df93ce212593820cb95a13` | Legacy-enum removal provenance; reviewed structural no-op identity when projection proves absence |
| `C14-37` | CX13 | final deferred custom reconciliation | — | — | GiST opening exclusion and remaining deferred custom-object reconciliation |
| `C14-38` | Gate | final projected replay evidence | — | — | Independent final evidence gate; no unexplained residual or fabricated history |

## 5. Structural and customized authoring contract

This section is design intent only and is not authority to perform it.

- PS children must be derived only from adjacent, approved projected executable snapshots, never directly from raw `S00..S24` schemas against canonical migration state.
- `S00..S24` remain immutable provenance inputs. Projected executable snapshots drive future replayable PS SQL.
- A raw adjacent diff that assumes, alters, or drops a quarantined object fails closed. It must not be executed, accepted, or hand-pruned.
- No generated table, column, enum, key, FK, index, default, or relation operation may be manually removed because the object never existed in canonical migrations.
- PS22/S22 legacy-model removals and PS24/S24 legacy-enum removals are expected reviewed structural **no-op identities** only when projection evidence proves those objects never existed. They preserve one-to-one provenance and must never emit `DROP` operations or absorb CX work.
- CX children contain only the independently approved unsupported-object manifest attached above. They must not duplicate or rewrite Prisma-supported structure.
- Final acceptance must reconcile projected supported structure and separately verify customized-object identities. It must prove zero fabricated Stock/Cajas history and repeatable canonical replay.

## 6. Approved documentary decisions

Independent Migration/DB review #4725 returned PASS on draft blob `a89c1a5a619766d302e0c436dad65cc3491b36b6`. Franco then substantively approved all four decisions below; Engram #4728. These approvals close documentary topology choices only and grant no estimation, SQL, migration, database, Git, deployment, or production authority.

| Decision | Approved direction | Tradeoff / rejected alternative |
| --- | --- | --- |
| Executable baseline protocol | Approve projected executable snapshots derived from canonical 18-migration truth | Reject materializing quarantined S00 and reject executing raw adjacent SQL. Projection adds evidence work but prevents fabricated history and invalid destructive operations. |
| CX count after E3 split | Preserve exactly 13 CX children by batching CX11 after S15 across S13–S15 assignment/preparation/correlation/control | One custom bundle spans three structural snapshots. Splitting it improves local attachment but creates 14 CX children and requires another topology amendment. |
| Legacy removal identities | Treat PS22 and PS24 as reviewed no-op identities when projection proves legacy models/enums absent | Never emit `DROP` and never hand-prune generated SQL. A non-empty destructive result is a projection/protocol failure. |
| Estimation and replay preparation | Require a separately approved task before implementation | The old 10,970-line forecast is stale. No replacement forecast may be guessed in this pack. Evidence-first estimation delays authoring but protects reviewability and the 350-line boundary. |

These documentary decisions are closed. C14 migration authoring and execution remain blocked until separately scoped estimation, implementation, review, and human approval gates are completed.

## 7. Required future estimation/replay-preparation task

A future task may be proposed only after this protocol is approved. It requires separate Franco approval and a new exact lock/scope. Its intended scope is read-only with respect to repository migrations and non-DB authoring preparation:

1. Materialize 25 temporary projected schemas `P00..P24`, each bound to canonical truth and immutable C13 provenance.
2. Generate 24 raw Prisma 7.8 schema-to-schema diffs only after protocol approval, retaining them as external estimation/review evidence rather than migration directories or accepted migration SQL.
3. Define exactly 13 CX manifests at the attachment points in §4.
4. Count raw, transformed, and final forecast lines separately; record assumptions instead of guessing.
5. Re-split any forecast above 350 lines before implementation and amend topology if the count changes.
6. Obtain independent Migration review of projection identities, raw operations, transformation plan, CX scopes, counts, and split recommendations.

Even that future task may not write `prisma/migrations/**`, accept SQL, connect to a database, introspect a database, or execute Prisma migration/database commands unless those actions are separately and explicitly authorized. It grants no implementation authority.

## 8. Ownership, review, approval, and stop conditions

| Field | Binding |
| --- | --- |
| Task | `C14 documentary topology amendment` |
| Owner | One Migration architecture/documentation writer |
| Lock | `C14-TOPOLOGY-AMENDMENT/P:MIG-DOC`; `reserved → editing → review → released` |
| Owned path | `knowledge/specs/STOCK-CAJAS-C14-TOPOLOGY-AMENDMENT-001/CHANGE_PACK.md` only |
| Independent reviewer | Migration/DB reviewer, read-only and no-fix |
| Human gate | Franco substantive design approval after independent PASS |

Stop without authoring or execution on any of the following:

- canonical baseline, migration count/tree, or zero-Stock/Cajas assertion contradicts evidence;
- projected snapshot content, inclusion/exclusion rule, or adjacency is ambiguous;
- preserving 13 CX children is unresolved;
- any required hash is stale, missing, ambiguous, or inconsistent;
- a defensible forecast is unavailable or a child exceeds 350 lines without approved re-splitting;
- database access, SQL authoring/acceptance, migration-directory writing, or execution is needed;
- ownership overlaps, independent review fails, or Franco has not substantively approved the design.

## 9. Exact exclusions and non-authority

This Change Pack excludes:

- migration files or directories and any mutation of the canonical 18 migrations;
- SQL authoring, transformation, acceptance, staging, or execution;
- `prisma migrate *`, `prisma db *`, database connections, introspection, or catalog access;
- extension changes, including creating or altering `btree_gist`;
- seed, backfill, fabricated baseline/history, opening, fold/rebuild, or domain-data mutation;
- provider, environment, configuration, package, lockfile, dependency, or schema edits;
- retained generated-client changes;
- Auth, security, permissions, multi-company implementation, APIs, services, UI, C15+, or unrelated files;
- Git staging, commit, push, pull request, merge, deployment, or production action.

Approval of this documentary topology, if later granted, is narrow and non-transitive. Every estimation, authoring, review, replay, database, and execution phase requires its own explicit scope and approval.

## 10. Documentary acceptance checklist

- [x] Independent Migration/DB reviewer verifies final C13 bindings and canonical migration truth — PASS #4725.
- [x] Independent reviewer accepts the executable projection protocol as safe and determinate — PASS #4725.
- [x] Franco decides all four items in §6 and substantively approves reviewed draft blob `a89c1a5a619766d302e0c436dad65cc3491b36b6` — approval #4728.
- [ ] Documentary lock is released.
- [ ] Separate estimation/replay-preparation task is proposed; no implementation starts from this document.
