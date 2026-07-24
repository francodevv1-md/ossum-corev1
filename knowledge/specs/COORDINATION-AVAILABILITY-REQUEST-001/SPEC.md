# SPEC — COORDINATION-AVAILABILITY-REQUEST-001

Status: **specified; documentation only; implementation not authorized**
Change: `COORDINATION-AVAILABILITY-REQUEST-001`
Language: English; visible UI labels and examples are Spanish
Sources: approved `PROPOSAL.md`, `DESIGN.md`, and Franco-confirmed rules supplied for this SPEC phase

This specification defines testable product and security behavior. It does **not** authorize architecture implementation, `schema.prisma` edits, migration creation or execution, backfill writes, Auth or permission changes, PÍVOT designation, sensitive Surgery/Expediente edits, feature enablement, or production rollout. Every gate in §14 remains pending explicit human approval and a separately approved implementation Task Brief.

---

## 1. Scope and normative vocabulary

The system SHALL provide a company-scoped workflow through which an authorized requester can ask eligible recipients to set the missing canonical **`Fecha de disponibilidad del material`** for one Surgery.

`MUST`, `MUST NOT`, `SHALL`, and `SHALL NOT` are normative. A **request** is one shared lifecycle record; a notification is only a recipient-specific delivery projection. An **active Surgery** for this workflow is same-company, not archived, and has a CX status other than cancelled or finalized. **PÍVOT** means exactly one currently designated, active, same-company user with active company access and base role `operator`; it never means every operator.

The only request lifecycle SHALL be:

```txt
no request --create--> OPEN --complete with date--> COMPLETED
```

`COMPLETED` SHALL be terminal. Read/unread notification state SHALL NOT create, complete, reopen, correct, transfer, or authorize a request.

---

## 2. Request eligibility and creation

### RQ-001 — Server-authorized request command

The server MUST derive the actor and authoritative company from authenticated context. At commit time, request creation SHALL require all of:

1. an authenticated, active actor with active access to the company;
2. the separately approved `availability.request.create` capability;
3. a Surgery resolved inside that company;
4. `archivedAt` absent and CX status neither cancelled nor finalized;
5. no canonical material availability date;
6. no existing `OPEN` request for that Surgery;
7. exactly one valid current company PÍVOT; and
8. a recipient set produced only by §§3–4.

UI visibility, a coordinator label, requester identity, and broad `admin` or `operator` roles MUST NOT grant this capability.

### RQ-002 — Ineligible Surgery

An archived, cancelled, or finalized Surgery SHALL reject request creation. A Surgery whose canonical availability date already exists SHALL reject request creation. These checks MUST be repeated at commit time; stale UI state SHALL NOT bypass them. This lifecycle prohibition applies to request creation and completion of an open request; it SHALL NOT prohibit the separately authorized correction of an existing canonical date under RQ-018.

### RQ-003 — One-open uniqueness

At most one `OPEN` request SHALL exist per Surgery. Enforcement MUST be database-safe under concurrent creates and MUST NOT rely solely on an application pre-check. A non-identical second create SHALL return a stable conflict and SHALL create no additional request, assignment, notification, audit, or trace.

### RQ-004 — Atomic creation

Successful creation SHALL atomically persist the shared request, immutable creator-resolution outcome, recipient-role assignments, one actionable delivery per distinct eligible user, technical audit, human-readable Surgery/Expediente trace, and idempotency result. Any failed invariant SHALL roll back all effects.

The trace SHALL use operator-readable Spanish copy such as **`Se solicitó fecha de disponibilidad del material`**. Success SHALL be represented as **`Solicitud de disponibilidad enviada`**; an existing open request SHALL be represented as **`Solicitud pendiente`**.

### RQ-005 — Closed input authority

The create command MUST NOT accept client authority for actor, company, requester, creator, PÍVOT, recipients, recipient reasons, status, audit identity, or notification keys. Recipient IDs SHALL NOT be editable in the confirmation UI.

---

## 3. Creator resolution and fallback

### RQ-006 — Canonical creator evidence

For new Surgeries, creator identity SHALL be the immutable authenticated creation actor captured by the future approved persistence path. Clients MUST NOT supply or update it.

For legacy Surgeries, only exactly one `AuditEvent` matching the Surgery's exact company ID, canonical entity type `Surgery`, exact Surgery entity ID, exact action `surgery.created`, and a real user ID MAY support creator backfill. Zero, multiple, malformed, missing-user, wrong-company, wrong-entity, or wrong-action events SHALL remain unprovable. Multiple matching events SHALL remain unprovable even if they name the same user.

Names, email text, chronology, current coordinator, requester, PÍVOT, administrator, note author, notification actor, browser state, and “first user/operator” selection MUST NOT be creator evidence.

### RQ-007 — Creator classification

At request creation, creator status SHALL be classified and persisted as one of these normative outcomes:

