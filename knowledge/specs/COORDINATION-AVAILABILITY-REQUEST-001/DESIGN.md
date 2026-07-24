# DESIGN — COORDINATION-AVAILABILITY-REQUEST-001

Status: **designed; documentation only; implementation not authorized**
Change: `COORDINATION-AVAILABILITY-REQUEST-001`
Language: English; visible UI labels and examples are Spanish
Artifact order: approved product direction → **DESIGN** → SPEC → TASKS → separately approved APPLY
Source: `PROPOSAL.md`, confirmed rules in task `COORDINATION-AVAILABILITY-REQUEST-001-D`, canonical multi-company/audit/Surgery guidance, and minimal current repository evidence

The task-provided approval authorizes this DESIGN phase only. `PROPOSAL.md` still contains its earlier `proposed` status text and is not changed because it is outside this task's one-file allowlist; this DESIGN does not convert that approval into implementation authority.

---

## 1. Decision and protected boundary

Use a dedicated, company-scoped `AvailabilityRequest` aggregate. Store the canonical date on `Surgery`; store immutable Surgery creator attribution on `Surgery`; represent the one company PÍVOT through an exact operational-assignee mapping; preserve append-only recipient-role assignments for request authorization history; and keep `InternalNotification` as recipient-specific delivery/read projections linked to the request.

This is the narrow Candidate A direction from the proposal. It rejects notifications, metadata, notes, client state, role names, and interactive metrics as workflow truth.

The design freezes these invariants:

1. A request can be created only for a same-company, non-archived Surgery whose `cxStatus` is not `cancelled` or `finalized`, and whose canonical availability date is absent at commit.
2. At most one request with status `OPEN` exists per Surgery.
3. Exactly one current, active, same-company `operator` PÍVOT must resolve. Missing, ambiguous, inactive, role-invalid, or wrong-company configuration fails closed.
4. The creator is the immutable `Surgery.createdById`, populated at creation or by the exact legacy backfill in §6. It is never inferred at request time from names, assignment, chronology, notes, or browser input.
5. Missing, unprovable, inactive, or company-ineligible creator means PÍVOT-only delivery and a persisted visible creator-resolution outcome. It never blocks a request when PÍVOT is valid.
6. Creator and PÍVOT are role assignments; delivery is deduplicated by canonical user ID.
7. Either currently eligible active recipient can complete. Recipient snapshots explain history but never bypass current authorization.
8. Completion writes the date and terminal state exactly once in one transaction. `COMPLETED` never returns to `OPEN`.
9. Corrections of an existing canonical date occur only through the protected Expediente date endpoint, are allowed even when the Surgery is archived, cancelled, or finalized, preserve every Surgery/request lifecycle fact, and create a separate actor/time/reason/old/new audit and trace fact.
10. Replacing PÍVOT transfers every open request to the new valid PÍVOT atomically, revokes the former PÍVOT role, audits the change, and emits deduplicated notifications. Completed requests are immutable.
11. Every read/write is scoped by authenticated `companyId`; path/body/query IDs identify candidates only and grant no authority.
12. This workflow has no write or authorization dependency on interactive Coordination metrics.

**Human approval gate — architecture:** Franco must explicitly approve this aggregate boundary and the use of `Surgery`, `CompanyOperationalAssignee`, `AvailabilityRequest`, recipient-role assignments, `InternalNotification`, `AuditEvent`, and server-generated `SeguimientoEntry` projections before TASKS may authorize code work.

---

## 2. Current evidence and design consequences

| Current evidence | Consequence |
| --- | --- |
| `Surgery` has `companyId`, `cxStatus`, `archivedAt`, dates as `DateTime`, but no creator or availability field. | Add nullable creator and native PostgreSQL `date` availability fields only after schema approval. |
| Surgery creation writes exact `AuditEvent(entityType="Surgery", action="surgery.created", entityId=surgery.id, companyId, userId)` in the same serializable transaction. | It is the sole accepted legacy creator backfill source. |
| `UserCompanyAccess` is unique on `(userId, companyId)` and carries `role`/`isActive`; `User` also carries `isActive`. | PÍVOT and recipient eligibility must validate both records. |
| `InternalNotification` is one row per recipient, has deterministic `eventKey`, `readAt`, and company/Surgery relations. | Extend it as a delivery projection; `readAt` remains unrelated to request completion. |
| `SeguimientoEntry` is a company/Surgery-scoped readable case narrative and `AuditEvent` is technical audit truth. | Generate immutable, server-only workflow entries while retaining independent AuditEvents. |
| Current Coordination role helper treats `admin`/`operator` broadly. | It cannot authorize request, completion, correction, or PÍVOT administration. New named capabilities are required. |
| API errors already support 403, 404, and 409. | Preserve these fail-closed classes with stable codes in §11. |

No current prototype-derived material availability value is canonical. Migration must not copy any candidate field without the dry-run classification and explicit approval in §6.

---

## 3. Recommended persistence model

The following is the exact recommended Prisma concept model for later review. Names and fields are **design recommendations, not authorization to edit `prisma/schema.prisma` or run SQL**.

### 3.1 Enums

```prisma
enum CompanyOperationalDesignation {
  PIVOT
}

enum AvailabilityRequestStatus {
  OPEN
  COMPLETED
}

enum AvailabilityCreatorResolution {
  IDENTIFIED_ELIGIBLE
  NOT_IDENTIFIED
  IDENTIFIED_INACTIVE
  IDENTIFIED_NO_COMPANY_ACCESS
}

enum AvailabilityRecipientReason {
  CREATOR
  PIVOT
}

enum AvailabilityCommandType {
  REQUEST
  COMPLETE
  CORRECT
  REASSIGN_PIVOT
}
```

No cancellation, expiration, reopening, administrative completion, or generic task state is introduced.

### 3.2 Surgery additions

```prisma
model Surgery {
  // existing fields
  createdById                 String?
  materialAvailabilityDate   DateTime? @db.Date

  createdBy            User?                 @relation("SurgeryCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  availabilityRequests AvailabilityRequest[]

  @@index([companyId, materialAvailabilityDate])
  @@index([companyId, createdById])
}
```

`createdById` is nullable only for truthful legacy compatibility and immutable after assignment. Every new Surgery creation writes it from `ctx.actorUserId` in the same transaction as `surgery.created`. `materialAvailabilityDate` is the sole canonical value and uses PostgreSQL `date`, never `timestamp`.

### 3.3 Exact company PÍVOT mapping

