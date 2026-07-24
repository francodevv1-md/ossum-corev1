# Cajas B01 — Core Persistence Contract Decision

## 1. Metadata and authority

| Item | Value |
| --- | --- |
| Status | **GATE D1 DECIDED — Option A selected by Franco on 2026-07-20** |
| Date | 2026-07-20 |
| Task | `CAJAS-B01-D0 — Core Persistence Contract Design`; D1 decision recorded by `CAJAS-B01-D1-OPTION-SELECTION-RECORD` |
| Owner | Backend / Data Architect |
| Approver | Franco |
| Scope | Conceptual persistence-contract alternatives for Cajas B01 server truth, immutable operational evidence, current projections, cross-domain coordination, compatibility, and protected downstream gates. |
| Decision effect | **Gate D1 only:** Franco selected Option A, normalized typed immutable domain evidence with transactional current projections, as the architectural direction on 2026-07-20. |
| Authorization effect | **No downstream authorization.** The D1 selection does not authorize a D2 schema-design artifact, schema edits, migrations, data changes, Auth, permissions, role mapping, implementation, cutover, protected-file changes, production rollout, APPLY, or a difference-resolution owner/capability. |

This document records the Gate D1 architectural direction between the approved product/domain baseline and any later, separately authorized schema-design artifact. It deliberately stops before exact persistence structures. It defines no Prisma model, field, relation, index, enum, migration, API route, payload, transaction API, provider, source file, role mapping, or difference-resolution capability owner.

Public product labels remain the approved Spanish strings: `Caja`, `Contenido esperado`, `Caja identificada`, `Control de preparación`, `Contenido despachado`, `Disponible`, `Con diferencias`, and `Recontrolar caja`. “Snapshot” is technical prose only, not public copy.

## 2. Provenance and pre-write gate

The fresh CAJAS-B01-D0 pre-write check found the target absent, untracked, and without visible Git history or an overlapping visible writer/lock. Exclusive ownership was reserved for this target only during drafting. The relevant worktree remains broadly dirty: `prisma/schema.prisma` is modified and exactly eleven migration directories are untracked. Those protected artifacts were read only; their state is not normalized, adopted, or authorized by this document.

The following source blobs were revalidated against the latest T00 evidence before writing:

| Source | Revalidated Git blob |
| --- | --- |
| Cajas `PROPOSAL.md` | `6c4f5e238f0db1af2033b63772be3cfec4aa1fe2` |
| Cajas `SPEC.md` | `a1ba19cbb4d0d7a2ac9f49be4a9f03d038ca372a` |
| Cajas `DESIGN.md` | `01f1dad68dc7316690c04e96cecb7cfeab5496f7` |
| Cajas `TASKS.md` | `6118355d71e941fe665566e90c07a57421bdd446` |
| `DECISIONS-CD01-CD10.md` | `5fa640ebf8fee9bb01d138c52a0b483aab401e49` |
| Core Persistence ADR | `48258985953127836170550a000159e5641083b4` |
| Authorization ADR | `ca772cb8034a2e55be6e43855dd79a1e2ddfa651` |
| Operational Integrations ADR | `bee2397680d7ab1cf64fdf4b1edc85f2b63377b3` |
| Stock Transactions ADR | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` |
| Stock V1 domain proposal | `926476e1d5e275768296329e099e32e04069224e` |
| `STOCK_CAJAS_TRAZABILIDAD.md` | `4fb54edcb118107e07f21b51bbf6b37b5ceddeff` |
| `DATA_MODEL_RULES.md` | `c63360274b4ab48fe3dc935a97093a8a1c5da5f5` |
| `MULTI_COMPANY_ACCESS.md` | `328a7efbd255ee6620e1fad7e9cd0f1527f66226` |
| `AUDIT_EVENT_POLICY.md` | `42b56f4eb2f5c1a4acbdf8de8b2730b013fac43d` |
| Read-only Prisma baseline | `6678c6fb9751af53bcd005c5e28301457c7fbcdd` |

`TASKS.md` retains stale SPEC-hash/follow-up metadata even though current SPEC §16.3 correctly covers `MULTI-01`–`MULTI-10`. This known documentation inconsistency does not change the normative current SPEC and is not edited here.

## 3. Authoritative constraints and traceability

### 3.1 Authority chain

This comparison is constrained by, and must not reopen:

1. the approved Cajas product direction in `PROPOSAL.md`;
2. all **154 requirements and 70 acceptance scenarios** in current `SPEC.md`;
3. the interaction and ownership boundaries in `DESIGN.md`;
4. approved decisions `DG-01`–`DG-07` and `CD-01`–`CD-10`;
5. the dependency and gate structure of blocked packages `B01`–`B09` in `TASKS.md`;
6. the four accepted Cajas ADR directions: current projections plus append-only typed domain evidence; explicit Stock reservations plus append-only movements; centralized server capability policy with domain adapters; and synchronous modular orchestration for critical confirmations;
7. Stock V1 `DR-01`–`DR-16`, especially explainable movements, one accepted cause/one Stock consequence, historical truth, bounded traceability, explicit opening position, and financial separation; and
8. canonical data, multiempresa, and audit rules.

The accepted ADRs are directional constraints, not authorization for an exact persistence shape. Therefore, every option below remains within those accepted directions while varying how typed immutable evidence is represented and queried.

### 3.2 Decision-family continuity

| Approved family | Persistence obligation preserved here |
| --- | --- |
| `DG-01` | Exact public vocabulary remains presentation authority; persistence terminology must not leak technical “snapshot” copy into UI. |
| `DG-02` | Each confirmed `Contenido esperado` save is a future-only immutable version; open preparation and historical evidence retain the version they started with. |
| `DG-03` / `CD-08` | Historical results and differences are immutable; resolution appends evidence; only explicit clean re-control changes current condition to `Disponible`. |
| `DG-04` | Multiple identified boxes, exclusive active assignment, independent dispatches, partial returns, retained linkage, and bounded reuse are supported without one-to-one assumptions. |
| `DG-05` | Server-side capability checks, side-effect-free denial, and audit obligations apply without inventing roles or mapping capabilities. |
| `DG-06` | Articles/Stock owns masters; Cajas owns operation preparation/control evidence; Remittance, Return, and Consumption retain their business ownership; `/cajas` and other read models own no writes. |
| `DG-07` | Stock effects are explicit, atomic with their accepted checkpoint, audited, and idempotent; control/re-control is evidence-only; no financial effect is inferred. |
| `CD-01`–`CD-02` | Reservation starts only on confirmed incorporation; replacement/removal/cancellation preserves coherent reservation and historical behavior. |
| `CD-03`–`CD-04` | Operationally valid issuance accepts Remittance, immutable dispatch evidence, and Stock effect together; annulment/redispatch append evidence. |
| `CD-05`–`CD-06` | Each partial Return addresses one dispatch portion; Return and Consumption share one pending accounting boundary and cannot double-dispose quantity or identity. |
| `CD-07` | Added/replacement evidence preserves both sides, remains custody-neutral for the original, and does not infer movement or availability. |
| `CD-09` | Every critical confirmation revalidates current server truth; accepted results are immediate while informational projections may lag honestly. |
| `CD-10` | Every query and mutation is company-scoped; cross-company access is non-disclosing and side-effect-free; difference-resolution ownership/capability remains open. |

## 4. Current baseline and gaps

The read-only Prisma baseline demonstrates a PostgreSQL/Prisma modular-monolith foundation, company-scoped operational records, authenticated actor links, and an existing `AuditEvent`. It does **not** provide the approved Cajas persistence contract.

Material gaps are:

- `AuditEvent` is complementary transversal audit evidence. It cannot substitute for queryable immutable domain evidence such as formula versions, controls, dispatch contents, partial Returns, dispositions, differences, or resolutions.
- No dedicated Article, Stock, or Box server models exist in the current Prisma baseline.
- Existing soft `boxId` and `itemId` references are compatibility hints only. They lack the integrity, company scope, physical identity, version linkage, and historical semantics required for Cajas.
- Those soft references cannot be treated as historical truth or as authority for automatic backfill.
- Current Remittance, Return, and Consumption persistence provides useful integration context but does not implement the approved per-dispatch immutable evidence and shared pending accounting contract.
- Prototype, Zustand, local, or UI state cannot be promoted to server truth or migration evidence.
- The schema and migrations are dirty and protected. Schema design, schema edits, migration artifacts, execution, and reconciliation are outside this task.

The core design problem is therefore not “add Box tables.” It is to preserve independent domain ownership while making each accepted checkpoint durable, immutable, company-safe, conflict-safe, and retry-safe.

## 5. Required conceptual boundaries

These are ownership boundaries, not proposed storage names.

### 5.1 Articles/catalog and formula/content versions

Articles/catalog owns shared Article identity and the compound `Caja` definition. Confirmed `Contenido esperado` saves append immutable future-only versions. A preparation binds to one applicable version when it starts; later formula changes do not rewrite open preparation or evidence.

### 5.2 Identified physical box/unit identity

Articles/Stock owns each `Caja identificada` as one company-scoped physical identity under a base `Caja`, including the applicable unique serial/internal code and physical traceability. Cajas does not create a parallel unit registry. Current availability is not historical evidence.

### 5.3 Cajas operation aggregate

The Cajas operation boundary owns assignment to Surgery/Record, preparation selection, controlled current composition, control/re-control evidence, post-control changes, acknowledged differences, difference records, resolution evidence, current condition, and dispatch/reuse eligibility. One identified box may belong to at most one active operation, but an operation may contain multiple identified boxes.

The exact owner/capability for **difference resolution remains unresolved**. No option, recommendation, matrix rating, or gate below selects it.

### 5.4 Immutable dispatch, Return, Consumption, and shared pending accounting

- Remittance retains issuance ownership and owns its document acceptance.
- Each accepted dispatch has independent immutable `Contenido despachado` evidence.
- Return retains ownership of confirmed Return evidence and its declared dispatch portion.
- Consumption retains ownership of separately confirmed consumption.
- Return and Consumption coordinate against one shared per-dispatch pending-accounting boundary so each quantity or physical identity receives at most one accepted disposition.
- Prior dispatch, Return, Consumption, annulment, correction, and redispatch evidence is never destructively rewritten.

### 5.5 Stock reservations and movements

Stock is a separate coordinated owner. It owns confirmed reservation/release commitments, explainable append-only physical/disposition movements, holds/review effects, and availability projections. Cajas evidence describes the business checkpoint; it does not become a duplicate Stock ledger. Control and re-control create Cajas evidence only.

### 5.6 Read models

Read models may combine company-scoped source facts for `/cajas`, Articles/Stock consultation, Surgery/Record operation views, histories, counts, and eligibility explanations. They own no business writes and cannot authorize confirmation. A lagging read model must be marked non-current; critical commands revalidate authoritative source state.

## 6. Obligations common to every option

### 6.1 Transaction and consistency

- Each critical confirmation has one trusted server boundary.
- Authorization, company scope, current-state freshness, invariants, and idempotency are checked before acceptance.
- The accepted business record, immutable domain evidence, required current-projection update, and same-checkpoint Stock effect succeed together or none is accepted.
- Cross-domain post-commit delivery is allowed only for non-critical derivatives that do not define user-visible checkpoint success.
- Failed or denied commands leave no successful domain, Stock, projection, or audit-success effect.

### 6.2 Concurrency

Every option must prevent simultaneous active assignment, oversubscription, stale formula saves, stale control/re-control, dispatch beyond controlled/reserved composition, and over-disposition of the shared pending balance. A later schema-design decision must choose the concurrency-control family and prove conflict behavior; this document chooses none.

### 6.3 Idempotency

Each accepted confirmation requires a stable retry identity scoped tightly enough to suppress duplicate evidence and effects without suppressing a later legitimate command. Retry suppression itself must be company-scoped, inspectable, auditable, and included in rollback/reconciliation tests. Exact key format, source, retention, and storage remain undecided.

### 6.4 Security and multiempresa

- Authenticated actor, active/target company membership, conceptual capability, resource company, and business invariants are distinct checks.
- Client-supplied company context is never sufficient.
- Cross-company references are rejected without existence disclosure and without side effects.
- Read models apply the same company and filtered-history constraints as source domains.
- RLS, if separately approved later, is defense in depth and cannot replace backend validation.

### 6.5 Audit and domain evidence

Typed domain evidence answers **what business fact was accepted**. Audit answers **who attempted or caused it, for which company, why, when, and with what result**. Both are required for critical actions. Generic audit records are never reconstructed into Cajas history as a substitute for domain evidence.

## 7. Option family A — Normalized typed evidence with transactional current projections

### 7.1 Conceptual model boundary

Represent formula versions, operation assignment/current work, control/re-control evidence, changes, dispatch evidence, Return evidence, accepted dispositions, differences, and resolutions as explicit relational concepts with typed immutable line-level evidence. Maintain narrow current projections for active assignment, current composition/version, current condition, eligibility, and per-dispatch pending balance.

Stock keeps separate reservation and append-only movement concepts. Remittance, Return, and Consumption retain their records and coordinate through explicit integrity-preserving links to dispatch evidence and shared accounting.

### 7.2 Current projection and immutable evidence

Immutable records are the historical authority. Current projections are transactional accelerators and decision inputs, not history. A projection can be rebuilt or reconciled from typed evidence plus separately owned Stock facts, but no rebuild may infer facts absent from accepted evidence.

### 7.3 Transaction, concurrency, idempotency, audit, and company scope

- Strong relational constraints can protect company-consistent references and cumulative boundaries.
- Critical commands update the relevant current projection and append typed evidence in one accepted transaction boundary, including required Stock effects.
- Concurrency can be targeted to the smallest current aggregate and shared-disposition boundary; the exact locking/token family remains open.
- Idempotency can bind one command identity to its typed evidence and effects.
- Audit correlation points to durable business evidence rather than duplicating it.
- Company identity participates in every aggregate, evidence link, uniqueness/invariant boundary, and read path.

### 7.4 Soft-reference compatibility and cutover

Treat existing soft references as legacy display/adapter inputs only. New confirmed Cajas operations use integrity-preserving identities after cutover. Existing records remain readable in their current form and are labeled legacy/unlinked where no verified mapping exists. A mapping may be accepted only when source identity is independently verified; otherwise no synthetic Cajas evidence, Stock movement, or formula history is created.

### 7.5 Consequences for B02–B09

| Package | Consequence |
| --- | --- |
| `B02` | Straightforward company-scoped catalog/detail reads and explicit future-only formula version commands; read projections can support counts/search. |
| `B03` | Strong fit for targeted assignment, preparation, control, difference, and re-control invariants with immutable typed history. |
| `B04` | Dispatch eligibility and independent dispatch lines can be checked relationally within synchronous orchestration. |
| `B05` | Shared pending accounting and one-disposition rules are explicit but require careful cumulative constraints across Return and Consumption owners. |
| `B06` | B0/B1/B2 can consume purpose-built projections without owning writes. |
| `B07` | O1/O2 can receive immediate accepted evidence plus fresh current projection. |
| `B08` | O3/O4 can present typed exceptions, partial accounting, and failures without interpreting opaque documents. |
| `B09` | Verification can query invariants directly and reconcile projections against typed evidence and Stock history. |

### 7.6 Benefits, costs, failure modes, and rollback

**Benefits:** strongest relational integrity; precise queries across component traceability and partial accounting; clear domain ownership; direct fit with current modular monolith and accepted ADR directions.

**Costs:** largest conceptual surface; more joins and explicit invariants; disciplined projection maintenance and transaction ownership are mandatory.

**Primary failure modes:** current/evidence divergence; over-large transactions; accidental mutation of typed historical lines; cross-owner circular dependencies; an overly broad idempotency scope.

**Rollback implications:** deployment rollback must disable new writes before reverting readers; already accepted evidence remains retained and readable. Projection rebuild/repair can be rolled back independently if it never changes evidence. Compatibility adapters remain available until post-cutover verification. No rollback deletes accepted evidence or invents legacy history.

## 8. Option family B — Self-contained immutable checkpoint documents with relational coordination

### 8.1 Conceptual model boundary

Represent each formula version, control/re-control, dispatch, Return confirmation, and resolution checkpoint as a typed immutable, self-contained document containing the complete evidence needed to render that checkpoint. Keep relational coordination concepts for company scope, master/physical identity, active assignment, current condition, dispatch identity, shared pending accounting, idempotency, and Stock links.

This is not “JSON as the whole domain.” Documents hold immutable checkpoint content; relational coordination owns invariants and cross-domain identity.

### 8.2 Current projection and immutable evidence

The latest applicable document informs current projections, but current condition and eligibility remain explicit coordinated projections. Historical rendering reads the original document without joining mutable catalog descriptions. Shared pending accounting cannot be derived merely from “latest Return”; it remains an explicit concurrency-protected coordination boundary.

### 8.3 Transaction, concurrency, idempotency, audit, and company scope

- Each accepted checkpoint appends one complete immutable evidence document and updates coordination/current projections atomically with required effects.
- Concurrency protects assignment, applicable source version, latest accepted checkpoint, dispatch remainder, and shared disposition.
- Idempotency binds the command identity to the immutable checkpoint document and coordinated effects.
- Audit points to the checkpoint identity and records actor/company/cause/result without replacing document content.
- Documents and every referenced identity are company-scoped and validated against server truth before acceptance.

### 8.4 Soft-reference compatibility and cutover

Legacy records may continue to render through a compatibility reader, but they are not wrapped retroactively in fabricated checkpoint documents. New documents may reference a verified legacy document context as provenance without asserting physical identity that cannot be proven. Cutover is write-forward: only post-cutover accepted confirmations produce new checkpoint evidence.

### 8.5 Consequences for B02–B09

| Package | Consequence |
| --- | --- |
| `B02` | Formula/history display is simple and historically stable; cross-version catalog analysis needs extracted projections. |
| `B03` | Complete controls/re-controls are easy to render; line-level difference and resolution queries need indexed/extracted coordination facts. |
| `B04` | Each dispatch is naturally self-contained; cumulative bounds still depend on relational coordination. |
| `B05` | Return evidence is clear, but shared Return/Consumption accounting cannot live only inside independent documents. |
| `B06` | Read models must extract searchable/countable data instead of scanning documents. |
| `B07` | O1/O2 obtains faithful checkpoint payloads; current editable composition remains a separate projection. |
| `B08` | O3/O4 historical readers are simple; cross-return pending calculations require coordinated projections. |
| `B09` | Evidence immutability is easy to inspect; schema/content-version compatibility and extracted-projection reconciliation add test burden. |

### 8.6 Benefits, costs, failure modes, and rollback

**Benefits:** self-contained historical evidence; stable rendering despite later catalog changes; fewer joins for a single checkpoint; intuitive alignment with `Control de preparación` and `Contenido despachado`.

**Costs:** repeated data; document-content governance and versioning; weaker ad hoc line-level analytics; relational extracts are still necessary for critical constraints.

**Primary failure modes:** opaque documents becoming an integrity escape hatch; stale or incomplete extracted projections; document-version drift; duplicated traceability without verified physical links; attempting to calculate shared accounting from documents alone.

**Rollback implications:** accepted documents remain immutable and readable by version-aware readers. New writes can be disabled while legacy readers continue. Extracted projections may be rebuilt from valid documents, but rebuild must stop on unknown versions or unverifiable references rather than infer. No document is converted into invented pre-cutover history.

## 9. Option family C — Immutable relational aggregate revisions with explicit current pointers

### 9.1 Conceptual model boundary

Represent each accepted Cajas aggregate checkpoint as a typed immutable relational revision with relational lines and integrity-preserving references. The server-owned current aggregate/projection remains operational truth and points explicitly to its accepted current revision and version. A revision captures the aggregate state accepted at that checkpoint; it is neither an opaque document nor a collection of action-by-action entries.

Stock keeps its separate reservation and movement history. Remittance, Return, and Consumption retain their approved business records and ownership. Cajas revisions preserve the Cajas checkpoint and link to those separately owned consequences without absorbing or duplicating them.

### 9.2 Current projection and immutable evidence

The current aggregate/projection is the authoritative source for operational decisions; prior revisions are immutable historical evidence and are not edited when current state advances. Each accepted checkpoint appends a complete typed relational revision and transactionally advances the explicit current pointer/version. Recovery or reconciliation copies a validated revision into a current projection under an approved repair procedure; it does not infer unrecorded history or make chronological reconstruction the primary persistence model.

### 9.3 Transaction, concurrency, idempotency, audit, and company scope

- The current pointer/version provides an explicit stale-write coordination point; the exact locking or token mechanism remains open.
- Synchronous orchestration appends the accepted relational revision, advances its current pointer/version, and applies required Stock/Remittance/Return/Consumption effects atomically.
- Active assignment and shared per-dispatch pending accounting remain explicit concurrency-protected relational coordination boundaries; they are not inferred from revision contents alone.
- Idempotency binds one command identity to one accepted revision, pointer advance, and coordinated effects so a retry cannot create a duplicate checkpoint.
- Audit remains a separate actor/cause/result record correlated to the accepted revision.
- Revisions, lines, pointers, coordination records, and cross-domain references are company-scoped; cross-company acceptance is rejected before existence disclosure or effects.

### 9.4 Soft-reference compatibility and cutover

Begin relational revision history only for checkpoints accepted under the later approved cutover policy. Existing soft references remain legacy records and may be linked only through verified identity mapping. The first accepted revision must not claim prior preparation, dispatch, Return, Consumption, Stock movement, or physical history. Any opening operational context requires separate approval and must be explicitly distinguished from verified historical evidence.

### 9.5 Consequences for B02–B09

| Package | Consequence |
| --- | --- |
| `B02` | Formula history is stable through immutable relational revisions; B0/B1/B2 read the explicit current pointer and query relational version lines. |
| `B03` | Each accepted operation checkpoint preserves a complete prior aggregate revision; stale detection uses the current version while differences and resolutions remain typed and queryable. |
| `B04` | Dispatch acceptance can link one immutable Cajas revision to separately owned immutable dispatch evidence; cross-domain atomic coordination remains mandatory. |
| `B05` | Revision history explains accepted Cajas checkpoints, while the shared Return/Consumption pending boundary remains separately explicit and concurrency-protected. |
| `B06` | B0/B1/B2 consume server-owned current projections and relational history readers without interpreting opaque documents. |
| `B07` | O1/O2 receive the accepted current version and revision identity immediately; no client-side reconstruction defines current truth. |
| `B08` | O3/O4 can query prior relational revisions and separately owned Return/Consumption evidence; current and historical states remain visibly distinct. |
| `B09` | Verification targets pointer/version atomicity, prior-revision immutability, relational reference integrity, coordination bounds, and current/revision reconciliation. |

### 9.6 Benefits, costs, failure modes, and rollback

**Benefits:** complete immutable relational state at each accepted checkpoint; explicit and cheap current-state access; stable historical rendering without opaque payloads; prior/current comparison remains queryable; corrections advance state without rewriting prior revisions.

**Costs:** repeated relational state across revisions; larger accepted transactions; careful version and pointer constraints; line-copy discipline; explicit coordination remains necessary outside the aggregate for assignment, pending accounting, and separately owned effects.

**Primary failure modes:** pointer/version advancing without its complete revision or vice versa; accidental mutation of prior revision lines; partial or incorrect line copying; current projection diverging from the pointed revision; treating revision contents as ownership of Stock, Remittance, Return, or Consumption; idempotency accepting duplicate revisions.

**Rollback implications:** disable new revision writes before reverting readers or writers, retain every accepted revision, and restore code compatible with both current pointer/version and retained revision shapes. A current projection may be repaired only from its validated pointed revision under reconciliation; rollback never deletes prior revisions, rewrites pointers to fabricate business reversal, or imports unverified legacy history.

## 10. Decision matrix

Ratings are comparative: **5 = strongest / lowest concern**, **1 = weakest / highest concern**. “Implementation simplicity” rates relative simplicity, not product value.

| Criterion | Weight | A — Normalized typed evidence | B — Checkpoint documents | C — Relational aggregate revisions |
| --- | ---: | --- | --- | --- |
| Fit with accepted Cajas ADR directions | High | **5** — direct current-projection + typed evidence fit | **4** — fit if relational coordination remains authoritative | **5** — server-owned current truth plus typed immutable relational checkpoints |
| Relational integrity and company-safe references | High | **5** — strongest explicit constraints | **3** — coordination is strong, document internals need validation | **5** — revision lines, pointers, and references remain relationally constrained |
| Immutable historical fidelity | High | **5** — explicit typed records | **5** — complete self-contained checkpoints | **5** — complete prior aggregate revisions remain immutable |
| Partial Return/Consumption accounting | High | **5** — direct line-level constraints and queries | **3** — requires separate relational accounting beside documents | **4** — explicit shared coordination is strong but remains outside revision state |
| Current operational read simplicity | High | **5** — narrow projections plus relational queryability | **4** — single checkpoints are simple; summaries need extracts | **5** — explicit current pointer/version and server projection avoid reconstruction |
| Implementation simplicity for current V0 | High | **4** — substantial but conventional | **3** — document governance plus coordination | **3** — conventional relational tools, with state-copy and pointer discipline |
| Projection divergence risk | High | **4** — transactional updates and direct reconciliation | **3** — document/extract divergence | **4** — atomic pointer/version update enables direct revision reconciliation |
| Historical rendering stability | Medium | **4** — may require immutable descriptive captures | **5** — self-contained by design | **5** — complete immutable relational revisions retain checkpoint state |
| Queryability across traceability/evidence | Medium | **5** — strongest line-level access | **2** — extracted/indexed facts required | **4** — relational lines are queryable, with repeated state across revisions |
| Compatibility with soft-reference coexistence | Medium | **4** — additive verified mapping and legacy adapters | **4** — clean write-forward documents | **4** — revision history can begin write-forward without rewriting legacy records |
| Rollback and repair operability | High | **4** — preserve evidence; repair projections | **4** — preserve documents; rebuild extracts | **4** — preserve revisions; verify pointer-compatible readers and repairs |
| Future analytical flexibility | Low | **4** — strong structured queries | **3** — extraction required | **4** — structured checkpoint comparison is strong but duplicates state |

Matrix result: Option A has the best overall fit for the current project constraints and is the option Franco selected at Gate D1 on 2026-07-20. The ratings and tradeoffs remain comparative evidence; they do not authorize any downstream gate.

## 11. Selected architectural direction

**GATE D1 DECISION — SELECTED BY FRANCO ON 2026-07-20:** **Option A: normalized, typed, immutable domain evidence with transactional current projections.** This is an architectural direction only.

Rationale:

- it most directly implements the already accepted Core Persistence, Stock Transactions, Authorization, and Operational Integrations directions;
- it matches the current PostgreSQL/Prisma modular-monolith context without introducing a new chronological-log operating model;
- it provides the clearest integrity surface for exclusive assignment, bounded dispatch, shared Return/Consumption accounting, company isolation, and physical traceability;
- it keeps read models practical while preserving typed immutable evidence; and
- it can support the candidate reversible write-forward policy in §12.2 without treating soft references as history, if Franco later approves that policy.

The selected direction retains these qualifications without adopting Option B or C as the primary architecture:

- typed, self-contained checkpoint captures may be preserved for `Control de preparación` and `Contenido despachado` without adopting document-primary architecture;
- explicit current-version and stale-write protection may be evaluated later without adopting full aggregate revisions;
- `AuditEvent` remains complementary to, and never substitutes for, typed domain evidence;
- soft references do not authorize invented backfill;
- Stock and operational domain ownership remain separate; and
- read models have no write ownership.

Options B and C remain documented in §§8–9 as considered alternatives with visible benefits, costs, failure modes, and rollback implications; neither was selected.

The D1 decision does **not** choose or authorize exact aggregate size, normalized line shape, checkpoint capture content, concurrency mechanism, transaction boundary, idempotency design, audit storage, compatibility mapping, schema design, schema edit, migration, implementation, cutover, production action, APPLY, or source placement. The exact difference-resolution owner/capability remains open.

## 12. Compatibility, cutover, and rollback strategy

### 12.1 Mandatory compatibility and historical-safety invariants

1. **No invented backfill.** Existing soft references, descriptive lines, UI state, and current quantities do not prove physical identity or historical checkpoint acceptance.
2. **Verified identity only.** No compatibility mapping may assert company, source, physical identity, or business identity that independent evidence cannot prove.
3. **No false Stock history.** Compatibility work never fabricates prior reservations, movements, availability, custody, or opening position.
4. **Accepted facts survive rollback.** Accepted immutable Cajas evidence, Remittance/Return/Consumption records, and Stock history are retained; technical rollback cannot erase or rewrite business facts.
5. **Projection repair is not evidence repair.** A current/read projection may be repaired only without changing immutable source evidence and only after reconciliation proves the repaired state.
6. **No duplicate business effects.** Compatibility, comparison, retry, or rollback mechanisms cannot silently create duplicate Cajas, Stock, Remittance, Return, Consumption, or audit-success effects.

These invariants constrain every later policy but do not approve when, where, or how cutover, coexistence, mappings, write routing, retirement, or rollback execution will occur.

### 12.2 Candidate cutover policy — requires Franco approval

The following is a candidate for the pending decision in §13.6, not an approved strategy:

1. **Named-environment write-forward start.** New immutable Cajas evidence would begin only after explicit approval for a named environment.
2. **Explicit legacy coexistence.** Existing records would remain readable through labeled legacy/compatibility paths until separately approved retirement criteria pass.
3. **Verified mapping workflow.** A legacy reference would connect to a new identity only after documented verification; ambiguous records would remain legacy/unlinked.
4. **Single write owner during transition.** Each new command boundary would have one declared write owner; shadow comparison could observe but would not create business effects.
5. **Controlled rollback posture.** A rollback would first disable affected new writes, preserve all accepted facts, restore compatible readers/adapters, and use only separately approved linked correction evidence to neutralize a business effect.
6. **Separately approved Stock opening.** If Stock adoption required an opening position, it would follow the separately approved dated reconciliation rule rather than derive history from soft references.

Franco may approve, revise, replace, or reject this candidate. No item above authorizes a cutover, migration, mapping, write path, retirement, rollback execution, or environment action.

## 13. Human decisions and authorizations still required after Gate D1

Gate D1 selected Option A only. Franco must still explicitly authorize or approve the following in later, separately scoped gates:

1. separately authorize Gate D2 and its schema-design artifact; D1 does not authorize that work;
2. within an authorized D2 artifact, approve the exact conceptual aggregate boundaries and Option A evidence/projection granularity, including any typed self-contained checkpoint captures;
3. approve the cross-domain atomicity boundary among Cajas, Stock, Remittance, Return, and Consumption for each critical checkpoint;
4. approve the concurrency-control family for assignment, formula save, control/re-control, dispatch, and shared pending accounting, including whether explicit current-version/stale-write protection is used;
5. approve idempotency scope, lifecycle, inspection, and retry semantics;
6. approve, revise, replace, or reject the candidate soft-reference coexistence/cutover policy in §12.2, including verified mappings versus permanently legacy/unlinked records;
7. approve the named environment sequence and rollback posture for any later migration execution;
8. approve the exact Stock reservation granularity and shared-disposition technical contract without changing approved product semantics;
9. approve the company/security/capability implementation and later role mapping under its own protected process; and
10. separately define the exact business owner and conceptual capability for difference resolution.

Item 10 is intentionally unresolved. No later schema design may encode an assumed owner/capability before Franco closes that business definition. A schema edit remains unapproved and requires Gate D3 even after a separately authorized and approved D2 artifact.

## 14. Required downstream gates and task decomposition

Each stage requires its own Task Brief, exclusive file ownership, independent review, rollback definition, and Franco approval where protected. Passing one stage does not authorize the next.

### Gate D1 — Persistence option decision

- **Completed on 2026-07-20:** Franco selected Option A as the architectural direction.
- This records only the option decision, without schema-design, schema-edit, migration, implementation, cutover, production, or APPLY authorization.

### Gate D2 — Schema design artifact

- **Not authorized by Gate D1; requires a separate Task Brief and Franco authorization.**
- Produce a conceptual/logical schema design against the selected option.
- Define aggregate identities, relationships, invariant locations, evidence granularity, projection/reconciliation rules, compatibility, and rollback.
- Still no schema edit, migration artifact, or APPLY.

### Gate D3 — Schema edit

- Separate approved Task Brief for the protected schema file.
- Minimal exact-file allowlist, source baseline, lock, and schema-only validation.
- No migration execution.

### Gate D4 — Migration artifact review

- Generate or author migration artifacts only under explicit authorization.
- Independently review forward safety, legacy coexistence, no-invented-backfill behavior, rollback/forward-fix plan, and environment assumptions.
- No database execution.

### Gate D5 — Migration execution by named environment

- Separate approval for each named environment.
- Record preconditions, backups/recovery posture, operator, commands, verification, and stop conditions.
- Development, staging, and production are never implicitly grouped.

### Gate D6 — Backend contracts

- Separate server tasks for services, validators, centralized capability policy/adapters, company access, audit, idempotency, concurrency, and APIs.
- Separate ownership for Cajas, Stock, Remittance, Return, and Consumption chains.
- No role mapping, Auth change, or difference-resolution capability inference without its own approval.

### Gate D7 — Integration and UI slices

- `B02`–`B05` server slices precede or explicitly gate `B06`–`B08` bindings.
- `/cajas` and other read models remain non-owning views.
- Sensitive Surgery/Record, Remittance, and Return integration requires exact-file Task Briefs and Franco approval.

### Gate D8 — Independent verification and rollback readiness

- `B09` independently verifies all 154 requirements and 70 scenarios, company isolation, authorization denial, immutable evidence, stale rejection, idempotency, concurrency, Stock reconciliation, accessibility, compatibility, and rollback.
- QA does not fix failures; failures return to the owning task under Diagnose.
- Release/APPLY remains separately authorized after verification.

## 15. Approval checklist for Franco

### Option decision

- [x] **Gate D1 only:** Option A — normalized typed immutable domain evidence with transactional current projections — selected by Franco on 2026-07-20.
- [ ] Option B — considered alternative; not selected.
- [ ] Option C — considered alternative; not selected.

### Required confirmations independent of option

- [ ] Confirm that selection is architecture-only and does not authorize schema design/edit, migrations, implementation, protected-file changes, production rollout, or APPLY.
- [ ] Confirm that `AuditEvent` remains complementary and is not domain evidence.
- [ ] Confirm that existing soft references are not historical truth or automatic-backfill authority.
- [ ] Confirm that Stock reservations/movements remain separately owned from Cajas evidence.
- [ ] Confirm that Remittance, Return, and Consumption retain their approved ownership while sharing coordinated dispatch accounting.
- [ ] Confirm that read models have no write ownership and cannot authorize critical confirmations.
- [ ] Confirm that exact difference-resolution ownership/capability remains open for a later business decision.
- [ ] Confirm that all gates in §14 require separate approval and that no APPLY is authorized here.

## 16. Decision closure statement

This artifact records Franco's 2026-07-20 Gate D1 selection of Option A, normalized typed immutable domain evidence with transactional current projections. Options B and C remain visible as considered, non-selected alternatives with their tradeoffs intact. The decision preserves the accepted Cajas ADR directions, Stock V1 boundaries, current schema gaps, multiempresa/security/audit obligations, and the B02–B09 dependency chain. It approves no D2 schema-design work, schema edit, migration, implementation, candidate cutover policy, production action, invented backfill, difference-resolution owner/capability, or APPLY authority; every downstream gate remains separately protected.