| Condition | Required behavior |
| --- | --- |
| Creator proven, user active, and active access to Surgery company | Add active `CREATOR` reason and delivery eligibility. Base role need not be `operator`. |
| Creator missing or unprovable | PÍVOT-only; show **`Creador de la cirugía no identificado`**. |
| Creator inactive | PÍVOT-only; persist/audit creator unavailable; show **`Creador de la cirugía no identificado o no habilitado`**. |
| Creator lacks active access to the Surgery company | PÍVOT-only; persist/audit creator unavailable; use the same non-disclosing unavailable treatment. |

Creator unavailability SHALL NOT block creation when PÍVOT is valid. The requester, PÍVOT, administrator, or any default user MUST NOT be substituted as creator.

### RQ-008 — Creator eligibility after creation

An assigned creator who later becomes inactive or loses company access SHALL retain historical evidence but immediately lose completion authority. The active PÍVOT SHALL remain eligible. The creator reason SHALL NOT transfer or be silently substituted.

---

## 4. PÍVOT, recipients, snapshots, and transfer

### RQ-009 — Exact company PÍVOT

The server SHALL resolve PÍVOT only from the future approved company-scoped persisted designation. It MUST require exactly one effective designation whose user and company access are active, whose access belongs to the Surgery company, and whose base company role is exactly `operator`.

Zero, multiple, inactive, wrong-role, malformed, stale, or wrong-company results SHALL fail closed. The server MUST NOT choose the first operator, treat all operators as PÍVOT, or trust a browser-provided PÍVOT ID.

### RQ-010 — Recipient reasons and deduplication

The request SHALL preserve append-only recipient-role history for `CREATOR` and `PIVOT`. Delivery SHALL be deduplicated by canonical user ID after eligibility and company checks.

If creator and PÍVOT are different users, each SHALL receive one actionable delivery linked to the same request. If creator and PÍVOT are the same user, that user SHALL receive exactly one actionable delivery while both reasons remain preserved and visible as **`Creador`** and **`PÍVOT`**.

Snapshots SHALL explain who was selected and why. They MUST NOT bypass current actor, access, role, designation, lifecycle, or tenant checks.

### RQ-011 — PÍVOT replacement

PÍVOT replacement SHALL be a separate critical configuration command requiring the future approved `availability.pivot.configure` capability, current mapping version, valid replacement, reason, idempotency key, and server-side company/role/access validation.

In one atomic company-scoped transaction, replacement MUST:

1. update the current designation and version;
2. select all and only the company's `OPEN` requests;
3. revoke each former active `PIVOT` assignment;
4. append one active `PIVOT` assignment for the new PÍVOT on each open request;
5. emit deduplicated actionable notifications to the new PÍVOT;
6. emit non-actionable revocation/reassignment information to the former PÍVOT;
7. audit the company reassignment and every affected request transfer; and
8. create correlated request trace entries.

If every open request cannot transfer, the entire replacement SHALL roll back. No open request may retain former-PÍVOT authority after commit. Completed requests, their assignments, dates, deliveries, and history SHALL remain unchanged.

### RQ-012 — Former and dual-role PÍVOT authority

After replacement, the former PÍVOT SHALL lose completion authority through the PÍVOT reason. If that user independently remains the active eligible creator, authority MAY continue only through the `CREATOR` reason. A replacement PÍVOT SHALL gain authority only after the atomic transfer commits.

Initial PÍVOT designation SHALL be a separate protected and audited readiness operation; it SHALL NOT infer a user or enable an unready company.

---

## 5. Date-only semantics, completion, and correction

### RQ-013 — Canonical date-only contract

Canonical availability SHALL represent one Gregorian calendar date and no time. The wire form SHALL be exactly valid `YYYY-MM-DD`; for example, `2026-07-24`. Empty strings, timestamps, offsets, locale-formatted input, impossible dates, and implicit coercion SHALL be invalid.

The value SHALL round-trip without UTC, company-time-zone, user-time-zone, or browser-local conversion and without changing the day. Spanish display MAY render `24/07/2026`, but persistence and wire comparison SHALL remain date-only. The UI control SHALL be labeled **`Fecha de disponibilidad del material`** and SHALL contain no time input.

### RQ-014 — Completion authority

Completion SHALL require an authenticated, active actor with active access to the request company and at least one active recipient reason on that exact `OPEN` request. A PÍVOT-reason actor MUST still be the company's current valid PÍVOT. A creator-reason actor MUST still have active access to that company.

Requester status, administrator status, generic operator status, notification possession/read state, old PÍVOT status, or UI visibility SHALL be insufficient.

### RQ-015 — Atomic single-winner completion

At commit time, completion SHALL revalidate company, actor, assignment, current PÍVOT where applicable, active Surgery lifecycle, `OPEN` request status, and absent canonical date. It SHALL then atomically:

