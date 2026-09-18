# Tasks — STOCK-V1-E01-SCHEMA-DESIGN-001

## 1. Documentary status and authority boundary

- **Status:** PLANNED ONLY — every future package is `BLOCKED`; no package may autostart.
- **Task:** `STOCK-V1-E01-SCHEMA-DESIGN-001/TASKS-T01-CORRECTION-02`
- **Owner:** Backend/Data Execution Planner — corrective pass
- **Mode:** documentary planning / single writer
- **Artifact write authority:** this `TASKS.md` only
- **Current and implementation write set:** `∅`
- **Authorization effect:** none

This plan decomposes possible future work. It authorizes no schema choice or write, migration, SQL, seed, import, backfill, opening creation, database access, validator, test, command, Auth, permission/RLS, Cirugías/Expediente/Cajas change, E02 mechanism, production action, or APPLY. A checked dependency, review, or artifact cannot dispatch a successor. Franco must authorize every applicable gate and exact future Task Brief.

## 2. Provenance, inventory, and staleness contract

Fresh T00 immediately before this writer revalidated branch `master`, HEAD `4a25cf63a1dd8ddd2696f0d6601ad078cef5e37e`, absent target, absent `.git/index.lock`, no visible target/schema overlap, and these package blobs:

| Artifact | Frozen blob |
| --- | --- |
| `PROPOSAL.md` | `04c4716fae030ee1e7a993e7151b13998bb14195` |
| `SPEC.md` | `f65c5148de4cdf6b11a70ff311b0dea2abf603c6` |
| `DESIGN.md` | `7e9286686410124f009ee827f41b08e9e09dc06d` |

All `26/26` unique frozen predecessor/upstream inputs were revalidated exactly: package `PROPOSAL.md`, `SPEC.md`, and `DESIGN.md` plus the deduplicated governing/candidate files identified by SPEC §2, including `prisma/schema.prisma` at `6678c6fb9751af53bcd005c5e28301457c7fbcdd`. The candidate manifest remains indivisible read-only evidence, not live database truth or authority. Package inventory is exactly `PROPOSAL.md`, `SPEC.md`, `DESIGN.md`, and `TASKS.md`.

Fresh correction T00 immediately before this pass revalidated the same branch and HEAD, exact base `TASKS.md` blob `1e62dcede4e582e6b55e6938c2b7df4b765bac4b`, all `26/26` frozen upstream/package inputs, exact four-file package inventory, schema blob `6678c6…`, absent `.git/index.lock`, and no visible E01 target or schema-owner overlap. Cajas D3 remains proposed with substantive approval blocked, and Cajas D4 remains blocked with no schema reservation.

Fresh correction-02 T00 immediately before this pass revalidated branch `master`, HEAD `4a25cf63a1dd8ddd2696f0d6601ad078cef5e37e`, exact base `TASKS.md` blob `0bdfa01485af0549f9da8e51b386c194c9371bbf`, unchanged `26/26` frozen upstream/package inputs, exact four-file package inventory, schema blob `6678c6fb9751af53bcd005c5e28301457c7fbcdd`, absent `.git/index.lock`, and no visible E01 target or schema-owner overlap. Package blobs and package manifest remain exact.

Every future package requires a fresh T00 immediately before work. Drift in any frozen blob, manifest membership, branch/HEAD, package inventory, approval, owner, exact file set, scope, dependency, environment, or material risk makes evidence stale. Work must stop for explicit human re-baselining. A modified-but-hash-matching schema remains foreign-owned evidence and grants no ownership.

## 3. Execution and ownership contract

For every future package: **one task = one owner = one scope = one exact file set = one Caveman handoff**. The Task Brief must name role, model, mode, exact allowed and forbidden files, commands, validation, dependencies, gates, rollback/forward-fix, and stop conditions. Ownership follows `reserved → editing → review → released`; reviewers are read-only/no-fix and never inherit writer authority.

No package below has a reservation, write set, start signal, or command authority. Its current write set is `∅`, state is `BLOCKED`, and `no autostart` applies even after dependencies pass.

## 4. Review workload forecast

| Field | Value |
| --- | --- |
| Estimated future changed lines | Above 400 across schema, validation, tests, and planning |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending Franco decision |
| Suggested split | X00/G00 decisions → S01-A/B/C → V01 and V02-A/B/C → seven one-to-one Q01 reviews → Q01-C → Q02; M01 separate |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Future slices must be independently reviewable, use their immediate accepted base, and remain at or below 400 changed lines (`additions + deletions`). A slice that forecasts or reaches more than 400 changed lines must stop for explicit TASKS replanning before review; no implementation or review subdivision may be invented outside this declared DAG. Schema and migration work remain serialized regardless of chain strategy. No APPLY is currently available.

## 5. Dependency DAG and package inventory

```text
Fresh T00 + accepted TASKS reviews
  └─> X00 literal path/owner/base/lifecycle/disjointness record
       ├─> G00 readiness evidence + Franco G-SCHEMA decision
       ├─> D00 Franco decimal lexical-grammar decision
       └─> C00 Franco Stock/Cajas single-truth decision

Accepted G-SCHEMA + accepted C00 direct-Stock disposition
  └─> S01-A identity/eligibility/context ─> Q01-S01-A
       └─> S01-B trace/position/compatibility ─> Q01-S01-B
            └─> S01-C ActivationBoundary representation/integration ─> Q01-S01-C

Accepted S01-C + accepted D00 ─> V01 decimal validation contract ─> Q01-V01
Accepted S01-C ─> V02-A structural integrity ─> Q01-V02-A
Accepted V02-A + accepted V01 ─> V02-B decimal/compatibility structure ─> Q01-V02-B
Accepted V02-B ─> V02-C deferred-test registry ─> Q01-V02-C

Accepted Q01-S01-A + Q01-S01-B + Q01-S01-C + Q01-V01
  + Q01-V02-A + Q01-V02-B + Q01-V02-C ─> Q01-C consolidated verdict
Accepted Q01-C ─> Q02

Accepted S01-C + separate Franco G-MIGRATION approval ─> M01 migration/constraint planning
Accepted S01-C boundary + separately approved E02/E11 ─> O01 opening-evidence linkage
Accepted O01 + approved E02/E11 implementation evidence ─> operational opening tests (outside E01)
Any implementation ─> separate Franco G-APPLY approval (never implied above)
```

