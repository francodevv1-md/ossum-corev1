# ADR — Stock V1 Core Persistence Boundaries

## Metadata

- **Status:** ACCEPTED — A-01–A-03 approved by Franco as part of blanket approval A-01–A-12 on 2026-07-20
- **Date:** 2026-07-20
- **Owner:** Backend/Data Architecture
- **Approver:** Franco
- **Approval date:** 2026-07-20
- **Scope:** Stock V1 core persistence boundaries A-01, A-02, and A-03 only
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** A-01–A-03 were accepted exactly as verified recommendations within Franco's blanket approval A-01–A-12; this ADR remains bounded to those three decisions.
- **Authorization effect:** None for schema, migration, or implementation. Approval authorizes only the next documentary SDD execution-plan phase.

Approval of this ADR accepts only the three architecture directions recorded below. It does not authorize a Prisma model, field, relation, constraint, index, migration, seed, reconciliation, opening-position load, API, service, permission, Auth behavior, UI implementation, protected-file change, or APPLY. The only authorized continuation is the next documentary SDD execution-plan phase.

## Context

The approved Stock V1 domain baseline requires Stock to be company-scoped, explainable, and associated with an Article, an applicable deposit or custody context, and the approved traceability depth. The approved UX baseline must distinguish Article summaries from deposit/custody positions and from applicable lot, expiration, or identified-unit detail. Critical actions must operate on an explicit actionable scope rather than an ambiguous aggregate.

Current repository persistence does not provide normalized production identities for Article, deposit, Stock position, or identified physical unit. Existing Remittance, Consumption, and Return line references and traceability values are useful compatibility evidence, but their soft identifiers and repeated text attributes cannot establish final Stock identity or integrity. Prototype Stock rows and local/mock state are not migration authority or productive Stock truth.

The accepted Cajas Stock transaction ADR selects explicit reservations plus append-only Stock transactions for its bounded checkpoint effects. This ADR accepts that direction as an inherited constraint and does not reopen its transaction, reservation, projection, atomicity, or idempotency decisions. The present question is narrower: which identities and traceability granularity must a later persistence design be able to represent.

## Inherited approved baselines

This ADR preserves the approved Stock domain and UX decisions exactly:

- only explicitly Stock-controlled Articles participate in Stock V1;
- Stock is scoped by company and supports multiple deposits per company plus a transit context;
- Stock position distinguishes on hand, reserved, available, in transit or external custody, under review, and applicable final disposition;
- one Stock unit applies per Article, with configurable fractional quantities and no general conversion engine in V1;
- hybrid traceability applies: Article plus deposit throughout V1, lot and expiration where applicable, and serial or identified-unit depth for Boxes and equipment;
- hierarchical UX presentation is Article summary, then deposit/custody, then applicable lot/expiration or identified unit; this presentation hierarchy does not dictate persistence hierarchy;
- identified Boxes and equipment must preserve exclusive physical identity where applicable;
- accepted Stock history remains explainable and is not destructively rewritten;
- Stock V1 has no costing, valuation, accounting, billing, collection, or fiscal effect; and
- detailed internal locations, universal traceability, and full Box-composition Stock remain outside the approved minimal V1 depth.

## Decision drivers

1. Preserve company isolation and prevent cross-company identity ambiguity.
2. Give Stock effects and positions stable references to the Article, deposit/custody context, and identified physical unit where applicable.
3. Support the approved Article-to-position-to-traceability UX without making its display hierarchy the database design.
4. Prevent soft text references or opaque payloads from becoming the only source of operational identity.
5. Represent fungible quantity and exclusive physical units without forcing one traceability regime onto every Article.
6. Keep position aggregation explicit enough to avoid combining different deposits, custody contexts, lots, expirations, or identified units incorrectly.
7. Preserve the accepted Cajas reservation and transaction direction without redefining its ledger or checkpoints.
8. Allow migration and progressive delivery planning without selecting exact schema artifacts prematurely.

## Considered option families

### A-01 — Core operational identities

#### Option A — Normalized relational identities for Article, company, deposit, and identified unit

Treat each core concept as an independently addressable identity with integrity-preserving relationships. Stock positions and accepted Stock evidence refer to those identities rather than relying on copied codes, names, or opaque payloads as their sole linkage. Identified units represent physical instances only for the applicable identity-managed Article classes.

**Advantages**

- Supports stable references across Stock, Cajas, Remittance, Consumption, Return, Transfer, count, correction, and history.
- Makes company and deposit/custody boundaries explicit and enforceable in a later schema.
- Preserves Article master ownership while separating catalog identity from physical-unit identity.
- Allows codes, labels, and descriptive snapshots to change without changing operational identity.
- Supports integrity checks for identified-unit exclusivity and traceability continuity.

**Tradeoffs**

