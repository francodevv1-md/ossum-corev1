# Approved Conceptual Decisions — CD-01–CD-10

| Metadata | Value |
| --- | --- |
| Status | **APPROVED** |
| Approver | Franco |
| Approval date | 2026-07-20 |
| Approval evidence | Franco explicitly replied `APRUEBO` to the complete CD-01–CD-10 packet on 2026-07-20. |
| Authority | Authoritative addendum for CD-01–CD-10; the existing SPEC/DESIGN baseline remains unchanged. |
| Approval effect | Conceptual product decisions only. |

## Purpose and authority

This addendum records the approved conceptual product decisions below without amending, replacing, or reinterpreting the existing PROPOSAL, SPEC, DESIGN, or TASKS artifacts. It provides authoritative decision evidence for this packet only.

## CD-01 — Reservation commitment

A physical identified box or component becomes reserved for the Surgery/Record when its incorporation into active preparation is explicitly confirmed. Browsing, opening, provisional marking, comparison, or draft selection does not reserve Stock. A confirmed replacement must release the previous reservation and accept the new reservation as one coherent confirmation without oversubscription.

## CD-02 — Pre-dispatch removal and cancellation

Before dispatch, removing a confirmed component releases only that component's reservation; removing an identified box releases the box and all still-undispatched component reservations; cancelling the whole operation releases all undispatched reservations. A post-control composition change preserves prior evidence and requires applicable re-control. Dispatched material is never handled as a simple release.

## CD-03 — Successful Remittance issuance

Remittance issuance succeeds only when the owning flow accepts the Remittance as emitted and operationally valid—not at draft, preview, tentative numbering, download, or attempted issuance. Remittance acceptance, its immutable Dispatched Content, and the Stock dispatch effect are accepted together; if any fails, none succeeds. Later annulment never erases or mutates that evidence and instead adds a linked correction or reversal. Formal/fiscal/commercial effects remain outside scope.

## CD-04 — Multiple dispatches and redispatch

One identified box may participate in multiple independent, non-overlapping dispatches within its operation. Each quantity or physical unit belongs to at most one current dispatch; cumulative dispatch cannot exceed controlled and reserved composition; undispatched content remains reserved; every dispatch keeps independent evidence/accounting. Redispatch of returned material is a new dispatch after applicable operational review and never edits prior dispatch evidence.

## CD-05 — Partial Return semantics

Each partial Return references one specific dispatch and accounts only quantities/units confirmed in that Return. “Without changes” applies only to the portion declared returned in that confirmation; remaining dispatch balance stays pending. Correctly returned components may become Available after human validation when they have no differences. The identified box remains linked and non-reusable while content remains pending or differences remain open. A partial result never implies global box availability.

## CD-06 — Consumption and Return shared accounting

Consumption becomes effective only through explicit human confirmation linked to the applicable Remittance/dispatch and may be partial. Consumption and Return may be confirmed in either order but must consume one shared pending balance per dispatch. A quantity already accepted as consumed, returned, damaged, missing, or under review cannot receive a second disposition. If a confirmed Return explicitly classifies a component as consumed, that classification produces the single corresponding consumption effect; later Consumption input recognizes it as already accounted. This is an expressly approved new product rule.

## CD-07 — Added and replacement items

Every added item or item received as a replacement must be identified and remain Under Review until origin, belonging, and disposition are resolved. A replacement preserves evidence for both sides: the originally dispatched item and the received replacement item. The decision does not presume physical custody of the originally dispatched item and does not infer compensation, Stock availability, entry, or exit from comparison alone.

## CD-08 — Difference resolution and availability

Each difference closes individually through new evidence and never rewrites dispatch, Return, or historical result. Correct/unaffected components retain their approved disposition; affected components remain unavailable or Under Review until resolution and the applicable checkpoint. The identified box remains With Differences while any difference is open. Closing the last difference only enables Re-control Box. Only an explicit clean successful re-control restores global box status to Available.

## CD-09 — Read-model freshness

Every critical confirmation—selection, control, dispatch, Return, Consumption, or resolution—must revalidate current server truth before acceptance. After success, the same operation immediately shows its confirmed result. Search, summary, and history views may refresh later only if they clearly indicate updating/non-current state, never show false zero/success/availability, and never enable confirmation from stale data. No technical time SLA is selected.

## CD-10 — Company and conceptual capability boundary

Every query/mutation is limited to the authorized company and validated server-side. Cross-company references are rejected without revealing existence or causing side effects. Critical actions require the applicable conceptual capability and audit actor, company, cause, and result; UI state is never a security control. Exact ownership/capability for closing differences remains pending Franco's later business definition and must not be inferred from current roles or mapped technically now.

## Non-authorization and downstream gate

This approval records conceptual product decisions only. It does **not** authorize schema, migrations, APIs, services, technical contracts, Auth, permissions, role mapping, Surgery/Record changes, protected-file changes, TASKS, implementation, or APPLY.

Any incorporation of these decisions into SPEC, DESIGN, or TASKS, and any technical Task Brief derived from them, requires a separate task and all applicable approvals. Nothing in this addendum selects an implementation, resolves the pending CD-10 ownership/capability definition, or expands the authority of the existing baseline.