1. write the canonical date only if absent;
2. transition exactly that request from `OPEN` to `COMPLETED`;
3. persist the real completion actor, server time, submitted date, and command identity;
4. audit `null → YYYY-MM-DD` and `OPEN → COMPLETED` with actor reasons;
5. create a correlated immutable human-readable trace such as **`María estableció disponibilidad para el 24/07/2026`**;
6. make every recipient delivery non-actionable through shared terminal state without changing read state; and
7. create exactly one informational requester notification, even when requester and completer are the same user.

If any step fails, none SHALL persist. Exactly one concurrent completion MAY win.

### RQ-016 — Completed and stale behavior

A `COMPLETED` request MUST NOT reopen. A stale second actor, different date, different command, or old PÍVOT SHALL NOT overwrite the committed date or add duplicate effects. The UI SHALL show **`La solicitud ya fue completada`** and the committed date when safely readable. Completed detail MAY offer **`Abrir expediente`** but MUST NOT offer **`Reabrir`** or date editing.

### RQ-017 — Controlled initial-date write

While an `OPEN` request exists, completion SHALL be the only command permitted to set a previously missing canonical availability date. Any other initial-date path SHALL fail with a stable conflict and SHALL NOT create an untracked reconciliation state.

### RQ-018 — Correction is separate

A later correction SHALL originate only from the separately authorized Expediente surface using the future approved `availability.date.correct` capability. It SHALL require an existing canonical date, exact expected current date, valid new date, mandatory non-empty reason, and idempotency key.

An existing canonical date SHALL remain correctable when the Surgery is finalized, archived, or cancelled. The correction command MUST NOT reject solely because of any of those lifecycle conditions. It SHALL change only the canonical date through an exact expected-old-value comparison and SHALL NOT reopen, reactivate, unarchive, or otherwise change the Surgery lifecycle or any AvailabilityRequest.

Correction SHALL persist immutable audit evidence containing the real actor, server time, exact old date, exact new date, and mandatory reason, and SHALL create a separate immutable trace such as **`Se corrigió la disponibilidad del 24/07/2026 al 25/07/2026`**. It SHALL leave every completed request, original submitted date, assignment, and notification unchanged and SHALL NOT reactivate any request.

---

## 6. Notification, modal, and requester experience

### RQ-019 — Actionable delivery

An actionable recipient notification SHALL identify the shared request and MAY use:

- title: **`Fecha de disponibilidad solicitada`**;
- body: **`[Solicitante] pidió informar cuándo estará disponible el material para la cirugía [número visible].`**;
- action: **`Informar disponibilidad`**.

The notification SHALL NOT be workflow truth. Its deterministic identity SHALL prevent duplicate rows for the same request, event kind, and recipient.

### RQ-020 — Fresh modal authorization

Opening a notification/deep link SHALL fetch current same-company request state and reauthorize the current actor before opening the modal. URL, notification metadata, cached data, and frontend IDs MUST NOT establish authority or prefill trusted requester, recipient reasons, status, or date.

The modal SHALL show safe Surgery identity, requester, request time, actor reasons, creator-unavailable caveat where applicable, and one required date-only control. It SHALL use title **`Informar disponibilidad`** and submit label **`Guardar disponibilidad`**.

Actor or company context change SHALL close the modal and discard prior trusted data. A read notification MAY remain actionable; an unread notification MAY already be terminal.

### RQ-021 — Modal outcomes

The UI SHALL:

- announce success as **`Disponibilidad informada`**;
- retain entered date and reuse the same idempotency key for a network retry whose semantic input is unchanged;
- show committed terminal state without resubmitting after another actor wins;
- show **`La fecha ya fue informada. Abrí el expediente para revisar el caso.`** on date conflict;
- show a non-disclosing blocked state after access, recipient, lifecycle, or PÍVOT authority loss; and
- never claim success after a denied, conflicted, or rolled-back command.

### RQ-022 — Requester completion notification

After successful commit, the original requester SHALL receive one idempotent, informational, non-actionable notification such as **`Disponibilidad informada: 24/07/2026`**, naming the real completer and linking to safe request or Expediente detail. It SHALL NOT permit date mutation.

### RQ-023 — Accessibility and mobile contract

The action UI SHALL use an existing accessible dialog/drawer primitive without a new dependency, remain usable at `412x915`, avoid horizontal overflow, provide visible Spanish labels and associated errors, maintain at least `44x44` CSS-pixel targets, trap and restore focus, support Escape cancellation without submit, and announce success/conflict/error once with appropriate status/alert semantics.

---

## 7. Authorization, tenancy, and fail-closed errors

### RQ-024 — Named capabilities remain narrow

The server SHALL use distinct future-approved capabilities for request creation, date correction, and PÍVOT configuration. Request completion SHALL derive from exact active recipient assignment plus current eligibility, not from a broad role. Completion authority MUST NOT imply correction authority, and current PÍVOT status MUST NOT imply configuration authority.