- Requires lifecycle and compatibility rules for each identity.
- Introduces more relationships than a flat Stock row.
- A later design must define whether and how shared catalog identity relates to company-specific Stock eligibility without weakening company isolation.

#### Option B — Soft references using business codes or free text

Link Stock records through Article codes, deposit labels, Box codes, or generic source identifiers without integrity-preserving identity relationships.

**Advantages**

- Low initial modeling effort.
- Superficially compatible with current soft-reference fields and imported text.

**Tradeoffs**

- Renames, duplicates, formatting differences, and cross-company code reuse create ambiguity.
- Referential integrity and company consistency depend entirely on application convention.
- Identified-unit exclusivity and reliable causal history become difficult to prove.
- Existing compatibility data can be mistaken for authoritative Stock identity.

#### Option C — JSON/document-owned identities

Embed Article, company, deposit, and physical-unit identity primarily inside Stock or movement payloads.

**Advantages**

- Flexible for heterogeneous traceability data.
- Can preserve source snapshots conveniently.

**Tradeoffs**

- Weakens normalized identity, relationship validation, and cross-record consistency.
- Makes operational querying, reconciliation, and duplicate detection harder.
- Risks conflating an immutable descriptive snapshot with the current authoritative identity.

### A-02 — Stock position identity and aggregation grain

#### Option A — Company + Article + deposit/custody + applicable traceability dimension

Define the conceptual Stock-position grain from company, Article, deposit or custody context, and the traceability dimension required by that Article. Fungible non-lot-managed Stock has no finer traceability slice; applicable lot/expiration-managed Stock remains separated by its relevant traceability identity; identified-unit Stock remains distinguishable by physical unit. Article-level and company-level totals are projections over compatible position grains, not replacement identities.

**Advantages**

- Matches the approved operational questions: what Article, for which company, where or under whose custody, and under which applicable traceability.
- Prevents quantities from different companies, deposits, custody contexts, lots, expirations, or identified units from being silently combined.
- Supports the approved hierarchical UX while allowing Article summaries to remain derived rollups.
- Gives critical operations an explicit child scope and a basis for reconciliation.
- Supports multiple deposits and transit without treating location as incidental metadata.

**Tradeoffs**

- Position cardinality grows with traceability depth and custody changes.
- Reads require deliberate aggregation rules and must not sum incompatible quantity-managed and identity-managed Stock.
- A later design must define traceability equivalence, transit/external-custody representation, and projection consistency without changing the approved domain meaning.

#### Option B — Article-only aggregation

Use one current Stock identity per Article, optionally per company, and retain deposit, custody, lot, expiration, and unit detail only as secondary metadata or history.

**Advantages**

- Compact current-state reads.
- Fewer position records and simpler superficial totals.

**Tradeoffs**

- Cannot safely answer where Stock is, which traceability slice is available, or which identified unit is committed.
- Hides transfer transit, external custody, and deposit-specific availability.
- Makes critical selection against an aggregate ambiguous.
- Conflicts with the approved UX requirement that actions use an explicit actionable child scope.
- Encourages Article totals to become unexplained mutable truth.

### A-03 — Traceability representation depth

#### Option A — Hybrid traceability by Article applicability

Represent fungible Articles as quantities; add lot and expiration traceability only where applicable; and represent Boxes and equipment through identified physical units. Preserve applicable traceability through accepted Stock evidence and custody changes without requiring every Article to use every dimension.

**Advantages**

- Exactly matches approved `DR-11` and the approved UX hierarchy.
- Keeps common quantity operations proportional while preserving required physical identity.
- Supports identified Cajas behavior without expanding V1 into universal serial tracking or full Box-composition Stock.
- Allows later approved traceability depth to extend applicable Article classes without redesigning the domain vocabulary.

**Tradeoffs**

- Validation and query behavior vary by the Article's approved traceability profile.
- Mixed quantity-managed and identity-managed results require explicit aggregation and presentation rules.
- Changes to an Article's traceability applicability require safe lifecycle rules so historical evidence is not reinterpreted.

#### Option B — Universal lot, expiration, serial, and per-unit traceability

Require every Stock-controlled Article to carry all fine-grained traceability dimensions or an equivalent universal physical-unit representation.

**Advantages**

- One nominally uniform traceability mechanism.
- Maximum theoretical granularity for future investigation.

**Tradeoffs**

- Exceeds the approved minimal V1 depth and adds mandatory data that is not meaningful for many Articles.
- Increases receiving, counting, transfer, selection, and correction burden.
- Encourages placeholder or fabricated traceability values merely to satisfy universality.
- Expands implementation and migration scope without an approved product need.

#### Option C — Fungible quantity only

Represent all Stock-controlled Articles only as aggregate quantities and retain Box, equipment, lot, serial, or expiration references outside core position identity.