| Package | Deliverable | Dependency | Current state |
| --- | --- | --- | --- |
| `X00` | Literal execution-path, owner, base-blob, lifecycle, and disjointness record | Accepted TASKS reviews and fresh T00 | `BLOCKED`; decision/control only; `∅`; no autostart |
| `G00` | Readiness record and Franco `G-SCHEMA` decision packet | Accepted X00, TASKS reviews, and fresh T00 | `BLOCKED`; `∅`; no autostart |
| `D00` | Franco decimal lexical-grammar decision record | Accepted X00 and fresh T00 | `BLOCKED`; decision-only; `∅`; no autostart |
| `C00` | Franco Stock/Cajas single-truth decision record | Accepted X00 and fresh T00 | `BLOCKED`; decision-only; `∅`; no autostart |
| `S01-A/B/C` | Three autonomous serialized physical-schema slices | Explicit current `G-SCHEMA`, accepted C00 direct-Stock disposition, and prior slice | `BLOCKED`; `∅`; no autostart |
| `V01` | Representation-first decimal validation contract | Accepted S01-C and explicit D00 decision | `BLOCKED`; `∅`; no autostart |
| `V02-A/B/C` | Structural integrity; decimal/compatibility structure; deferred-test registry | Accepted S01-C, then prior slice; V01 before V02-B | `BLOCKED`; `∅`; no autostart |
| `M01` | Migration and physical-constraint plan only | Accepted schema plus separate `G-MIGRATION` approval | `BLOCKED`; `∅`; no autostart |
| `O01` | Opening-evidence linkage | Deferred to separately approved E02/E11 design | `BLOCKED`; `∅`; no autostart |
| `Q01-S01-A` | Autonomous DB/domain review of exact S01-A diff, ≤400 changed lines | Accepted immutable S01-A only, plus fresh T00 and reviewer independence | `BLOCKED`; read-only; no autostart |
| `Q01-S01-B` | Autonomous DB/domain review of exact S01-B diff, ≤400 changed lines | Accepted immutable S01-B only, plus fresh T00 and reviewer independence | `BLOCKED`; read-only; no autostart |
| `Q01-S01-C` | Autonomous DB/domain review of exact S01-C diff, ≤400 changed lines | Accepted immutable S01-C only, plus fresh T00 and reviewer independence | `BLOCKED`; read-only; no autostart |
| `Q01-V01` | Autonomous DB/domain review of exact V01 diff, ≤400 changed lines | Accepted immutable V01 only, plus fresh T00 and reviewer independence | `BLOCKED`; read-only; no autostart |
| `Q01-V02-A` | Autonomous DB/domain review of exact V02-A diff, ≤400 changed lines | Accepted immutable V02-A only, plus fresh T00 and reviewer independence | `BLOCKED`; read-only; no autostart |
| `Q01-V02-B` | Autonomous DB/domain review of exact V02-B diff, ≤400 changed lines | Accepted immutable V02-B only, plus fresh T00 and reviewer independence | `BLOCKED`; read-only; no autostart |
| `Q01-V02-C` | Autonomous DB/domain review of exact V02-C diff, ≤400 changed lines | Accepted immutable V02-C only, plus fresh T00 and reviewer independence | `BLOCKED`; read-only; no autostart |
| `Q01-C` | Consolidated 70/43 verdict without re-reviewing cumulative implementation diffs | All seven accepted one-to-one Q01 verdicts and unchanged cited blobs | `BLOCKED`; read-only; no autostart |
| `Q02` | Independent governance verdict | Accepted Q01-C and unchanged evidence | `BLOCKED`; read-only; no autostart |

## 6. Blocked future package specifications

### 6.1 X00 — Literal execution registry

- **Objective:** record every literal future path, sole owner, accepted base blob, ownership lifecycle state, and evidence that each write set is disjoint before any execution slice; select no implementation.
- **Owner/mode:** future Execution Registry owner; documentary decision/control only, single writer.
- **Dependencies:** accepted TASKS reviews, fresh T00, exact package inventory, and no visible reservation overlap.
- **Prospective ownership:** one separately authorized registry path only; all implementation paths remain read-only and unreserved.
- **Validation:** literal paths rather than wildcards; owner/model/mode; accepted parent blob; `reserved → editing → review → released`; Stock E01/Cajas D4/shared-file disjointness; 400-line ceiling.
- **Stop:** path is unknown, wildcard or shared ownership appears, base is mutable, lifecycle evidence is absent, or a decision is inferred from registry completion.
- **Handoff/state:** Caveman registry evidence; `BLOCKED`; decision/control only; `∅`; no autostart or hidden acceptance.

### 6.2 G00 — Readiness evidence and Franco decision packet

- **Objective:** assemble hash-pinned readiness evidence, unresolved risks, adopted/rejected alternatives, exact future ownership, and a decision request; do not decide `G-SCHEMA`.
- **Owner/mode:** future Backend/Data Readiness Owner; docs, single writer.
- **Dependencies:** approved TASKS closure, accepted X00, fresh T00, released ownership, no E01/Cajas D4 schema reservation.
- **Prospective ownership:** one future exact decision-packet path only; `prisma/schema.prisma` remains read-only.
- **Future gates:** Franco must explicitly decide `G-SCHEMA`; all other gates remain blocked.
- **Validation:** provenance, 70/43 traceability, DESIGN decision dispositions, exact file ownership, risks, and no hidden authorization.
- **Rollback/forward-fix:** withdraw stale packet; corrections return to its writer under fresh authorization. Never edit evidence in place through a reviewer.
- **Stop:** drift, overlap, unresolved P0/P1, ambiguous schema choice, or another gate/decision required.
- **Handoff:** Caveman readiness report plus explicit `G-SCHEMA` question.
- **State/write set:** `BLOCKED`; `∅`; no autostart.

### 6.3 D00 — Decimal lexical-grammar decision

- **Objective:** decide only the residual lexical grammar for quantity input before parsing: accepted locale/decimal separator, exponent notation, signs, surrounding/internal spaces, leading/trailing zeros, transport representation, and mandatory preservation of submitted text until validation; implement nothing. D00 cannot reopen, weaken, or reinterpret the already approved representation-first rejection of every fractional digit beyond the Article's approved scale.
- **Owner/mode:** future Decimal Contract Decision owner; documentary decision-only, single writer.
- **Dependencies:** accepted X00, fresh T00, frozen quantity requirements, and one exact decision-record path.
- **Prospective ownership:** one decision record only; no validator, transport, schema, test, or source file.
- **Validation:** every residual grammar dimension has an explicit accept/reject disposition; representation preservation precedes parse/canonicalization; every excess fractional digit beyond approved scale remains rejected regardless of accepted lexical form; no D00 completion is inferred without Franco's recorded choice.
- **Stop/handoff/state:** stop on omitted syntax, transport ambiguity, implementation detail, or assumed acceptance; Caveman decision request; `BLOCKED`; `∅`; no autostart.

