# Design — STOCK-V1-E01-SCHEMA-DESIGN-001

## 1. Status, provenance, authority

- **Status:** PROPOSED PHYSICAL DESIGN; pending independent review and Franco decision
- **Source:** approved SPEC blob `f65c5148de4cdf6b11a70ff311b0dea2abf603c6`
- **Authorization:** None; implementation write set `∅`

Fresh preflight revalidated `master` at `4a25cf63a1dd8ddd2696f0d6601ad078cef5e37e`, all 25 exact package/governing/candidate blobs in SPEC §2, the eleven-member migration manifest, package inventory, absent target/TASKS/index lock, and no visible overlap. Although SPEC metadata still says pending approval, Franco explicitly approved and closed that exact blob before separately dispatching D01; SPEC remains unedited. Prisma and migrations are evidence, not authority or live truth.

## 2. Approach and alternatives

Design only E01 identity/scope persistence. E02 evidence, reservations, projections, folds, locking, isolation, idempotency, replay, repair, and reconstruction remain unresolved.

| Concern | Alternatives | Recommendation pending Franco |
| --- | --- | --- |
| Eligibility | Article flag; temporal company link | Versioned company-Article link |
| Custody | nullable columns; discriminator; supertype/subtypes | Company context supertype with Deposit, Transit, External-Custody subtypes |
| Trace grain | universal columns; separate families; exclusive references | One scope with exactly one applicable axis: none, lot, identified unit |
| Quantity | float; scaled integer; decimal | Decimal, maximum scale 4, with row-carried approved scale |
| Compatibility | Stock registry; source-owned rows | Source-owned rows using the four approved dispositions |

## 3. Recommended candidate contract

```text
SharedArticle ─ CompanyStockEligibilityVersion ─ QuantityPolicySnapshot
Company ─ StockContext ─ {Deposit | Transit | ExternalCustody}
Company + Article ─ {BusinessLot | IdentifiedUnit}
EligibilityVersion + StockContext + exclusive trace axis ─ PositionScope
PositionScope ─ ActivationBoundary
```

Use immutable technical IDs; labels/codes are alternate scoped identifiers only. Every company-owned relation carries `company_id`. Composite references enforce matching company and Article across `CompanyStockEligibilityVersion`, `PositionScope`, and every protected `BusinessLot`, `IdentifiedUnit`, or trace reference; same-company/different-Article links are structurally rejected. Eligibility versions carry non-overlapping effective boundaries, unit, scale `0..4`, and trace applicability. Historical references bind their governing version/snapshot.

`StockContext` subtype integrity keeps deposit, transit, and external custody distinct without bins. Pre-canonical lot observations preserve source code and expiration evidence separately. Conflicting expiration blocks `BusinessLot` creation or consolidation until explicit linked review evidence resolves it. Only then enforce canonical uniqueness by company + Article + normalized lot code, without rewriting observations or accepted history. `IdentifiedUnit` is never fungible. Its configuration changes are prospective only and are rejected while any reservation, allocation/assignment, custody transfer, or disposition remains pending. `PositionScope` permits only the trace shape authorized by eligibility; identified-unit scope represents one unit. Aggregates are derived, compatible, and non-editable.

Quantities use exact base-10 values. Documentary candidate precision is 24, scale at most 4, and non-negative range `0`–`99,999,999,999,999,999,999.9999`, pending Franco. Validate submitted representation before parsing or canonicalization and reject fractional digits above approved scale: scale-2 `1.230` is rejected, not normalized. Only accepted inputs become canonical values; rows copy governing scale, with no conversion or implicit rounding.

Each source-owned compatibility row retains source identity, provenance, snapshot, and exactly one of the four §2 dispositions. Every Stock-effect-capable compatibility reference carries company and enforces company equality with source and normalized target through composite references. A truly global source is structurally excluded from Stock-effect references and may remain only non-actionable descriptive evidence, never silently exempted. Automation may collect or propose evidence, but cannot accept a compatibility mapping or change a compatibility disposition; both acceptance and disposition changes remain authorized human actions owned by the source domain. Only accepted deterministic mappings may reference normalized identities; unresolved legacy is non-actionable.

`ActivationBoundary` identifies one dated bounded scope and future opening-evidence link without inventing history. The accepted checkpoint governs every cross-boundary effect: an operation created before opening but accepted after opening takes effect at acceptance and is never backdated. Opening evidence shape, quantity fold, activation, and cross-boundary mechanism remain E02/E11 decisions.

## 4. Integrity, traceability, validation