The exact capability-to-role/user mapping remains pending Franco approval. Implementers MUST NOT substitute current broad `admin`, `operator`, coordinator, or Coordination-page access.

### RQ-025 — Tenant isolation

Every request, Surgery, creator source, PÍVOT designation, assignment, notification, command receipt, audit, and trace lookup or mutation SHALL be scoped to the authenticated authoritative company. A path/body/query company or entity ID SHALL identify only a candidate and SHALL grant no authority.

Foreign-company, mismatched-Surgery, non-recipient, and forged-link attempts SHALL expose no other-company existence, user, recipient, date, membership, or configuration data and SHALL write nothing.

### RQ-026 — Error classes

The API SHALL fail closed using stable classes:

- `401` for missing or invalid authentication under the existing contract;
- `403` when an authenticated actor is known in company context but lacks a named capability, without target disclosure;
- non-disclosing `404` when the target cannot be resolved inside the authorized company/recipient scope; and
- `409` for same-company authorized stale state, invariant loss, idempotency-key reuse, or race loss.

Stable conflict semantics SHALL cover at least date already set, request already open/completed/not open, ineligible Surgery, unavailable or changed PÍVOT, expected-date mismatch, an open request blocking another initial write, and reused idempotency key. Validation failures SHALL use `400`. Denied commands SHALL have no partial domain effects.

---

## 8. Idempotency, concurrency, and atomicity

### RQ-027 — Mutation idempotency

Every create, complete, correct, and PÍVOT configure/reassign mutation SHALL require a validated opaque idempotency key. The server SHALL bind it to company, actor, command type, and normalized semantic payload.

An exact same-key/same-payload retry SHALL return the stored result without duplicate effects. Reusing the key with a different payload SHALL fail with `409 idempotency_key_reused`. A different actor or date against a terminal request SHALL fail stale rather than mutate terminal truth.

### RQ-028 — Race outcomes

Database transactions and constraints SHALL determine winners. Optimistic UI state SHALL NOT. Required deterministic behavior includes:

- two creates: one open request, no duplicate effects;
- creator versus PÍVOT completion: exactly one terminal commit;
- completion versus archive/cancel/finalize: one serializable winner, no partial write;
- completion versus PÍVOT replacement: former PÍVOT cannot commit after transfer;
- two PÍVOT replacements: one expected-version winner, loser transfers nothing;
- stale modal after completion or transfer: fresh authorization/state wins; and
- completion/correction ordering: correction can run only after a date exists and only against its exact expected value.

Serializable/deadlock retries SHALL be bounded. Exhaustion SHALL return a stable conflict and preserve existing data.

---

## 9. Audit, trace, and observability

### RQ-029 — Technical audit and readable trace

Successful request creation, completion, correction, PÍVOT designation/reassignment, and each open-request transfer SHALL produce technical audit facts in the same atomic command boundary. Audit SHALL include authoritative company, entity/request/Surgery, real actor, server time, action, correlation ID, relevant creator resolution/evidence, recipient reasons, mapping version, state transition, and old/new dates where applicable.

The correlated Surgery/Expediente trace SHALL be immutable and server-generated. AuditEvent SHALL remain technical truth; the readable trace SHALL remain an operator narrative. Neither SHALL authorize or derive workflow state, and generic client Seguimiento operations MUST NOT create or edit these protected workflow events.

### RQ-030 — Security and privacy telemetry

Failed authorization attempts SHALL be security telemetry rather than successful domain audits unless a separately approved security-audit policy requires persistence. Structured logs MUST NOT contain patient names, raw auth headers, notification bodies, free-text reasons, or dates combined with patient identity.

### RQ-031 — Required observability

The future implementation SHALL expose low-cardinality measurements for request attempts/results, creator-resolution outcomes, PÍVOT resolution failures, completion outcomes, serialization retries/exhaustion, notification attempted/created/deduplicated counts, PÍVOT transfer count/duration, idempotency hits/hash conflicts, transaction duration, and rollback reasons.

Operational alerts SHALL detect at least:

- enabled company without one valid PÍVOT;
- open request without exactly one active PÍVOT assignment;
- multiple active assignments for one request reason;
- completed request/date inconsistency;
- audit/trace/notification count invariant failure; and
- persistent serialization exhaustion.

Observability SHALL be active before pilot rollout and SHALL avoid high-cardinality or sensitive labels.

---

## 10. Separation and prohibited shortcuts

### RQ-032 — Interactive metrics remain read-only

Metrics, filters, chips, drill-downs, derived labels, and dashboard counters SHALL NOT create, complete, correct, transfer, authorize, or select recipients for this workflow. A drill-down MAY navigate to a case, but **`Pedir disponibilidad`** SHALL remain an explicit independently authorized command.

This workflow SHALL NOT alter CX state, preparation state, SLA, urgency, coordinator assignment, or metric formulas.

### RQ-033 — Sources of truth