**Advantages**

- Lowest initial persistence complexity.

**Tradeoffs**

- Cannot satisfy approved identified Box/equipment behavior.
- Weakens lot/expiration continuity where applicable.
- Cannot prove exclusive reservation or disposition of a physical unit.
- Contradicts the approved hybrid traceability baseline.

## Accepted recommendation

**Accepted by Franco on 2026-07-20 as part of blanket approval A-01–A-12, with no drift from the verified recommendations:** Option A governs A-01, A-02, and A-03 as one coherent core persistence direction:

1. **A-01:** use normalized relational identities for Article, company, deposit, and applicable identified physical unit; soft references and JSON may supplement compatibility or immutable descriptive evidence but must not be the sole operational identity.
2. **A-02:** define Stock-position identity conceptually by company + Article + deposit/custody + applicable traceability dimension. Article-only views are derived aggregates and cannot be the actionable persistence grain.
3. **A-03:** use hybrid traceability: fungible quantity by default, conditional lot/expiration where applicable, and identified-unit identity for Boxes and equipment.

The three recommendations are mutually reinforcing: normalized identities supply stable references; the position grain prevents incompatible scopes from collapsing; and the hybrid profile determines when a traceability dimension participates. This recommendation does not select an exact table family, column set, key, constraint, index, ledger, balance algorithm, transaction boundary, or API.

## Approved architecture constraints

- Company scope must be explicit for every actionable Stock position and applicable physical identity.
- Cross-company Article, deposit, identified-unit, position, or Stock-evidence references must be rejectable by the trusted server boundary; exact enforcement remains a later decision.
- Deposit/custody identity must support multiple deposits per company and the approved transit context without implying detailed internal-bin management.
- An identified unit must remain distinguishable from fungible quantity and must not be simultaneously actionable in incompatible positions.
- Applicable lot, expiration, serial, or identified-unit evidence must remain attached to accepted history when current master configuration changes.
- Article summaries and broader totals must be derived only from compatible, explicitly scoped position grains.
- Soft legacy identifiers and copied labels may be retained as compatibility or descriptive snapshots, but cannot silently become authoritative Stock identity.
- JSON may hold supplemental evidence or source snapshots, but cannot replace the normalized identities required for company, Article, deposit/custody, and applicable identified unit.
- The accepted Cajas reservation-plus-append-only-transaction architecture remains governing for the Cajas checkpoints; this ADR neither replaces nor extends it.
- No decision here defines authorization roles, API ownership, service boundaries, or source-module placement.

## Consequences

### Positive

- Later Stock effects can refer to stable operational identities rather than mutable text.
- Company, deposit/custody, traceability, and identified-unit boundaries remain visible and testable.
- The persistence direction supports both fungible operations and approved Cajas/equipment identity without universal fine tracing.
- Article summary UX can remain compact while critical actions target explicit position detail.
- Historical traceability can remain interpretable when labels or current configuration change.

### Negative

- More identity and aggregation rules are required than in the current flat mock representation.
- Position projections and rollups require explicit compatibility rules and reconciliation.
- Progressive traceability creates conditional validation paths.
- Legacy soft references will require mapping decisions before they can participate in authoritative Stock behavior.

### Risks

- A later schema could accidentally encode UX nesting as rigid persistence ownership.
- Article-level totals could be treated as editable truth instead of scoped projections.
- Expiration or lot applicability could be changed retroactively and reinterpret accepted history.
- Transit or external custody could be collapsed into a normal deposit and hide unresolved material.
- Identified units could be duplicated across companies or positions if later integrity rules are incomplete.
- JSON or compatibility fields could become an unofficial second identity system.
- Scope could expand from identified Boxes/equipment into unapproved universal serial tracking.

## Migration-neutral implications

- Current schema, prototype rows, soft item/Box references, repeated lot/serial text, and mock data remain baseline evidence only; none is declared authoritative or migration-ready by this ADR.
- No existing record is to be rewritten, backfilled, deleted, or assigned a new identity under this decision alone.
- Historical Remittance, Consumption, Return, or Cajas evidence must not receive invented Article, deposit, lot, expiration, or identified-unit relationships.
- A future compatibility assessment must distinguish records that can be mapped deterministically from records that must remain legacy/unresolved.
- Any coexistence period must avoid treating both legacy soft references and future normalized identities as independent Stock truths.
- Opening position, reconciliation, backfill, cutover, rollback, and production-data treatment remain separately gated.
- The recommendation is compatible with incremental introduction, but it does not prescribe sequence, dual-write behavior, adapters, or migration tooling.

## Rejected alternatives

The following alternatives are rejected by the accepted recommendation:

- soft business codes, free text, or generic source identifiers as the sole identity of Article, company, deposit, or identified unit;
- JSON documents as the sole relationship mechanism for core Stock identities;
- Article-only current Stock as the actionable position grain;
- hidden aggregation across companies, deposits, custody contexts, applicable lots/expirations, or identified units;
- universal lot, expiration, serial, or per-unit tracking for every Stock-controlled Article; and
- fungible-only Stock that cannot represent identified Boxes/equipment.

## Explicit non-decisions and downstream blocks

This ADR does not decide or authorize:

- final Prisma models, columns, relation names, key shapes, constraints, index names, enums, mappings, or migrations;
- whether Article catalog identity is globally shared, company-owned, or linked through a company-specific eligibility construct;
- exact lot identity, expiration equivalence, serial format, identified-unit coding, or traceability-profile representation;
- exact transit, external-custody, branch, deposit, or detailed-location schema;
- balance storage, projection algorithms, transaction journal shape, reservation record shape, concurrency, locking, or idempotency mechanisms;
- movement, evidence, audit, correction, reversal, opening-position, or reconciliation persistence design;
- APIs, routes, Server Actions, services, validators, repositories, module boundaries, caches, queues, or offline behavior;
- permission names, role mappings, authorization behavior, RLS, Auth, or security implementation;
- UI routes, components, forms, or changes to Stock, Articles, Cajas, Preparation, Remittance, Consumption, Return, or Cirugías;
- costing, valuation, prices, replenishment, purchasing optimization, billing, accounting, collection, tax, or fiscal behavior; or
- APPLY, production rollout, or any protected-file change.

Only the next documentary SDD execution-plan phase is authorized. Schema, migration, implementation, APPLY, production work, and all other protected downstream activity remain blocked until their own Task Briefs and required Franco approvals are recorded. Acceptance of this ADR does not lift any implementation gate.

## Validation criteria for this ADR

This accepted ADR is internally valid only if all of the following remain true:

1. A-01, A-02, and A-03 are visibly marked as accepted exactly as verified recommendations under Franco's blanket approval A-01–A-12 dated 2026-07-20.
2. A-01 compares normalized relational identity against both soft-reference and JSON-first alternatives.
3. A-02 distinguishes actionable company + Article + deposit/custody + applicable traceability position grain from Article-only aggregation.
4. A-03 preserves fungible quantity, conditional lot/expiration, and identified-unit depth for Boxes/equipment without universal traceability.
5. Approved Stock domain decisions `DR-01`–`DR-16` and UX decisions `UXD-01`–`UXD-12` are inherited without reopening or narrowing them.
6. The accepted Cajas Stock transaction ADR is referenced as governing inherited behavior and is not reconsidered.
7. No final schema artifact, migration, API, role, service boundary, or implementation sequence is selected.
8. Current soft references, schema, and mock/local data are not represented as authoritative Stock truth.
9. Migration implications remain non-operative and prohibit invented historical relationships.
10. Authorization remains limited to the next documentary SDD execution-plan phase, with no schema, migration, or implementation authority.

## Decision register — accepted by Franco

| ID | Architecture decision | Accepted recommendation | Franco decision |
| --- | --- | --- | --- |
| `A-01` | **Core operational identities** | Normalize relational identities for Article, company, deposit, and applicable identified unit. Soft references and JSON may supplement evidence or compatibility but are not sole identity. | **ACCEPTED by Franco — 2026-07-20** |
| `A-02` | **Stock-position identity** | Use company + Article + deposit/custody + applicable traceability dimension as the conceptual actionable grain. Article-only totals remain derived aggregates. | **ACCEPTED by Franco — 2026-07-20** |
| `A-03` | **Traceability representation** | Use hybrid traceability: fungible quantity, conditional lot/expiration, and identified-unit identity for Boxes/equipment. | **ACCEPTED by Franco — 2026-07-20** |

**Decision count:** exactly three accepted decisions, `A-01` through `A-03`.

Franco explicitly accepted A-01–A-03 exactly as verified recommendations through blanket approval A-01–A-12. No schema, migration, or implementation authorization follows from this acceptance.

## References and provenance

- `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` — approved Stock domain baseline; working-tree blob reverified at approval close as `926476e1d5e275768296329e099e32e04069224e`.
- `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` — approved Stock UX baseline; working-tree blob reverified at approval close as `95d8d986e7dc426b48a7b4480966a558a54d52ed`.
- `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` — accepted Cajas Stock transaction direction; working-tree blob reverified at approval close as `5f470c58113c8990ea8bd83aaa811730f9417a55`.
- `knowledge/domain/STOCK_CAJAS_TRAZABILIDAD.md`.
- `knowledge/architecture/DATA_MODEL_RULES.md`.
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md`.
- `prisma/schema.prisma` — current baseline evidence only; unchanged and not adopted as final Stock design.