Schema evidence must prove company-and-Article reference equality, non-overlapping eligibility, context subtypes, trace-axis exclusivity, pre-canonical lot isolation, identified-unit exclusivity, representation-first scale rejection, finite precision, compatible aggregation, company-scoped Stock-effect compatibility, one disposition, and one opening boundary per activated scope. Conservation, origin ceilings, custody vocabulary, and historical continuity remain acceptance invariants, not algorithms.

For each compatible actionable scope `s`, company `c`, dispatch `d`, internal Transfer `x`, and checkpoint time `t`, exact Article-scale quantities must satisfy:

- `E01-CONS-001`: `AccountableEstablished(s,t) = AcceptedOpening(s) + AcceptedReceipts(s,t) + AcceptedInboundCorrections(s,t)`, with every accepted cause included once and only within its causal scope.
- `E01-CONS-002`: `Available(s,t) = EligibleOnHand(s,t) - ActiveReserved(s,t) - UnderReview(s,t)`; transit and external custody are excluded, and reserve/release alone has `ΔPhysicalCompanyQuantity(c,t) = 0`.
- `E01-CONS-004`: `RemainingAccountable(d,s,t) = AcceptedDispatched(d,s) - AcceptedConsumption(d,s,t) - AcceptedReturnDispositions(d,s,t) >= 0`; each quantity or identified unit is allocated at most once and every remainder stays explicit and unavailable.
- `E01-CONS-005`: `CompanyTransferTotalBefore(x) = OriginRemainder(x,t) + InTransitOrUnresolved(x,t) + AcceptedDestination(x,t)` across the same company, Article, unit, and compatible trace scope; only explicit linked discrepancy/correction evidence may alter the equality.

These equations are behavioral review criteria only and select no E02 storage, fold, projection, locking, isolation, idempotency, replay, repair, reconstruction, or reconciliation algorithm.

| Coverage | Evidence |
| --- | --- |
| `CORE-001`–`CORE-014`; `U-01`–`U-09` | §§2–4: direct `14/14`, `9/9` |
| 70 requirements | All `GOV/CORE/ELIG/LOC/LOT/UNIT/COMP/QTY/CONS/HIST/OPEN/NEG/GATE/REV/STOP` families map to §§1–6 |
| 43 scenarios | `SCN-001`–`006` provenance/identity; `007`–`014` scope/trace; `015`–`019` compatibility; `020`–`023` precision; `024`–`033` conservation; `034`–`037` opening/history; `038`–`043` governance |

Future validation requires static schema review, isolated constraint tests, cross-company negatives, decimal boundaries, compatibility/opening fixtures, and separate DB/domain and SDD/governance verdicts. No command is authorized.

## 5. Article taxonomy boundary

The Article taxonomy contract is deliberately separate from this E01 Stock identity design:

- `articleType` is `STANDARD` or `COMPOSITE`, never Implant, Instrumental, Disposable, or Equipment.
- Product classification is Category → Subcategory → optional third level; Clinical Family is independent.
- Brand, Manufacturer, and optional Product Line are independent commercial catalogs.
- `CajasBoxFormula.currentVersionId` is the only evidence for `COMPOSITE`; it identifies a box model. `StockIdentifiedUnit` identifies a physical box and is not implied by operational type.
- Legacy Fabricado/Reventa remains lossless evidence only. Rubro is a curated Category candidate; Sección is not a permanent separate axis from the available export; Sector is unresolved.

`ARTICLE-XADMIN-MIGRATION-MATRIX-001/MIGRATION_MATRIX.md` is the read-only migration contract. This section selects no physical model, catalog relation, migration, backfill, API, UI, Auth, permission, or data action.

## 6. Risks and unresolved decisions

Risks: subtype leakage, cross-company links, trace ambiguity, retroactive policy change, expiration collapse, dual truth, and opening mistaken for history. Franco must accept or revise §2–§3, numeric precision/constraint strategy, lot grouping, and opening linkage before `G-SCHEMA`. Any later forward-fix or migration plan must preserve evidence and receive separate approval.

## 7. Review, stop, non-authorization

Independent DB/domain and SDD/governance reviewers are read-only/no-fix and report `PASS`, `PASS WITH CONCERNS`, or `FAIL`. Stop on drift, overlap, contradiction, extra path/command, or any unapproved decision.

This recommendation does not approve itself. `TASKS.md` is unauthorized. `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, and `G-APPLY` remain blocked, independent, and non-transitive. No schema, migration, DB operation, Auth, permissions/RLS, workflow, E02 mechanism, production action, or implementation is authorized.
