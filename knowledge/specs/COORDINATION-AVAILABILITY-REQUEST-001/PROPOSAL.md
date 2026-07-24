# Proposal — COORDINATION-AVAILABILITY-REQUEST-001

Status: proposed; documentation only; requires explicit human approval before DESIGN, schema, migration, permissions, or implementation

Change: `COORDINATION-AVAILABILITY-REQUEST-001`

Workspace: `E:/OSSUM_COR_PROJECT`

Artifact chain: **PROPOSAL** → human approval → DESIGN → SPEC → TASKS → APPLY

---

## 1. Summary

Introduce a traceable, company-scoped workflow through which an authorized coordinator can use **`Pedir disponibilidad`** when a surgery has no canonical material availability date.

The request must reach two intended subjects: the original Surgery creator and the company's one specifically designated Gestión de Implantes/PÍVOT operator. If both subjects are the same user, the system sends one actionable notification. If an historical Surgery has no provable creator, the request goes only to PÍVOT and visibly states **`Creador de la cirugía no identificado`**.

Either valid recipient may open the actionable notification and set one date-only **`Fecha de disponibilidad del material`**. A successful completion closes the single open request for both recipients, records actor, time, old and new values, creates a traceable surgery event/note, and notifies the requester. A completed request is never reopened to correct the date; later corrections happen only from Expediente under the separately authorized and audited edit path.

This proposal deliberately does not approve an implementation. Current persistence lacks an explicit Surgery creator, a canonical material availability date, a company-scoped PÍVOT designation, and a persisted availability-request lifecycle. A safe implementation is therefore expected to require architecture, schema, migration/backfill, and narrow authorization decisions that Franco must approve separately.

---

## 2. Problem and current-state evidence

Coordination needs to ask the responsible operational users when material will be available, but the current system has no trustworthy end-to-end contract for that action.

Current evidence establishes these gaps:

1. `Surgery` has neither an explicit `createdById` nor a canonical material availability date.
2. The creator of newer persisted surgeries may be recoverable only from an exact, company-scoped `AuditEvent` with action `surgery.created`; historical cases may have no provable creator.
3. There is no persisted company-scoped designation for exactly one Gestión de Implantes/PÍVOT operator.
4. `InternalNotification` can persist multiple recipient rows and mark them read, but it does not represent a shared actionable request lifecycle. Read/unread state is not completion state.
5. Existing operational notifications use recipient-specific idempotency keys, but they do not provide one-open-request-per-surgery semantics or an atomic date-write-and-close operation.
6. Existing roles such as `operator` are broader than this capability. Treating every operator as PÍVOT or granting every operator the completion action would violate the approved business rule.

Without a persisted workflow, the UI could show an action that duplicates requests, sends to the wrong company, loses the historical creator caveat, allows stale recipients to complete, or writes a date after another actor already completed the request.

---

## 3. Goals

1. Make **`Pedir disponibilidad`** available only to an authenticated actor with a narrowly approved coordinator capability in the current company and only while the canonical material availability date is absent.
2. Resolve exactly one active, company-scoped designated PÍVOT; deny request creation when that designation is missing, ambiguous, inactive, or belongs to another company.
3. Resolve the original Surgery creator from a future explicit source or, for historical records, from exact auditable evidence without guessing or impersonation.
4. Deliver actionable notifications to the creator and PÍVOT, deduplicated by user identity.
5. Persist one shared request lifecycle so either valid recipient can complete it and completion applies to both.
6. Write a date-only canonical material availability value atomically with request completion.
7. Preserve tenant isolation, actor attribution, old/new values, and a human-readable event/note in the Surgery/Expediente trace.
8. Notify the original requester after successful completion.
9. Make retries safe and concurrent attempts deterministic and fail-closed.
10. Keep later date correction separate: **`Corregir fecha desde Expediente`**, never request reopening.

---

## 4. Non-goals

