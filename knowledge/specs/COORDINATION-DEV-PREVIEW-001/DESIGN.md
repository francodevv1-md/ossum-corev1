# Design — COORDINATION-DEV-PREVIEW-001

Status: designed; T0 completed; DEV bootstrap explicitly approved by Franco  
Change: `COORDINATION-DEV-PREVIEW-001`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Source: approved `knowledge/specs/COORDINATION-DEV-PREVIEW-001/PROPOSAL.md`

---

## 1. Purpose and constraints

This design restores persisted coordinator assignments to the Coordination read path, resolves the production personal inbox fail-closed, and adds a server-gated, read-only DEV preview. It also freezes the bounded desktop/mobile hierarchy and all data states required to test real cases. Following T0, it includes Franco's explicit approval for one narrowly bounded, idempotent data bootstrap in the exact Districorr DEV company.

The implementation must not add or change:

- Prisma models, migrations, seeds, fixtures, or domain data, except for the exact transactional DEV bootstrap defined in §3.2;
- the Auth provider, Auth tokens, session identity, or audit actor;
- dependencies or package manifests;
- coordinator assignment write behavior;
- shared bucket, subgroup, SLA, availability, incident, or next-action rules;
- production personal-inbox subject selection by query string, browser state, or local storage.

The mandatory implementation order is:

1. exact transactional Districorr DEV bootstrap after its dedicated lock and preconditions pass;
2. assignment read projection, DTO, adapter, hydration, and loading states;
3. strict production personal identity resolution;
4. server-only DEV preview capability and validated read endpoint;
5. dedicated read-only preview presentation and bounded hierarchy adjustments.

No later phase may mask a failure in an earlier phase.

---

## 2. Current code and contract evidence

The design is grounded in the current repository, especially:

- `prisma/schema.prisma`: `Surgery.contactAssignments` and `SurgeryContactAssignment` already persist `contactId`, free-string `role`, `isPrimary`, and `createdAt`; `User` has no relation to `Contact`. `ContactCompanyLink` is the existing company boundary.
- `knowledge/specs/SURGERY_DB_PHASE1_SPEC.md`: the canonical surgery assignment role is exactly `"coordinator"`; only one primary per surgery/role is a service-level rule, not a database constraint.
- `src/lib/services/surgery.service.ts`: `surgeryReadSelect` currently omits `contactAssignments`; both list and detail reads use that projection and remain company-scoped.
- `src/app/api/companies/[companyId]/surgeries/route.ts`: the current GET authenticates with `getApiAuthContext`, applies `requireCompanyReadAccess`, then returns the service result.
- `src/lib/api/surgery-adapter.ts`: `SurgeryApiRow` and `mapApiSurgeryRowToSurgery` currently omit coordinator assignments, so hydration cannot set `coordinadorContactId` or a backend coordinator label.
- `src/lib/api/backend-surgeries.ts` and `src/hooks/useBackendActiveSurgeries.ts`: the current backend loader maps the surgery API response into the Zustand surgery representation and exposes `loading`, `ready`, `error`, and `refresh`.
- `src/lib/store.ts`: `replaceSurgeries` replaces the current surgery array; the persisted store initially contains mocks, so Coordination must not derive a true empty state before the backend load is ready.
- `src/types/index.ts`: the client `Surgery` shape already has `coordinadorCx?: string` and `coordinadorContactId?: string`, but no assignment-resolution state.
- `src/components/coordinadores/CoordinatorInboxView.tsx`: the current personal inbox defaults to `Nelson`, accepts `?coord=`, offers `Seleccionar coordinador` and `Ver otros coordinadores`, reads Zustand directly, and exposes multiple mutating surfaces.
- `src/app/coordinadores/page.tsx`: the global panel also reads Zustand directly and exposes management, tracking, surgery, and dialog actions.
- `src/components/coordinadores/coordinator-queue.helpers.ts`: shared bucket, subgroup, SLA, material availability, incident, and sorting derivations already exist and must be reused.
- `src/app/coordinadores/mi-bandeja/page.tsx`: the route is a thin wrapper over `CoordinatorInboxView`; it does not resolve identity or load backend cases itself.
- `src/lib/api/auth-context.ts`: the normal API context can resolve through Supabase Auth or a non-production DEV header. DEV preview must accept only `source === "supabase-auth"` and a non-null `supabaseAuthId`; the DEV-header fallback is not sufficient.
- `src/lib/api/guards.ts`: any active company access currently grants read access; the approved preview therefore needs an additional exact admin gate without changing the general permissions architecture.
- `src/components/auth/AuthProvider.tsx` and `/api/companies/[companyId]/me`: the client receives the real internal user, current company, and company role. These values are display inputs only; preview authorization remains server-side.
- `src/lib/services/remito-dev-preset.service.ts`: there is precedent for an exact server-only DEV company marker (`Districorr DEV`), but its `NODE_ENV` gate is explicitly insufficient for this feature.
- T0 aggregate evidence: the exact Districorr DEV company currently has 21 active surgeries, zero eligible coordinator contacts/links, and zero persisted coordinator assignments. Therefore the former “representative assignments already exist” prerequisite cannot pass without the now-approved bounded DEV bootstrap.
- Franco's 2026-07-16 approval authorizes creating only `Nelson DEV` and `Ezequiel DEV` as exact-company DEV coordinator contacts and assigning 8 surgeries to each while leaving 5 unassigned. It authorizes no production data, schema, migration, generalized seed, fixture import, or assignment-write feature.

---

## 3. Architecture overview

### 3.1 Components

The change introduces three server-side read concerns, one client controller, and one isolated preview presentation boundary; the separately locked DEV bootstrap is defined in §3.2:

1. **Surgery read projection and serializer**
   - selects company-valid coordinator assignments with contact identity fields;
   - emits a stable assignment DTO and deterministic combined-resolution result;
   - is shared by normal surgery reads and the Coordination read facade.

2. **Personal coordinator resolver**
   - receives the real `ApiAuthContext` and current company;
   - resolves a unique active coordinator contact using the temporary normalized match;
   - returns `resolved`, `unresolved`, or `ambiguous`; it never returns a fallback.

3. **Coordination view service and private GET endpoint**
   - resolves production or preview context before listing cases;
   - applies all preview gates and validates selected preview subjects;
   - returns context, an optional server-derived preview allowlist, and company-scoped cases;
   - returns no cases for blocked personal identity states.

4. **Coordination client controller**
   - performs the initial backend request before deriving metrics or empty states;
   - hydrates the existing store through the shared surgery adapter;
   - exposes an explicit UI state machine and immutable `readOnly` mode;
   - renders the existing shared derivations without forking business rules.

5. **Dedicated preview presentation boundary**
   - receives only the read DTO returned by the private Coordination GET endpoint;
   - renders preview personal/global summaries through preview-only components;
   - imports no mutation hooks, mutation dialogs, general surgery/Expediente workspaces, or navigation target that can reach a mutation-capable surface;
   - permits only GET refetches, local filtering, local expansion, and exit back to the real actor's production Coordination entry.

### 3.2 Approved idempotent Districorr DEV bootstrap

The bootstrap is a one-purpose DEV operation, not a seed framework or product write path. It runs server-side only and must satisfy all of these preconditions before its transaction may commit:

1. `OSSUM_DEPLOYMENT_TIER === "dev"`;
2. server-only `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` is present and is the sole company ID accepted by the operation;
3. the loaded active company ID equals that configured ID, its name is exactly `Districorr DEV`, and its active organization slug is exactly `ossum-dev`;
4. the active-surgery ID set for that company equals the 21-ID T0 baseline captured for this bootstrap; a count-only match is insufficient;
5. no surgery, contact, company link, or assignment outside that exact company is selected or writable.

Inside one database transaction, the operation must converge to this exact postcondition:

- exactly two active, non-company DEV contacts labeled `Nelson DEV` and `Ezequiel DEV` are eligible through active exact-company `ContactCompanyLink` rows whose role is exactly `coordinator`;
- the first approved 8 surgery IDs are relationally assigned to `Nelson DEV`, the next approved 8 are relationally assigned to `Ezequiel DEV`, and the remaining approved 5 have no coordinator candidate in either the relational or legacy representation;
- each of the 16 created relational assignments has role exactly `coordinator`; `isPrimary` may be true for the sole relational assignment but does not alter assignment resolution;
- no assignment, link, or contact is created for another company, and no unrelated field or record is changed.

Idempotency is state convergence, not unconditional upsert. A first run may create the two contacts, their exact-company links, and the 16 assignments. A rerun over the exact target state performs no logical change. Duplicate matching contacts, foreign-company links, pre-existing conflicting assignment candidates, a changed active-surgery ID set, unexpected target partition, or any post-write count/mapping mismatch throws inside the transaction and rolls back the complete operation. After the writes and before commit, the operation re-reads and proves exactly `8 / 8 / 5` across all 21 baseline surgeries, exactly two eligible contacts, exactly 16 canonical relational assignments, and zero cross-company effects. There is no schema change, migration, broad seed, repair mode, partial commit, or “best effort” continuation.

### 3.3 End-to-end data flow

```txt
Supabase session + path companyId
  → getApiAuthContext(request, companyId)
  → active company access check
  → production personal resolver OR complete DEV preview gate
  → trusted server view subject (contactId or global)
  → listSurgeriesByCompany(companyId, trusted coordinator filter when personal)
  → surgery read select includes role="coordinator" assignments and contacts
  → company-link validation + assignment DTO serializer
  → private/no-store CoordinationViewResponse
  → shared surgery adapter
  → Surgery.coordinadorContactId + Surgery.coordinadorCx + assignment state
  → production: replaceSurgeries → existing coordinator queue helpers → personal/global UI
  → preview: dedicated read-only controller → pure shared derivations → preview-only presentation boundary
```

For production personal and preview-personal reads, the server-derived contact ID is the filter authority. The client-supplied preview contact ID is only a lookup request and becomes trusted only after allowlist validation. Production personal reads never accept a client subject.

---

## 4. Assignment read contract

### 4.1 Service projection

`surgeryReadSelect` must add `contactAssignments` with only the fields required by the read model:

```ts
type SelectedCoordinatorAssignment = {
  id: string;
  contactId: string;
  role: string;
  isPrimary: boolean;
  createdAt: Date;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    legalName: string | null;
    email: string | null;
    isCompany: boolean;
    isActive: boolean;
    companyLinks: Array<{
      companyId: string;
      role: string | null;
      isActive: boolean;
    }>;
  };
};
```

Selection rules:

- assignment `role` must equal the canonical value `"coordinator"` exactly;
- the nested contact must be active and non-company;
- the contact must have an active `ContactCompanyLink` for the surgery's exact `companyId` with link role exactly `"coordinator"`;
- no assignment from another company is serialized, even if bad historical data references it;
- no missing assignment is synthesized and no record is written or repaired.

The parent surgery query remains constrained by `where.companyId` and `archivedAt: null`. Personal inclusion must use the same combined candidate resolver as serialization. A relational database predicate may narrow work only when it cannot discard a legacy-only match; otherwise the trusted Coordination service loads the company-scoped active set, resolves the relational-plus-legacy union server-side, and retains only singular matches to the trusted contact ID. The public query parser must not expose this trusted filter as a production personal subject override.