```prisma
model CompanyOperationalAssignee {
  id          String                        @id @default(cuid())
  companyId   String
  userId      String
  designation CompanyOperationalDesignation
  version     Int                           @default(1)
  createdById String
  updatedById String
  createdAt   DateTime                      @default(now())
  updatedAt   DateTime                      @updatedAt

  company    Company           @relation(fields: [companyId], references: [id], onDelete: Restrict)
  userAccess UserCompanyAccess @relation(fields: [userId, companyId], references: [userId, companyId], onDelete: Restrict)

  @@unique([companyId, designation])
  @@index([userId, companyId])
}
```

The unique key permits at most one PÍVOT row per company. Feature readiness and every command require exactly one row. The service additionally requires `userAccess.isActive`, `userAccess.role == "operator"`, `userAccess.user.isActive`, and active Company. A mapping row is not itself proof of current eligibility.

The user ID never comes from a request/complete browser payload. Only the separately protected PÍVOT administration command accepts a proposed replacement ID, then proves the composite company membership and exact role server-side.

### 3.4 Availability request aggregate

```prisma
model AvailabilityRequest {
  id                       String                         @id @default(cuid())
  companyId                String
  surgeryId                String
  requesterUserId          String
  status                   AvailabilityRequestStatus     @default(OPEN)
  creatorResolution        AvailabilityCreatorResolution
  creatorUserIdSnapshot    String?
  creatorAuditEventId      String?
  pivotUserIdAtCreation    String
  pivotMappingVersion      Int
  requestedAt              DateTime                       @default(now())
  completedAt              DateTime?
  completedByUserId        String?
  submittedDate            DateTime?                      @db.Date
  completionCommandId      String?                        @unique
  correlationId            String                         @unique
  createdAt                DateTime                       @default(now())
  updatedAt                DateTime                       @updatedAt

  company      Company                                  @relation(fields: [companyId], references: [id], onDelete: Restrict)
  surgery      Surgery                                  @relation(fields: [surgeryId], references: [id], onDelete: Restrict)
  requester    User                                     @relation("AvailabilityRequester", fields: [requesterUserId], references: [id], onDelete: Restrict)
  completedBy  User?                                    @relation("AvailabilityCompleter", fields: [completedByUserId], references: [id], onDelete: Restrict)
  assignments  AvailabilityRequestRecipientAssignment[]
  notifications InternalNotification[]

  @@index([companyId, surgeryId, status])
  @@index([companyId, requesterUserId, requestedAt])
  @@index([companyId, status, requestedAt])
}
```

This design chooses Prisma's default PostgreSQL mapping for every new model and field: there is no `@map` or `@@map` on `AvailabilityRequest` or `AvailabilityRequestRecipientAssignment`. Therefore table and column identifiers remain the exact case-sensitive Prisma identifiers and are double-quoted in handwritten SQL. The check constraint name is the quoted identifier `"AvailabilityRequest_terminal_consistency_check"`; the three explicit index names are intentionally unquoted lowercase identifiers and therefore have exactly the spellings shown. The enum column values remain the exact Prisma enum values `OPEN` and `COMPLETED`. The reviewed migration uses the following exact constraint and identifiers:

```sql
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "AvailabilityRequest_terminal_consistency_check"
CHECK (
  ("status" = 'OPEN' AND "completedAt" IS NULL AND "completedByUserId" IS NULL AND "submittedDate" IS NULL)
  OR
  ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "completedByUserId" IS NOT NULL AND "submittedDate" IS NOT NULL)
);
```

One open request is protected by a PostgreSQL partial unique index, because Prisma `@@unique` cannot express terminal-state filtering:

```sql
CREATE UNIQUE INDEX availability_request_one_open_per_surgery
ON "AvailabilityRequest" ("companyId", "surgeryId")
WHERE "status" = 'OPEN';
```

The migration must add this index through reviewed SQL and assert that every request's `companyId` equals its Surgery company in service transactions. A composite database foreign key to `(surgeryId, companyId)` is preferred if the approved schema also introduces a matching unique Surgery key; otherwise every write must resolve Surgery by both fields and integration tests must prove it.

`creatorAuditEventId` is populated only when `createdById` came from the approved exact backfill; otherwise it is null. The creator outcome and snapshots remain readable even if eligibility later changes.

### 3.5 Append-only recipient-role assignments

```prisma
model AvailabilityRequestRecipientAssignment {
  id                    String                      @id @default(cuid())
  availabilityRequestId String
  companyId             String
  userId                String
  reason                AvailabilityRecipientReason
  assignedAt            DateTime                    @default(now())
  assignedByUserId      String
  revokedAt             DateTime?
  revokedByUserId       String?
  revokeReason          String?
  correlationId         String

  request AvailabilityRequest @relation(fields: [availabilityRequestId], references: [id], onDelete: Restrict)

  @@index([companyId, userId, revokedAt])
  @@index([availabilityRequestId, reason, revokedAt])
}
```

Assignments are evidence plus the current request-specific authorization projection:

- creation adds one active `PIVOT` assignment and, only when identified and eligible, one active `CREATOR` assignment;
- creator=PÍVOT produces two reason rows but one delivery and one eligible user identity;
- PÍVOT replacement revokes the active PÍVOT row and inserts a new one; it does not rewrite history;
- a former PÍVOT who is also the active creator remains eligible only through the creator assignment;
- creator assignment is never transferred or silently substituted;
- current `User`/`UserCompanyAccess` validity is always rechecked.

Add partial unique indexes:

```sql
CREATE UNIQUE INDEX availability_request_one_active_reason
ON "AvailabilityRequestRecipientAssignment" ("availabilityRequestId", "reason")
WHERE "revokedAt" IS NULL;

CREATE UNIQUE INDEX availability_request_assignment_episode
ON "AvailabilityRequestRecipientAssignment" ("availabilityRequestId", "reason", "userId", "assignedAt");
```

The three explicit index names in this section and §3.4 are the exact migration names. Their quoted table/column identifiers match the no-map Prisma choice above. These indexes allow one open request, one active creator slot, and one active PÍVOT slot while preserving transfer history. Deliveries are deduplicated by a set of active assignment `userId` values.

### 3.6 Idempotency ledger and notification relation

```prisma
model AvailabilityCommand {
  id             String                  @id @default(cuid())
  companyId      String
  actorUserId    String
  type           AvailabilityCommandType
  idempotencyKey String
  payloadHash    String
  requestId      String?
  surgeryId      String?
  completedAt    DateTime?
  resultCode     String?
  createdAt      DateTime                @default(now())

  @@unique([companyId, actorUserId, type, idempotencyKey])
  @@index([companyId, requestId])
  @@index([companyId, surgeryId])
}
```