### 6.4 C00 — Stock/Cajas single-truth decision

- **Objective:** ask Franco to select exactly one D4 dependency: direct approved Stock models, or one verified Cajas anti-corruption adapter; prohibit both from becoming independent identity/quantity truths.
- **Owner/mode:** future Cross-Package Decision owner; documentary decision-only, single writer.
- **Dependencies:** accepted X00, current immutable Stock E01 and Cajas D3 evidence, fresh T00, and no schema reservation.
- **Prospective ownership:** one decision record only; neither `prisma/schema.prisma` nor either package is owned.
- **Validation:** selected option, rejected option, exact governing blobs, owner, expiry conditions, and explicit statement that C00 acceptance authorizes neither Stock S01 nor Cajas D4.
- **Stop/handoff/state:** stop on dual truth, adapter plus direct-model coexistence, schema choice, overlap, or implicit approval; Caveman Franco decision request; `BLOCKED`; `∅`; no autostart.

### 6.5 S01-A/B/C — Autonomous serialized physical-schema slices

- **Objective:** only after `G-SCHEMA` and C00 selects direct Stock models, encode the approved E01 representation as three autonomous chained slices: `S01-A` identity/eligibility/context; `S01-B` trace, position scope, and compatibility; `S01-C` `ActivationBoundary` representation plus static integration.
- **Owner/mode:** one future Backend/Data schema writer; implementation, strictly serialized.
- **Dependencies:** current scoped Franco `G-SCHEMA`, accepted C00 direct-Stock disposition, accepted X00, fresh T00, and exact accepted parent for each `S01-A → S01-B → S01-C` slice.
- **Prospective ownership:** only `prisma/schema.prisma`, if the future brief grants it; no migration file.
- **Future gates:** `G-SCHEMA` and later separate `G-APPLY`; `G-MIGRATION` is not inherited.
- **Validation:** each slice has its own exact diff, static representation evidence, rollback boundary, and ≤400 changed-line budget; `S01-C` represents only the dated bounded `ActivationBoundary`, not opening creation, acceptance, fold, or operational tests.
- **Rollback/forward-fix:** discard the unaccepted candidate or produce a separately reviewed forward correction; never rewrite accepted migration history.
- **Stop:** more than 400 changed lines in a slice (return for explicit TASKS replanning; invent no slice), concurrent E01/Cajas D4 schema claim, schema hash drift, extra file, migration need, provider-specific assumption, or unapproved decision.
- **Handoff:** one Caveman handoff per autonomous slice with accepted parent, exact diff, static evidence, and residual constraints.
- **State/write set:** `BLOCKED`; `∅`; no autostart.

### 6.6 V01 — Representation-first decimal validation contract

- **Objective:** validate the submitted decimal representation before parsing/canonicalization, independently from stored Decimal precision.
- **Owner/mode:** future Backend Validation owner; implementation/testing in one exact isolated file set.
- **Dependencies:** accepted S01-C quantity interface, explicit Franco-approved D00 grammar, accepted X00, fresh exact-file T00, separate brief, and disjoint ownership proof.
- **Prospective ownership:** validator and its dedicated test file(s), exact paths selected only by the future brief; never schema or migration files.
- **Future gates:** separate `G-APPLY`; Auth, permissions, Cirugías, production remain blocked.
- **Validation:** apply the accepted D00 locale/separator, exponent, sign, spacing, zero, transport, and textual-preservation rules; prove scales `0`–`4`, canonical boundaries, scale-2 `1.23` acceptance and unconditional textual `1.230` rejection, every excess-digit negative, no implicit round/truncate/coerce, and separate stored Decimal precision/range.
- **Rollback/forward-fix:** revert the isolated validator slice or forward-fix under the same representation contract; accepted Stock effects must never be repaired by rounding.
- **Stop:** parser erases source scale before validation, locale/exponent/format policy is undecided, schema edit is needed, or exact paths overlap.
- **Handoff:** Caveman matrix of raw representation, approved scale, expected rejection, and stored-value boundary.
- **State/write set:** `BLOCKED`; `∅`; no autostart.

### 6.7 V02-A/B/C — Structural evidence and deferred-test registry

- **Objective:** `V02-A` proves structural identity/integrity and `ActivationBoundary` representation; `V02-B` proves decimal storage/compatibility structure; `V02-C` registers behavioral evidence deferred to E02/O01/E11 or the owning source domain without pretending to execute it.
- **Owner/mode:** future QA/Data Test owner; isolated testing.
- **Dependencies:** accepted immutable S01-C and X00 before V02-A; accepted V02-A plus V01 before V02-B; accepted V02-B before V02-C; fresh exact-file T00 for every slice.
- **Prospective ownership:** dedicated fixtures/tests in an exact future brief; no schema, migration, production data, or source-domain writer files.
- **Future gates:** separate `G-APPLY`; database access requires its own explicitly approved isolated environment and command set.
- **Validation:** V02-A covers company+Article equality, contexts/subtypes, trace-axis and lot/unit structural prerequisites, eligibility, static quantity vocabulary/ceiling/conservation support, and one boundary representation. V02-B covers stored precision/range and source-owned compatibility shape only. V02-C lists every deferred behavioral requirement/scenario, target package (`E02`, `O01`, `E11`, or the owning source domain), prerequisite, future evidence, and blocked status; specifically it defers identified-unit pending-state blocking, human source acceptance/non-mutation of compatibility, and linked correction/reversal behavior outside structural V02 PASS.
- **Rollback/forward-fix:** remove only the isolated test slice or correct fixtures prospectively; do not weaken constraints merely to pass tests.
- **Stop:** more than 400 changed lines in a slice (return for explicit TASKS replanning; invent no slice), shared/dev/production DB required, destructive setup, any conservation/reservation/dispatch/Consumption/Return/Transfer behavior execution, hidden E02 algorithm, opening creation/test, source-domain mutation, or cross-company disclosure.
- **Handoff:** Caveman scenario-by-scenario evidence and failures.
- **State/write set:** `BLOCKED`; `∅`; no autostart.

### 6.8 M01 — Separately gated migration/constraint planning