### 4.2 DTO

The shared serializer emits:

```ts
type CoordinatorAssignmentDto = {
  assignmentId: string;
  contactId: string;
  label: string;
  isPrimary: boolean;
  createdAt: string; // ISO datetime
};

type CoordinatorAssignmentResolutionDto =
  | { status: "none"; resolved: null }
  | { status: "resolved"; resolved: { contactId: string; label: string } }
  | { status: "ambiguous"; resolved: null };

type SurgeryReadDto = {
  // existing surgery fields
  coordinatorAssignments: CoordinatorAssignmentDto[];
  coordinatorAssignment: CoordinatorAssignmentResolutionDto;
};
```

`label` is derived as `legalName`, otherwise trimmed `firstName + lastName`. Contact ID eligibility does not depend on a non-empty label: an eligible assignment with an empty label remains a candidate in the exact-ID union. The empty label is surfaced as a data anomaly in focused tests/logging and receives generic non-identifying presentation copy; it never becomes an identity key.

### 4.3 Deterministic combined assignment resolution

Resolution first forms the union of:

- every eligible relational coordinator assignment `contactId`; and
- the non-empty legacy `coordinatorContactId` already carried by the existing surgery representation.

Exact equal IDs are deduplicated before cardinality is evaluated. Relational DTOs may be sorted for stable serialization by:

1. `isPrimary` descending;
2. `createdAt` ascending;
3. `assignmentId` ascending.

Combined resolution is fail-closed:

- zero unique candidate contact IDs → `none`;
- exactly one unique candidate contact ID → `resolved`, whether it came from relational data, the legacy field, or both;
- more than one unique candidate contact ID → `ambiguous`.

`isPrimary` is serialization/diagnostic metadata only. It never selects among distinct contact IDs and cannot turn a `>1` union into `resolved`. Source precedence, array order, label, and first-row behavior are equally forbidden. The sorted relational collection exists for deterministic serialization and diagnostics, not to bypass ambiguity.

### 4.4 Adapter and client hydration

The shared adapter maps only a singular resolved candidate:

```ts
type SurgeryCoordinatorClientFields = {
  coordinadorContactId?: string;
  coordinadorCx?: string;
  coordinatorAssignmentState: "none" | "resolved" | "ambiguous";
  coordinatorAssignments: Array<{
    contactId: string;
    label: string;
    isPrimary: boolean;
  }>;
};
```

- `resolved` sets `coordinadorContactId` to the sole union ID and sets `coordinadorCx` from its eligible relational DTO label when available, otherwise from the already-associated legacy display value without using that label as identity;
- `none` clears backend-derived coordinator fields and displays `Sin asignar` through the existing helper layer;
- `ambiguous` clears the singular fields, retains the collection for diagnostics, and displays `Asignación ambigua` in the global read surface;
- an existing local/mock coordinator value must not override a backend `none` or `ambiguous` result after backend hydration.

Personal filtering compares `coordinadorContactId`, never the display label. Labels are presentation only. This prevents duplicate names from merging inboxes.

---

## 5. Temporary production personal identity resolver

### 5.1 Eligible coordinator contacts

The candidate set is queried server-side and contains distinct contacts satisfying all conditions:

- requested company equals `ctx.companyId`;
- `Company.isActive === true`;
- the real `User` and its `UserCompanyAccess` are active;
- `Contact.isActive === true` and `Contact.isCompany === false`;
- an active `ContactCompanyLink` exists for that exact company;
- `ContactCompanyLink.role === "coordinator"` exactly;
- the contact has a usable normalized email or usable normalized display name.

Contact groups such as the prototype label `coordinadores` are not authority for this resolver. They may remain UI categorization, but the backend company link and canonical role define eligibility.

### 5.2 Normalization

Two independent keys are computed:

```ts
function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es-AR")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeIdentityEmail(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}
```

Name inputs are:

- user: trimmed `firstName + lastName`;
- contact: `legalName` when present, otherwise trimmed `firstName + lastName`.

No first-name-only, phone, document, substring, fuzzy, or accent-sensitive fallback is permitted.

### 5.3 Matching and result

A contact is a match when at least one non-empty key matches:

- normalized user email equals normalized contact email; or
- normalized user full name equals normalized contact display name.

Matches are deduplicated by `contactId` before cardinality is evaluated. The union is deliberate: if email identifies one contact while name identifies another, the result is ambiguous rather than silently preferring one signal.

```ts
type PersonalCoordinatorResolution =
  | {
      status: "resolved";
      subject: { contactId: string; label: string };
    }
  | {
      status: "unresolved";
      subject: null;
      reason: "identity_incomplete" | "no_match";
    }
  | {
      status: "ambiguous";
      subject: null;
      reason: "multiple_matches";
    };
```

Only `resolved` permits a personal case query. `unresolved` and `ambiguous` return an empty case array and non-disclosing blocked UI state. Candidate IDs, candidate count, and emails are not returned.

There is no `Nelson`, first-result, current Zustand user, query parameter, or local-storage fallback.

---

## 6. Server-only DEV preview capability

### 6.1 Exact gate

Preview is available only when every condition below is true on every preview request:

1. server-only `OSSUM_DEPLOYMENT_TIER` equals exactly `dev`;
2. server-only `OSSUM_ENABLE_COORDINATION_DEV_PREVIEW` equals exactly `true`;
3. server-only `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` is non-empty and is the sole ID allowlist: it must equal the route company ID, `ctx.companyId`, and the loaded database `Company.id` exactly;
4. the active database company has that exact ID, `isActive === true`, name exactly `Districorr DEV`, and belongs to the active organization with slug exactly `ossum-dev`;
5. `getApiAuthContext` resolved a real Supabase session: `ctx.source === "supabase-auth"` and `ctx.supabaseAuthId !== null`;
6. the internal user is active and has an active `UserCompanyAccess` for that exact company;
7. the access role equals exactly `admin` for this phase.