All mutation endpoints require an opaque `Idempotency-Key` with a bounded validated format. The server hashes the normalized semantic payload. Same key/type/actor/company plus same hash returns the stored result; reuse with a different hash returns `409 idempotency_key_reused`. The ledger row and domain effects commit together.

Extend `InternalNotificationType` with `availability_request_actionable`, `availability_request_completed`, and `availability_pivot_reassigned`; add nullable `availabilityRequestId` plus a relation/index. Existing deterministic uniqueness remains:

```txt
availability:request:{requestId}:actionable:{recipientUserId}
availability:request:{requestId}:completed:{requesterUserId}
availability:request:{requestId}:pivot-reassigned:{newPivotUserId}:{assignmentId}
availability:request:{requestId}:pivot-revoked:{formerPivotUserId}:{assignmentId}
```

All rows are persisted in the same database transaction as the corresponding domain command. `readAt` does not affect actionability. Any later push/email transport requires a separately approved outbox; external delivery must never be placed inside the domain transaction.

**Human approval gate — exact schema:** Franco must approve every field, enum, relation, delete behavior, check, partial index, notification enum addition, command ledger, and date location/type before `schema.prisma` or migration files are touched.

---

## 4. Date-only contract

The API accepts and emits exactly a valid Gregorian `YYYY-MM-DD` string. Empty strings, datetimes, offsets, locale strings, impossible dates, and implicit coercion are invalid.

- persistence: PostgreSQL `date` through Prisma `DateTime @db.Date`;
- request body: `{ "date": "2026-07-24" }`;
- response: `"2026-07-24"`, serialized from the date component without timezone conversion;
- UI display: `24/07/2026` using calendar components, not `new Date("2026-07-24")` browser-local conversion;
- comparison/concurrency: normalized date strings or native database dates, never instants;
- there is no time, UTC boundary, company timezone, or user timezone in this field.

The server date validator must validate year/month/day and round-trip the components. This contract resolves day-shift risk without inventing a timezone policy.

**Human approval gate — date semantics:** Franco must approve the native `date` storage and `YYYY-MM-DD` wire contract before schema/API implementation.

---

## 5. Creator resolution and current eligibility

### 5.1 New Surgeries

`createSurgery()` derives `createdById = scopedContext.actorUserId` and writes it in the existing serializable creation transaction. Clients cannot supply or update it. Audit remains `entityType="Surgery"`, `action="surgery.created"`.

### 5.2 Legacy Surgeries

The only accepted backfill candidate is exactly one `AuditEvent` satisfying all conditions:

```txt
AuditEvent.companyId  = Surgery.companyId
AuditEvent.entityType = "Surgery"
AuditEvent.entityId   = Surgery.id
AuditEvent.action     = "surgery.created"
AuditEvent.userId resolves to a real User
count of matching AuditEvent rows = 1
```

No normalization to another entity type/action is approved. Zero rows, more than one row, missing user, cross-company event, or malformed identity leaves `Surgery.createdById = null`. Multiple rows naming the same user still fail the strict exactly-one-event rule. No earliest-event, name, email, note author, coordinator, requester, PÍVOT, admin, or first-user fallback exists.

### 5.3 Request-time creator classification

After reading `createdById` under the same company transaction:

| Condition | Persisted outcome | Creator assignment/delivery |
| --- | --- | --- |
| Null/unprovable | `NOT_IDENTIFIED` | None; show **`Creador de la cirugía no identificado`**. |
| User inactive | `IDENTIFIED_INACTIVE` | None; show **`Creador de la cirugía no identificado o no habilitado`**. |
| No active access to Surgery company | `IDENTIFIED_NO_COMPANY_ACCESS` | None; same visible not-eligible treatment. |
| Active User + active company access | `IDENTIFIED_ELIGIBLE` | Active `CREATOR` assignment. Base company role does not need to be `operator`. |

An eligible creator who later becomes inactive or loses company access remains historical evidence but immediately loses completion authority. The active PÍVOT remains able to complete. No reassignment or replacement occurs for creator reason.

---

## 6. Migration, backfill, readiness, and rollback

No step in this section is authorized for execution.

### 6.1 Additive migration sequence

1. **Dry-run only:** classify Surgeries by creator evidence; inventory date-like legacy fields without mapping them; classify every company as valid/missing/ambiguous/inactive/wrong-role PÍVOT readiness; assert no request tables yet contain conflicts.
2. **Approval checkpoint:** Franco reviews counts and row-level exception report with no secrets in logs.
3. Add nullable Surgery fields, new tables/enums/relations, notification linkage/type values, checks, and non-unique indexes. Feature flag remains off globally.
4. Deploy dual-compatible code that always records `createdById` for new Surgeries but exposes no availability command.
5. Backfill `createdById` only for strict §5.2 successes in bounded batches. Record migration run ID, source AuditEvent ID, before/after counts, failures, and checksum. Unknown remains null.
6. Configure one reviewed PÍVOT per pilot company through the protected designation command; never seed the first operator.
7. Validate and then create partial unique indexes. Since no availability requests predate rollout, one-open conflicts must be zero.
8. Enable read UI, then request creation, then completion/correction for an approved pilot company. Expand only after observability gates pass.

### 6.2 Verification queries

Before rollout, prove:

- no `createdById` was written without exactly one source AuditEvent;
- every backfilled creator source shares company/entity/action/id exactly;
- no legacy material date was copied automatically;
- each enabled company has exactly one mapping whose current member is active and role `operator`;
- no open-request duplicate exists by `(companyId, surgeryId)`;
- no active request has zero active PÍVOT assignments or more than one active assignment per reason;
- every request, assignment, notification, command, trace, and AuditEvent company matches the Surgery company.

### 6.3 Rollback

1. Disable feature flags first; keep all data readable for audit.
2. Roll back application consumers to ignore additive fields/tables. Do not reopen, delete, or rewrite completed requests.
3. If pre-request rollout fails, nullable additions may remain dormant. Do not drop columns in the incident window.
4. If requests exist, schema rollback is forward-fix only. Preserve request/audit/trace facts; repair services or indexes through a new approved migration.
5. Never roll back by clearing canonical dates, restoring former PÍVOT authority, fabricating creator values, or deleting notifications/audit.

**Human approval gates — migration/backfill and production rollout:** Franco must separately approve the dry-run, exact write migration, backfill report, PÍVOT designation for each enabled company or approved administration process, pilot companies, feature-flag stages, production execution window, verification evidence, and any rollback SQL.

---

## 7. Service architecture and transaction boundaries