- **Objective:** plan migration ordering, provider capabilities, physical constraints, compatibility, and reversal/forward-fix only after schema acceptance; execute nothing.
- **Owner/mode:** future Migration Planner; docs/read-only planning, serialized after S01.
- **Dependencies:** accepted hash-pinned S01-C, separate Franco `G-MIGRATION` approval, fresh manifest T00, exact target path.
- **Prospective ownership:** one new planning artifact; any future migration directory requires another exact brief and is not owned here.
- **Future gates:** `G-MIGRATION`; data/backfill/opening, DB, production, and APPLY remain independently blocked.
- **Validation:** ordering, provider-neutral versus provider-specific constraints, replay assumptions, forward-fix, downgrade limits, data preconditions, and zero execution evidence.
- **Rollback/forward-fix:** withdraw the plan before execution; after any future accepted migration, use separately approved forward-fix rather than history rewriting.
- **Stop:** schema not accepted, migration file requested, DB access needed, data quality unknown, destructive action, or production scope appears.
- **Handoff:** Caveman planning report with explicit unexecuted status.
- **State/write set:** `BLOCKED`; `∅`; no autostart.

### 6.9 O01 — Deferred opening-evidence linkage

- **Objective:** link `ActivationBoundary` to accepted opening evidence only after E02/E11 defines ownership and effect semantics; never fabricate history.
- **Owner/mode:** future jointly scoped E02/E11 owner; design before implementation.
- **Dependencies:** accepted E01 boundary interface, approved E02/E11 opening-evidence design, bounded-slice decision, fresh T00.
- **Prospective ownership:** no E01 file is preassigned; exact linkage files are selected only by the later approved brief.
- **Future gates:** applicable schema/migration/APPLY gates plus production gate for any real opening; none is inherited.
- **Validation:** O01 may validate linkage design only. Operational opening, accepted-checkpoint, cross-boundary effect, and sole-truth tests require accepted O01 plus separately approved E02 and E11 implementation evidence and cannot complete in E01.
- **Rollback/forward-fix:** keep activation blocked or forward-fix linked evidence under E02/E11; never backdate, infer, delete, or rewrite source history.
- **Stop:** opening evidence owner is unclear, production slice is absent, backfill is proposed, or historical linkage would be invented.
- **Handoff:** Caveman deferred-dependency and boundary-evidence report.
- **State/write set:** `BLOCKED`; `∅`; no autostart.

### 6.10 Q01 one-to-one DB/domain reviews and consolidated verdict

- **Objective:** declare exactly seven one-to-one review nodes: `Q01-S01-A`, `Q01-S01-B`, `Q01-S01-C`, `Q01-V01`, `Q01-V02-A`, `Q01-V02-B`, and `Q01-V02-C`; each reviews only its namesake immutable implementation slice. `Q01-C` consolidates their accepted row-level verdicts into the exact 70/43 verdict and residual blockers without reviewing a cumulative implementation diff.
- **Owner/mode:** independent DB/domain reviewer; read-only/no-fix.
- **Dependencies:** each one-to-one node depends exactly on its namesake accepted immutable slice, fresh T00, and a reviewer with no writer role for that slice; no one-to-one node depends on another implementation slice or Q01 review. `Q01-C` depends exactly on all seven accepted one-to-one verdicts and unchanged cited blobs.
- **Prospective ownership:** none; review output location must be separately authorized.
- **Future gates:** grants none and cannot approve for Franco.
- **Validation:** every declared review is autonomous, cites the exact namesake blob/diff, reviews ≤400 changed lines, and issues row-level P0/P1/P2 evidence. No cumulative Q01-A/B review and no undeclared future review subdivision are permitted; if a namesake implementation slice exceeds 400 changed lines, that implementation stops for explicit replanning before its review node can start. `Q01-C` distinguishes E01 structural PASS from explicitly blocked E02/O01/E11/source-domain behavior and cannot convert deferral into PASS.
- **Rollback/forward-fix:** reviewer issues no fix; findings return to the owning writer under a new brief.
- **Stop:** namesake evidence changes, its diff exceeds 400 changed lines, another slice enters the review, any undeclared subdivision is proposed, reviewer independence fails, or a fix/write is requested.
- **Handoff:** one Caveman verdict per declared one-to-one node; only `Q01-C` may issue the consolidated `PASS`, `PASS WITH CONCERNS`, or `FAIL`.
- **State/write set:** `BLOCKED`; read-only `∅`; no autostart.

### 6.11 Q02 — Independent SDD/governance verification

- **Objective:** verify provenance, authority, package DAG, exact ownership, lineage, non-transitive gates, alternatives, and absence of hidden autostart.
- **Owner/mode:** separate SDD/governance reviewer; read-only/no-fix.
- **Dependencies:** accepted Q01-C evidence and unchanged S01/V01/V02 evidence, fresh T00, reviewer independence.
- **Prospective ownership:** none; review output location must be separately authorized.
- **Future gates:** grants none; only Franco may close readiness or approve a gate.
- **Validation:** all package fields, seven blocked gates, schema/migration serialization, complete lineage, 70/43 rows, and no command/production authorization.
- **Rollback/forward-fix:** reviewer issues no fix; correction returns to the exact writer and restarts independent review.
- **Stop:** drift, overlap, missing approval, hidden implementation decision, or attempted reviewer edit.
- **Handoff:** Caveman `PASS`, `PASS WITH CONCERNS`, or `FAIL`; if P0/P1 are zero, propose consolidated Franco closure only.
- **State/write set:** `BLOCKED`; read-only `∅`; no autostart.

## 7. Seven independently blocked gates

| Gate | Required future evidence | Current state and effect |
| --- | --- | --- |
| `G-SCHEMA` | G00 packet, accepted decisions, exact schema ownership, fresh T00, Franco decision | `BLOCKED`; no physical choice or schema write |
| `G-MIGRATION` | Accepted schema, M01 scope, provider/data evidence, separate Franco approval | `BLOCKED`; no migration, SQL, seed, import, backfill, or DB work |
| `G-AUTH` | Separate Auth architecture and approval | `BLOCKED`; no provider/session/identity change |
| `G-PERMISSIONS` | Separate capability/role/RLS matrix and approval | `BLOCKED`; no grants, roles, exceptional authority, or RLS |
| `G-CIRUGIAS` | Exact protected-flow brief and approval | `BLOCKED`; no Cirugías, Expediente, Ficha CX, Cajas placement, hooks/store/types/components |
| `G-PRODUCTION` | Exact environment/slice, dated go/no-go, rollout/rollback, Franco approval | `BLOCKED`; no real data, opening, deployment, cutover, repair, or writer routing |
| `G-APPLY` | Accepted reviewable slice, exact files/commands, risk decision, Franco dispatch | `BLOCKED`; no code, configuration, data, command, or implementation mutation |