The server-only configured company ID is mandatory authority and is never supplied, overridden, or completed by the client. The exact database name plus organization slug are additional markers, not substitutes for the ID gate. A company with a copied name/slug or a request with the right name but a different ID remains denied.

Missing, blank, malformed, differently cased, unknown, or contradictory values deny preview. `NODE_ENV`, `NEXT_PUBLIC_*`, browser state, URL visibility, hidden controls, and client role checks are never capability inputs. The existing DEV-header Auth fallback is always denied for preview.

The normal production personal/global behavior does not depend on these variables. Production deployment tier must deny every request carrying preview intent even if the flag and client parameters are present.

### 6.2 Server-derived target allowlist

After the complete capability gate succeeds, the server derives preview targets from the same eligible coordinator-contact query used by the personal resolver, but without matching the actor identity.

```ts
type PreviewTarget = {
  contactId: string;
  label: string;
};
```

Targets are deduplicated by `contactId` and sorted by normalized label, then `contactId`. The response contains no user ID, Supabase ID, role details, email, phone, or cross-company contact.

The selected target is sent as `subjectContactId`. The server must find an exact ID in the just-derived allowlist. Unknown, inactive, ineligible, malformed, stale, and other-company IDs receive the same non-disclosing rejection. Labels are never accepted as selection keys.

### 6.3 Identity and authorization invariants

Preview changes only `viewSubject`:

```txt
actorUserId       = real internal User.id, unchanged
supabaseAuthId    = real Supabase user.id, unchanged
session/token     = real session, unchanged
companyId         = actor's active allowed company, unchanged
role/permissions  = real actor access, unchanged
audit actor       = real actor if a normal non-preview action occurs elsewhere
viewSubject       = validated coordinator Contact.id, preview read only
```

No impersonated session, synthetic token, user switch, server persistence, domain write, preference write, or audit rewrite is created.

---

## 7. API contract

### 7.1 Endpoint

```http
GET /api/companies/{companyId}/coordination/view
```

Query contract:

```txt
surface=personal|global          required
preview=true                     optional; absence means production behavior
subjectContactId=<contact-id>    required only for preview personal
```

Combinations:

| Surface | Preview | Subject | Meaning |
| --- | --- | --- | --- |
| `personal` | absent | forbidden | Resolve the real actor's personal coordinator server-side. |
| `global` | absent | forbidden | Existing production multi-coordinator view under existing read permissions. |
| `personal` | `true` | required | Read-only DEV preview of one allowlisted coordinator contact. |
| `global` | `true` | forbidden | Read-only DEV preview framing of the global panel. |

Unknown parameters, duplicate subject values, empty IDs, `preview=false`, and invalid combinations receive `400 invalid_coordination_view_request`. Production personal subject overrides are rejected rather than ignored.

### 7.2 Response

```ts
type CoordinationViewResponse = {
  context: {
    mode: "production" | "dev-preview";
    surface: "personal" | "global";
    readOnly: boolean;
    actor: {
      userId: string;
      label: string;
    };
    personalResolution:
      | PersonalCoordinatorResolution
      | null; // null for global
    viewSubject:
      | { contactId: string; label: string }
      | null; // null for global or blocked personal
  };
  previewCapability?: {
    enabled: true;
    targets: PreviewTarget[];
  };
  surgeries: SurgeryReadDto[];
};
```

`previewCapability` is included only after the full server gate succeeds. Its absence is not a client-authoritative denial reason and must not produce diagnostic detail.

Behavior:

- resolved production personal: `readOnly: false`, trusted personal contact filter, matching surgeries only;
- unresolved/ambiguous production personal: HTTP 200 with explicit resolution and `surgeries: []`;
- production global: current company surgeries with coordinator assignment DTOs; normal existing permissions remain in force;
- preview personal: `mode: "dev-preview"`, `readOnly: true`, validated target and target-filtered surgeries;
- preview global: `mode: "dev-preview"`, `readOnly: true`, company surgeries and allowlisted targets;
- every surgery remains constrained to the authenticated company.

### 7.3 Status and failure semantics

| Status | Code | Use |
| --- | --- | --- |
| 200 | n/a | Successful view or explicit personal `unresolved`/`ambiguous` state. |
| 400 | `invalid_coordination_view_request` | Malformed/contradictory query contract. |
| 401 | existing Auth code | Missing, invalid, or expired real session. |
| 403 | `coordination_preview_denied` | Any preview capability gate fails. The response does not identify which gate. |
| 404 | `coordination_preview_target_not_found` | Capability is valid but target is unknown/ineligible/stale/wrong-company. |
| 500 | `coordination_view_failed` | Unexpected read failure with generic user-safe copy. |

Cross-company target and unknown target are intentionally indistinguishable. A blocked personal match is not an authorization error and therefore remains a typed 200 state.

### 7.4 Cache and method policy

Every success and error response from this endpoint must include:

```http
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
Vary: Authorization
```

The route exports GET only. POST, PUT, PATCH, and DELETE are unsupported and must return 405 through the route/framework contract. Responses must not be statically generated or shared by CDN/server caches.

### 7.5 Client contract

The Coordination client uses a dedicated fetcher/controller and the shared surgery adapter. Production Coordination may use the existing store replacement; DEV preview keeps its immutable read model inside the dedicated preview boundary and must not hydrate a mutation-capable global surface. It must:

- wait for the real Auth/company context before the request;
- never send a subject for production personal mode;
- send only a selected server-returned `contactId` for preview personal mode;
- refetch the full server view when surface or preview target changes;
- replace production store surgeries, or replace preview-boundary local rows, only after a successful response;
- leave rendered data intact during refresh;
- clear personal cases immediately when context becomes blocked, company changes, preview is denied, or target validation fails;
- never persist mode or subject in local storage, cookies, server preferences, domain data, or query-driven production state.

An in-memory preview selection may live for the mounted page only. Reload begins from server-issued capability and production personal context; it does not silently restore a prior preview subject.

---

## 8. Read-only enforcement

### 8.1 UI enforcement

When `context.readOnly === true`, both personal preview and global preview cross into a dedicated presentation boundary rather than conditionally reusing a mutation-capable component tree:

- preview entry mounts a preview-only root and preview-only case rows;
- the preview root and every descendant must not import, instantiate, render, or dynamically reach `useCirugiaActions`, mutation handlers, `Gestionar`, `Abrir seguimiento`, status/date changes, suspend, cancel, authorize, prepare, logistics changes, notes, evidence upload/import, mail, share, invoice, bulk, or assignment actions;
- the boundary must not mount mutation dialogs, `ExpedienteFullView`, general surgery workspaces, or links/router actions to any mutation-capable route or screen;
- allowed interactions are limited to GET-backed subject/surface refresh, local-only filters, local section expansion, static summary inspection, and exit to the real actor's production Coordination entry;
- preview DTOs and component props expose no mutation callback, mutation URL, writable form model, or action capability.

Disabled controls must not be the sole protection. Prefer absence; a disabled explanatory affordance is acceptable only when needed for clarity and has no handler.

Production personal and global surfaces keep their existing actions under existing permissions. This design does not broaden or redesign those permissions.

### 8.2 Server and navigation boundary

The preview API boundary exports only the private Coordination GET contract. It returns no action manifest or mutation target. Preview parameters and `subjectContactId` are parsed only by that GET boundary and never by domain mutation services.

This design deliberately does not attempt an incomplete mutation-route manifest or a client-supplied preview marker across unrelated write endpoints. Normal mutation routes retain their normal authorization for the real actor, but the preview presentation graph has no control, callback, URL, router transition, dialog, nested workspace, or API client through which those routes can be reached. Static import-graph tests, component tests, and browser network evidence must prove this closed presentation graph.

If the dedicated graph imports or can navigate to any mutation-capable surface, or if it emits any non-GET request, stop rather than adding selected route guards and claiming partial coverage.

---

## 9. Trust boundaries and security invariants

### Boundary A — browser to Coordination endpoint

Untrusted: path company ID, query values, subject contact ID, browser role, and preview intent.  
Trusted only after: Supabase token validation, active internal user/access resolution, exact company equality, and server gate evaluation.

### Boundary B — Auth user to coordinator contact

There is no schema relation. The normalized match is temporary and produces a subject only at cardinality one. Zero or multiple candidates expose no cases.

### Boundary C — assignment relation to client

Only assignments with canonical role and active same-company contact link are serialized. Personal ownership uses contact ID; labels never authorize or filter ownership.

### Boundary D — preview actor versus view subject

The actor remains the Auth user. The contact is only a read filter. No user, role, permission, token, or audit field is copied from the contact.

### Boundary E — store and local UI

Zustand is a production hydration/cache surface, not identity or authorization authority. Preview rows remain scoped to the dedicated presentation boundary rather than being published into a mutation-capable global surface. A browser-edited store cannot obtain a server response for an unallowlisted target. Blocked context clears personal cases before rendering.

Security invariants:

1. every database query includes the exact authenticated company;
2. production personal subject is server-derived only;
3. preview subject is server-allowlisted and revalidated per request;
4. preview capability is absent in production and unavailable through DEV-header Auth;
5. ambiguous identity or assignment never selects the first row;
6. preview grants no mutation method or alternate actor, and its dedicated presentation graph cannot reach a mutation-capable surface;
7. error messages never disclose configured company IDs, gate values, candidate identities, or other-company existence.

---

## 10. UI state machine

### 10.1 States

```ts
type CoordinationUiState =
  | { tag: "waiting-auth" }
  | { tag: "loading-initial" }
  | { tag: "blocked-unresolved" }
  | { tag: "blocked-ambiguous" }
  | { tag: "ready-empty" }
  | { tag: "ready-filtered-empty" }
  | { tag: "ready-populated" }
  | { tag: "refreshing"; previous: "empty" | "populated" }
  | { tag: "error-initial" }
  | { tag: "error-refresh"; previous: "empty" | "populated" }
  | { tag: "preview-denied" };
```

### 10.2 Transitions

```txt
waiting-auth
  → loading-initial when real user + active company are ready
  → error-initial if company resolution finishes without an active company

loading-initial
  → blocked-unresolved | blocked-ambiguous from typed personal resolution
  → ready-empty when load succeeds and unfiltered case count is zero
  → ready-populated when load succeeds and cases exist
  → error-initial on request failure

ready-*
  → refreshing on retry/manual refresh/same-context revalidation
  → ready-filtered-empty only when unfiltered cases exist but active filters yield zero
  → preview-denied when a preview capability/target becomes stale or invalid

refreshing
  → ready-* on success, preserving previous rows until replacement
  → error-refresh on failure, preserving previous rows with retry

company, actor, mode, or subject change
  → loading-initial after clearing data from the prior trust context
```

### 10.3 Spanish visible copy