### 7.1 Modules

```txt
src/lib/validators/availability-request.validator.ts
src/lib/permissions/availability-request.ts
src/lib/services/availability-request.service.ts
src/lib/services/company-operational-assignee.service.ts
src/lib/services/material-availability.service.ts
src/lib/services/internal-notifications.service.ts       // bounded extension
src/lib/services/seguimiento.service.ts                  // server-only trace helper
src/lib/api/availability-request-client.ts
```

Routes authenticate and parse. Validators validate closed shapes. Permission functions evaluate named capabilities. Services own company resolution, transactions, constraints, audit, trace, and notification intents. React never imports Prisma or decides eligibility.

### 7.2 Create request transaction

Run at `Serializable`, retry serialization/deadlock failures a bounded three attempts, and convert exhausted races to `409`:

1. authenticate and require `availability.request.create` for current company;
2. validate path and idempotency key; body contains no actor, company, recipient, creator, or PÍVOT IDs;
3. begin transaction and claim/read command ledger key;
4. resolve Surgery by `(id or visibleNumber, ctx.companyId)` without revealing foreign-company existence;
5. require `archivedAt IS NULL`, `cxStatus NOT IN ('cancelled','finalized')`, and `materialAvailabilityDate IS NULL`;
6. resolve exactly one current PÍVOT mapping and revalidate Company, User, access, and exact `operator` role;
7. resolve/classify creator under §5 and build role assignments;
8. create `AvailabilityRequest`; the partial unique index chooses the winner;
9. create append-only assignments and one actionable notification per distinct eligible user;
10. create `AuditEvent(action="availability.requested")` and immutable server-generated Seguimiento entry **`Se solicitó fecha de disponibilidad del material`**;
11. complete the command receipt and commit.

An existing open request reached with a new command key returns `409 availability_request_already_open` plus only same-company safe state. An exact proven retry returns the original representation without duplicate effects.

### 7.3 Completion transaction

Run at `Serializable` with bounded retries:

1. authenticate; validate request ID, `YYYY-MM-DD`, and idempotency key;
2. claim/read the command receipt;
3. resolve request joined to Surgery by `(request.id, request.companyId=ctx.companyId)`; a non-recipient receives non-disclosing `404` unless policy chooses uniform `403` after same-company proof;
4. re-read request and Surgery inside the serializable transaction; require request `OPEN`, `Surgery.archivedAt IS NULL`, `Surgery.cxStatus NOT IN ('cancelled','finalized')`, and canonical date null;
5. resolve active assignment rows for actor; require at least one; revalidate active User and company access;
6. if acting via PÍVOT reason, require actor still equals the company's current valid PÍVOT; if via creator reason, current company access is sufficient;
7. execute a conditional Surgery `updateMany` with the exact winning predicate `WHERE id = :surgeryId AND companyId = :companyId AND archivedAt IS NULL AND cxStatus NOT IN ('cancelled','finalized') AND materialAvailabilityDate IS NULL`; require count one. PostgreSQL acquires the Surgery row lock for this write. After a concurrent same-row lifecycle write, PostgreSQL either yields a zero match under predicate recheck or raises a serialization failure; the bounded retry repeats this exact predicate against fresh committed truth;
8. conditional request update: `WHERE id, companyId, status=OPEN`, setting `COMPLETED`, submitted date, actor, server time, command ID;
9. require both update counts equal one;
10. write `AuditEvent(action="availability.completed", oldValue={date:null,status:"OPEN"}, newValue={date,status:"COMPLETED"})`;
11. create immutable Seguimiento entry, e.g. **`María estableció disponibilidad para el 24/07/2026`**, correlated to request/audit;
12. create one informational requester notification, even when requester is also completer, with deterministic event key;
13. complete command receipt and commit.

All recipient notifications become non-actionable by reading the shared terminal state; they are not deleted and their `readAt` values are unchanged. Exactly one concurrent completer wins. A concurrent archive/cancel/finalize write targets the same Surgery row: if that lifecycle write commits first, the exact step 7 predicate updates zero rows and the whole completion returns `409 availability_surgery_ineligible`; if completion locks/commits first, completion was valid while active and the later lifecycle transition is a separate subsequent fact. Serializable retry never relaxes the lifecycle predicate, and no request/audit/trace/notification effect commits when the Surgery update count is zero.

An exact retry by the same actor/key/hash returns the stored terminal result. Any other actor/key/date against terminal state returns `409 availability_request_completed`; it never adds duplicate audit, trace, or notification rows.

### 7.4 Correction transaction

`correctMaterialAvailability()` is an Expediente-only command, not a request transition:

1. require `availability.date.correct` and exact current company;
2. validate `date`, required `expectedCurrentDate`, required trimmed correction reason, and idempotency key;
3. resolve the Surgery directly by `(id, ctx.companyId)` without filtering `archivedAt` or `cxStatus`; require an existing canonical date. Archived, cancelled, and finalized Surgeries are intentionally eligible for this correction when the actor is authorized;
4. conditionally update only `materialAvailabilityDate` where `(id, companyId, materialAvailabilityDate=expectedCurrentDate)`; intentionally apply no archived/CX lifecycle predicate, require count one, and leave `archivedAt`, `cxStatus`, request status, completion facts, assignments, and notifications untouched;
5. write `AuditEvent(action="availability.corrected")` in the same transaction with server-derived actor, server timestamp, mandatory reason, and exact old/new dates;
6. create immutable Seguimiento entry **`Se corrigió la disponibilidad del 24/07/2026 al 25/07/2026`**;
7. leave every completed request, submitted date, assignment, and notification unchanged; commit with command receipt.

Correction never reopens or advances Surgery/request lifecycle. If an open request exists, correction is impossible because correction requires an existing date. The only command allowed to set a missing date while a request is open is completion. Any other future initial-date path must call the same material-availability service and reject `409 availability_request_open`, eliminating an untracked external-write reconciliation state.

### 7.5 PÍVOT replacement transaction

`reassignPivot()` is one critical company-configuration transaction:

1. require `availability.pivot.configure`; validate proposed user ID, `expectedVersion`, reason, idempotency key;
2. resolve exact active same-company `UserCompanyAccess` with role `operator` and active User;
3. lock current mapping; reject missing initial setup through replacement endpoint, stale version, no-op, or invalid target;
4. update mapping user and increment version conditionally;
5. select all company requests still `OPEN`; revoke each active former `PIVOT` assignment and append the new active PÍVOT assignment;
6. generate one new actionable notification per request unless that user already has a delivery for that request; notification detail exposes both reasons when creator=new PÍVOT;
7. emit a revoked/reassignment informational notification to the former PÍVOT without retaining an action; if former PÍVOT is creator, UI actionability remains through creator reason only;
8. audit `availability.pivot_reassigned` at company level and `availability.request_pivot_transferred` for affected requests, with counts/correlation IDs;
9. create request trace entries for each transferred open request and commit the command receipt.

