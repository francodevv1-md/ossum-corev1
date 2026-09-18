# SPEC — COORDINATION-EZEQUIEL-DEV-QA-002

Status: specified against the Franco-approved `PROPOSAL.md`; implementation remains separately gated. This documentation amendment executes no implementation, data, DB, server, or browser action.

## Purpose and requirements

| ID | Normative requirement | Proposal source |
| --- | --- | --- |
| REQ-01 | Add eight synthetic non-PII, non-archived DEV surgeries. Protected 21 active and 8 Ezequiel/8 Nelson/5 unassigned MUST remain unchanged; temporary totals MUST be 29 active/16 Ezequiel. | Evidence/invariants |
| REQ-02 | Pre-write MUST prove approved local DEV deployment, exact approved project/workspace, authoritative exact company, approved baseline/provenance, and REQ-03. Missing, ambiguous, foreign, client-controlled, production, or mismatched evidence MUST stop. | Contract ¶3 |
| REQ-03 | Within the exact approved company, the authorized resolver MUST yield exactly one active personal contact (non-company) linked to the authenticated Ezequiel DEV user with role `coordinator`. Zero/multiple matches or any company contact MUST fail closed before writes; dynamic IDs MUST NOT be hardcoded/exposed. | Evidence ¶2 |
| REQ-04 | Every overlay surgery/assignment MUST have a deterministic package key and manifest ownership; each surgery MUST have exactly one Ezequiel `coordinator` assignment. Rerun MUST no-op; collision, partial ownership, duplication, or schema invention MUST stop. | Contract ¶4 |
| REQ-05 | All A–H MUST remain active and eligible for the productive personal inbox. A–D carry only their listed metric memberships; E–H carry no additional memberships. These direct fixture facts preserve overlay deltas without creating any new product eligibility or lifecycle rule. AND, stable counts, unique rows, and empty-state distinctions MUST remain unchanged; interactions MUST NOT mutate. | Proposed contract ¶1; Evidence ¶1 |
| REQ-06 | Active E–H disclosure MUST follow `Cierre pendiente: N requisito(s) faltante(s)`, complete `aria-expanded="false" → "true" → "false"`, and remain visibly operable by Enter, Space, or touch after open/close with focus retained/restored. Pending categories are orthogonal closure facts, limited to `Documentación`, `Consumo`, `Facturación`; H shows no control/write. | Evidence ¶3; Modified capability; QA |
| REQ-07 | Creation, no-op, rejected-preflight, and cleanup evidence MUST contain real actor, authoritative company, provenance, outcome, and timestamps; creation/cleanup MUST identify affected owned records/assignments. Cleanup MUST reconcile independently to exact 21/8 with originals unchanged; broad deletion MUST NOT occur. | Contract ¶5; QA |
| REQ-08 | No PII, new backend/API/schema/Auth/permission/category/business-lifecycle rule, production behavior, current-bootstrap mutation, or `Remitos` is authorized. Any such need MUST stop for new approval. | Non-goals; gate |
| REQ-09 | Synthetic facts MUST be recognized exclusively in approved local DEV, for the exact company-scoped authenticated Ezequiel personal inbox, exact owned N=8 overlay, and canonical approved fixture evidence. Production, wrong company/subject, unowned, mismatched, or tampered data MUST NOT alter UI or product behavior and MUST fail QA/operations closed. | Evidence; Proposed contract; Risks/gates |
| REQ-10 | Canonical approved fixture evidence MUST bind each A–H stable key, facts, integrity, provenance, and ownership throughout creation, rerun/no-op, reconciliation, audit outcomes, and cleanup. Evidence MUST preserve actor, company, outcome, timestamps, and affected ownership. Any drift/tamper MUST cause zero writes and zero partial cleanup. | Proposed contract ¶¶2–4; QA |

## Authorized eight-case matrix

Evaluate at `T = 2026-07-21T12:00:00.000Z`; symbolic keys/identities are stable synthetic values, not database IDs.

| Key | Existing-semantic facts | Expected metrics | Pending |
| --- | --- | --- | --- |
| A | active; no CX date; assignment `T−48h`; CX `SYN-A`; institution X; client X; availability `2026-07-22`; state `Autorizada` | `Poner fecha`, `Fuera de plazo` | — |
| B | active; no CX date; assignment `T−47h59m59.999s`; CX `SYN-B`; institution Y; client X; availability `2026-07-23`; state `Autorizada` | `Poner fecha` only | — |
| C | active; CX date `2026-07-24`; CX `SYN-C`; institution X; client Y; availability `2026-07-25`; state `Autorizada` | `Coordinadas` only | — |
| D | active; CX date `2026-07-24`; CX `SYN-D`; institution X; client X; availability `2026-07-25`; state `En tránsito` | `Coordinadas`, `En tránsito` | — |
| E | active/eligible; direct fixture membership facts: none | none | `Documentación` |
| F | active/eligible; direct fixture membership facts: none | none | `Consumo` |
| G | active/eligible; direct fixture membership facts: none | none | `Documentación`, `Consumo`, `Facturación` |
| H | active/eligible; direct fixture membership facts: none | none | none |