| State | Required visible behavior/copy |
| --- | --- |
| Initial loading | `Cargando tu bandeja…` or `Cargando panel global…`; skeletons, no zero metrics, no empty message. |
| Refresh | Keep rows and metrics; inline `Actualizando…`; set `aria-busy=true`. |
| Initial backend error | `No pudimos cargar la bandeja.` plus `Reintentar`. |
| Refresh error | `No pudimos actualizar. Seguís viendo la última información cargada.` plus `Reintentar`. |
| Unresolved | `No pudimos vincular tu usuario con un coordinador activo.` and `Contactá a un administrador para revisar la vinculación.` |
| Ambiguous | `Encontramos más de un coordinador posible para tu usuario.` and the same administrator guidance. |
| True empty | `No tenés casos asignados en esta etapa.` No filter-clearing suggestion. |
| Filtered empty | `No hay casos con estos filtros.` plus `Limpiar filtros`. |
| Stale/denied preview | `La vista de prueba ya no está disponible.` Clear preview cases and offer `Volver a mi bandeja`. |

Blocked and error copy must not show contact IDs, company IDs, candidate names, environment values, or security-gate reasons.

---

## 11. UI hierarchy and behavior

### 11.1 Production personal inbox

Header:

- title `Mi bandeja de coordinación`;
- fixed resolved identity `{label} · Coordinador CX`;
- `Vista personal` marker;
- link `Panel global` only under its existing permission behavior;
- no coordinator selector, `?coord` behavior, `Ver otros coordinadores`, or label-based override.

Body order:

1. compact metrics: `Pendientes`, `SLA vencido`, `Sin disponibilidad`, `En tránsito`;
2. mobile-scrollable quick filters: `Mi bandeja`, `Vence hoy`, `Vencidas`, `Sin fecha`;
3. search and status in progressive disclosure on constrained widths;
4. `Requieren coordinación`;
5. `Programadas / preparadas`;
6. `En tránsito`;
7. `Finalizadas recientes`, collapsed by default on mobile.

Metrics use neutral treatment at zero and alert emphasis only when nonzero. A surgery appears once, with existing incident badges indicating multiple reasons.

### 11.2 DEV preview

Only a server response containing `previewCapability.enabled === true` may render preview controls.

Visible banner, persistent above results:

```txt
Vista de prueba DEV · Solo lectura
Sesión real: {actor label}
Bandeja visualizada: {subject label}    // personal preview
Panel global                            // global preview
```

Controls:

- selector label `Probar bandeja de` with options keyed by `contactId`;
- switch/link between `Bandeja del coordinador` and `Panel global`;
- `Volver a mi bandeja` first tears down all preview state and the dedicated boundary, then enters the real actor's production personal context;
- no preview control renders when capability is absent.

Changing the selector triggers a server refetch and displays a loading transition; it does not locally filter an already downloaded global data set.

### 11.3 Global panel

`/coordinadores` remains the production multi-coordinator surface under existing read and action permissions. Its coordinator filter remains a global-panel filter, not a personal-identity selector.

Preview global is rendered by the dedicated preview-only boundary, not by conditionally hiding controls inside the production global component tree. Its visible differences remain the persistent DEV banner and complete absence of mutation affordances, while existing pure bucket, workload summary, and shared case derivations remain unchanged.

### 11.4 Responsive constraints

- Desktop uses a flatter, wider content area; avoid nested card-on-card framing around every hierarchy level.
- At `412x915`, the first real case row must begin no later than the second viewport for representative populated content.
- Quick filters remain one horizontal usable strip; secondary search/status controls collapse behind `Más filtros` when needed.
- Touch targets remain at least 40 CSS pixels high.
- One surgery equals one row/card across all groups.
- Preview banner remains visible without consuming a full viewport.

This is a bounded hierarchy adjustment, not a broad redesign of Cirugías, Expediente, navigation, or shared components.

---

## 12. Failure behavior

- Missing persisted assignment: show the surgery as unassigned in global view; do not create or infer an assignment.
- Ambiguous persisted coordinator assignment: do not place the surgery in a personal inbox; show `Asignación ambigua` in global read context.
- Resolver unresolved/ambiguous: no case query for a personal subject and no case hydration.
- Initial case load failure: do not derive counts or empty states from mock/persisted Zustand content.
- Refresh failure: preserve last successful same-context rows and identify them as stale.
- Company/actor/subject change: discard prior-context rows before displaying the next context.
- Preview gate failure: generic 403, no allowlist, no preview UI.
- Preview target failure: generic 404, clear preview data, return to safe production personal entry.
- Capability revoked after page load: the next selector, refresh, or view request fails closed; UI removes preview controls and data.
- Approved DEV bootstrap mismatch: roll back the complete transaction and stop; do not partially create, repair, broaden, or repartition data.

---

## 13. Validation strategy

### 13.1 Unit tests

**Assignment serializer/adapter**

- relational-only, legacy-only, equal relational-plus-legacy, and conflicting relational-plus-legacy cases;
- zero/one/multiple distinct candidate IDs, proving `isPrimary` never chooses among distinct IDs;
- stable sort by primary, timestamp, and assignment ID;
- contact ID and label survive service DTO → adapter → client surgery;
- wrong-company/inactive/non-coordinator links are excluded;
- backend `none`/`ambiguous` cannot revive local mock labels;
- duplicate labels remain distinct by contact ID.

**Personal resolver**

- exact normalized email match;
- full-name match with accents, case, and repeated whitespace normalized;
- no first-name, fuzzy, phone, or substring match;
- union conflict between email and name produces `ambiguous`;
- zero and duplicate candidates produce blocked results;
- inactive user/access/company/contact/link and wrong-company contacts are excluded;
- no source contains or returns `Nelson` as a fallback.