Use set-based updates/inserts inside one serializable transaction. No request may remain assigned to the old PÍVOT after commit. If the transaction cannot transfer every open request, it rolls back the mapping change and all effects. Completed requests are neither selected nor modified.

Initial PÍVOT designation uses a separate protected create operation with the same capability, eligibility checks, audit, and expected-absence condition. It does not transfer requests because the feature remains disabled until designation readiness passes.

### 7.6 Trace records

Add a closed, server-only Seguimiento entry type `availability_event`; generic Seguimiento POST/PATCH must reject client creation or editing of this type. `evidenceRef` contains only non-secret identifiers and facts:

```ts
{
  source: "availability_request",
  event: "requested" | "completed" | "corrected" | "pivot_transferred",
  requestId?: string,
  auditEventId: string,
  correlationId: string,
  oldDate?: string | null,
  newDate?: string | null
}
```

AuditEvent remains technical truth; Seguimiento is the human-readable projection. Neither is used to authorize or derive lifecycle state.

---

## 8. API, validators, and response contracts

### 8.1 Endpoints

| Method and path | Purpose | Capability/authority |
| --- | --- | --- |
| `POST /api/companies/:companyId/surgeries/:surgeryId/availability-requests` | Create one open request. Empty JSON body; `Idempotency-Key` required. | `availability.request.create`; server resolves all recipients. |
| `GET /api/companies/:companyId/availability-requests/:requestId` | Current modal/deep-link representation. | Same-company requester with read capability or currently eligible recipient; terminal safe representation for historical recipients as approved. |
| `POST /api/companies/:companyId/availability-requests/:requestId/complete` | Complete with `{ date }`. | Exact current active recipient assignment plus reauthorization. |
| `PATCH /api/companies/:companyId/surgeries/:surgeryId/material-availability` | Correct existing date with `{ date, expectedCurrentDate, reason }`. | Separate `availability.date.correct`; Expediente origin only. |
| `PUT /api/companies/:companyId/operational-assignees/pivot` | Replace PÍVOT with `{ userId, expectedVersion, reason }`. | `availability.pivot.configure`; critical audited configuration. |

No endpoint accepts `requesterUserId`, `completedByUserId`, recipient IDs/reasons, creator outcome, old date, status, `companyId` in body, notification keys, audit actor, or trace actor.

### 8.2 Closed validators

- reject unknown body keys;
- path IDs are trimmed, bounded opaque strings;
- `Idempotency-Key`: 16–128 visible ASCII characters, no secrets/PII;
- date: exact valid `YYYY-MM-DD`;
- correction reason and reassignment reason: trimmed 3–500 characters;
- `expectedCurrentDate` uses the same date validator;
- `expectedVersion` is a positive safe integer;
- proposed PÍVOT user ID is only a lookup candidate, never authority.

### 8.3 Safe response shape

```ts
type AvailabilityRequestView = {
  id: string
  companyId: string
  surgery: { id: string; visibleNumber: string | null }
  status: "OPEN" | "COMPLETED"
  requestedAt: string
  requester: { id: string; displayName: string }
  creatorResolution: "identified_eligible" | "not_identified_or_eligible"
  recipientReasonsForActor: Array<"creator" | "pivot">
  canComplete: boolean
  submittedDate: string | null
  completedAt: string | null
  completedBy: { id: string; displayName: string } | null
}
```

Do not expose other recipient IDs, inactive-user details, raw AuditEvent metadata, company membership, or PÍVOT configuration through the modal endpoint.

---

## 9. Permissions and tenancy matrix

Exact capability-to-role/user mapping remains a human-approved authorization artifact. Current broad `admin`, `operator`, or Coordination UI access is not an acceptable substitute.

| Operation | Required checks | Explicitly insufficient |
| --- | --- | --- |
| Request | authenticated active actor; active company access; `availability.request.create`; same-company active Surgery; valid PÍVOT | Coordination page visibility, any coordinator label, any operator/admin role alone |
| Read action modal | active company access; same-company request; requester read policy or exact current/historical safe recipient policy | notification ID, request ID, unread status |
| Complete | active company access; exact active request role assignment; current creator/PÍVOT rules; open request | generic operator, requester, admin, notification reader, old PÍVOT |
| Correct | active company access; `availability.date.correct`; Expediente command; optimistic date match | prior completion authority, request recipient status |
| Configure/reassign PÍVOT | active company access; `availability.pivot.configure`; valid target; expected mapping version | any operator, current PÍVOT, company page access |

Error policy:

- `403`: authenticated actor is known in company context but lacks a named capability; no target facts are disclosed;
- `404`: Surgery/request/notification cannot be resolved inside the authorized company/actor scope, including foreign-company IDs and non-recipient action links;
- `409`: same-company authorized command is stale or loses an invariant/race (`date_present`, `request_open`, `request_completed`, `pivot_changed`, `expected_date_mismatch`, uniqueness winner);
- validation uses `400`; missing/invalid authentication remains `401` under the existing auth contract.

Stable 409 codes include `availability_date_already_set`, `availability_request_already_open`, `availability_request_completed`, `availability_request_not_open`, `availability_surgery_ineligible`, `availability_pivot_unavailable`, `availability_pivot_version_conflict`, `availability_expected_date_mismatch`, `availability_request_open`, and `idempotency_key_reused`.

All repository lookups use `ctx.companyId`; no service trusts a body/path company to scope nested records. Logs hash or omit untrusted IDs where unnecessary and never log dates with patient identity.

**Human approval gate — permissions/security:** Franco must approve the four named capabilities, their exact assignment mechanism, requester terminal-read policy, PÍVOT administrator population, and 403/404 disclosure policy before implementation.

---

## 10. Deep link, modal, UI states, and mobile behavior

### 10.1 Routing and reauthorization

Actionable notification metadata carries only:

```ts
{
  channel: "operational",
  eventType: "availability_request_actionable",
  availabilityRequestId: requestId,
  href: `/notificaciones?accion=informar-disponibilidad&solicitud=${requestId}`
}
```

Opening the URL may mark the delivery read, but actionability is fetched independently through the protected GET endpoint. The page opens the action modal only after a successful server response for the current actor/company. URL or frontend IDs never prefill authority, recipient reason, requester, status, or date. Actor/company change closes the modal and discards all prior request data; late responses are rejected by context/request sequence.

