# Cajas B01 D2 — Conceptual/Logical Schema Design Proposal

## 1. Metadata, status, and authorization boundary

| Item | Value |
| --- | --- |
| Status | **D2 SELECTED AND APPROVED BY FRANCO — D3 NOT AUTHORIZED** |
| Date | 2026-07-20 |
| Task | `CAJAS-B01-D2-SCHEMA-DESIGN-001/P01-PROPOSAL` |
| Owner | Backend / Data Architect |
| Selected model | `openai/gpt-5.6-sol` |
| Approver | Franco |
| D2 approval | Franco approved `D2-01`–`D2-10` and `D2-12` without amendments on 2026-07-20; confirmed inherited/closed `D2-11`; retained unresolved `D2-13` |
| D1 dependency | **Option A selected** by Franco on 2026-07-20 |
| Scope | Approval-ready conceptual/logical design for normalized typed immutable Cajas evidence and transactional current projections |
| Current write authority | This proposal only |
| Implementation write set | `∅` |
| Authorization effect | D2 documentary conceptual/logical closure only; **no D3 or later authorization** |

This artifact translates the selected D1 Option A into one conceptual/logical candidate. It defines business identities, responsibilities, relationships, cardinalities, attributes, invariant locations, constraint and index families, consistency boundaries, and compatibility choices. It deliberately does **not** define final Prisma models or fields, physical table/column/index names, native data types, annotations, DDL, migration content, APIs, payloads, source files, transaction APIs, providers, Auth, roles, permission mappings, or implementation.

Franco's approval of this document approves only the selected conceptual/logical D2 decisions recorded in §20 and closes D2. It does **not** authorize D3, a protected schema edit, migration artifact or execution, data/backfill operation, backend or UI implementation, Auth or permission work, rollout, production, Cirugías/Expediente change, difference-resolution owner/capability, or APPLY.

Public product copy remains governed by the approved Spanish vocabulary. Capitalized English terms below are **conceptual labels**, not final persistence names.

## 2. Fresh T00 provenance and exclusive ownership

The fresh read-only T00 immediately before writing recorded branch `master`, HEAD `4a25cf63a1dd8ddd2696f0d6601ad078cef5e37e`, absent target, absent `.git/index.lock`, no visible target overlap, a modified protected Prisma schema, and exactly eleven untracked migration artifacts. Exclusive ownership was reserved in-session for this target only through `reserved → editing → review → released`.

The governing working-tree blobs were stable:

| Governing source | Git blob |
| --- | --- |
| Cajas `PROPOSAL.md` | `6c4f5e238f0db1af2033b63772be3cfec4aa1fe2` |
| Cajas `SPEC.md` — 154 requirements / 70 scenarios | `a1ba19cbb4d0d7a2ac9f49be4a9f03d038ca372a` |
| Cajas `DESIGN.md` | `01f1dad68dc7316690c04e96cecb7cfeab5496f7` |
| Cajas `TASKS.md` | `6118355d71e941fe665566e90c07a57421bdd446` |
| `DECISIONS-CD01-CD10.md` | `5fa640ebf8fee9bb01d138c52a0b483aab401e49` |
| B01 D1 contract | `076220771a96959bfc4d2bb46864ffb704c34b28` |
| Cajas Core Persistence ADR | `48258985953127836170550a000159e5641083b4` |
| Cajas Authorization ADR | `ca772cb8034a2e55be6e43855dd79a1e2ddfa651` |
| Cajas Operational Integrations ADR | `bee2397680d7ab1cf64fdf4b1edc85f2b63377b3` |
| Cajas Stock Transactions ADR | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` |
| Stock V1 domain decisions | `926476e1d5e275768296329e099e32e04069224e` |
| Stock V1 SDD `PROPOSAL.md` | `37a55267e3342fcf74128b5a597ada4aa62cf74b` |
| Stock V1 SDD `SPEC.md` | `a45230fec13b359dd90d5e64ad358563419f150a` |
| Stock V1 SDD `DESIGN.md` | `457d0eb2f7222b3c45aa3fb7752dc962d7344c03` |
| Stock V1 SDD `TASKS.md` | `d4810235020b429a338ca6a867469a3cbbca1699` |
| Stock Core Persistence ADR | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` |
| Stock Effects/Reservations/Projections ADR | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` |
| Stock Authorization/Audit ADR | `82c30231d56293d5ee98bf27fe3758237d0bd495` |
| Stock Operational Integration/Adoption ADR | `8277cb1710de84fd000f3487e91b709ca8a28244` |
| `STOCK_CAJAS_TRAZABILIDAD.md` | `4fb54edcb118107e07f21b51bbf6b37b5ceddeff` |
| `DATA_MODEL_RULES.md` | `c63360274b4ab48fe3dc935a97093a8a1c5da5f5` |
| `MULTI_COMPANY_ACCESS.md` | `328a7efbd255ee6620e1fad7e9cd0f1527f66226` |
| `AUDIT_EVENT_POLICY.md` | `42b56f4eb2f5c1a4acbdf8de8b2730b013fac43d` |

The protected candidate baseline remained unchanged: schema blob `6678c6fb9751af53bcd005c5e28301457c7fbcdd` plus the same eleven migration blobs recorded by `STOCK-V1-E01-SCHEMA-DESIGN-001`. This is read-only planning evidence, not live database truth or authority to adopt the candidate migration chain. Any source, hash, set, owner, branch, overlap, approval, or material-scope change invalidates this proposal's T00 evidence and requires a new preflight.

## 3. Authority and traceability

### 3.1 Governing chain

This proposal is subordinate to and preserves, without reopening:

1. B01 D1's selected **Option A only**: normalized typed immutable domain evidence with transactional current projections;
2. approved `DG-01`–`DG-07` and `CD-01`–`CD-10`;
3. all 154 normative Cajas requirements and 70 acceptance scenarios in current `SPEC.md`;
4. Cajas `DESIGN.md` ownership and interaction boundaries and blocked `TASKS.md` packages `B01`–`B09`;
5. the accepted Cajas persistence, Stock-transaction, authorization, and synchronous modular-integration directions;
6. Stock V1 `DR-01`–`DR-16` and accepted `A-01`–`A-12`, especially normalized identities, hybrid traceability, reservations separate from movements, evidence-derived projections, conditional claims, semantic uniqueness, linked corrections, one-transaction mandatory Stock effects, and no fabricated history; and
7. canonical data, multiempresa, security, and audit rules.

Options B and C are not reconsidered. Self-contained captures and explicit projection versions appear only as possible qualifications inside selected Option A, never as document-primary or aggregate-revision architectures.

### 3.2 Requirement-to-design obligations

| Authority family | Logical obligation in this proposal |
| --- | --- |
| `DG-01` | Technical concepts never redefine approved public labels. |
| `DG-02` | Confirmed formula saves append immutable future-only versions; an open preparation retains its starting version. |
| `DG-03` / `CD-08` | Controls, results, differences, and resolutions are immutable; only clean explicit re-control changes global current condition to `Disponible`. |
| `DG-04` | Multiple boxes, dispatches, and partial Returns are supported; active assignment is exclusive; linkage and reuse gates remain explicit. |
| `DG-05` / `CD-10` | Capability and company checks are server obligations; denial precedes effects; no role or difference-resolution owner is inferred. |
| `DG-06` | Articles/Stock owns catalog and physical identities; Cajas owns operation evidence; Remittance, Return, and Consumption retain their business ownership; read models own no writes. |
| `DG-07` / `CD-01`–`CD-04` | Confirmed incorporation reserves; control is evidence-only; successful issuance, immutable dispatch evidence, and mandatory Stock effect are one accepted boundary. |
| `CD-05`–`CD-07` | Each Return addresses one dispatch portion; Return and Consumption share pending accounting; replacement sides remain explicit and custody-neutral. |
| `CD-09` | Every confirmation revalidates current truth; same-operation success is immediate; lagging informational projections are non-authoritative. |
| Stock V1 | Cajas records business evidence and correlations only; Stock retains reservation, movement, position, and availability ownership. |

## 4. Current baseline and material gaps

The read-only baseline has a company-scoped modular-monolith foundation, server-side operational slices, authenticated actor links, and an existing `AuditEvent`. It does not yet provide Cajas server truth.

- `AuditEvent` is complementary transversal evidence. It cannot replace typed formula, control, change, dispatch, Return, Consumption, difference, resolution, or disposition evidence.
- No dedicated server Article, Stock, or Box models exist in the current Prisma baseline.
- Existing soft `boxId` and `itemId` references are compatibility hints, not integrity-preserving or company-proven historical truth.
- Current Remittance, Consumption, and Return records do not establish immutable per-dispatch Cajas evidence or the shared pending-accounting boundary.
- Prototype/local/Zustand state is not migration evidence or server authority.
- The protected schema is modified and exactly eleven migration artifacts are untracked. Nothing in this proposal adopts, repairs, reorders, executes, or validates them.

The logical design must therefore be additive, evidence-honest, ownership-preserving, and compatible with records that may remain explicitly legacy/unlinked.

## 5. Conceptual ownership map

| Boundary | Owns | Does not own |
| --- | --- | --- |
| Articles/catalog | Shared Article and compound `Caja` identity; reusable expected-content formula and its versions | Physical selections, operation evidence, Stock positions, dispatch or disposition |
| Stock | Identified physical-unit identity, traceability applicability, reservation/release, physical/disposition consequences, positions, availability projections | Formula history, control evidence, Remittance, Return, or Consumption business acceptance |
| Cajas operation | Assignment, current preparation projection, selected composition correlation, controls/re-controls, changes, differences/resolutions, current condition and eligibility projection | Article/physical master creation, Stock ledger, Remittance issuance, Return or Consumption ownership |
| Surgery/Record | Operation context and host relationship | Article/Stock master truth or a duplicate Cajas ledger |
| Remittance | Document issuance and operational validity | Cajas preparation/control history or Return/Consumption disposition ownership |
| Return | Return confirmation and Return-owned line evidence | Mutation of dispatch evidence, Consumption-owned confirmation, or Stock master truth |
| Consumption | Consumption confirmation and Consumption-owned line evidence | Return-owned confirmation, dispatch mutation, or automatic financial truth |
| Shared dispatch accounting | One accepted disposition per dispatched scope and current pending projection | Return/Consumption business meaning, billing, or general accounting |
| Audit | Actor/company/cause/result traceability correlated to domain facts | Replacement for typed domain evidence |
| Read models | Query-oriented summaries and histories | Business writes, authorization, or confirmation truth |

The exact business owner and conceptual capability for difference resolution remain unresolved. This proposal supplies a neutral evidence boundary but assigns neither ownership nor permission.

## 6. Candidate logical entity catalog

These are required logical concepts. Their labels are not final physical names, and a later D3 design may map them differently only if it preserves every approved identity, ownership, and invariant.

### 6.1 Master and formula boundary

| Logical concept | Responsibility and identity | Candidate logical attributes and lifecycle |
| --- | --- | --- |
| **Article Identity Reference** | Integrity-preserving reference to the Articles/catalog identity; catalog owns it. Identity must remain distinguishable under the approved company/catalog applicability policy. | Stable Article identity; company applicability when required; display identity/description as optional immutable evidence capture; unit-of-measure meaning. Current catalog attributes may change, but accepted evidence references do not. |
| **Box Formula** | Associates one compound `Caja` Article identity with its ordered history of expected-content versions. | Company/applicability context; base Box identity; creation and retirement context if later approved. It contains no lot, serial, expiration, GTIN, or physical selection. |
| **Expected-Content Version** | One immutable, confirmed formula edition. Business identity is the Box formula plus a monotonic version identity; at most one is current for starting future preparations. | Effective-from acceptance point; acceptance actor/time/cause correlation; optional prior-version link; version lifecycle is append-only. Cancellation/failure creates none. |
| **Expected-Content Version Line** | Immutable expected component and quantity in one version. Identity is version plus stable line identity, not mutable Article text. | Article reference; expected quantity and business unit; optional presentation order; optional immutable descriptive capture. No physical traceability. |

### 6.2 Physical identity and operation boundary

| Logical concept | Responsibility and identity | Candidate logical attributes and lifecycle |
| --- | --- | --- |
| **Identified Physical Box Reference** | Reference to one Stock-owned company-scoped physical unit under a base `Caja`. | Stable physical identity; company; base Box identity; unique serial/internal code boundary; applicable traceability; optional compatibility provenance. Current location/availability is not stored here as Cajas history. |
| **Operation Assignment** | Links one identified physical box to one Surgery/Record operation and bounds its active use. | Company; operation identity; physical-box identity; assignment start/end facts; release reason/correlation; current-active marker as a projection concern. History is retained; at most one active assignment exists per physical identity. |
| **Current Preparation Projection** | Mutable, server-owned working truth for one assigned box in one operation. | Company; assignment; bound formula version; current projection version; latest accepted control reference; re-control-required indication; preparation lifecycle; last accepted change correlation. It owns no historical truth and is never client-authoritative. |
| **Selected Physical Preparation Line** | Current selected composition line inside the preparation projection. | Stable preparation-line identity; expected formula-line reference when applicable; selected Article/physical Stock identity; quantity/unit; lot/serial/expiration/other applicable traceability reference or captured evidence; selected-versus-expected role; acknowledgement context; current line version. |
| **Reservation Correlation** | Correlates a confirmed preparation line or identified box with the separately Stock-owned reservation commitment/effect. | Company; operation, assignment and preparation-line scope; Stock reservation identity; source checkpoint identity; reserved scope/quantity meaning; release/replace correlation. It is not the reservation ledger and creates no movement. |

### 6.3 Immutable Cajas checkpoints and differences

| Logical concept | Responsibility and identity | Candidate logical attributes and lifecycle |
| --- | --- | --- |
| **Control / Re-control Evidence** | Immutable accepted checkpoint for the complete actual composition reviewed at control or re-control. | Company; operation; assignment; formula version; checkpoint kind; sequence; accepted time/actor/cause correlation; source preparation version; result; explicit acknowledgement summary; prior checkpoint link when applicable. Never updated after acceptance. |
| **Control Evidence Line** | Immutable selected component evidence at the checkpoint. | Evidence identity; preparation-line/source identity; Article and physical Stock references; quantity/unit; captured traceability; expected-line reference; expected/actual relation; acknowledged difference reference where applicable; optional immutable description. |
| **Composition Change Evidence** | Append-only explanation of every accepted post-control change. | Company; assignment; prior and resulting preparation versions; change kind (add/remove/replace/quantity/traceability); actor/time/cause correlation; affected prior/new line identities; reservation correlations; no mutation of the prior control. |
| **Difference Evidence** | One immutable identified discrepancy arising from an accepted checkpoint. | Company; operation/assignment; originating control, dispatch, Return, or other approved evidence reference; affected line/scope; difference kind and observed facts; opened correlation; current open/closed interpretation derived from appended resolution evidence. |
| **Difference Resolution Evidence** | Append-only evidence addressing one difference without rewriting it. | Company; difference identity; resolution sequence; actor/time/cause; explanation and supporting reference; accepted outcome. Owner/capability is intentionally unassigned. Closing the final difference does not itself make the box `Disponible`. |

### 6.4 Dispatch and shared pending accounting

| Logical concept | Responsibility and identity | Candidate logical attributes and lifecycle |
| --- | --- | --- |
| **Dispatch Evidence** | One immutable `Contenido despachado` accepted only with an operationally valid Remittance. Each dispatch has independent identity and accounting. | Company; operation; assignment/physical box; Remittance identity; source control/re-control evidence; dispatch sequence; accepted time/actor/cause; correction/annulment correlation; idempotency correlation. Original evidence remains after correction. |
| **Dispatch Evidence Line** | Immutable physical content included in that dispatch. | Dispatch identity; source controlled line; Article and physical identity/traceability; dispatched quantity/unit; immutable descriptive capture; semantic line identity; Stock effect correlation. |
| **Per-Dispatch Pending-Accounting Boundary** | Shared coordination aggregate for Return and Consumption against one dispatch. Historical authority remains the dispatch and accepted dispositions; this concept maintains bounded pending scope. | Company; dispatch; current accounting version; initialized dispatched scope; cumulatively disposed scope; pending scope; reconciliation marker. It owns no Return/Consumption business content. |
| **Accepted Disposition Evidence** | Append-only shared acceptance fact that one dispatched quantity or physical identity received exactly one disposition. | Company; dispatch line/scope; accepted disposition meaning (returned, consumed, missing, damaged, under review, or another approved meaning); quantity/unit or physical identity; originating Return/Consumption line; accepted time; Stock consequence correlation; semantic idempotency identity. |

### 6.5 Separate Return and Consumption evidence

| Logical concept | Responsibility and identity | Candidate logical attributes and lifecycle |
| --- | --- | --- |
| **Return Confirmation Evidence** | Immutable Return-owned confirmation against exactly one dispatch and one declared portion. | Company; owning Return identity; dispatch identity; declared portion; confirmation result; optional plain-language note; actor/time/cause; pending-accounting version observed; retry correlation. |
| **Return Evidence Line** | Immutable Return classification for a line/physical scope, including unchanged, consumed, missing, damaged, added, or replacement evidence as approved. | Return evidence identity; dispatch line/scope when applicable; quantity/unit; Article/physical identity and traceability; classification; human validation evidence; accepted-disposition reference when the line consumes pending scope; optional difference reference. Added lines need not consume dispatched scope. |
| **Replacement Pair Evidence** | Preserves both original dispatched side and received replacement side without inferring custody, compensation, availability, or movement. | Return line; original dispatch line/physical identity; received Article/physical identity and traceability; relationship explanation; under-review correlation; explicit Stock-effect correlation only if separately accepted. |
| **Consumption Confirmation Evidence** | Immutable Consumption-owned confirmation linked to the applicable dispatch and allowed to be partial. | Company; owning Consumption identity; dispatch identity; actor/time/cause; pending-accounting version observed; retry correlation. |
| **Consumption Evidence Line** | Immutable Consumption classification for a dispatched line/scope. | Consumption evidence identity; dispatch line/scope; quantity/unit or physical identity; accepted-disposition reference; Stock consequence correlation; recognition link when Return already created the single consumed disposition. |

### 6.6 Current condition, correlation, audit, and reads

| Logical concept | Responsibility and identity | Candidate logical attributes and lifecycle |
| --- | --- | --- |
| **Current Condition / Eligibility Projection** | Narrow mutable Cajas projection for present unit condition and operation/reuse/dispatch eligibility. | Company; physical box; assignment; projection version; current condition when applicable; open-difference count; pending-dispatch scope; re-control requirement; operation-ended fact; dispatch/reuse eligibility with reasons; source evidence watermark. It never replaces evidence or Stock availability. |
| **Command Idempotency / Correlation Record** | Associates semantic command identity, attempt correlations, accepted result, and domain/Stock/audit references. | Company; source operation; checkpoint; applicable line/effect scope; intent fingerprint meaning; first/last attempt context; outcome; accepted evidence references; retention state. Transport request identity is correlation only. |
| **Audit Correlation** | Shared correlation context from each critical attempt/acceptance to `AuditEvent` and typed evidence. | Company; actor; cause; action; target/evidence identities; result; attempt correlation. It supplements rather than duplicates domain facts. |
| **Projection Reconciliation Record** | Evidence of comparison between authoritative immutable facts and a current projection, without changing evidence. | Company; projection kind/scope; evidence watermark; observed projection version; comparison time/actor/process; match/mismatch result; approved repair correlation if any. |
| **Read-Model Projection** | Non-owning query shape for `/cajas`, Articles/Stock consultation, Surgery/Record operation views, histories, counts, and eligibility explanations. | Company scope; source watermark/freshness; denormalized identity and summary fields; updating/non-current indication. No command, capability, or write ownership. |

## 7. Relationship and cardinality map

The following cardinalities are logical requirements, not physical relation syntax.

1. One compound Box Article has zero or more expected-content versions; each version has one or more immutable version lines. One version may be designated current for **future starts**, while every preparation binds exactly one version at creation and never drifts to a later version.
2. One compound Box Article has zero or more identified physical boxes. Each identified physical box belongs to exactly one company scope and one base Box identity under the later-approved catalog/company policy.
3. One Surgery/Record operation may have zero or more operation assignments. One identified physical box may have many assignments over time but no more than one active assignment at once.
4. One active assignment has at most one current preparation projection and one or more current selected lines. Each confirmed incorporation reserves the identified physical box and each confirmed selected component through independently addressable Stock scopes. Each component scope follows its applicable approved identity, quantity, and traceability depth; the exact physical representation and claim mechanism remain deferred.
5. One assignment has zero or more controls/re-controls; each accepted checkpoint has one or more immutable lines and refers to exactly one formula version and one accepted preparation version.
6. One accepted post-control change links one prior current preparation version to one resulting version. It may affect multiple lines but never edits prior control evidence.
7. One accepted checkpoint may identify zero or more differences. One difference has zero or more appended resolution records and is interpreted closed only under the approved resolution evidence rules.
8. One assignment may have zero or more dispatches. Each dispatch belongs to one operation, one identified box, one Remittance, and one latest eligible control/re-control; each dispatch has one or more immutable lines.
9. A controlled/reserved line may contribute to multiple dispatches over time, but cumulative accepted dispatch cannot exceed its applicable controlled and reserved scope. The same physical identity or quantity portion cannot belong to two current dispatches.
10. Each dispatch has exactly one shared pending-accounting boundary and zero or more accepted dispositions. It may have multiple partial Return confirmations and multiple partial Consumption confirmations in either order.
11. Each Return confirmation references exactly one dispatch. Each Consumption confirmation references exactly one applicable dispatch. One confirmation has one or more lines; cross-dispatch bulk input must decompose into independently bounded confirmations rather than collapse accounting.
12. Each accepted disposition references exactly one originating Return or Consumption line and exactly one dispatched scope. A dispatched quantity or physical identity accepts at most one disposition. A consumed classification created by Return is recognized, not recreated, by later Consumption.
13. A Return replacement pair references one original dispatched side and one received side; either side may have different physical identity. The relationship alone establishes no custody or Stock movement.
14. Correct component disposition may advance component-level eligibility, but global box reuse requires all dispatched scope accounted, all differences closed, operation ended, and a current clean `Disponible` condition established through the approved checkpoint.
15. Every critical evidence/projection update has company-scoped idempotency and audit correlation. Read models may reference all source concepts but have cardinality to no write owner.

## 8. Invariant ownership matrix

No frontend, local store, read model, or generic audit record enforces these invariants.

| Invariant | Owning enforcement boundary | Coordinated participants |
| --- | --- | --- |
| Formula versions are immutable and future-only | Articles/catalog formula boundary | Cajas preparation binds the accepted version |
| One identified box has at most one active operation | Cajas assignment boundary, validated against Stock-owned physical identity | Surgery/Record context |
| Browsing/draft does not reserve; confirmed incorporation does | Stock reservation boundary invoked by Cajas confirmation | Cajas reservation correlation |
| Replacement/removal/cancellation changes only applicable undispatched reservations | Stock reservation lifecycle | Cajas current preparation and change evidence |
| Control/re-control is evidence-only | Cajas control boundary | Stock receives no movement command |
| Post-control change blocks dispatch until successful re-control | Cajas preparation/eligibility boundary | Remittance queries current eligibility |
| Historical evidence is append-only | Owning domain of each evidence record | Audit correlates; projections never rewrite |
| Cumulative dispatch does not exceed controlled/reserved scope | Cajas dispatch eligibility plus Stock conditional scope | Remittance issuance and shared atomic boundary |
| Operationally valid Remittance, dispatch evidence, and mandatory Stock effect succeed together | Cross-domain critical-confirmation boundary | Remittance, Cajas, Stock |
| Each Return addresses one dispatch and only its declared portion | Return boundary | Shared pending accounting |
| Return and Consumption cannot double-dispose | Shared per-dispatch accounting boundary | Return, Consumption, Stock |
| Added/replacement comparison infers no custody or movement | Return evidence boundary | Stock accepts only an explicit separate effect |
| Only clean explicit re-control restores global `Disponible` | Cajas condition/eligibility boundary | Difference evidence and Stock facts |
| Retry cannot duplicate domain or Stock consequence | Company-scoped semantic idempotency boundary | Every participating domain and audit correlation |
| Projection is current acceleration, never history | Owning domain projection boundary | Reconciliation reads immutable evidence |
| Cross-company access is non-disclosing and side-effect-free | Server authorization/company boundary before domain mutation | Every domain repeats resource-company validation |
| Difference-resolution ownership/capability is not inferred | **Unresolved human business decision** | Neutral evidence structures only |

## 9. Constraint families required at physical design

This section defines required outcomes, not final constraints or DDL.

1. **Company consistency:** every operational identity, evidence item, line, correlation, projection, and cross-domain reference must resolve within one authorized company; shared-catalog applicability must be explicit rather than inferred.
2. **Exclusive active assignment:** at most one active operation assignment per identified physical box; historical assignments remain many-over-time.
3. **Immutable/future-only versioning:** accepted formula versions and their lines cannot be edited; a newly accepted version affects only preparations started afterward; one preparation retains one starting version.
4. **Append-only evidence:** accepted controls, changes, dispatches, Returns, Consumptions, dispositions, differences, resolutions, corrections, and their lines cannot be destructively changed or deleted as ordinary workflow behavior.
5. **Cumulative dispatch ceilings:** accepted dispatch by controlled line/physical identity cannot exceed the latest applicable controlled and reserved scope, and undispatched remainder remains reserved.
6. **Cumulative disposition ceilings:** total accepted dispositions cannot exceed each dispatch line/scope and pending cannot become negative.
7. **Exactly-one accepted disposition:** one dispatched quantity slice or identified physical unit may be accepted once across Return and Consumption disposition meanings; conflicting reuse fails rather than overwriting.
8. **Company-scoped retry uniqueness:** semantic identity is unique at company + source operation + checkpoint + applicable line/effect scope; changed material intent conflicts; transport attempt identity alone cannot create another consequence.
9. **Stale-write/current-projection versioning:** formula save, assignment, preparation, control/re-control, dispatch, Return, Consumption, difference resolution, pending accounting, and projection repair must compare current authoritative version/watermark before acceptance.
10. **Reference completeness:** accepted line evidence retains the Article, physical identity, quantity/unit, and applicable traceability needed to interpret the fact after masters change.
11. **Correction linkage:** annulment, reversal, or correction appends a new attributable fact linked to the original and cannot exceed still-reversible scope.
12. **No false global availability:** component availability cannot imply identified-box reuse while pending dispatch scope, open differences, active operation, or missing clean re-control remains.

## 10. Index categories for later physical design

No final index name, key order, or implementation is selected. D3 must prove coverage of these access and enforcement categories:

| Category | Required logical access paths |
| --- | --- |
| Company + identity | Article/Box identity, physical-unit code, operation, evidence identity, and every integrity lookup within company scope |
| Active assignment | Current assignment by physical box; boxes assigned to one operation; conflict detection without historical scan |
| Chronological history | Formula versions, controls/re-controls, changes, differences/resolutions, dispatches, Returns, Consumptions, dispositions, corrections, and audit correlation by scope and acceptance order |
| Dispatch / pending accounting | Dispatch lines, cumulative dispatched scope, pending scope, dispositions, partial Return/Consumption history, and correction chains |
| Idempotency lookup | Semantic identity and transport-attempt correlation within company, including accepted result replay and intent-conflict inspection |
| Evidence / projection reconciliation | Projection source watermark/version to authoritative evidence, mismatch lookup, and repair-history inspection |
| Read-model queries | Box SKU search/description, physical-unit code search, current-condition counts, operation views, eligibility reasons, and honestly fresh history summaries |

## 11. Transaction and atomicity boundary alternatives

Accepted directions require synchronous modular orchestration and one atomic database transaction for a critical business confirmation and every mandatory Stock effect. Asynchronous delivery is permitted only for optional post-commit derivatives. The open choice is **responsibility placement**, not whether mandatory outcomes may become eventually consistent.

| Alternative | Responsibility model | Benefits | Risks/tradeoffs |
| --- | --- | --- | --- |
| **T-A — Owning source domain coordinates** | Formula, Cajas, Remittance, Return, or Consumption owner coordinates its confirmation and invokes participating boundaries inside one atomic unit. | Clear business entry owner; local invariant context. | Repeated coordination patterns; source domain may absorb foreign rules. |
| **T-B — Neutral application confirmation boundary** | A thin application boundary coordinates separately owned domain decisions and the common atomic unit. | Consistent no-partial behavior; domain ownership can remain explicit. | Can become an oversized technical orchestrator or hidden policy owner. |
| **T-C — Checkpoint-specific coordinators** | Assignment, dispatch, Return, and Consumption each use a dedicated coordinator contract while domains retain validation ownership. | Small transaction scopes and explicit participants. | More contracts; cross-checkpoint consistency and naming governance are harder. |

**D2 selection approved by Franco on 2026-07-20:** require one named responsibility owner per critical checkpoint and one atomic acceptance envelope, while keeping domain authorization and invariant validation in each owning boundary. T-A, T-B, and T-C remain considered responsibility-placement alternatives for later exact checkpoint mapping. This D2 selection does not select an orchestrator, transaction API, isolation level, or source placement.

Minimum atomic outcomes:

- assignment/incorporation: assignment or preparation acceptance, reservation commitment, current projection, typed correlation, and required audit result;
- coherent replacement/removal/cancellation: current preparation change, reservation release/replacement, change evidence, projection, and audit;
- control/re-control: immutable evidence, differences where applicable, current projection/version, eligibility/condition effect, and audit, with no Stock movement;
- dispatch: operationally valid Remittance, immutable dispatch header/lines, pending-accounting initialization/update, mandatory Stock dispatch effect, projection, idempotency, and audit;
- Return/Consumption: owning confirmation evidence, shared accepted dispositions, pending projection, mandatory Stock consequence, condition/eligibility consequence, idempotency, and audit;
- difference resolution: appended resolution evidence and current interpretation, without assigning its owner/capability or bypassing clean re-control.

## 12. Concurrency strategy families

Franco approved the scoped invariant-by-invariant strategy and required conflict outcomes below for D2 on 2026-07-20. Families may be combined, but the exact physical primitive remains unselected.

| Invariant boundary | Viable families | Required conflict outcome |
| --- | --- | --- |
| Active assignment | Integrity-enforced active uniqueness; conditional claim against physical identity; serialized physical-identity scope | At most one assignment succeeds; loser creates no evidence/effect. |
| Formula save/current version | Optimistic current-version comparison; serialized formula scope; conditional current-pointer advance | Stale save creates no version and requires reload. |
| Preparation selection/reservation | Conditional Stock claim at identified-unit or quantity-position scope; scoped serialization; versioned reservation projection | No oversubscription; failed replacement keeps prior reservation. |
| Control/re-control | Optimistic preparation-version comparison; scoped lock on assignment/preparation; conditional evidence append plus projection advance | Stale composition creates no control evidence. |
| Dispatch ceiling | Conditional remaining-controlled/reserved claim; scoped serialization by assignment/controlled line; versioned dispatch-remainder projection | No overlapping dispatch; failed issuance leaves no dispatch/Stock effect. |
| Shared Return/Consumption disposition | Conditional decrement/claim by dispatch line/physical scope; scoped serialization by dispatch; immutable semantic-slice uniqueness plus version check | One disposition wins; conflict creates no second evidence/effect. |
| Difference closure/current condition | Optimistic difference/projection version; serialized assignment condition scope; conditional transition after all closures and clean re-control | No stale close or false `Disponible`. |
| Projection repair | Compare-and-advance projection version; maintenance lease by projection scope; shadow rebuild followed by guarded swap | Evidence unchanged; stale or concurrent repair cannot overwrite newer projection. |

Global serialization is not the default. Minimum contention scope is the affected identified physical identity or compatible Stock position; a multi-scope confirmation may widen only to all scopes whose atomic invariant would otherwise be violated.

## 13. Idempotency and correlation alternatives

The inherited minimum is semantic uniqueness by company + source operation + checkpoint + applicable line/effect; transport request identities correlate attempts only.

### 13.1 Scope alternatives

- **I-S1 — Confirmation-level:** one semantic identity for the whole accepted checkpoint. Simple replay, but partial line effects still need deterministic subordinate identity.
- **I-S2 — Line/effect-level:** one semantic identity for each consequence. Precise partial retries, but risks partial acceptance unless enclosed by the checkpoint transaction.
- **I-S3 — Hierarchical:** one confirmation identity with deterministic line/effect identities. Strongest whole-result replay and line-level duplicate protection, with greater governance cost.

### 13.2 Origin alternatives

- server-issued command identity before confirmation;
- stable owning-document/operation checkpoint identity;
- client-supplied attempt identity accepted only as transport correlation, never sole semantic identity.

### 13.3 Retention alternatives

- retain semantic acceptance records for the same lifetime as immutable evidence;
- archive old attempt metadata while retaining the semantic acceptance tombstone and result reference;
- bounded retry records only, permissible only if another permanent uniqueness boundary still prevents duplicate business consequences.

### 13.4 Replay alternatives

- return the original accepted result and evidence references for identical intent;
- report accepted/already-accounted and require authoritative reread;
- reject ambiguous retries when prior result cannot be proven. Re-executing effects is never a replay strategy.

**D2 selection approved by Franco on 2026-07-20:** I-S3 with permanent semantic acceptance identity, bounded attempt-detail retention, original-result resolution when safe, and conflict on changed material intent. Exact physical origin, replay API contract, and archive depth remain deferred.

## 14. Shared Return/Consumption accounting contract

The shared boundary is an operational dispatch-accounting coordination concept, not financial accounting and not a new owner of Return or Consumption.

1. Dispatch evidence initializes the maximum accountable line/physical scope.
2. Return and Consumption each validate and append their own immutable confirmation and line evidence.
3. The same atomic confirmation conditionally appends shared accepted disposition evidence and advances pending accounting.
4. Every accepted disposition points back to exactly one owning line. It never erases or absorbs that line.
5. A Return line classified as consumed creates the single consumed disposition and corresponding Stock consequence; a later Consumption interaction recognizes that accepted identity as already accounted.
6. Correct return, consumption, missing, damaged, and under-review meanings are mutually exclusive for the same accepted quantity slice or physical identity.
7. Added/replacement received material remains outside dispatched pending scope unless an explicit approved relation says otherwise; comparison alone creates no Stock entry/exit.
8. No technical orchestrator or service owner is selected here. Franco must approve the cross-domain responsibility alternative in §11.

## 15. Minimum Stock integration contract

This proposal integrates only the Stock depth required by approved Cajas checkpoints; it does not design full Stock V1.

- Cajas references normalized Article and identified-unit identities supplied by Articles/Stock.
- Confirmed incorporation reserves the identified box and each confirmed selected component through independently addressable Stock scopes. Each component scope follows its applicable approved identity/quantity/traceability depth. Exact physical representation and claim mechanism remain deferred.
- Cajas stores reservation and mandatory-effect correlations, not duplicate Stock balances or movements.
- Control/re-control sends no Stock movement consequence.
- Dispatch, Return, Consumption, review, added/replacement, correction, and reversal effects are explicit Stock-owned consequences only where approved.
- Stock validates compatible company, position/custody, availability, traceability, reservation, and semantic uniqueness inside the common atomic boundary.
- Stock availability remains an evidence-derived Stock projection. Cajas condition/eligibility is separate and cannot override it.
- No full Box-composition Stock model, deposit redesign, valuation, costing, replenishment, purchasing, or financial behavior is introduced.

This inherited reservation scope must preserve no oversubscription, granular release, partial dispatch, reservation of undispatched remnants, replacement atomicity, and no double disposition. D2 selects no table, field, API, claim algorithm, locking primitive, or other physical representation.

## 16. Multiempresa, security, audit, and no-leakage obligations

1. Authenticated actor, active/target company membership, conceptual capability, resource company, and business invariant are separate checks.
2. Client-provided company, actor, identity, version, or eligibility claims are never authoritative.
3. Every query, mutation, relation, uniqueness scope, idempotency identity, projection, reconciliation, and read model is company-safe.
4. Cross-company references are rejected without confirming existence. Authorization and company denial occur before business side effects; any failure inside an accepted atomic envelope rolls back the whole confirmation.
5. UI disabled states and read-model filtering are not security controls. Backend domain and policy boundaries remain mandatory; RLS, if separately approved, is defense in depth only.
6. Critical accepted actions and security-relevant denied attempts follow the later-approved audit policy. A denied action creates no domain, Stock, projection, or **success** audit effect.
7. Typed domain evidence states what was accepted. Audit states who attempted/caused it, for which company, why, when, and with what result. Correlation joins them without collapsing either.
8. External or restricted readers receive filtered history; no traceability, identifier, count, conflict, retry, or reconciliation response may leak another company's facts.
9. This design names no Auth provider, role, capability identifier, mapping, override, or difference-resolution permission.

## 17. Compatibility and cutover alternatives

### 17.1 Mandatory historical-safety rules

- Soft references, text, prototype state, current quantities, and UI snapshots are not proof of company, Article, physical identity, checkpoint acceptance, or Stock history.
- No mapping may be created without independently verified identity and company evidence.
- No historical formula, reservation, movement, control, dispatch, Return, Consumption, or disposition may be invented.
- Existing records without verified mapping remain explicitly **legacy/unlinked** and readable only under a bounded compatibility policy.
- One bounded slice has one authoritative writer; shadow comparison creates no business effect.
- Accepted new evidence survives technical rollback.

### 17.2 Mapping alternatives

| Alternative | Treatment | Tradeoff |
| --- | --- | --- |
| **M-A — Verified mapping only** | Link only records with independently proven company and business/physical identities; all others remain legacy/unlinked. | Strongest truth; incomplete linkage remains visible. |
| **M-B — Verified business-document mapping without physical assertion** | Link a legacy document context while explicitly leaving Article/physical identity unresolved. | Better navigation; requires strict prevention of operational use. |
| **M-C — No legacy linking** | Start authoritative relationships only for post-cutover accepted facts. | Simplest integrity; weakest continuity for historical navigation. |

Inferred or probabilistic mapping is not viable for authoritative evidence.

### 17.3 Candidate cutover alternatives — all pending

- **C-A — Write-forward by bounded operation slice:** new operations after an approved boundary use the new truth; prior operations remain legacy.
- **C-B — Checkpoint-forward for verified open operations:** only an explicitly verified open operation may begin new evidence at a named checkpoint, without claiming prior history.
- **C-C — Company/slice pilot with legacy coexistence:** one approved company and bounded process uses one new writer while all others remain legacy; no environment or company is selected here.

**D2 selection approved by Franco on 2026-07-20:** M-A plus C-A as a conceptual direction, retaining M-B only for non-operational navigation where physical identity is intentionally unresolved. This aligns with no-invented-backfill and reversible write-forward adoption. No cutover boundary, company, environment, writer, rollout, or production action is selected or authorized.

## 18. Projection reconciliation, repair, and rollback alternatives

### 18.1 Reconciliation alternatives

- **R-A — On-demand evidence fold:** rebuild a bounded projection from immutable evidence when requested or when inconsistency is suspected.
- **R-B — Scheduled comparison:** compare maintained and independently reconstructed results and report mismatches without mutation.
- **R-C — Continuous watermark verification:** each projection advance records an evidence watermark and background comparison checks continuity.

### 18.2 Repair alternatives

- **P-A — Guarded in-place projection replacement** from a verified reconstruction while evidence remains unchanged.
- **P-B — Shadow projection rebuild and approved pointer/routing swap** after comparison.
- **P-C — Disable affected writes and serve evidence-backed degraded reads** until a separately approved repair occurs.

No projection-only manual balance/status edit may be accepted as repair. Every repair must be company-scoped, repeatable, version-guarded, audited, and unable to overtake newer accepted evidence.

### 18.3 Rollback obligations

1. Disable affected new writes before reverting writers or routing.
2. Preserve every accepted formula version, domain evidence item, disposition, Stock consequence, and audit correlation.
3. Restore readers/adapters compatible with retained evidence; never delete evidence to make older code fit.
4. Keep legacy compatibility until explicit retirement criteria pass.
5. Reconcile current projections after rollback; repair them only from authoritative evidence.
6. Neutralize an accepted business effect only through separately approved linked correction/reversal evidence, never technical deletion.
7. Rehearse forward, rollback, and re-forward behavior for retries, stale writes, partial dispatch/accounting, and projection mismatch before a named environment is approved.

**D2 selection approved by Franco on 2026-07-20:** R-C plus R-B for detection and P-B for higher-risk repairs, with P-C as the safe stop posture. Exact frequency, tooling, authority, tolerance, repair owner, and monitoring remain open.

## 19. Rollout decomposition and downstream gates

No environment, command, schedule, company, data slice, or operator is selected. Every stage requires a fresh T00, exact Task Brief, exclusive ownership, independent review, and explicit Franco approval where protected.

1. **D2-R — Independent conceptual/logical review:** completed read-only/no-fix before the recorded decision.
2. **D2-A — Franco selection:** completed on 2026-07-20 as recorded in §20; approval authorizes no writer or later gate.
3. **D3 — Physical schema design/edit:** not authorized; it requires a separate protected task and explicit Franco approval. No migration artifact or execution is implied.
4. **D4 — Migration artifact design/review:** separate forward/compatibility/rollback evidence; no database execution.
5. **D5-EACH — Named-environment migration gate:** one explicit approval per named environment, with backups/recovery, operator, commands, no-invented-backfill verification, and stop conditions.
6. **D6 — Backend contracts:** separate tasks for each owning domain, authorization/company checks, audit, idempotency, concurrency, transaction responsibility, reconciliation, and APIs.
7. **D7 — Integration/UI slices:** independently gated Cajas, Stock, Remittance, Return, Consumption, read-model, and sensitive Surgery/Record work. Read models remain non-owning.
8. **D8 — Independent verification and rollback readiness:** verify all 154 requirements / 70 scenarios, company isolation, immutable evidence, concurrency, idempotency, Stock reconciliation, compatibility, and rollback.
9. **D9 — Rollout decision per named environment/slice:** explicit go/no-go, one writer, observability, support, rollback rehearsal, and stabilization evidence.
10. **APPLY / production:** separate final authorization; never implied by D2–D9.

## 20. Decision register — Franco selections recorded

On 2026-07-20, Franco approved without amendments the proposal's recommended choices for `D2-01`–`D2-10` and `D2-12`. The alternatives and tradeoffs below remain visible as considered and not selected for D2. `D2-11` remains inherited and closed by already approved rules. `D2-13` remains unresolved.

| ID | Human decision | Alternatives / non-binding recommendation | Status |
| --- | --- | --- | --- |
| `D2-01` | Entity and line granularity | **Selected:** dedicated immutable lines for formula, control, dispatch, Return, and Consumption evidence. Selectively grouped typed lines was considered and not selected. | **APPROVED — Franco, 2026-07-20** |
| `D2-02` | Self-contained control and dispatch captures | **Selected:** references plus sufficient immutable descriptive/traceability captures. Live references only and fully self-contained typed capture were considered and not selected. | **APPROVED — Franco, 2026-07-20** |
| `D2-03` | Current projection boundaries | **Selected:** separate narrow preparation, pending-accounting, and condition projections. One broad projection and the hybrid alternative were considered and not selected. | **APPROVED — Franco, 2026-07-20** |
| `D2-04` | Cross-domain atomicity responsibility | **Selected:** one named responsibility owner per critical checkpoint and one atomic acceptance envelope, with authorization and invariant validation retained by each owning domain. T-A, T-B, and T-C remain considered responsibility-placement alternatives; no technical orchestrator, transaction API, isolation level, or source placement is selected. | **APPROVED — Franco, 2026-07-20** |
| `D2-05` | Concurrency family per invariant | **Selected:** the scoped invariant-by-invariant strategy and required conflict outcomes in §12, using an approved family or combination per boundary and avoiding global serialization by default. The exact physical primitive remains deferred. | **APPROVED — Franco, 2026-07-20** |
| `D2-06` | Idempotency scope, origin, retention, and replay | **Selected:** hierarchical semantic identity, permanent semantic acceptance identity, bounded attempt-detail retention, original-result resolution when safe, and conflict on changed material intent. Other §13 scope, origin, retention, and replay alternatives were considered and not selected. | **APPROVED — Franco, 2026-07-20** |
| `D2-07` | Projection reconciliation and repair | **Selected:** continuous watermark verification plus scheduled comparison (`R-C` + `R-B`), shadow rebuild for higher-risk repair (`P-B`), and `P-C` as safe stop posture. Other §18 alternatives were considered and not selected; frequency, tooling, authority, tolerance, repair owner, and monitoring remain later concerns. | **APPROVED — Franco, 2026-07-20** |
| `D2-08` | Verified mappings versus legacy/unlinked | **Selected:** verified mapping only (`M-A`), with `M-B` limited to visibly non-operational navigation where physical identity remains unresolved. `M-C` and operational use of unresolved mappings were considered and not selected. | **APPROVED — Franco, 2026-07-20** |
| `D2-09` | Candidate cutover policy | **Selected as D2 conceptual direction only:** write-forward by bounded operation slice (`C-A`), subject to later named-slice evidence and separate approval. `C-B` and `C-C` were considered and not selected. No cutover boundary, company, environment, writer, rollout, or production action is approved. | **APPROVED FOR D2 ONLY — Franco, 2026-07-20** |
| `D2-10` | Rollout and rollback sequence | **Selected as documentary gates only:** the downstream sequence in §19 and rollback obligations in §18.3. Alternatives remain constrained by those obligations. No stage after D2, named environment, command, schedule, rollout, production action, or APPLY is approved. | **APPROVED FOR D2 ONLY — Franco, 2026-07-20** |
| `D2-11` | Inherited Stock reservation scope | Approved `CD-01`/`CD-02`, `DR-11`, and `A-06` require reservation of the identified box plus independently addressable scopes for every confirmed selected component, each at its applicable identity/quantity/traceability depth. Exact physical representation and claim mechanism remain deferred; no full Stock V1 design is selected. | **CLOSED BY APPROVED CD-01/CD-02, DR-11 AND A-06 — no new Franco decision** |
| `D2-12` | Detailed evidence retention/archive | **Selected:** immutable evidence lifetime independent from bounded attempt metadata. Full hot retention, hot/cold archive with permanent identity, and the legal/business schedule remain considered implementation alternatives; no archive depth or retention schedule is physically selected. | **APPROVED — Franco, 2026-07-20** |
| `D2-13` | Difference-resolution business owner/capability | Must be defined separately by Franco; this schema remains ownership-neutral until then. | **UNRESOLVED — no recommendation** |

These selections close D2 only. They do not select final physical representation, Prisma names/types, DDL/SQL, migration or backfill mechanics, Auth/permissions, implementation, cutover execution, rollout, production, or APPLY. `D2-13` cannot be pre-empted by a physical schema choice while it remains unresolved.

## 21. Approval checklist

### Conceptual/logical model

- [x] Ownership boundaries in §5 approved for D2.
- [x] Logical concepts and attributes in §6 approved for D2 without treating labels as physical names.
- [x] Relationship/cardinality map in §7 approved for D2.
- [x] Invariant ownership and constraint families in §§8–9 approved for D2.
- [x] Index categories in §10 approved only as obligations for a separately authorized D3.

### Human choices

- [x] Franco selected the recommended choices for `D2-01`–`D2-10` and `D2-12` without amendments on 2026-07-20.
- [x] `D2-11` confirmed as inherited and closed by approved `CD-01`/`CD-02`, `DR-11`, and `A-06`; exact physical representation and claim mechanism remain deferred.
- [x] `D2-13` confirmed unresolved; no owner, role, or capability is inferred.
- [x] Stock and operation ownership remain separate.
- [x] Return and Consumption retain separate evidence ownership while sharing per-dispatch pending accounting.
- [x] Alternatives and tradeoffs remain recorded as considered and not selected for D2.

### Compatibility, safety, and authorization

- [x] `AuditEvent` remains complementary and is not domain evidence.
- [x] Soft references are not historical truth; invented backfill remains prohibited.
- [x] Mapping, candidate cutover, reconciliation, and rollback directions are approved for D2 only as recorded in `D2-07`–`D2-10`; no cutover or rollout is authorized.
- [x] Company isolation, denial-before-side-effect, non-disclosure, and server authority obligations are approved for D2.
- [x] D3, `prisma/schema.prisma`, migrations, backfill, implementation, Auth/permissions, rollout, production, and APPLY remain explicitly unauthorized.

## 22. Validation and stop conditions

This D2 approval record is valid only if:

1. exactly this file was created and its exclusive lock is released at handoff;
2. selected Option A alone is translated and Options B/C are not reopened;
3. all required entities, relationships, cardinalities, attributes, invariants, constraint families, index categories, atomicity, concurrency, idempotency, audit, multiempresa, compatibility, reconciliation, and rollback concerns are covered;
4. Stock and operation ownership remain separate, while shared Return/Consumption pending accounting and immutable evidence remain explicit;
5. every approved Franco selection (`D2-01`–`D2-10` and `D2-12`) remains visible with considered alternatives/tradeoffs; `D2-11` remains visibly inherited/closed without selecting its physical representation or claim mechanism; and `D2-13` remains unresolved without recommendation, owner, or capability;
6. no final physical name/type/key order, Prisma/DDL syntax, migration, API, payload, provider, Auth/role mapping, technical orchestrator, difference-resolution owner, environment, implementation, or APPLY choice appears;
7. the schema blob and eleven-artifact migration set remain unchanged from T00; and
8. scoped diff and whitespace validation pass without placeholders.

Stop and return to Franco if a source/hash/set drifts, target overlap appears, another file is required, a physical choice is needed to continue, Stock V1 must be expanded, a protected gate would be crossed, or this design cannot remain conceptual/logical.

## 23. Explicit non-authorization statement

Creation, review, or D2 approval of this proposal does not authorize D3, `prisma/schema.prisma`, any final model/field/relation/index/constraint/type, DDL/SQL, migration content or command, seed, database access, data mapping/backfill, provider change, Auth, permissions, role/capability mapping, RLS, API/service/validator, transaction implementation, difference-resolution owner, Cirugías/Expediente/Cajas host change, Remittance/Return/Consumption implementation, UI/read-model implementation, dependency, Git mutation, cutover execution, environment action, rollout, production, or APPLY.

D2 is now closed as a documentary conceptual/logical decision gate. D3 physical schema work and every later artifact or action require their own exact authorization.