- No schema, Prisma, migration, seed, Auth, database, API, service, UI, or source-code change in this proposal.
- No approval to implement any candidate architecture.
- No notes-only, notification-metadata-only, Zustand, or `localStorage` workaround as the source of truth.
- No designation of all users with role `operator` as PÍVOT.
- No general roles/permissions redesign and no broad new operator permission.
- No general internal-notifications redesign, generic task engine, inbox product, or chat workflow.
- No automatic date inference from surgery date, preparation state, notes, notifications, or metrics.
- No reopening of a completed request and no correction through the completed notification.
- No destructive migration assumption, mandatory historical creator fabrication, or silent backfill.
- No change to CX state, preparation state, SLA, urgency, coordinator assignment, or surgery scheduling rules.
- No coupling of the mutation to interactive metrics, dashboard counters, or derived coordination indicators.

---

## 5. Domain vocabulary

| Term | Meaning |
| --- | --- |
| **Availability date** | The canonical date-only value for **`Fecha de disponibilidad del material`** on a Surgery. It is not a timestamp, shipping date, surgery date, or preparation status. |
| **Availability request** | One persisted, company-scoped request asking valid recipients to set the missing availability date for one Surgery. |
| **Requester** | The real authenticated coordinator actor who creates the request. The requester identity never changes when another user opens or completes it. |
| **Original creator** | The real user who created the Surgery, proven by the future canonical creator relation or exact accepted historical audit evidence. A display name, note author, coordinator, current assignee, or first matching user is not creator proof. |
| **PÍVOT** | Exactly one specifically designated, active `operator` for Gestión de Implantes in the Surgery company. PÍVOT is a company-scoped operational designation, not a synonym for every operator. |
| **Actionable recipient** | A deduplicated user authorized for this exact open request: proven original creator and/or designated PÍVOT. |
| **Open** | The request can still be completed because it is current, the canonical date remains absent, and the actor and tenant checks pass. |
| **Completed** | A recipient atomically set the canonical date and closed the request. This is terminal. |
| **Correction** | A later audited change to the canonical date from Expediente, outside the request lifecycle. |
| **Workflow state** | The shared request status. It is distinct from each notification's delivery/read state. |

---

## 6. Lifecycle and invariants

### 6.1 Creation preconditions

The server may create a request only when all of the following are true at commit time:

1. the actor is authenticated, active, has access to the requested company, and has the approved narrow **request availability** capability;
2. the Surgery exists, belongs to that same company, and is eligible under the later approved lifecycle policy;
3. the canonical availability date is absent;
4. there is no open availability request for the Surgery;
5. exactly one active PÍVOT designation resolves to an active company member with base role `operator` in that same company; and
6. the recipient set can be produced under the rules in section 7.

Missing, stale, malformed, ambiguous, inactive, or cross-company data denies the operation. The server must not infer a PÍVOT, choose the first operator, trust a client-provided recipient, or create an incomplete request and “repair it later.”

### 6.2 State transitions

The minimum lifecycle is intentionally small:

```txt
no request --create--> open --complete with date--> completed
```

- `completed` is terminal.
- A failed validation or denied attempt does not create a partial workflow state.
- Read/unread notification changes do not transition the request.
- If the date is populated outside this workflow before completion, the open request becomes non-actionable and completion must fail. DESIGN must define the explicit reconciliation/closure treatment; it must not overwrite the date or pretend that the request completed successfully.
- Cancellation, expiration, archival, and administrative override are not approved lifecycle states in this proposal. Adding any of them requires a product decision rather than an implementation convenience.

### 6.3 Completion transaction

Completion must be one server-side atomic operation. At commit time it must:

1. revalidate the real actor, active company access, recipient membership, Surgery company, open request, and absent canonical date;
2. validate a date-only value under the approved calendar/time-zone contract;
3. conditionally write the canonical availability date only if it is still absent;
4. conditionally transition exactly that request from `open` to `completed`;
5. persist completion actor and completion time;
6. write the required audit event with old value `null` and the new date;
7. create or reference a human-readable Surgery/Expediente event/note;
8. make both recipient notifications non-actionable through the shared terminal request state; and
9. create an idempotent completion notification for the requester.