Gate approval is scope-specific, evidence-bearing, expiring, and non-transitive. TASKS closure, review PASS, dependency completion, or approval of any one gate approves none of the others.

## 8. Critical serialization and safe candidate parallelism

Only one schema writer may own `prisma/schema.prisma`. C00 must first select direct Stock models or one Cajas adapter as the sole truth boundary; it authorizes neither writer. E01 S01-A/B/C and Cajas D4 schema ownership must never overlap; a visible or claimed reservation stops both until Franco selects order and a fresh X00/T00 proves release. S01-A, S01-B, and S01-C are autonomous but serialized on the shared schema and each must remain within 400 changed lines or stop and subdivide. Migration planning starts only after S01-C is accepted and `G-MIGRATION` is separately approved.

After X00 and exact-file T00 prove literal disjoint ownership, only representation-validator planning, fixture/test planning, and read-only review preparation may run in parallel. Shared schema, validators, fixtures, and the S01/V02 implementation chains remain serialized on their immediate accepted bases. Each declared one-to-one Q01 node depends only on its namesake immutable slice; `Q01-C` waits for all seven verdicts. Parallel permission never autostarts a task.

## 9. Approved DESIGN decision dispositions

| Decision | Adopted candidate and rationale | Rejected/deferred alternatives and rationale |
| --- | --- | --- |
| Eligibility | Versioned company–Article link; preserves company applicability, policy boundaries, and historical interpretation. | Article flag rejects company isolation/history; non-versioned link cannot preserve policy boundaries. |
| Custody | Company context supertype with Deposit, Transit, and External-Custody subtypes; preserves distinct lifecycle/conservation semantics. | Nullable columns permit invalid combinations; discriminator-only shape weakens subtype integrity. |
| Trace grain | One position scope with exactly one applicable axis: none, lot, or identified unit; enforces applicability without fabricated dimensions. | Universal columns create null/invalid combinations; unrelated families complicate common scope integrity. |
| Quantity storage | Exact Decimal, documentary precision 24 and maximum scale 4, with row-carried governing scale; matches exact arithmetic and finite range. | Float is inexact; scaled integer adds conversion semantics; final provider constraint remains gated. |
| Quantity input | Representation-first rejection before parse/canonicalization; preserves excess-digit evidence. | Parse-first normalization could accept `1.230` at scale 2; implicit rounding/truncation violates SPEC. |
| Identity | Immutable technical IDs with scoped labels/codes as alternates; avoids soft-label identity. | Free text, copied labels, and opaque soft references cannot establish authoritative identity. |
| Company integrity | Company ID on every company-owned relation plus composite company+Article references; structurally rejects cross-company and same-company/wrong-Article links. | Service-only checks are insufficient for protected relational integrity. |
| Eligibility history | Non-overlapping effective versions bind quantity and trace policy snapshots. | Mutable current-policy fields would reinterpret accepted history. |
| Context detail | No internal-bin expansion in V1. | Detailed warehouse locations are outside approved scope. |
| Lot canonicalization | Preserve pre-canonical observations; create/consolidate canonical business lot only after discrepancy resolution. | Silent merge/split/overwrite or expiration normalization would rewrite evidence. |
| Identified units | Stable non-fungible identity; prospective reconfiguration only when no pending reservation/assignment/custody/disposition exists. | Fungible treatment and retroactive configuration violate exclusivity/history. |
| Aggregation | Compatible, derived, non-editable aggregates. | Mutable aggregate or candidate balance would create alternate Stock truth. |
| Compatibility | Source-owned rows, exactly one approved disposition, human acceptance, company-scoped effect references. | Stock-owned registry, automatic acceptance, and global actionable exemptions violate ownership and isolation. |
| Opening boundary | `ActivationBoundary` records the bounded dated interface only. | Opening evidence shape/fold/linkage is deferred to E02/E11; inferred pre-boundary history is prohibited. |
| E02 mechanisms | Conservation equations remain acceptance invariants only. | Storage, projections, folds, locks, isolation, idempotency, replay, repair, and reconstruction remain unselected. |

These are approved DESIGN recommendations for a future G00 decision packet, not self-authorizing schema selections. Any revision is a new product/architecture/schema decision and must stop this chain for Franco.

## 10. Writer, correction, approval, and artifact lineage

| Stage | Artifact/evidence | Writer or reviewer boundary | Approval/correction lineage |
| --- | --- | --- | --- |
| Proposal | `PROPOSAL.md` blob `04c471…` | Backend/Data Architect — Stock E01 | Franco approved and closed 2026-07-20; corrections required fresh writer authority. |
| Specification | `SPEC.md` blob `f65c51…` | Backend/Data Architecture Specification Writer | Independently reviewed, then explicitly approved/closed by Franco without editing the frozen blob. |
| Design initial/corrections | `DESIGN.md` final blob `7e9286…` | Backend/Data Design writer; correction writers limited to exact findings | R01 findings returned to writer under fresh authorization; reviewers remained no-fix; final R01/R02 had P0=0/P1=0. |
| Design approval | Final immutable DESIGN evidence | Franco only | Explicitly closed DESIGN; did not authorize TASKS or any gate. |
| TASKS exploration/T00 | hash-pinned read-only readiness evidence | Read-only explorer; no writer authority | Fresh T00 PASS immediately preceded this dispatch. |
| TASKS initial writer | base blob `1e62dcede4e582e6b55e6938c2b7df4b765bac4b` | Backend/Data Execution Planner — Stock E01 | R01 returned exactly seven findings; reviewer remained read-only/no-fix. |
| TASKS correction 01 | `TASKS.md` blob `0bdfa01485af0549f9da8e51b386c194c9371bbf` | Backend/Data Execution Planner — corrective pass | Franco authorized correction from exact initial base; subsequent conditional reviews found exactly three residual P1. |
| TASKS correction 02 | this corrected file only | Backend/Data Execution Planner — corrective pass | Franco authorized only the three residual P1 corrections from exact correction-01 blob; no downstream gate or implementation authority. |
| TASKS R01 | next technical/executability report | Independent DB/domain reviewer, read-only/no-fix | Rechecks the corrected immutable blob; findings return to writer under new exact authorization. |
| TASKS R02 | future governance report | Separate SDD/governance reviewer, read-only/no-fix | Starts only after R01; findings return to writer. |
| Consolidated closure | future Franco closure proposal | Orchestrator/human boundary, not this writer | May be proposed only if both reviews report P0=0/P1=0; no gate is implied. |
| G00 and later | future separately authorized artifacts | One owner per exact slice | Each correction, review, approval, and resulting blob must be recorded without overwriting prior lineage. |