The shared persisted request lifecycle and canonical Surgery availability date SHALL be authoritative. Notifications, notification metadata, read state, Seguimiento notes, browser state, Zustand, `localStorage`, and role labels MUST NOT become lifecycle, date, creator, PÍVOT, or authorization truth. A notes-only or notification-only workaround is prohibited.

### RQ-034 — No broad authority or scope expansion

This change MUST NOT grant every operator or administrator request-completion authority, redesign Auth or the role taxonomy, create a generic task/workflow product, redesign all notifications, add a new dependency, infer dates, or authorize external email/push delivery. External delivery requires a separately approved transactional outbox design.

---

## 11. Migration, backfill, readiness, and rollback constraints

### RQ-035 — No migration or backfill authorization

This SPEC SHALL NOT authorize any migration, backfill, production write, Prisma edit, PÍVOT seed/designation, feature flag enablement, or rollout. Before any write, Franco SHALL separately approve the exact schema and SQL, dry-run report, backfill set, environment/window, backup, verification evidence, and rollback procedure.

### RQ-036 — Additive and truthful migration policy

Any future approved migration SHALL default to additive and nullable compatibility. It MUST NOT destructively rewrite data, copy a prototype/date-like value into the canonical date automatically, fabricate a creator, choose a default/first operator as PÍVOT, mass-assign a user, or collapse unknown/ambiguous creator states into identified truth.

Creator backfill SHALL write only strict RQ-006 successes in bounded, auditable batches. Unknown SHALL remain unknown. The feature SHALL remain disabled for companies that fail PÍVOT or data-readiness checks.

### RQ-037 — Dry-run and verification evidence

Before migration execution or rollout, a no-write dry run SHALL classify creator evidence, inventory but not map date-like fields, classify every company's PÍVOT readiness, and report malformed/ambiguous/cross-company cases without secrets.

Future verification SHALL prove:

1. no creator was backfilled without exactly one accepted source event;
2. no legacy date was copied automatically;
3. every enabled company has exactly one currently valid PÍVOT;
4. no duplicate open request exists;
5. every open request has exactly one active PÍVOT reason and at most one active assignment per reason; and
6. company IDs match across Surgery, request, assignment, notification, command, trace, and audit.

### RQ-038 — Rollback preserves facts

Rollback SHALL disable feature flags first and preserve request, canonical date, audit, trace, assignment, and notification facts. Once requests exist, rollback SHALL be forward-fix only unless a later destructive plan is explicitly approved. It MUST NOT reopen or delete completed requests, clear canonical dates, restore former-PÍVOT authority, fabricate creator values, or delete evidence.

---

## 12. Acceptance scenarios

### SC-001 — Eligible request with distinct recipients

**Given** an authenticated actor with active access and `availability.request.create`, an active same-company Surgery with no canonical date or open request, one valid PÍVOT, and one proven eligible creator distinct from PÍVOT
**When** the actor creates the request with a valid idempotency key
**Then** one `OPEN` request, two role assignments, two actionable deliveries, one correlated audit, and one **`Se solicitó fecha de disponibilidad del material`** trace SHALL commit atomically.

### SC-002 — Archived/cancelled/finalized rejection

**Given** a same-company Surgery that is archived, cancelled, or finalized
**When** an otherwise authorized actor requests availability
**Then** the server SHALL reject it as ineligible and create no request, assignment, notification, audit, or trace.

### SC-003 — Existing date rejection

**Given** a same-company Surgery whose canonical date is already `2026-07-24`
**When** request creation is attempted from UI or direct HTTP
**Then** it SHALL fail closed, preserve the date, and expose no sent-success state.

### SC-004 — Invalid PÍVOT matrix

**Given** PÍVOT configuration is missing, multiple, inactive, wrong-role, wrong-company, or points to an inactive user/access
**When** request creation is attempted
**Then** it SHALL fail closed with no partial request and the UI MAY show **`No se pudo enviar: falta configurar un PÍVOT válido.`**

### SC-005 — Missing or unprovable historical creator

**Given** no exact single accepted `surgery.created` event proves the legacy creator and PÍVOT is valid
**When** a request is created
**Then** only PÍVOT SHALL be assigned/delivered, creator-unavailable status SHALL be persisted and audited, and context SHALL show **`Creador de la cirugía no identificado`** without substitution.

### SC-006 — Inactive or company-ineligible creator

**Given** creator identity is known but the user is inactive or lacks active access to the Surgery company and PÍVOT is valid
**When** a request is created
**Then** creation SHALL succeed PÍVOT-only, preserve the unavailable reason, and show **`Creador de la cirugía no identificado o no habilitado`** without exposing membership details.

### SC-007 — Creator becomes unavailable later

**Given** creator and PÍVOT received an open request and the creator later becomes inactive or loses company access
**When** the creator submits completion
**Then** completion SHALL be denied with no write, while the current valid PÍVOT SHALL remain able to complete and no substitute creator SHALL be assigned.