If any invariant fails, the transaction writes none of these effects. Exactly one concurrent completion may win.

### 6.4 Corrections

A completed request cannot return to `open`. A later date correction:

- originates only from Expediente;
- uses its own explicit authorization capability;
- audits actor, timestamp, old date, and new date;
- leaves the completed request and its original submitted date trace intact; and
- does not reactivate old notifications.

---

## 7. Recipient and creator rules

### 7.1 PÍVOT resolution

- Resolve PÍVOT on the server from company-scoped persisted configuration.
- Require exactly one effective active designation for the Surgery company.
- Require the designated user to be active, to have active access to that company, and to hold the required `operator` base role there.
- Reject zero, multiple, inactive, role-invalid, or wrong-company results.
- Do not accept a PÍVOT user ID from the browser as authority.
- Changes to the designation itself are a separate critical configuration operation and must be permissioned and audited.

### 7.2 Creator resolution

For new Surgeries, the desired future source is an explicit immutable creator reference recorded at creation. Exact modeling remains for DESIGN and schema approval.

For historical Surgeries without that source, creator recovery may use only evidence that satisfies the complete later-approved contract, at minimum:

- same `companyId` as the Surgery;
- entity type representing Surgery under the accepted canonical/legacy normalization;
- exact Surgery `entityId`;
- exact action `surgery.created`; and
- one unambiguous real `userId` attributable to that creation.

No creator may be inferred from names, email text, current coordinator assignment, earliest arbitrary event, notification actor, note author, or client state. Conflicting or multiple candidate creation events are **not provable**.

### 7.3 Historical fallback

When creator proof is absent or ambiguous:

- create the request only for the valid PÍVOT;
- persist/surface the creator-resolution outcome;
- show **`Creador de la cirugía no identificado`** in the request context and actionable notification/modal; and
- never substitute the requester, PÍVOT, an administrator, or a default user as creator.

This fallback does not relax the requirement for exactly one valid PÍVOT.

### 7.4 Deduplication and recipient snapshots

- Deduplicate recipients by canonical user ID after company and eligibility checks.
- If creator and PÍVOT are the same user, create one actionable delivery while preserving that the user fulfilled both recipient reasons.
- The persisted request should retain enough immutable resolution evidence to explain who was selected and why, even if future user names, roles, or the company PÍVOT designation change.
- Current authorization must still be revalidated at completion; a historical recipient snapshot is evidence, not a permission bypass.

The behavior for an identified creator who later becomes inactive or loses company access must be frozen in DESIGN before implementation. It may never result in silent substitution or cross-company access; PÍVOT remains mandatory and completion authorization always uses current active access.

---

## 8. Architecture candidates and tradeoffs

### Candidate A — Dedicated request aggregate with notification projections (recommended for DESIGN evaluation)

Persist a narrow availability-request aggregate, its terminal completion facts, creator/PÍVOT resolution evidence, and recipient reasons. Keep internal notifications as per-recipient delivery/read projections linked to the request. Store the canonical availability date on the Surgery or a canonical one-to-one Surgery operational record selected by architecture review.

**Benefits**

- naturally represents one shared request with multiple deliveries;
- separates workflow completion from notification read state;
- supports one-open-request, idempotency, audit, and race constraints;
- preserves recipient/resolution evidence without overloading generic metadata; and
- can keep API/service scope narrow.

**Costs and risks**

- requires schema and migration approval;
- needs an explicit aggregate boundary and transaction design;
- needs a safe relation to notification delivery and surgery trace surfaces; and
- requires a migration/backfill decision for creator/date/PÍVOT sources.

### Candidate B — Generic company designation plus generic workflow/task framework