**Preview capability**

- table-driven deny cases for missing/wrong tier, flag, configured ID, route ID, company name, organization slug, company active state, Auth source, Supabase ID, user/access active state, and exact role;
- only the complete `dev` + flag + exact ID/marker + Supabase `admin` combination allows;
- DEV-header context, `super_admin`, `owner`, `manager`, `coordinator`, and all unknown roles deny in this phase;
- allowlist contains only active exact-company coordinator contacts and is deterministically sorted.

**DEV bootstrap**

- every wrong/missing tier, configured ID, company ID/name, organization slug, active-surgery baseline, contact/link state, or assignment precondition rolls back with zero committed change;
- first run converges to exactly two eligible DEV contacts, `8 / 8 / 5` surgery distribution, and 16 canonical relational assignments;
- second run is a no-op with the same postcondition;
- a conflicting candidate, duplicate contact, changed 21-ID set, post-write mismatch, or simulated exception rolls back contacts, links, and assignments together;
- no schema API, migration, production company, foreign company, or unrelated record is touched.

### 13.2 Route and service tests

- production personal rejects any subject parameter;
- resolved personal returns only surgeries assigned to that contact ID;
- unresolved/ambiguous personal returns 200 plus zero surgeries;
- production global preserves existing company read behavior;
- preview personal requires a validated allowlist ID;
- preview global rejects a subject ID;
- cross-company and unknown targets are non-disclosing and return no data;
- all success/error responses are private/no-store;
- unsupported methods cannot call services;
- query/service predicates always include authenticated `companyId`;
- no audit, preference, assignment, or domain write is called.

### 13.3 Component/controller tests

- direct navigation starts loading and never flashes zero counts/true empty;
- backend error differs from true empty and filtered empty;
- retry and clear-filter actions call only their intended handlers;
- production personal renders a fixed owner and no selector/query override;
- unresolved and ambiguous states render no case rows;
- preview controls render only from server-issued capability;
- selector options use contact IDs and refetch rather than local global filtering;
- preview banner shows real actor and viewed subject distinctly;
- every mutation control/dialog is absent in preview personal and preview global;
- refresh preserves old rows; context changes clear old rows.

### 13.4 Dedicated preview-boundary negative tests

For the complete dedicated preview component/import/navigation graph, verify:

- no mutation hook, dialog, general surgery/Expediente workspace, mutation API client, writable form, or mutation-capable route target is imported or dynamically referenced;
- preview row inspection remains inside the static bounded summary;
- every preview interaction emits GET only;
- preview target/contact ID is accepted only as the private GET read filter and never as actor identity;
- database spies observe no write and no audit event from preview interactions.

### 13.5 Browser QA

Run authenticated QA in the exact Districorr DEV company after automated denial tests:

- desktop and `412x915` production personal resolved inbox;
- unresolved and ambiguous identity fixtures through mocks/test doubles only, not data writes;
- at least two allowlisted coordinator preview targets with representative persisted assignments;
- read-only preview global panel;
- loading, refresh, initial error, refresh error, true empty, filtered empty, stale target, and revoked capability;
- keyboard navigation, focus visibility, `aria-busy`, selector labeling, and horizontal quick-filter usability;
- first populated result no later than the second mobile viewport.

### 13.6 Regression and diff audit

- existing coordinator bucket/subgroup/SLA/material/incident/next-action tests remain green;
- existing production global-panel behavior remains unchanged outside loading and assignment correctness;
- TypeScript, focused tests, lint/build as applicable;
- final diff contains no schema, migration, generalized seed/fixture, Auth provider, package, lockfile, production selector, or data write outside the exact approved DEV bootstrap.

---

## 14. Ownership and serialization

This change crosses sensitive shared files and must be serialized. One active owner holds one chain at a time.

### Work package A0 — exact DEV bootstrap

Own one dedicated server-only bootstrap script/service and its focused tests. It may write only the two approved DEV contacts, their exact-company coordinator links, and the 16 approved assignments inside one transaction. It must not share a writer lock with the read-path, API, or UI packages. Exit before A: first-run, rerun, mismatch rollback, exact ID gate, `8 / 8 / 5`, and no-schema/no-foreign-write tests pass.

### Work package A — assignment read path

Own together:

- `src/lib/services/surgery.service.ts`;
- shared surgery DTO/serializer location;
- `src/lib/api/surgery-adapter.ts`;
- `src/lib/api/backend-surgeries.ts` or its Coordination reuse;
- `src/hooks/useBackendActiveSurgeries.ts` or dedicated Coordination controller;
- `src/types/index.ts` and `src/lib/store.ts` only for the minimal read shape/hydration;
- focused service/adapter/hook tests.

Exit before B: representative persisted assignments survive end to end and loading/error states are trustworthy.

### Work package B — context and endpoint

Own together:

- new personal resolver and preview capability service;
- new private Coordination route/fetch contract;
- route/service tests;
- dedicated GET-only preview DTO with no mutation capabilities or route targets.

Do not edit Auth provider behavior or schema. Exit before C: complete allow/deny and cross-company matrices pass.

### Work package C — UI

Own together and serialize because both consume shared Coordination logic:

- `src/components/coordinadores/CoordinatorInboxView.tsx`;
- `src/app/coordinadores/mi-bandeja/page.tsx`;
- `src/app/coordinadores/page.tsx`;
- minimal coordinator components/helpers and focused component tests.

Preview UI must be a separate import/navigation graph, not a read-only flag threaded through the existing mutation-capable graph.

No concurrent writer may edit `src/lib/store.ts`, `src/types/index.ts`, the surgery service/adapter chain, either Coordination page, or shared Cirugías hooks during these packages. Locks progress through `reserved → editing → review → released`. Stop on overlap.