## 11. Row-level requirement execution matrix — 70/70

No family-only claim is sufficient. Each normative requirement has an explicit future package and evidence obligation.

| Requirement | Primary package | Required row-level evidence |
| --- | --- | --- |
| `E01-GOV-001` | G00/Q02 | Baseline inventory proves CORE/U/DR/UXD/A/Cajas fidelity. |
| `E01-GOV-002` | G00/Q02 | Packet and handoffs state documentary authority only. |
| `E01-GOV-003` | G00/Q02 | Frozen sources govern; candidate manifest remains evidence. |
| `E01-GOV-004` | G00/Q02 | Fresh-T00 mismatch forces stop and re-baseline. |
| `E01-GOV-005` | G00/Q02 | No dependency, review, artifact, or gate grants another. |
| `E01-CORE-001` | S01-A/V02-A | Company eligibility gates operational Stock independently. |
| `E01-CORE-002` | S01-A/V02-A | Stable identities, not labels/soft evidence, anchor links. |
| `E01-CORE-003` | S01-B/V02-A | Position scope includes company, Article, context, applicable trace. |
| `E01-CORE-004` | S01-B/V02-A | Aggregates are compatible, derived, and non-editable. |
| `E01-CORE-005` | S01-A/V02-A | Multiple deposits and explicit transit/external custody; no bins. |
| `E01-CORE-006` | S01-B/V02-A | None/lot/identified-unit applicability excludes fabricated axes. |
| `E01-CORE-007` | S01-B/V02-A | Accepted trace/source snapshots survive later changes. |
| `E01-CORE-008` | S01-B/V02-A | Identified-unit exclusivity is structurally supported; operational conflict behavior is registered in V02-C for E02. |
| `E01-CORE-009` | S01-A/V01 | One unit and approved scale; no conversion engine. |
| `E01-CORE-010` | S01-B/V02-A | Distinct quantity/disposition vocabulary remains representable. |
| `E01-CORE-011` | S01-B/V02-A→V02-C:E02 | E01 proves vocabulary/exclusion representation; availability behavior is deferred. |
| `E01-CORE-012` | S01-B/V02-A | Unique compatible contribution structurally prevents contradictory double count. |
| `E01-CORE-013` | S01-B/V02-A→V02-C:E02 | E01 proves origin/ceiling references; cumulative allocation behavior is deferred. |
| `E01-CORE-014` | S01-B/V02-A→V02-C:E02 | E01 proves transfer-state representation; conservation behavior is deferred. |
| `E01-ELIG-001` | S01-A/V02-A | Versioned company applicability preserves policy/history. |
| `E01-LOC-001` | S01-A/V02-A | Deposit, transit, external custody have distinct subtype integrity. |
| `E01-LOT-001` | S01-B/V02-A | Canonical lot uniqueness is company+Article+normalized code. |
| `E01-LOT-002` | S01-B/V02-A | Expiration discrepancy blocks equivalence pending linked evidence. |
| `E01-UNIT-001` | S01-B/V02-A | One stable identified-unit lifecycle remains attributable. |
| `E01-UNIT-002` | S01-B/V02-A→V02-C:E02 | E01 proves prospective configuration and pending-state prerequisites structurally; blocking behavior is deferred to E02. |
| `E01-COMP-001` | S01-B/V02-B | Exactly one of four compatibility dispositions. |
| `E01-COMP-002` | S01-B/V02-B | Source domain owns disposition and retention. |
| `E01-COMP-003` | S01-B/V02-B→V02-C:source-domain | E01 proves automation/source-decision separation structurally; human acceptance and non-mutation behavior are deferred to the owning source domain. |
| `E01-COMP-004` | S01-B/V02-B | No fabricated relationship or second Stock writer. |
| `E01-COMP-005` | S01-B/V02-B | Unresolved legacy is read-only and operationally excluded. |
| `E01-QTY-001` | S01-A/V01 | Approved Article scale is constrained to each value 0–4. |
| `E01-QTY-002` | V01/V02-B | Exact base-10 arithmetic/comparison at governing scale. |
| `E01-QTY-003` | V01 | Raw excess fractional digits reject before Stock effect. |
| `E01-QTY-004` | V01 | No implicit round, truncate, coercion, or conversion. |
| `E01-CONS-001` | S01-C/V02-A→V02-C:O01/E02/E11 | E01 proves cause/boundary representation; establishment behavior is deferred. |
| `E01-CONS-002` | S01-B/V02-A→V02-C:E02 | E01 proves distinct reservation vocabulary/support; reclassification behavior is deferred. |
| `E01-CONS-003` | S01-A/B/V02-A→V02-C:E02 | E01 proves custody/scope support; dispatch behavior is deferred. |
| `E01-CONS-004` | S01-B/V02-A→V02-C:E02 | E01 proves shared-origin/remainder support; Consumption/Return behavior is deferred. |
| `E01-CONS-005` | S01-A/B/V02-A→V02-C:E02 | E01 proves transfer contexts/support; conservation behavior is deferred. |
| `E01-CONS-006` | S01-B/V02-A→V02-C:E02 | E01 proves observation/correction separation; zero-effect behavior is deferred. |
| `E01-CONS-007` | S01-B/V02-A→V02-C:E02 | E01 proves bounded linked evidence structure; correction/reversal behavior is deferred. |
| `E01-CONS-008` | S01-B/V02-A→V02-C:E02 | E01 proves structural isolation/exclusivity/ceiling support; runtime safety is deferred. |
| `E01-CONS-009` | G00/Q02 | Tests treat equations as criteria, not E02 mechanism selection. |
| `E01-HIST-001` | S01-B/V02-A | Every accepted cause retains applicable attribution fields. |
| `E01-HIST-002` | S01-B/V02-A | Composite protected links reject cross-company references safely. |
| `E01-HIST-003` | S01-B/V02-A | Later policy/labels/review cannot reinterpret accepted facts. |
| `E01-OPEN-001` | S01-C/V02-A→O01/E02/E11 | E01 proves one dated boundary representation; operational opening is deferred. |
| `E01-OPEN-002` | S01-C/V02-A→O01/E02/E11 | E01 represents checkpoint linkage; effect timing tests are deferred. |
| `E01-OPEN-003` | S01-C/V02-A→O01/E02/E11 | E01 represents cross-boundary metadata; prospective behavior is deferred. |
| `E01-OPEN-004` | S01-C/V02-A→O01/E02/E11 | E01 excludes alternate truth structurally; operational sole-truth tests are deferred. |
| `E01-NEG-001` | G00/Q02 | No unapproved final physical choice enters readiness. |
| `E01-NEG-002` | M01/Q02 | No migration/data action is selected or executed. |
| `E01-NEG-003` | G00/Q01-C | No E02 mechanism enters E01 candidate or evidence. |
| `E01-NEG-004` | G00/Q02 | Adjacent Auth/permissions/workflows/APIs/UI/types/store excluded. |
| `E01-NEG-005` | G00/Q01-C | No bins, universal trace, conversion, composition, finance, or WMS expansion. |
| `E01-NEG-006` | S01-B/V02-A | No mutable aggregate, compatibility view, projection, or candidate truth. |
| `E01-NEG-007` | G00/Q01-C | No identity, movement, opening, or continuity invented from candidates. |
| `E01-NEG-008` | G00/Q02 | No command or automatic progression. |
| `E01-GATE-001` | G00/Q02 | G-SCHEMA stays blocked until explicit Franco decision. |
| `E01-GATE-002` | M01/Q02 | G-MIGRATION stays separately blocked after schema acceptance. |
| `E01-GATE-003` | G00/Q02 | G-AUTH remains independent and blocked. |
| `E01-GATE-004` | G00/Q02 | G-PERMISSIONS remains independent and blocked. |
| `E01-GATE-005` | G00/Q02 | G-CIRUGIAS remains independent and blocked. |
| `E01-GATE-006` | G00/Q02 | G-PRODUCTION remains independent and blocked. |
| `E01-GATE-007` | G00/Q02 | G-APPLY remains independent and blocked. |
| `E01-GATE-008` | G00/Q02 | All seven gates are scope-specific, expiring, human-approved. |
| `E01-REV-001` | Q01-S01-A/B/C,Q01-V01,Q01-V02-A/B/C,Q01-C/Q02 | Separate independent technical and governance reviewers are assigned. |
| `E01-REV-002` | Q01-S01-A/B/C,Q01-V01,Q01-V02-A/B/C,Q01-C/Q02 | Each verdict cites evidence and grants no approval. |
| `E01-REV-003` | Q01-S01-A/B/C,Q01-V01,Q01-V02-A/B/C,Q01-C/Q02 | Findings return to writer; reviewers never fix. |
| `E01-STOP-001` | All/Q02 | Every package applies the complete mandatory stop set. |

