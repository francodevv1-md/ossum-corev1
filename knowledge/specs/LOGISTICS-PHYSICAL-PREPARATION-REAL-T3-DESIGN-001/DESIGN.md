# Design: Real Physical Preparation — Phase B

## Purpose and boundary

This is the single T3 decision package for a DEV-only Phase B that turns a Caja formula snapshot into **real, server-authoritative physical preparation**. It stops after a confirmed Stock reservation, `CajasReservationCorrelation`, and an expected-versus-found read projection.

**Non-goals:** billing, fiscal/TusFacturasAPP, purchases, replenishment, control acceptance or re-control, surgical Remito activation/issuance, schema or migrations, UI, and Auth/role-policy changes. It neither writes `CajasControl` nor changes `latestControlId`; a prepared composition is only a prerequisite for a later control.

## Starting contracts (facts)

| Fact | Consequence |
| --- | --- |
| Caja assignment atomically snapshots one formula into `CajasPreparation` and `CajasPreparationLine` records with `role=EXPECTED` and `stockPositionId=null`. | Expected lines are formula facts, not found physical composition. Formula versions remain future-only. |
| Generic `reservePreparation` locks a `SurgeryPreparationLine`, reserves one selected position, and updates Stock availability atomically. | It cannot be reused blindly: its source lineage is `SurgeryPreparationLine`, while the Caja path must persist Caja-line composition and `CajasReservationCorrelation`, which the Remito derivation requires. |
| Existing `CajasReservationCorrelation` links assignment/preparation/line, Stock position, reservation, reservation evidence, quantity/unit/scale, and a company-scoped semantic key. | Existing topology is a candidate only; Phase B must stop rather than alter schema if it cannot express the approved decision outcomes. |
| Surgical dispatch currently requires accepted control, correlation lineage, and a single reservation across mapped lines. | Phase B must not activate Remito or claim arbitrary multi-component dispatch. WCB-06 replay hardening and control production remain independent prerequisites. |

## Proposed bounded command and read model

### Reads

The server exposes eligible positions only for one active Caja assignment's expected line. It derives eligibility from the expected article, stock unit/scale, required traceability mode, company, active assignment/preparation/version, and live positive availability. The client submits only the expected-line identity, selected position identity, requested quantity, and idempotency key; it cannot submit Article, trace snapshot, assignment, or availability as authority.

The expected-versus-found projection is server-derived and returns, per expected line: expected quantity/unit/scale; confirmed found composition; reserved quantity; remaining quantity; trace snapshot from the selected position; and a status such as `UNFOUND`, `PARTIAL`, `MATCHED`, or `DIFFERENT`. It is informational only: `DIFFERENT` creates no acknowledgement, control, or dispatch eligibility.

### Command

`confirmPhysicalSelection` is one semantic command for one expected line and one position. In one transaction it:

```text
lock Caja preparation/expected line + relevant Stock scope
  -> revalidate tenant, active assignment, formula/version, article, unit/scale,
     traceability, position eligibility, and available quantity
  -> atomically reserve Stock
  -> persist found-composition linkage and trace capture
  -> persist CajasReservationCorrelation + command/audit evidence
  -> return the derived expected-versus-found projection
```

The exact write representation is **not decided**: before apply, the owner must prove that the current expected/found line and correlation topology supports the approved cardinality and append-only/history requirements. Failure to prove it stops the work for a separately approved schema/migration decision.

## Integrity and boundaries

- **Idempotency:** company-scoped semantic intent includes assignment/preparation version, expected line, position, quantity, and applicable trace scope. Same intent replays the accepted result; changed material intent conflicts without a second reservation.
- **Concurrency:** lock the Caja line/preparation and applicable identified-unit scope; use conditional Stock projection decrement (`available >= quantity`) as the final oversubscription guard. Reservation, correlation, composition, acceptance, and audit roll back together.
- **Tenant isolation:** authorize company before lookup; every lookup and mutation is company-scoped. Cross-company identities are non-disclosing and side-effect-free.
- **Audit:** acceptance, actor, authoritative time, semantic key, Stock reservation evidence, and correlation must be linked. Found traceability is captured from Stock, never client input.
- **API boundary:** a Caja-physical-preparation service owns validation and transactionality; thin authenticated route(s) only validate transport and call it. No Prisma in UI and no generic-preparation shortcut.

## Business decision gates — required before apply

| Gate | Decision required from Franco | Why it blocks Phase B |
| --- | --- | --- |
| B1: component cardinality | Can one expected component be fulfilled from one position/lot only, or multiple? | Determines whether one expected line can produce multiple found/reservation correlations. |
| B2: pre-control composition changes | Are substitutions, additions, and removals allowed before control? | Defines allowed Article/line mutations and reservation lifecycle. |
| B3: difference acknowledgement | Which actor/capability may acknowledge a difference? | `DIFFERENT` must remain informational until an approved authority and evidence rule exist. |
| B4: partial composition | May partial found composition retain reservations, and when must it release them? | Determines whether `PARTIAL` is a durable reserved state or must be reverted. |

### Deferred Phase C dependency (not a Phase B gate)

The later multi-reservation-dispatch contract is explicitly deferred to Phase C: current WCB-06 rejects mapped lines spanning multiple reservations. Phase B may create valid per-component reservation evidence only after B1–B4 are decided; it does not modify, satisfy, or activate the dispatch constraint.

## Test matrix for a future apply

| Layer | Required proof |
| --- | --- |
| Service | server-derived eligibility; Article/unit/scale/trace checks; each B1–B4 outcome; replay/conflict; correlation/evidence atomicity |
| Integration | tenant isolation; conditional-stock race/oversubscription; rollback leaves no reservation/correlation/composition; expected-versus-found projection |
| Regression | generic preparation reservation unchanged; no control write, Remito activation, or dispatch behavior change |

## Approval requested and stop conditions

Before apply, Franco must explicitly approve this bounded DEV-only Phase B **and decide B1–B4**. The later apply surface is limited to Caja physical-preparation service/route/read contracts and focused tests necessary for this command; no other domains are authorized.

Stop immediately on: unresolved B1–B4; inability to represent the selected decision without schema/migration; dirty-file ownership/lock overlap; a need to alter dispatch, control, Auth, UI, billing, or generic-preparation contracts; non-disposable DB; or any request to activate surgical Remito.

## File changes

| File | Action | Description |
| --- | --- | --- |
| `knowledge/specs/LOGISTICS-PHYSICAL-PREPARATION-REAL-T3-DESIGN-001/DESIGN.md` | Create | This documentary-only T3 design. |