Completed/requester notifications deep-link to the same safe detail or **`Abrir expediente`**, never to an editable completed action.

### 10.2 Requester surface

For an authorized active Surgery:

| Server-backed state | UI |
| --- | --- |
| Date absent, no open request, valid local eligibility hint | Button **`Pedir disponibilidad`**. |
| Open request | Disabled/replaced state **`Solicitud pendiente`** with safe requested date/actor context. |
| Date present | Show canonical date; no request button. |
| Archived/cancelled/finalized | No request action; direct calls still reject. |
| PÍVOT invalid at submit | Explicit blocked result **`No se pudo enviar: falta configurar un PÍVOT válido.`**; never claim success. |

Confirmation explains recipients but does not expose/edit IDs. Creator unavailable copy is **`Creador de la cirugía no identificado o no habilitado; la solicitud se enviará al PÍVOT.`** Success is **`Solicitud de disponibilidad enviada`**.

### 10.3 Recipient modal

Title: **`Informar disponibilidad`**. Show Surgery visible number, requester, request date, actor reasons (`Creador`, `PÍVOT`, or both), and creator-resolution caveat. Required control: **`Fecha de disponibilidad del material`**. Submit: **`Guardar disponibilidad`**.

States:

- loading: skeleton/spinner, no enabled submit;
- open/authorized: empty date control and enabled submit only when valid;
- submitting: one disabled submit, retain entered value;
- completed by this command: close and announce **`Disponibilidad informada`**;
- completed by another actor: **`La solicitud ya fue completada`**, committed date, no edit/reopen;
- date conflict: **`La fecha ya fue informada. Abrí el expediente para revisar el caso.`**;
- authorization/PÍVOT/access loss: non-disclosing blocked state and close action;
- network retry: retain date and reuse the same idempotency key until semantic input changes.

Reading/unreading notifications never changes these states.

### 10.4 Correction UI

Only the independently authorized Expediente surface offers **`Corregir fecha`** when a canonical date exists. It requires new date and reason, shows old/new values, uses optimistic `expectedCurrentDate`, and never mentions reopening the request. Completed notification details provide **`Abrir expediente`** only.

### 10.5 Mobile and accessibility

At `412x915` and wider:

- use the existing accessible dialog/drawer primitive; no new dependency;
- one-column layout, viewport-bounded height, internal scroll, safe-area padding;
- title/context and sticky/reachable action area; no horizontal overflow;
- native/date-picker interaction must still submit canonical date-only text;
- all controls have visible Spanish labels, errors with `aria-describedby`, and at least `44x44` CSS-pixel targets;
- focus enters the title/first invalid field, remains trapped, Escape cancels without submit, and returns to the notification/action trigger;
- success/conflict is announced once through a polite/status region; authorization/error uses alert semantics;
- do not place nested dashboards, recipient selectors, time inputs, or correction controls in the action modal.

---

## 11. Audit, observability, retries, and race handling

### 11.1 Audit actions

| Action | Entity | Required old/new and metadata |
| --- | --- | --- |
| `availability.requested` | `AvailabilityRequest` | Surgery, requester, creator resolution/evidence ID, deduplicated recipient reasons, PÍVOT mapping version, correlation ID |
| `availability.completed` | `AvailabilityRequest` | `null → YYYY-MM-DD`, `OPEN → COMPLETED`, actor reasons, correlation ID |
| `availability.corrected` | `Surgery` | authenticated actor ID, server event time, mandatory reason, exact old/new date, related completed request ID if any, correlation ID; Surgery/request lifecycle remains unchanged |
| `availability.pivot_designated` | `CompanyOperationalAssignee` | null/new user, version, reason |
| `availability.pivot_reassigned` | `CompanyOperationalAssignee` | old/new user, old/new version, affected-open count, reason |
| `availability.request_pivot_transferred` | `AvailabilityRequest` | revoked/new assignment IDs/users, correlation ID |

Failed authorization attempts are security telemetry, not domain AuditEvents unless an approved security-audit policy requires persistence. Never write a success audit outside the command transaction.

### 11.2 Metrics and structured logs

Emit low-cardinality counters/histograms:

- request attempts/success/conflict by safe reason;
- creator resolution outcome;
- PÍVOT resolution failure category;
- completion attempts/success/stale/denied;
- serializable retry count and exhausted retries;
- notification rows attempted/created/deduplicated;
- PÍVOT transfer open-request count and duration;
- idempotency hit/hash-conflict;
- transaction duration and rollback reason.

Logs include operation, request/correlation ID, company ID or approved hash, actor ID or approved hash, safe result code, retry number, and duration. They exclude patient names, free-text reasons, notification body, and raw auth headers.

Alerts: any enabled company with invalid PÍVOT; open request without one active PÍVOT assignment; more than one active assignment per reason; completed request/date mismatch; notification/audit/trace count invariant failure; persistent serialization exhaustion.

### 11.3 Race matrix

| Race | Winner/loser behavior |
| --- | --- |
| Two creates | Partial unique index allows one open request; exact retry returns winner, other command gets stable 409. |
| Creator and PÍVOT complete | Conditional Surgery + request updates allow one commit; loser gets terminal 409/current safe state. |
| Completion vs correction | Correction requires an existing expected date; before completion it fails. After completion it can run only against exact committed date with separate authority. |
| Completion vs archive/finalize/cancel | Completion's exact conditional Surgery update includes `archivedAt IS NULL` and `cxStatus NOT IN ('cancelled','finalized')`. Same-row locking plus serializable retry makes terminal-first completion update zero rows/409; completion-first is valid and the later lifecycle transition is subsequent. No partial effects commit. |
| Correction vs archive/finalize/cancel | Correction is explicitly allowed before, during, or after these lifecycle transitions. It conditionally matches only the same-company expected existing date, changes only that date, and audits actor/time/reason/old/new without reopening any lifecycle. |
| Completion vs PÍVOT replacement | Replacement revokes old assignment and changes mapping in one transaction; old PÍVOT cannot commit after replacement. Serializable conflict retries against new truth. |
| Two PÍVOT replacements | Mapping `expectedVersion` permits one; loser gets 409 and transfers nothing. |
| Stale modal/read state | Submit always reauthorizes; UI state cannot select the winner. |
| Duplicate notification/command retry | Unique event keys and command ledger suppress duplicate effects. |

---

## 12. Separation from interactive metrics

`COORDINATION-INTERACTIVE-METRICS-001` remains read-only and independent.