Introduce reusable company designations and a generic actionable task/workflow aggregate, with this request as one task type.

**Benefits**

- may support future operational assignments and actionable notifications;
- could centralize lifecycle and recipient semantics.

**Costs and risks**

- materially expands scope into architecture and general notifications/tasks;
- creates abstractions before other use cases are approved;
- increases permission, migration, and regression surface.

This candidate should not be selected merely for anticipated reuse. It requires a separate architecture decision and is outside this proposal's implementation scope.

### Candidate C — Encode the workflow only in existing notification rows or Seguimiento notes (rejected)

Use notification metadata/event keys or notes as the request record and infer shared completion by querying rows.

**Why rejected**

- recipient rows do not provide one authoritative shared lifecycle;
- read state cannot safely mean completed;
- uniqueness and concurrent completion become fragile;
- metadata/notes cannot safely enforce canonical date writes or recipient authorization; and
- it would be the prohibited notes-only workaround.

### Proposal direction

Proceed to DESIGN only after Franco approves the architectural direction. Candidate A is the narrowest credible basis, but this proposal does not finalize table names, columns, relations, enum strategy, indexes, or migration SQL.

---

## 9. Likely persistence concepts, not final schema

A later DESIGN is expected to evaluate these concepts:

1. **Canonical material availability date** — a nullable date-only value associated authoritatively with Surgery.
2. **Immutable Surgery creator source for new records** — an explicit relation or equivalent canonical attribution written during creation.
3. **Company PÍVOT designation** — a persisted company-to-user operational designation constrained to one effective active operator per company.
4. **Availability request aggregate** — company, Surgery, requester, status, creation/completion facts, submitted date, and creator-resolution status/evidence.
5. **Recipient evidence** — deduplicated users plus reasons (`creator`, `pivot`, or both), sufficient for traceability.
6. **Notification linkage** — recipient-specific deliveries that point to the shared request without becoming its source of truth.
7. **Uniqueness/concurrency enforcement** — database-backed protection for at most one open request per Surgery and one terminal completion.
8. **Audit and human-readable trace linkage** — correlation IDs/keys that connect request, date mutation, notification, AuditEvent, and Surgery/Expediente event/note.

DESIGN must decide whether these concepts use dedicated relations, constrained strings, partial uniqueness, transactional conditional updates, or another PostgreSQL-safe mechanism. It must not assume that a Prisma application check alone prevents races.

---

## 10. Authorization and tenancy requirements

Authorization is capability-based and server-enforced:

- **Create request:** narrow coordinator capability in the current company; not implied by arbitrary UI access.
- **Complete request:** the real actor must be a deduplicated recipient of that exact open request and retain active access to that same company. Being any `operator`, coordinator, administrator, or notification reader is insufficient by itself.
- **Correct date:** separate Expediente capability, never inherited from request completion.
- **Configure PÍVOT:** separate critical configuration capability with audit, outside this workflow.

Every query and mutation must scope request, Surgery, recipients, designation, notifications, and audit to one authoritative `companyId`. The server derives actor identity from the authenticated context and must not trust client-supplied actor, recipient, role, company, old value, completion status, or PÍVOT designation.

No preview identity, selected coordinator, notification actor, or requester identity may impersonate a recipient. UI visibility is not authorization. Direct calls must fail under the same rules.

---

## 11. Audit, trace, idempotency, and race requirements

### 11.1 Audit and trace

At minimum, successful creation and completion must be correlated and auditable with:

- company, Surgery, request, and real actor IDs;
- action and module/source;
- server timestamps;
- requester and deduplicated recipient IDs/reasons;
- creator-resolution status and accepted evidence reference where applicable;
- old and new canonical date values on completion;
- request status transition; and
- a non-secret correlation key joining AuditEvent, actionable notifications, requester notification, and Surgery/Expediente event/note.