### SC-008 — Creator equals PÍVOT

**Given** the same eligible user fulfills creator and PÍVOT reasons
**When** a request is created
**Then** both reasons SHALL be preserved but exactly one actionable delivery SHALL exist; the modal SHALL show both **`Creador`** and **`PÍVOT`**.

### SC-009 — One-open uniqueness under concurrency

**Given** no request is open
**When** two authorized creates race for the same Surgery
**Then** exactly one `OPEN` request SHALL commit; the loser SHALL receive a stable conflict and no duplicate side effects.

### SC-010 — Exact create retry

**Given** a creation command committed but its response was lost
**When** the same actor retries the same semantic command with the same idempotency key
**Then** the stored result SHALL return and no request, delivery, audit, or trace SHALL be duplicated.

### SC-011 — Valid date-only completion

**Given** an active eligible recipient of an open request and an absent canonical date
**When** the recipient submits `2026-07-24`
**Then** the system SHALL atomically store that calendar date with no time, mark the request `COMPLETED`, record actor/time and old/new values, create the readable trace, close actionability for all deliveries, and notify the requester exactly once.

### SC-012 — Invalid date representations

**Given** an open authorized request
**When** completion supplies `24/07/2026`, `2026-07-24T00:00:00Z`, an offset, empty text, or an impossible date
**Then** validation SHALL return `400`, write nothing, and retain the request as open.

### SC-013 — No day shift

**Given** canonical input `2026-07-24` and users/browsers in different time zones
**When** the value is persisted, returned, and displayed
**Then** the wire value SHALL remain `2026-07-24` and Spanish display SHALL remain `24/07/2026` for every user, with no time component or day shift.

### SC-014 — Simultaneous recipient completion

**Given** eligible creator and PÍVOT have the same open request
**When** they concurrently submit different valid dates
**Then** exactly one atomic completion SHALL win; the loser SHALL receive terminal conflict/current safe state and SHALL not overwrite or duplicate audit, trace, or requester notification.

### SC-015 — Stale modal

**Given** a recipient opened the modal before another recipient completed
**When** the stale recipient submits
**Then** the server SHALL re-read terminal truth, reject mutation, and the UI SHALL show **`La solicitud ya fue completada`** with the committed date.

### SC-016 — Generic operator/non-recipient forced completion

**Given** an active generic operator, requester, administrator, or notification reader who lacks an active recipient reason
**When** that actor calls completion directly
**Then** the server SHALL deny without disclosing protected request data and write nothing.

### SC-017 — Tenant isolation

**Given** an actor in company C1 and a Surgery, request, PÍVOT, assignment, or notification in C2
**When** C1 supplies C2 identifiers through a path, body, query, or deep link
**Then** the operation SHALL return a non-disclosing denial/not-found, expose no C2 facts, and perform no write.

### SC-018 — Read state independence

**Given** an actionable delivery
**When** it is marked read or unread
**Then** request status and completion authority SHALL remain unchanged; after another actor completes, even an unread delivery SHALL be non-actionable.

### SC-019 — PÍVOT replacement transfers open requests

**Given** a valid current PÍVOT, valid replacement, and multiple open company requests
**When** an actor with `availability.pivot.configure` submits a valid versioned replacement command
**Then** the mapping and every open request PÍVOT assignment SHALL transfer atomically, the new PÍVOT SHALL receive deduplicated actionable notifications, the former PÍVOT SHALL receive non-actionable revocation information, and company/request audits and traces SHALL correlate the transfer.

### SC-020 — PÍVOT replacement rollback

**Given** one affected open request cannot be transferred
**When** replacement executes
**Then** mapping, assignments, notifications, audits, and traces SHALL all roll back; no partial replacement SHALL remain.

### SC-021 — Former PÍVOT loses authority

**Given** an open request was transferred to a replacement PÍVOT
**When** the former PÍVOT submits from a stale modal
**Then** completion through the revoked PÍVOT reason SHALL be denied. If that actor is also the still-eligible creator, only the creator reason MAY authorize completion.

### SC-022 — Completed requests survive PÍVOT replacement

**Given** one completed and one open request exist in the company
**When** PÍVOT is replaced
**Then** only the open request SHALL transfer; the completed request, submitted date, assignments, notifications, and history SHALL remain byte-for-byte semantically unchanged.

### SC-023 — Completion versus PÍVOT replacement

**Given** the current PÍVOT completion and replacement race
**When** transactions contend
**Then** one serialization order SHALL win; after replacement commits, former-PÍVOT completion cannot commit, and no partial effects SHALL exist.

### SC-024 — Completion versus terminal Surgery change

**Given** an open request and a concurrent archive, cancellation, or finalization
**When** completion races with that lifecycle change
**Then** one transaction SHALL win under revalidation; a stale completion SHALL fail without date, terminal request, audit, trace, or notification partials.

### SC-025 — External initial date write blocked