Overlay deltas for active A–H MUST be `Poner fecha=2`, `Fuera de plazo=1`, `Coordinadas=2`, `En tránsito=1`; these are never temporary 29-case inbox totals, and baseline metric counts are not asserted. Intersections: `Poner fecha AND Fuera de plazo={A}`; `Coordinadas AND En tránsito={D}`. `Poner fecha AND Coordinadas` is contradictory; `En tránsito AND institution Y` is an ordinary empty; an authorized subject with no base cases is true-empty. Advanced matches: CX `SYN-D`→D; date `2026-07-24` AND institution X→{C,D}; client X AND availability `2026-07-25` AND state `En tránsito`→D. Browser/implementation verification MUST identify A–H by owned keys and prove observed total counts remain stable through interactions without inventing complete totals.

## Acceptance scenarios

### SC-01 — Exact additive state
- **Given** the protected 21/8 baseline and REQ-02/03 pass
- **When** A–H are created
- **Then** totals SHALL be 29 active/16 Ezequiel with originals unchanged and unique assignments.

### SC-02 — Invalid preflight fails closed
- **Given** invalid gate, provenance, key, ownership, or cardinality
- **When** preflight runs
- **Then** no write SHALL occur; rejected evidence SHALL satisfy REQ-07.

### SC-03 — Valid rerun is idempotent
- **Given** exact A–H already exists with valid ownership
- **When** the package reruns
- **Then** it SHALL no-op, change nothing, and satisfy REQ-07.

### SC-04 — Deterministic filtering
- **Given** A–H at T
- **When** required metrics/advanced filters apply
- **Then** all eight SHALL remain productive-inbox eligible, A–D memberships and E–H non-memberships SHALL yield exact deltas by owned key, and observed total counts SHALL remain stable without asserted baseline totals.

### SC-05 — Pending disclosure is accessible and read-only
- **Given** active E–H render on desktop/mobile without lifecycle finalization
- **When** Enter, Space, or touch opens and closes each `ClipboardList`
- **Then** E/F SHALL name `Cierre pendiente: 1 requisito faltante`, G `Cierre pendiente: 3 requisitos faltantes`, and H SHALL show no control; `aria-expanded` SHALL cycle false→true→false, focus SHALL remain/return visibly to the operable trigger, and zero mutating network requests SHALL occur.

### SC-06 — Invalid ownership blocks cleanup
- **Given** stale/tampered canonical evidence, integrity/provenance drift, partial ownership, identity ambiguity, collision, or mismatch
- **When** cleanup preflight runs
- **Then** cleanup SHALL perform zero writes and no partial deletion, preserve baseline/evidence, and escalate.

### SC-07 — Cleanup is bounded and recoverable
- **Given** a wholly verified manifest proves every owned overlay record/assignment
- **When** cleanup runs
- **Then** only proven owned overlay records/assignments SHALL be deleted; REQ-07 evidence and independent exact 21/8 reconciliation SHALL precede success.

### SC-08 — Creation evidence is complete
- **Given** valid creation commits A–H
- **When** evidence is reviewed
- **Then** all REQ-07 fields and created record/assignment ownership SHALL be present.

### SC-09 — Scope guard
- **Given** any REQ-08 dependency is required
- **When** detected
- **Then** work SHALL stop and require new Franco approval.

### SC-10 — Synthetic-fact acceptance is conjunctive
- **Given** canonical approved evidence for the exact owned A–H overlay
- **When** approved local DEV presents the exact company-scoped authenticated Ezequiel personal inbox
- **Then** only the bound synthetic facts SHALL be recognized and evidence SHALL satisfy REQ-10.

### SC-11 — Synthetic-fact isolation negative matrix
- **Given** production or wrong company/subject, unowned overlay data, or mismatched/tampered canonical evidence
- **When** UI, QA, rerun/no-op, reconciliation, or cleanup evaluates it
- **Then** synthetic facts SHALL NOT alter UI/product behavior and QA/operations SHALL fail closed with zero writes and zero partial cleanup.