The human-readable trace should use Spanish operational copy such as **`Se solicitó fecha de disponibilidad del material`** and **`María estableció disponibilidad para el 24/07/2026`**. AuditEvent remains technical truth; the event/note is the operator-readable case narrative. Neither silently replaces the other.

### 11.2 Idempotency

- Repeating request creation for the same Surgery while one is open returns the existing state or a stable conflict according to the future API contract; it must not create another request or duplicate deliveries.
- Notification event keys must be deterministic per request, event kind, and recipient.
- Repeating the exact successful completion may return the terminal representation only when the actor and idempotency contract prove it is a retry; it must never produce duplicate audit, trace, or requester-notification effects.
- A different date or actor against a completed request fails as closed/stale rather than mutating the terminal record.

### 11.3 Races

The design and tests must cover:

- two coordinators/request retries attempting creation;
- creator and PÍVOT completing simultaneously;
- completion racing with an Expediente date write;
- PÍVOT designation or company access changing between page load and submission;
- request state changing after a notification is opened; and
- stale modal submission after another recipient completes.

The database transaction and constraints, not optimistic UI state, determine the winner. Losers receive a stable non-disclosing conflict and refresh to the current truth.

---

## 12. UX notification and modal flow

### 12.1 Requester flow

1. Coordination shows **`Pedir disponibilidad`** only when the loaded canonical date is absent and local context suggests eligibility.
2. Selecting it presents a concise confirmation with Surgery identity and recipient explanation; recipient IDs are not editable.
3. The server revalidates every invariant.
4. Success shows **`Solicitud de disponibilidad enviada`** and the case reflects an open request.
5. An existing open request shows **`Solicitud pendiente`** rather than another create action.
6. Missing/ambiguous/inactive PÍVOT, existing date, wrong company, or race produces an explicit blocked/conflict state; the UI must not claim that a request was sent.

### 12.2 Recipient notification

The actionable notification may read:

- title: **`Fecha de disponibilidad solicitada`**;
- body: **`[Solicitante] pidió informar cuándo estará disponible el material para la cirugía [número visible].`**;
- action: **`Informar disponibilidad`**.

If creator proof is unavailable, the PÍVOT context also displays **`Creador de la cirugía no identificado`**. If one user is both creator and PÍVOT, one notification may indicate both reasons without duplicate rows.

Opening the notification resolves the current request server-side. A read notification may still be actionable; an unread notification may already be closed. The modal must show current Surgery context, requester, request time, recipient reason, and one required date-only control labeled **`Fecha de disponibilidad del material`**.

### 12.3 Completion and stale states

- Submit label: **`Guardar disponibilidad`**.
- Success: close the modal and render **`Disponibilidad informada`** with date and actor.
- If another recipient already completed: show **`La solicitud ya fue completada`** and the committed date; do not resubmit.
- If the date now exists through another path: show a conflict and direct the user to Expediente; do not overwrite.
- If authorization, company, PÍVOT validity, recipient status, or request status is no longer valid: deny without exposing other-company data.
- Completed notification detail may link to **`Abrir expediente`** but must not offer **`Reabrir`** or edit the date.

### 12.4 Requester completion notification

After commit, the requester receives an idempotent informational notification such as **`Disponibilidad informada: 24/07/2026`**, naming the real completing actor and linking to the Surgery/Expediente trace. It is not actionable and cannot alter the date.

---

## 13. Separation from interactive metrics

This workflow is an explicit domain command, not a dashboard metric interaction.

- Metrics may count surgeries with a missing canonical availability date or open requests only after their definitions are separately specified.
- Clicking a metric must not create a request, choose recipients, open a pre-authorized mutation, or imply permission.
- Derived labels such as **`Sin disponibilidad`** are read models and cannot substitute for checking the canonical date at commit time.
- Request lifecycle events must not alter CX status, preparation status, SLA clocks, urgency, coordinator assignment, or metric formulas unless a later independently approved specification says so.
- Any future metric drill-down must navigate to filtered cases and still require the explicit **`Pedir disponibilidad`** command with normal server authorization.