**Given** an open request and absent date
**When** another path attempts to set the first canonical date outside completion
**Then** it SHALL return an open-request conflict and SHALL not write or create a reconciliation state.

### SC-026 — Correction after completion

**Given** a completed request with date `2026-07-24` and an actor with separate correction capability
**When** Expediente submits new date `2026-07-25`, expected old date, reason, and idempotency key
**Then** the date SHALL change with separate audit/trace while the completed request and original submitted date remain unchanged and no old notification reactivates.

### SC-027 — Correction denied through notification

**Given** a completed notification or a user who only had completion authority
**When** the user attempts to edit or reopen through that notification
**Then** no edit/reopen action SHALL be available and a forced call without `availability.date.correct` SHALL be denied.

### SC-028 — Idempotency payload mismatch

**Given** an idempotency key was used for one valid date or replacement target
**When** the same actor reuses it with a different semantic payload
**Then** `409 idempotency_key_reused` SHALL return and no new effect SHALL occur.

### SC-029 — Requester is completer

**Given** the requester is also an eligible recipient
**When** that actor completes successfully
**Then** completion SHALL remain authorized by recipient reason, not requester identity, and exactly one non-actionable requester completion notification SHALL be created.

### SC-030 — Actor/company switch while modal is open

**Given** a valid request modal is open
**When** authenticated actor or company context changes
**Then** the modal SHALL close, prior data SHALL be discarded, late responses SHALL not render, and reopening SHALL require fresh authorization.

### SC-031 — Metrics cannot mutate

**Given** any Coordination metric, filter, chip, or drill-down
**When** a user interacts with it
**Then** no request/create/complete/correct/reassign mutation SHALL occur and no recipient or permission SHALL be inferred.

### SC-032 — Atomic failure injection

**Given** an injected failure after any intermediate creation, completion, correction, or replacement write
**When** the transaction aborts
**Then** no partial date, state, assignment, audit, trace, notification, or idempotency result SHALL persist.

### SC-033 — Migration dry run preserves unknowns

**Given** historical Surgeries with missing, multiple, malformed, or cross-company creator evidence and date-like prototype fields
**When** the approved dry-run classifier executes
**Then** it SHALL report classifications without writes, invented creators, copied dates, default PÍVOTs, or destructive assumptions.

### SC-034 — Feature readiness and observability

**Given** a company lacks one valid PÍVOT or required invariant monitoring
**When** rollout readiness is evaluated
**Then** the feature SHALL remain disabled for that company; pilot enablement SHALL require reviewed capability assignments, readiness evidence, active alerts, and explicit Franco approval.

### SC-035 — Rollback preserves terminal truth

**Given** requests exist and rollout is disabled or rolled back
**When** rollback procedure executes
**Then** all existing request/date/audit/trace/notification facts SHALL remain readable and no completed request, date, creator, or former-PÍVOT authority SHALL be rewritten.

### SC-036 — Current PÍVOT becomes inactive before replacement

**Given** a PÍVOT recipient of an open request later becomes inactive, loses company access, or loses the required `operator` role
**When** that user attempts completion before an authorized replacement commits
**Then** completion SHALL be denied with no write, the request SHALL remain open, no user SHALL be silently substituted, and authority MAY transfer only through the protected atomic PÍVOT replacement command.

### SC-037 — Correct existing date on terminal or archived Surgery

**Given** an archived, cancelled, or finalized Surgery has canonical date `2026-07-24`, and an active same-company actor has `availability.date.correct`
**When** Expediente submits new date `2026-07-25`, expected old date `2026-07-24`, a mandatory non-empty reason, and a valid idempotency key
**Then** the canonical date SHALL change to `2026-07-25`; immutable audit SHALL record exact old/new dates, real actor, server time, and reason; the readable correction trace SHALL be created; and neither the Surgery lifecycle nor any AvailabilityRequest SHALL reopen, reactivate, or otherwise change.

---

## 13. Verification requirements

### Automated verification

The future implementation SHALL include:

- validator tests for closed bodies, IDs, idempotency keys, date-only input, expected dates/versions, and reasons;
- service tests for every Surgery, creator, PÍVOT, recipient, correction, and authorization matrix in this SPEC;
- PostgreSQL integration tests for one-open uniqueness, active-reason uniqueness, terminal consistency, native date round-trip, all named races, and rollback after each write stage;
- route/security tests for `400/401/403/404/409`, tenant mismatch, forged client authority, and safe modal responses;
- notification/audit/trace tests proving deterministic deduplication and exact correlated counts;
- UI/component tests for requester states, creator-unavailable copy, dual reasons, stale/terminal states, context changes, accessibility, and date semantics; and
- migration dry-run/backfill tests proving strict evidence, unknown preservation, and zero automatic date/PÍVOT defaults.

### Manual and rollout verification

