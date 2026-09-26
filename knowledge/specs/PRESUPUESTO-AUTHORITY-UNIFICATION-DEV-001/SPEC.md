# Delta Specification: Presupuesto Authority Unification

## ADDED Requirements

### Requirement: Canonical authority and isolation
Prisma/API **MUST** be the sole authority. A Surgery **MUST** have at most one active family; standalone families **MAY** exist. Scope **MUST** come from authenticated membership, never client company, actor, totals, state, version, or display IDs.

#### Scenario: Family authority
- **GIVEN** a Surgery has no active family
- **WHEN** two linked creations race
- **THEN** one succeeds, one conflicts, and standalone creation remains allowed

#### Scenario: Cross-company access
- **GIVEN** a user supplies another company's ID
- **WHEN** reading, mutating, generating PDF, or emailing
- **THEN** nothing is disclosed or changed

### Requirement: Mandatory commercial snapshot
Each version **MUST** contain visible number; company/branch; client/payer; optional Surgery; date; responsible user; currency; items with quantity, unit price, discount, VAT rate/amount, and total; discriminated subtotal/discount/tax/total; payment terms; price list; validity; legend/clarifications; notes; state; version; lineage. Firm-price records **MUST** support coordinator/intermediary, quotation contact, included/excluded materials, availability, operational clarifications, and surgical assumptions. Applicable Districorr estimates **MUST** preserve the canonical legend.

#### Scenario: Valid commercial record
- **GIVEN** complete mandatory and conditional data
- **WHEN** a version is accepted
- **THEN** its snapshot and server-calculated totals persist

#### Scenario: Invalid commercial record
- **GIVEN** data is missing or client totals disagree
- **WHEN** creating, editing, or emitting
- **THEN** validation fails without mutation or trusted client totals

### Requirement: Draft editing and immutable history
Only `Borrador` **MUST** be editable or draft-deletable. An edit **MUST** atomically replace its snapshot and increment revision. Emitted versions **MUST NOT** change or cascade-delete.

#### Scenario: Edit draft
- **GIVEN** a draft at expected revision
- **WHEN** header or items change
- **THEN** one recalculated snapshot persists and revision increments

#### Scenario: Mutate emitted history
- **GIVEN** an emitted version
- **WHEN** mutation or deletion is requested
- **THEN** rejection leaves its snapshot unchanged

### Requirement: Revision and replacement lifecycle
Revising a current non-draft **MUST** create exactly one later draft in its family without changing the source. Emission **MUST** atomically set the draft `Emitido` and only its prior current version `Reemplazado`.

#### Scenario: Create revision
- **GIVEN** a current non-draft without a later draft
- **WHEN** revising it
- **THEN** one copied draft exists and source state remains unchanged

#### Scenario: Emit replacement
- **GIVEN** a valid later draft with current expectations
- **WHEN** emission succeeds
- **THEN** emission and prior replacement commit together

### Requirement: Conflicts and transactional audit
Mutations **MUST** carry expected revision/version. Accepted mutations **MUST** atomically audit real actor, company, IDs, lineage, old/new state, and bounded complete old/new header/item snapshots. Stale outcomes **MUST** be recorded without mutation. Secrets and email bodies **MUST NOT** be audited.

#### Scenario: Stale command
- **GIVEN** authority changed after reading
- **WHEN** the stale expectation is submitted
- **THEN** `409` records conflict without partial mutation

#### Scenario: Accepted mutation audit
- **GIVEN** an authenticated valid mutation
- **WHEN** it commits
- **THEN** actor/snapshot evidence commits transactionally, or neither commits

### Requirement: Authoritative email states
PDF/email **MUST** re-read authority. Only `Emitido` and `Aprobado` **MAY** be emailed.

#### Scenario: Email eligibility
- **GIVEN** any authoritative state
- **WHEN** emailing
- **THEN** only `Emitido`/`Aprobado` send; every other state is rejected

### Requirement: Workflow persistence and recovery
Sales, New Surgery, and Expediente **MUST** share the same authority. A valid Surgery **MUST** survive linked-Presupuesto failure; retry **MUST** reuse its canonical ID without duplicate Surgery/family.

#### Scenario: New Surgery partial success
- **GIVEN** Surgery succeeded but Presupuesto failed
- **WHEN** refreshing and retrying
- **THEN** that Surgery remains and one family or a current conflict results

#### Scenario: Sales and Expediente refresh
- **GIVEN** an authoritative Presupuesto change
- **WHEN** Sales or Expediente hard-refreshes
- **THEN** both show persisted version, state, totals, history, and valid actions

## REMOVED Requirements

### Requirement: Local Presupuesto authority
Visible local reads, writes, write-caches, fallbacks, and dual writes through Zustand/localStorage **MUST NOT** exist.

#### Scenario: API unavailable
- **GIVEN** unavailable API and legacy local data
- **WHEN** a visible action runs
- **THEN** a recoverable error appears; local data stays unused and unchanged

(Reason: local authority diverges from company-scoped commercial history.)