---

## 14. Migration and backfill gate

No migration or backfill is authorized by this proposal.

Before implementation, Franco must explicitly approve a migration plan that addresses:

1. where the canonical date will live and how existing date-like prototype fields are assessed without treating them as canonical automatically;
2. how new Surgery creator attribution will be captured going forward;
3. whether exact historical `surgery.created` evidence is backfilled into an explicit creator field, resolved on demand, or retained only as evidence;
4. how companies receive exactly one valid PÍVOT designation before the feature is enabled;
5. how ambiguous, missing, inactive, and wrong-company legacy records are reported without guessing;
6. how one-open-request and completion constraints are introduced safely;
7. deployment ordering, compatibility window, feature gating, observability, and rollback; and
8. verification queries and a dry-run report before any write.

The safe default is additive and nullable where necessary, with the feature disabled for companies that have not passed designation and data-readiness checks. No destructive rewrite, mass default user, first operator, or invented creator/date is acceptable.

---

## 15. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Every operator is accidentally treated as PÍVOT | Persist and validate one exact company designation; broad role membership is never recipient authority. |
| Historical creator is guessed | Accept only exact unambiguous evidence; otherwise use the visible PÍVOT-only fallback. |
| Creator and PÍVOT receive duplicate actions | Deduplicate by user ID while preserving both recipient reasons. |
| Notification read state is mistaken for completion | Keep one shared request aggregate as workflow truth. |
| Duplicate open requests arise under retries | Use database-backed uniqueness/serialization plus a deterministic idempotency contract. |
| Both recipients submit different dates | Conditional write and terminal transition in one transaction; exactly one wins. |
| A stale request overwrites an Expediente correction | Recheck that the canonical date is absent at commit; fail closed on conflict. |
| Date shifts because it is treated as a timestamp | Freeze a date-only serialization and display contract before schema/API implementation. |
| Cross-company recipient or Surgery leaks | Scope every lookup and write to authenticated company access; use non-disclosing denials. |
| Recipient loses access after notification delivery | Revalidate current active company access at action time; snapshots never bypass authorization. |
| Completion leaves partial audit/notifications | Commit date, request transition, audit, trace, and durable notification intents atomically or via an explicitly approved transactional outbox design. |
| Migration fabricates legacy truth | Require dry-run classification and human approval; leave unknown values unknown. |
| Scope expands into generic notifications/auth | Keep a narrow service/aggregate; stop if general redesign becomes necessary. |

---

## 16. Acceptance outline

A later SPEC must turn at least the following into executable scenarios:

1. An authorized coordinator can create one request for a same-company Surgery with no canonical availability date and one valid PÍVOT.
2. Creation is denied for an existing date, existing open request, unauthorized actor, missing/ambiguous/inactive PÍVOT, wrong-company PÍVOT, wrong-company Surgery, or stale race.
3. A provable creator and distinct PÍVOT each receive one actionable delivery linked to the same request.
4. When creator and PÍVOT are the same user, exactly one delivery exists and records both reasons.
5. A historical Surgery without one provable creator sends only to PÍVOT and visibly displays **`Creador de la cirugía no identificado`**.
6. No user is inferred or substituted as creator, requester, recipient, PÍVOT, or completion actor.
7. Either valid active recipient can submit one valid date-only value.
8. Completion atomically sets the canonical date, closes the shared request for both, audits actor/time/old-new, creates the trace event/note, and notifies the requester once.
9. The other recipient's stale modal cannot complete or overwrite after the first commit.
10. A direct forced request by a non-recipient, generic operator, inactive user, unauthorized coordinator, or cross-company actor is denied.
11. A completed request cannot reopen. Correction is possible only through the separately authorized Expediente path and produces its own audit.
12. Notification read/unread changes do not create, complete, reopen, or authorize the request.
13. Request creation and completion retries do not duplicate requests, deliveries, audit events, notes/events, or requester notifications.
14. Date-only input round-trips without time-zone/day shift under the approved company/user display contract.
15. Metric/filter interactions remain read-only and cannot bypass the explicit command or its server checks.
16. Migration validation proves no destructive assumptions, no invented historical creator/date, and no automatic selection of the first operator.