## 12. Row-level scenario execution matrix — 43/43

| Scenario | Primary package | Required future proof |
| --- | --- | --- |
| `E01-SCN-001` | G00/Q02 | Documentary approval leaves every downstream action unauthorized. |
| `E01-SCN-002` | G00/Q02 | Any frozen drift stops and requires re-baselining. |
| `E01-SCN-003` | S01-A/V02-A | Company A eligibility cannot create company B Stock. |
| `E01-SCN-004` | S01-A/V02-A | Prospective eligibility change preserves prior policy facts. |
| `E01-SCN-005` | S01-B/V02-A | Cross-company protected reference rejects without disclosure/effect. |
| `E01-SCN-006` | S01-A/V02-A | Shared label/code alone establishes no identity. |
| `E01-SCN-007` | S01-B/V02-A | Actionable grain remains explicit; aggregate is not mutable truth. |
| `E01-SCN-008` | S01-B/V02-A | Incompatible scopes remain isolated and counted once. |
| `E01-SCN-009` | S01-A/V02-A | Deposit, transit, external custody remain distinct. |
| `E01-SCN-010` | S01-B/V02-A | No lot/serial is fabricated where inapplicable. |
| `E01-SCN-011` | S01-B/V02-A | Scoped lot equivalence succeeds without source rewrite. |
| `E01-SCN-012` | S01-B/V02-A | Expiration discrepancy blocks equivalence pending linked review. |
| `E01-SCN-013` | S01-B/V02-A→V02-C:E02 | E01 proves pending-state/configuration prerequisites; E02 must prove incompatible claims/configuration are blocked. |
| `E01-SCN-014` | S01-B/V02-A | Clear identified unit may change prospectively only. |
| `E01-SCN-015` | S01-B/V02-B | Every soft reference has exactly one approved disposition. |
| `E01-SCN-016` | S01-B/V02-B→V02-C:source-domain | E01 proves proposal-versus-source-decision structure; the owning source domain must prove evidence remains non-actionable until human acceptance. |
| `E01-SCN-017` | S01-B/V02-B | Descriptive snapshot is explanatory and non-actionable. |
| `E01-SCN-018` | S01-B/V02-B/O01 | Unresolved legacy is immediately excluded and retained read-only. |
| `E01-SCN-019` | S01-B/V02-B | Rejected compatibility cannot fabricate history or write Stock. |
| `E01-SCN-020` | V01 | Scale 0 rejects `1.5` without rounding/effect. |
| `E01-SCN-021` | V01/V02-B | Scale 4 computes `1.2345 + 0.0005 = 1.2350` exactly. |
| `E01-SCN-022` | V01 | Scale 2 rejects `3.141` entirely. |
| `E01-SCN-023` | S01-B/V02-A | Quantity vocabulary excludes duplicate usable contribution. |
| `E01-SCN-024` | V02-C:O01/E02/E11 | Deferred behavioral proof: opening 10 plus receipt 4 establishes exactly 14 once. |
| `E01-SCN-025` | V02-C:E02 | Deferred behavioral proof: reserve/release leaves physical quantity unchanged and available 7. |
| `E01-SCN-026` | V02-C:E02 | Deferred behavioral proof: dispatch transfers quantity once and conserves company quantity. |
| `E01-SCN-027` | V02-C:E02 | Deferred behavioral proof: Consumption 4 and Return 3 leave exactly 3 of dispatch 10. |
| `E01-SCN-028` | V02-C:E02 | Deferred behavioral proof: completed transfer clears transit and conserves company total. |
| `E01-SCN-029` | V02-C:E02 | Deferred behavioral proof: partial receipt leaves explicit unresolved quantity without duplication. |
| `E01-SCN-030` | V02-C:E02 | Deferred behavioral proof: count observation alone changes no Stock. |
| `E01-SCN-031` | S01-B/V02-A→V02-C:E02 | E01 proves original/correction linkage and bounded-scope prerequisites; E02 must prove correction behavior preserves both. |
| `E01-SCN-032` | V02-C:E02 | Deferred behavioral proof: exhausted origin rejects further allocation without partial effect. |
| `E01-SCN-033` | G00/Q01-C | Accepted equations select no E02 mechanism. |
| `E01-SCN-034` | V02-C:O01/E02/E11 | Deferred operational proof: one honest dated opening creates no pre-boundary events. |
| `E01-SCN-035` | V02-C:O01/E02/E11 | Deferred operational proof: pre-boundary creation accepted later takes effect only at acceptance. |
| `E01-SCN-036` | S01-B/V02-A | Later configuration leaves accepted facts interpretable. |
| `E01-SCN-037` | V02-C:O01/E02/E11 | Deferred operational proof: opening plus accepted post-boundary effects is sole truth. |
| `E01-SCN-038` | G00/Q02 | Hidden physical/algorithm/adjacent-system choice fails review. |
| `E01-SCN-039` | G00/Q01-C | Candidate repository resemblance grants no authority. |
| `E01-SCN-040` | G00/Q02 | All seven gates remain independently blocked. |
| `E01-SCN-041` | Q01-S01-A/B/C,Q01-V01,Q01-V02-A/B/C,Q01-C/Q02 | Reviewers report only; correction returns to writer. |
| `E01-SCN-042` | All/Q02 | Stop condition preserves every blocked state and write boundary. |
| `E01-SCN-043` | G00/Q01-C | Unsupported Stock/WMS/financial expansion is rejected. |