- No metric click creates, completes, corrects, or reassigns a request.
- Metrics do not authorize or identify creator/PÍVOT/recipient.
- Availability request status does not change CX state, preparation state, SLA, coordinator assignment, or metric formulas.
- A future count of missing dates/open requests requires its own SPEC; this design adds no dashboard counter.
- Drill-down may navigate to an authorized case only; **`Pedir disponibilidad`** remains an explicit server-authorized command.

---

## 13. Exact file impact and ownership map

All packages require a new implementation Task Brief, visible lock, one writer, and Franco approval. The paths below are expected impact, not edit permission now.

### Package A — schema and migration (critical, serialized alone)

```txt
prisma/schema.prisma
prisma/migrations/<approved_add_availability_request>/migration.sql
src/lib/services/surgery.service.ts
focused schema/migration/backfill verification scripts and tests
```

Owns exact fields, relations, enum values, checks, partial indexes, new-Surgery creator write, dry-run/backfill, and compatibility. No parallel writer may touch Prisma, Surgery creation, seed, or generated client. `prisma/seed.ts` is not expected to assign PÍVOT or fabricate creator/date; any need requires escalation.

### Package B — protected backend domain

```txt
src/lib/validators/availability-request.validator.ts                 // new
src/lib/permissions/availability-request.ts                          // new
src/lib/services/availability-request.service.ts                     // new
src/lib/services/material-availability.service.ts                    // new
src/lib/services/company-operational-assignee.service.ts             // new
src/lib/services/internal-notifications.service.ts                   // bounded extension
src/lib/services/seguimiento.service.ts                              // bounded server-only trace extension
src/lib/api/errors.ts                                                // stable codes only if needed
src/app/api/companies/[companyId]/surgeries/[surgeryId]/availability-requests/route.ts
src/app/api/companies/[companyId]/availability-requests/[requestId]/route.ts
src/app/api/companies/[companyId]/availability-requests/[requestId]/complete/route.ts
src/app/api/companies/[companyId]/surgeries/[surgeryId]/material-availability/route.ts
src/app/api/companies/[companyId]/operational-assignees/pivot/route.ts
focused unit/integration/API tests
```

One owner holds the complete route/service/validator/permission chain. Broad Coordination role helpers and Auth provider code are forbidden unless a separately approved permission architecture task explicitly owns them.

### Package C — notification/deep-link UI

```txt
src/lib/api/availability-request-client.ts                           // new
src/components/notifications/AvailabilityRequestActionModal.tsx      // new
src/components/notifications/*                                      // minimal routing/card extension
src/app/notificaciones/page.tsx                                     // deep-link orchestration
focused component/accessibility tests
```

Owns no authority or Prisma. It consumes safe server representations and closes state on trust-context change.

### Package D — requester and Expediente surfaces (sensitive, serialized)

```txt
src/components/coordinadores/*                                      // exact requester component after reconnaissance
src/components/expediente/*                                         // exact correction component after reconnaissance
src/lib/api/*                                                       // bounded clients
focused UI tests
```

This package requires explicit Cirugías/Expediente Task Brief approval before exact files are locked. It must not refactor `src/app/cirugias/page.tsx`, `src/lib/store.ts`, Cirugías hooks, or shared business rules merely to add this workflow.

### Package E — PÍVOT administration UI

```txt
src/app/configuracion/* or separately approved company-configuration surface
bounded API client/component/tests
```

The exact administration surface is selected only after Franco approves who may designate PÍVOT. It cannot be hidden in generic operator editing.

Execution order: A → schema verification → B → backend security review → C/D/E with separate ownership → integrated QA → approved pilot rollout. Packages touching the same notification, Surgery, Seguimiento, Expediente, or shared type chain are serialized.

---

## 14. Test strategy

### 14.1 Schema/migration tests

- PostgreSQL native date round-trip and no timezone/day shift;
- migration SQL resolves the exact no-map identifiers `"AvailabilityRequest"`, `"AvailabilityRequestRecipientAssignment"`, `"status"`, `"completedAt"`, `"completedByUserId"`, `"submittedDate"`, `"companyId"`, `"surgeryId"`, `"availabilityRequestId"`, `"reason"`, `"revokedAt"`, `"userId"`, and `"assignedAt"` and creates the exact named check/indexes without missing-column or case-folding errors;
- partial unique index rejects concurrent open duplicates;
- active recipient-reason partial uniqueness;
- terminal check constraint;
- strict creator dry-run/backfill: exact one event succeeds; zero/multiple/wrong action/type/company/entity/missing user stays null;
- new Surgery creation always records immutable creator and exact audit in one transaction;
- no legacy date/PÍVOT/creator defaults invented;
- rollback compatibility and feature-disabled behavior.

### 14.2 Service unit tests

- request creation rejects archived/cancelled/finalized/date-present Surgeries and accepts only the confirmed active/date-absent states;
- completion's exact conditional Surgery update rejects archived/cancelled/finalized/date-present rows with zero committed side effects;
- correction of an existing date succeeds for otherwise authorized active, archived, cancelled, and finalized Surgeries, requires reason and exact expected old date, changes no lifecycle/request field, and audits actor/server time/reason/old/new;
- PÍVOT missing/ambiguous/inactive/wrong role/wrong company/inactive user;
- creator identified eligible, missing, ambiguous legacy, inactive, no access;
- creator=PÍVOT role preservation plus one delivery;
- one recipient can complete; requester/admin/generic operator/non-recipient cannot;
- creator loses access after creation; PÍVOT remains; no substitution;
- old PÍVOT loses authority after replacement; new PÍVOT gains it; creator reason survives independently;
- completed requests never reopen and are untouched by reassignment;
- correction requires existing exact old date, separate capability, and reason;
- exact idempotency retry versus key/hash misuse;
- deterministic event keys and no duplicate audit/trace/notification.

### 14.3 Transaction/integration tests against PostgreSQL

- simultaneous creates;
- simultaneous different-date completions;
- completion versus archive/cancel/finalize in both lock orders, proving terminal-first returns 409/no partial effects and completion-first is a valid prior commit;
- correction versus archive/cancel/finalize in both lock orders, proving correction remains allowed and changes only the expected existing date;
- completion versus PÍVOT replacement;
- two replacements with same expected version;
- correction versus completion ordering;
- transaction rollback injected after each write stage leaves no partial date/request/audit/trace/notification;
- company mismatch across every relation and forged frontend IDs;
- isolation retry succeeds or returns stable 409 after bounded exhaustion;
- set-based transfer covers all and only open company requests.

### 14.4 Route/security tests