Browser QA SHALL cover authorized and denied users, desktop and `412x915`, keyboard/focus/live regions, direct deep links, read-state independence, stale completion, PÍVOT transfer, Expediente-only correction, and network retry. Production readiness SHALL additionally require correlated canary request/complete/correct/reassign evidence, active observability, and a feature-off rollback rehearsal with no data deletion.

---

## 14. Protected human approval gates

The following gates remain pending and independent. Approval of this SPEC SHALL authorize only progression to TASKS planning, not implementation.

1. **Architecture gate:** Franco SHALL approve the dedicated aggregate boundary and its relationships with Surgery, exact company PÍVOT designation, recipient assignments, InternalNotification, AuditEvent, Seguimiento, and idempotency records.
2. **Exact schema gate:** Franco SHALL approve every field, enum, relation, delete behavior, native date location/type, check constraint, partial index, command ledger, and notification type before `prisma/schema.prisma` or migration files are touched.
3. **Migration/backfill gate:** Franco SHALL separately approve the no-write dry run, exact SQL/write migration, creator backfill report, PÍVOT readiness process, execution environment/window, backup, verification queries, and rollback SQL.
4. **Permissions/security gate:** Franco SHALL approve exact assignment of `availability.request.create`, `availability.date.correct`, and `availability.pivot.configure`, recipient completion policy, PÍVOT administrator population, terminal requester-read policy, and `403/404` disclosure behavior. Existing broad roles SHALL NOT be used as a substitute.
5. **Sensitive-file gate:** Any Surgery, Cirugías, Expediente, Auth, notification, Seguimiento, Prisma, shared type, validator/service/route chain, or permission edit SHALL require a new Task Brief, explicit allowlist, visible ownership lock, and serialized ownership.
6. **PÍVOT designation gate:** Each enabled company's initial PÍVOT or approved administration process SHALL require separate review; no seed/default is authorized.
7. **Rollout gate:** Feature flags, pilot company, canary, production execution, observability evidence, and wider rollout SHALL each require explicit Franco approval. No phase SHALL imply approval of the next.

No code, schema, migration, Auth, database, permission, PÍVOT assignment, backfill, or rollout action is authorized by this document.

---

## 15. Traceability matrix

| Source rule | Normative coverage | Acceptance coverage |
| --- | --- | --- |
| Active eligible Surgery; date absent | RQ-001–RQ-004 | SC-001–SC-004, SC-024 |
| Exact creator evidence and unavailable fallback | RQ-006–RQ-008 | SC-005–SC-007, SC-033 |
| Exact company PÍVOT; no broad operator authority | RQ-009, RQ-024 | SC-004, SC-016–SC-017 |
| Snapshot reasons and creator=PÍVOT dedupe | RQ-010 | SC-001, SC-008 |
| PÍVOT replacement/inactivity and terminal preservation | RQ-011–RQ-012 | SC-019–SC-023, SC-036 |
| One open request and retry safety | RQ-003, RQ-027–RQ-028 | SC-009–SC-010, SC-028 |
| Date-only, no time or day shift | RQ-013 | SC-011–SC-013 |
| Atomic completion and requester notification | RQ-014–RQ-016, RQ-022 | SC-011, SC-014–SC-016, SC-029, SC-032 |
| Completed terminal; correction only in Expediente, including terminal/archived Surgery | RQ-017–RQ-018 | SC-025–SC-027, SC-037 |
| Actionable notification/modal and read independence | RQ-019–RQ-023 | SC-015, SC-018, SC-030 |
| Tenant isolation and fail-closed errors | RQ-024–RQ-026 | SC-016–SC-017, SC-030 |
| Audit, trace, observability | RQ-029–RQ-031 | SC-019, SC-032, SC-034 |
| Metrics separation and prohibited shortcuts | RQ-032–RQ-034 | SC-031 |
| Migration/backfill/rollback constraints | RQ-035–RQ-038 | SC-033–SC-035 |

---

## 16. Stop conditions

TASKS or APPLY SHALL stop and return to Franco if:

1. any architecture, schema, SQL, migration/backfill, capability assignment, PÍVOT designation, sensitive-file scope, pilot, or rollout lacks its explicit gate;
2. creator attribution would require inference outside RQ-006;
3. exactly one current valid company PÍVOT cannot be represented without granting all operators authority;
4. database-safe one-open or single-winner completion cannot be retained;
5. any path can set a missing date outside completion while a request is open;
6. notifications, read state, notes, client state, or metrics would become workflow or authorization truth;
7. PÍVOT replacement cannot transfer every open request atomically or would mutate completed requests;
8. implementation requires Auth-provider redesign, generic workflow infrastructure, broad operator authority, destructive migration, notes-only persistence, or an unapproved external-delivery mechanism;
9. company scoping cannot be enforced at every boundary; or
10. file ownership overlaps a Prisma, Surgery, notification, Seguimiento, Coordination, Expediente, permission, or Auth chain.

Every stop condition SHALL fail closed and preserve existing data.