## 13. R01 correction map

| R01 finding | Corrected sections |
| --- | --- |
| Q01/Q02 DAG prerequisites | §§5, 6.10–6.11 |
| V02 structural/decimal/deferred split | §§5, 6.7, 11–12 |
| `ActivationBoundary` versus operational opening tests | §§5, 6.5, 6.7, 6.9, 11–12 |
| Blocked decimal lexical decision D00 | §§5, 6.3 |
| Blocked literal ownership/base registry X00 | §§5, 6.1 |
| Blocked Stock/Cajas single-truth decision C00 | §§5, 6.4, 8 |
| Autonomous ≤400-line S01/V02/Q01 chains | §§4–6, 8 |

### Correction-02 residual P1 map

| Residual P1 | Corrected sections |
| --- | --- |
| D00 limited to residual lexical grammar without reopening excess-digit rejection | §§5, 6.3, 14 |
| Five behavioral rows excluded from structural V02 PASS and deferred to E02/source-domain | §§6.7, 11–12, 14 |
| Seven declared one-to-one Q01 nodes replace cumulative Q01-A/B review | §§4–6, 11–12, 14 |

## 14. Future acceptance checklist

- [ ] Fresh T00 matches all `26/26` frozen upstream/package inputs, exact base, branch/HEAD, inventory, ownership, and exact file set.
- [ ] X00 records literal paths, sole owners, accepted base blobs, lifecycle states, and disjointness before execution; it grants no acceptance.
- [ ] D00 records only Franco's residual decimal lexical grammar before V01; it cannot reopen representation-first rejection of every excess fractional digit, implements nothing, and grants no acceptance by completion.
- [ ] C00 records Franco's direct-Stock-models OR single-Cajas-adapter choice before Stock S01-A or Cajas D4; never both truths and no writer authority.
- [ ] G00 records every adopted/rejected DESIGN alternative and Franco's explicit `G-SCHEMA` decision.
- [ ] Every package has one owner, one scope, one exact file set, one handoff, and no overlap.
- [ ] S01-A/B/C are autonomous immediate-base slices, serialized on one schema writer, each ≤400 changed lines or stopped for explicit TASKS replanning without inventing a slice, with no concurrent Cajas D4 owner.
- [ ] V01 follows explicit D00 and proves raw representation rejection separately from stored Decimal precision for scales 0–4 and excess-digit negatives.
- [ ] V02-A proves structural integrity, V02-B proves decimal/compatibility structure only, and V02-C records every blocked E02/O01/E11/source-domain behavioral test without executing it; `E01-UNIT-002`, `E01-COMP-003`, `E01-SCN-013`, `E01-SCN-016`, and `E01-SCN-031` cannot contribute behavioral PASS in V02-A/B; each implementation slice is ≤400 changed lines or stopped for explicit replanning.
- [ ] `ActivationBoundary` representation completes only in S01-C/V02-A; operational opening tests require accepted O01 plus approved E02/E11 and cannot complete in E01.
- [ ] M01 follows accepted schema and separate `G-MIGRATION`; no migration is authored or executed by this plan.
- [ ] Requirement matrix is `70/70`; scenario matrix is `43/43`; no family-only assertion substitutes for a row.
- [ ] Writer, correction, reviewer, Franco approval, immutable blob, and resulting artifact lineage is complete.
- [ ] Exactly `Q01-S01-A`, `Q01-S01-B`, `Q01-S01-C`, `Q01-V01`, `Q01-V02-A`, `Q01-V02-B`, and `Q01-V02-C` each review only their namesake accepted slice and ≤400 changed lines; no cumulative Q01-A/B or undeclared subdivision exists; `Q01-C` consolidates all seven verdicts, then Q02 follows it; all remain independent, read-only, and no-fix.
- [ ] `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, and `G-APPLY` are separately evidenced and never transitively approved.
- [ ] High review workload is delivered through autonomous reviewable slices after Franco chooses the chain strategy.
- [ ] No migration execution, database access, implementation command, production task, hidden authorization, or autostart appears.
- [ ] Final evidence includes package inventory of exactly four files, scoped diff/whitespace result, final TASKS blob, line count, and word count.

## 15. Caveman handoff contract

Every future package and review must close with:

```text
Done: exact completed evidence or explicit blocked result
Changed: exact authorized mutation, or none
Files: exact file set and resulting blobs
Validations: row/scenario evidence and scoped checks
Risks: unresolved risks, stale evidence, and blocked gates
Next: one separately approvable successor only; never autostart
```

## 16. Explicit no-authorization closure

This TASKS artifact is a plan, not a dispatch. All packages and seven gates remain `BLOCKED`; every current write set is `∅`. It creates no schema ownership, migration authority, database access, command permission, implementation right, production task, or APPLY authorization. The next permitted sequence is R01 technical/executability read-only/no-fix, then R02 governance read-only/no-fix. Only if both report P0=0/P1=0 may a consolidated Franco closure proposal be prepared; that proposal still cannot approve a protected gate by implication.