---

## 17. Human approval boundaries

The approved business rules supplied for this proposal define product intent only. They do not authorize technical implementation.

Franco must explicitly approve, after reviewing later artifacts:

1. **Architecture:** dedicated request aggregate and its boundary with Surgery, Seguimiento, AuditEvent, and InternalNotification.
2. **Schema:** canonical date location/type, creator attribution, PÍVOT designation, request/recipient persistence, status strategy, relations, and constraints.
3. **Migration/backfill:** additive migration, historical classification, PÍVOT readiness, rollout, rollback, and any data writes.
4. **Authorization:** exact capabilities for request, completion, correction, and PÍVOT administration; current roles alone are insufficient.
5. **Tenancy/security:** company-scoping and non-disclosing denial matrix.
6. **Date semantics:** date-only validation, serialization, locale display, and company time-zone boundary.
7. **Trace model:** whether the human-readable event is a Seguimiento entry, another surgery event projection, or an approved linked representation without duplicating truth.
8. **Implementation Task Brief:** sensitive file ownership, allowed files/commands, tests, migration execution permission, and rollout gate.

No schema or migration may be created or run, no permission broadened, and no implementation begun merely because this PROPOSAL exists.

---

## 18. Open decisions for DESIGN

These questions are intentionally not finalized here:

1. Exact persistence shape and naming for the canonical date, creator, designation, request, recipients, and notification linkage.
2. PostgreSQL/Prisma mechanism for one effective PÍVOT and one open request per Surgery.
3. Accepted legacy `entityType` normalization and handling of conflicting `surgery.created` audit evidence.
4. Exact behavior when an identified creator is inactive or loses company access before request creation, while preserving mandatory PÍVOT delivery and no substitution.
5. Explicit reconciliation state/trace when an Expediente write populates the date while a request is open.
6. Company time-zone source and date-only API representation.
7. Whether durable completion notification uses same-transaction persistence or an approved outbox, without permitting partial effects.
8. Exact Spanish error copy and non-disclosing HTTP/domain error codes.

Each decision must remain inside the approved business rules. If it requires a new lifecycle state, broad permission, generic workflow system, Auth redesign, or destructive migration, stop and return to Franco.

---

## 19. Stop conditions

Stop SDD progression and escalate if:

1. canonical sources contradict the approved business rules;
2. implementation would require choosing exact schema or migration behavior before Franco approves it;
3. no database-safe one-open-request or single-winner completion design can be established;
4. PÍVOT cannot be represented as exactly one designated company operator without granting every operator access;
5. creator recovery would require guessing, name matching, defaulting, or impersonation;
6. the workflow cannot be isolated by company at every read and write boundary;
7. notification metadata or notes would become the only workflow source of truth;
8. completion cannot atomically preserve canonical date, request status, audit, and trace intent;
9. scope expands into general notifications, Auth, permissions, metrics, Seguimiento, or Surgery redesign; or
10. a migration, backfill, production data write, or sensitive-file edit is requested without a new approved Task Brief and Franco's explicit approval.

Under every stop condition, fail closed and preserve existing data.

---

## 20. Proposal decision

`COORDINATION-AVAILABILITY-REQUEST-001` is coherent as a bounded product workflow and may be presented to Franco for approval to proceed to DESIGN. The credible direction is a dedicated, company-scoped request lifecycle linked to recipient-specific notifications and a canonical Surgery availability date, with exact PÍVOT designation and auditable creator evidence.

This document is not architecture, schema, migration, permission, or implementation approval. Until those gates are explicitly passed, **`Pedir disponibilidad`** remains a proposed workflow only.