---

## 15. Rollout and rollback

### Rollout

1. Run the approved bootstrap only in the exact gated Districorr DEV company; require transactional `8 / 8 / 5` verification and retain rollback-on-mismatch.
2. Merge assignment projection/DTO/adapter/loading with preview flag absent and validate the bootstrapped assignments through the read path.
3. Deploy strict personal resolution and blocked states. Production personal must have no client subject selector.
4. Deploy preview code with `OSSUM_ENABLE_COORDINATION_DEV_PREVIEW` absent/off.
5. Run the full denial matrix in the DEV deployment.
6. Configure exact server-only tier, flag, and DEV company ID; verify database name/organization marker and real Supabase admin session.
7. Exercise multiple personal previews and the global preview at desktop and mobile widths.
8. Deploy production with strict personal/read-state improvements only; preview remains denied and no preview UI renders.

### Rollback

- Immediate preview rollback: remove/disable `OSSUM_ENABLE_COORDINATION_DEV_PREVIEW`; no data repair is required.
- Bootstrap rollback: any mismatch rolls back before commit. After an accepted commit, cleanup or reassignment is a separate human-approved data task; this design provides no destructive rollback command.
- Assignment read rollback: revert projection/adapter changes only if they cause a read regression; do not delete assignments.
- Personal resolution incident: keep fail-closed blocked behavior and correct the resolver in a reviewed follow-up. Never restore Nelson, first-match, or client-selection fallbacks.
- UI hierarchy rollback may revert presentation while retaining corrected assignment, identity, security, and state contracts.

---

## 16. Alternatives rejected

1. **Auth impersonation or token substitution** — rejected because it changes actor identity, audit meaning, and security boundaries.
2. **Stable User-to-Contact schema relation now** — rejected because this approved change is no-schema and no-migration.
3. **Client `NODE_ENV`, `NEXT_PUBLIC_*`, hidden controls, or client role checks** — rejected as forgeable/visible and unreliable under production-mode DEV servers.
4. **Existing DEV actor header for preview** — rejected because preview requires a real Supabase-authenticated administrator.
5. **Company name alone** — rejected because another tenant could share a name; exact configured company ID plus DEV database marker is required.
6. **Coordinator label as identity/filter key** — rejected because labels can collide or change; contact ID is the ownership key.
7. **Nelson/default/first/fuzzy match** — rejected because it can expose another person's cases.
8. **Email-first silent preference over a conflicting name match** — rejected; conflicting unique signals are ambiguous and block.
9. **Contact-group-only eligibility** — rejected because prototype groups are not the canonical company access/role relation.
10. **Download all company surgeries and locally switch personal subjects** — rejected because manipulated client state could bypass strict personal semantics; personal case filtering is server-derived.
11. **Conditional read-only mode inside the existing mutation-capable tree** — rejected because hidden handlers, dialogs, and navigation remain reachable. The accepted boundary is a dedicated preview-only presentation graph consuming a GET-only DTO.
12. **Incomplete mutation-route manifest plus preview request marker** — rejected because it creates a false completeness claim and can become stale as routes evolve. Preview instead cannot render or reach mutation-capable routes/actions at all.
13. **Persist preview selection** — rejected because preview is temporary view context, not user preference or domain state.
14. **Fork coordinator bucket/SLA rules for preview** — rejected because preview must represent the same production derivations.

---

## 17. Stop and escalation conditions

Stop and return to Franco/SDD review if:

- DEV data work exceeds the explicitly approved two contacts, two exact-company links, 16 canonical assignments, and `8 / 8 / 5` baseline partition;
- the exact 21 active-surgery ID baseline or any bootstrap pre/postcondition mismatches, or the operation cannot be atomic and rollback-on-mismatch;
- exact canonical assignment/contact roles in real data contradict `"coordinator"` and cannot be reconciled without a business decision;
- unique normalized matching cannot operate without adding fuzzy or invented identity rules;
- preview requires Auth impersonation, provider changes, a new dependency, or permission-architecture redesign;
- preview cannot be denied independently of `NODE_ENV` and client state;
- any rendered preview path can import, render, navigate to, or call a mutation-capable dialog, route, action, hook, or workspace;
- company isolation cannot be proven for actor, subject, assignments, surgeries, and global view;
- implementation would alter assignment writes, audit attribution, bucket/SLA rules, or unrelated Cirugías behavior;
- a sensitive-file ownership overlap appears.

All stop conditions fail closed.

---

## 18. Design decision

Proceed with a server-derived Coordination view contract. Persisted coordinator assignments travel as contact ID plus label through the service projection, stable DTO, shared adapter, and client hydration. Assignment ownership is the exact-ID union of eligible relational candidates and legacy `coordinatorContactId`: zero is unassigned, one resolves, and more than one is ambiguous; `isPrimary` never selects among distinct IDs. Production personal identity uses the temporary exact normalized union match and blocks on zero or multiple candidates. DEV preview is available only to a real Supabase-authenticated `admin` in the exact active Districorr DEV company under an explicit server deployment tier, feature flag, and exact server-only company ID. It remains fully read-only with the real actor unchanged because it renders through a dedicated GET-only presentation boundary that cannot reach mutation-capable surfaces.

The only permitted data write is Franco's approved atomic, idempotent Districorr DEV bootstrap for `Nelson DEV`, `Ezequiel DEV`, and the exact `8 / 8 / 5` distribution among the T0-baselined 21 active surgeries. No schema, migration, Auth provider change, dependency, production data write, generalized seed/repair path, or production personal selector is required or permitted.