- body unknown keys and malformed date/idempotency/version/reason;
- 401 unauthenticated, 403 missing capability, non-disclosing 404 foreign/non-recipient, 409 stale/race;
- path request/Surgery mismatch and visible-number collision remain company-scoped;
- no client actor/company/recipient/status/old-value authority;
- GET modal leaks no other-recipient or inactive-user details;
- direct forced requests behave identically to UI calls.

### 14.5 UI/component/browser QA

- button/open/pending/date-present/terminal states;
- invalid PÍVOT does not show false success;
- notification read state independent from actionability;
- deep-link open performs fresh GET and closes on actor/company change;
- stale modal shows committed state without resubmit;
- no reopen/edit action on completed notification;
- correction exists only on authorized Expediente surface;
- creator unavailable and dual-reason Spanish copy;
- keyboard, focus trap/restore, labels/errors/live regions, loading/error states;
- desktop plus `412x915`, 44px targets, no clipping/overflow, date round-trip;
- network audit proves no metric interaction issues a mutation.

### 14.6 Production-readiness evidence

- approved migration/backfill dry-run and post-write report;
- approved PÍVOT readiness report per enabled company;
- capability assignments reviewed;
- dashboards/alerts active;
- canary request/complete/correct/reassign scenarios pass with correlated AuditEvent, trace, and notifications;
- feature-off rollback rehearsal succeeds without data deletion.

---

## 15. Phased implementation plan and approval gates

| Phase | Deliverable | Mandatory gate before phase |
| --- | --- | --- |
| 0 | SPEC from this design, then TASKS/Task Brief and ownership locks | Franco confirms design and remaining authorization assignments |
| 1 | Schema/migration SQL and dry-run tooling, no production write | **Exact schema + migration/backfill approval** |
| 2 | Additive migration in approved environment; new-Surgery creator capture; feature off | Execution-window approval and verified backup/rollback |
| 3 | Backend request/read/complete/correct services and security tests | **Capability mapping + tenancy/error policy approval** |
| 4 | Protected PÍVOT create/reassign service and administration surface | **PÍVOT designator population/process approval** |
| 5 | Notification deep link, action modal, requester and Expediente UI | Sensitive file locks + Cirugías/Expediente Task Brief approval |
| 6 | Pilot company designation, data readiness, canary | **Per-company PÍVOT + production pilot approval** |
| 7 | Wider rollout with monitored gates | **Explicit Franco production rollout approval** |

No phase implicitly authorizes the next one. Prisma generation/formatting, migration creation/application, Auth/permission changes, sensitive UI edits, and production feature enablement require their corresponding Task Brief and approval.

---

## 16. Proposal and confirmed-rule traceability

| Requirement | Design coverage |
| --- | --- |
| Request only when date absent and Surgery active; reject archived/cancelled/finalized | §§1, 7.2, 10.2, 14 |
| Provable creator + exact company PÍVOT | §§3.2–3.5, 5, 7.2 |
| Missing/unusable/inactive creator → visible PÍVOT-only | §§1, 5.3, 10.2–10.3 |
| Invalid PÍVOT fails closed | §§3.3, 7.2, 9 |
| Creator=PÍVOT deduplicated | §§3.5–3.6, 7.2, 14.2 |
| Either eligible recipient completes | §§7.3, 9 |
| One open request per Surgery | §§3.4, 7.2, 11.3 |
| Date-only, no time | §4 |
| Completion closes both, audits, traces, notifies requester | §§7.3, 7.6, 11.1 |
| Completed not reopened; correction only through Expediente | §§1, 7.4, 10.4 |
| A-01 — Existing date correction remains allowed for archived/cancelled/finalized Surgery and audits reason/old/new/actor/time without lifecycle change | §§1, 7.4, 9, 11.1, 11.3, 14.2–14.3 |
| PÍVOT replacement transfers every open request; old loses authority; completed unchanged | §§3.5, 7.5, 11.3 |
| 403/404/409 fail-closed; frontend IDs no authority | §§8–10, 14.4 |
| A-02 — Exact no-map Prisma/PostgreSQL identifiers, relations, indexes, and terminal constraint | §§3.4–3.5, 14.1 |
| A-03 — Completion winning update rejects archived/cancelled/finalized Surgery under same-row locking, serializable retry, and zero-side-effect conflict semantics | §§7.3, 11.3, 14.2–14.3 |
| Safe exact AuditEvent backfill, nullable otherwise | §§5.2, 6 |
| Transactions, notifications, idempotency/event keys | §§3.6, 7, 11 |
| Request/complete/correct/reassign routes/services/validators/permissions | §§7–9 |
| Deep link/action modal and server reauthorization | §10 |
| Audit, observability, retries/races, rollback | §§6, 11 |
| UI/mobile | §10 |
| File ownership, tests, phased plan | §§13–15 |
| Separate from interactive metrics | §12 |

The proposal's previously open implementation questions are resolved inside the confirmed rules without adding lifecycle states: exact schema is recommended; legacy creator entity/action are frozen to current exact values; inactive creators lose eligibility without substitution; all canonical date mutation is centralized so an open-request external initial write is rejected rather than reconciled; native date has no timezone; internal notifications commit in-transaction; and stable error semantics are defined.

---

## 17. Stop conditions

Stop and return to Franco/SDD review if:

1. any exact schema field, raw SQL constraint/index, migration/backfill write, PÍVOT designation, capability assignment, sensitive file scope, or production rollout lacks explicit approval;
2. creator attribution would require anything other than new-creation actor or the strict exact AuditEvent contract;
3. current data cannot represent exactly one active company PÍVOT without granting all operators authority;
4. a database-safe one-open constraint or single-winner completion cannot be retained;
5. any date path can write a missing canonical date while an open request exists outside completion;
6. notification metadata, read state, Seguimiento, client state, or metrics would become lifecycle/authorization truth;
7. transfer cannot update all open requests atomically or would mutate completed requests;
8. implementation requires Auth-provider redesign, generic workflow/task infrastructure, broad operator authorization, destructive migration, or notes-only persistence;
9. company scoping cannot be enforced at every request, Surgery, assignment, notification, trace, command, and audit boundary;
10. external notification delivery is required without a separately approved transactional outbox; or
11. file ownership overlaps any Prisma, Surgery, notification, Seguimiento, Coordination, Expediente, or Auth chain.

All stop conditions fail closed and preserve existing data. This DESIGN authorizes only progression to a normative SPEC. It does not authorize schema edits, migration generation/execution, backfill, permission changes, code implementation, PÍVOT designation, or production rollout.
