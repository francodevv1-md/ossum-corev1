# SPEC — COORDINATION-DEV-PREVIEW-001

Status: **specified; amended after T0 and explicit DEV-data approval**
Change: `COORDINATION-DEV-PREVIEW-001`
Language: English; visible UI examples are Spanish
Source: approved `PROPOSAL.md` dated 2026-07-16, T0 evidence, and Franco's explicit 2026-07-16 approval for the bounded Districorr DEV bootstrap specified below
Artifact chain: PROPOSAL → DESIGN → **SPEC** → TASKS → APPLY

---

## 1. Purpose and ordering

This specification makes Coordination trustworthy and testable by separating two contracts:

1. **Read-path correctness:** persisted coordinator assignments, backend loading, personal resolution, global-panel behavior, and explicit data states.
2. **DEV preview capability:** an additional, server-authorized, read-only way for an eligible administrator to choose a view subject without changing the authenticated actor.

Read-path correctness is mandatory independently of preview. Preview MUST NOT compensate for missing assignments, incomplete loading, unsafe personal identity resolution, or incorrect global-panel behavior. Assignment projection, mapping, hydration, and loading/error behavior MUST be validated before preview can be enabled.

The implementation order SHALL be:

1. the one-time bounded bootstrap in §4.3, with exact transactional 2/8/8/5 evidence;
2. assignment read path and load-state correctness;
3. strict production personal context;
4. server-gated DEV preview capability and server-side read-only enforcement;
5. preview UI and responsive hierarchy refinement.

Failure of an earlier stage SHALL block enablement of every dependent stage.

## 2. Scope boundaries

Except for the bounded DEV-only bootstrap in §4.3, this change MUST NOT:

- modify `prisma/schema.prisma`, create or run a migration, generate a general seed, import fixtures, backfill production data, repair arbitrary assignments, or perform database normalization;
- add, remove, or upgrade a dependency;
- create a stable `User` ↔ coordinator `Contact` relation;
- impersonate Supabase Auth, substitute tokens, create a synthetic login, switch the authenticated actor, redesign roles, or change the Auth provider;
- add a production coordinator selector, query-string override, local-storage override, hidden override, default coordinator, first-match behavior, or `Nelson` fallback;
- change assignment-write semantics, coordinator bucket rules, subgroup rules, SLA rules, availability rules, incident rules, next-action rules, CX/preparation transitions, or unrelated Cirugías behavior;
- introduce a domain write, preference write, or persisted preview selection from preview mode; or
- use Zustand, browser state, URL parameters, `NODE_ENV`, `NEXT_PUBLIC_*`, hidden controls, or client role checks as authority for identity, company scope, preview eligibility, or read-only enforcement.

T0 established that the exact Districorr DEV company contains 21 active surgeries, zero eligible coordinator contacts, and zero coordinator assignments. Franco subsequently approved only the deterministic bootstrap in §4.3: two DEV coordinator contacts, eight assignments to each coordinator, and five surgeries left unassigned. No other data creation, repair, import, normalization, or assignment write is authorized.

## 3. Terminology and result states

- **Actor:** the real user from the authenticated Supabase-backed server session.
- **Current company:** the company selected through the normal authenticated company-access path.
- **View subject:** the coordinator contact whose personal inbox is being read.
- **Personal inbox:** `Mi bandeja`, filtered to exactly one resolved view subject.
- **Global panel:** `Panel global`, the permission-governed cross-coordinator company view.
- **Preview:** the DEV-only capability that changes the read-only view subject while preserving the actor.
- **Eligible coordinator:** an active coordinator contact in the current company satisfying the existing approved coordinator eligibility criteria.
- **Assignment candidate:** a coordinator contact ID carried by either the persisted relational coordinator assignment or the existing legacy flat coordinator representation.
- **Bootstrap target company:** the single company whose exact ID is supplied by the server-only `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` value and which also satisfies the approved Districorr DEV database markers.
- **Resolved assignment:** all non-empty assignment candidates normalize to one unique coordinator contact ID.
- **Unassigned:** no coordinator assignment candidate exists.
- **Ambiguous assignment:** two or more distinct coordinator contact IDs remain after exact-ID deduplication.
- **Identity resolution:** exactly one of `resolved`, `unresolved`, or `ambiguous`.
- **Real empty:** a completed successful backend read contains no cases assigned to the resolved subject before user filters.
- **Filtered empty:** the unfiltered personal result contains cases, but active user filters produce zero visible rows.

## 4. Read-path correctness requirements

### 4.1 Assignment projection, preservation, and mapping

**RPATH-01.** The company-scoped active-surgery read service MUST project every persisted relational coordinator assignment required by Coordination.

**RPATH-02.** The API response, adapter, and Zustand hydration SHALL preserve coordinator contact IDs without substituting names, local defaults, or client-inferred ownership.

**RPATH-03.** When an existing record also contains the legacy flat coordinator representation, mapping MUST preserve that representation for compatibility. The mapper MUST NOT erase a relational assignment because the flat representation is absent, and MUST NOT erase the flat representation merely because a relational representation is present.

**RPATH-04.** Assignment resolution SHALL form one union containing the contact ID from every eligible relational coordinator assignment, regardless of `isPrimary`, plus every non-empty existing legacy flat coordinator contact ID. It SHALL discard empty values, deduplicate exact equal IDs, and return exactly one of:

- `resolved(contactId)` when one unique ID remains;
- `unassigned` when no ID remains; or
- `ambiguous` when more than one unique ID remains.

**RPATH-05.** Relational and flat values naming the same contact ID SHALL resolve deterministically to that contact. Differing non-empty IDs SHALL be ambiguous; the system MUST NOT choose by array order, source precedence, display name, first result, local state, or `isPrimary`.

**RPATH-05A.** Cardinality SHALL be evaluated only after the complete relational-plus-legacy exact-ID union is deduplicated: cardinality zero is `unassigned`, cardinality one is `resolved(contactId)`, and cardinality greater than one is `ambiguous`.

**RPATH-05B.** `isPrimary` is diagnostic and deterministic-serialization metadata only. It MAY affect diagnostic ordering but MUST NOT remove a candidate, collapse distinct contact IDs, establish source precedence, or select one contact when the deduplicated union contains more than one ID. These requirements supersede any earlier design wording that allowed one primary relational row to resolve multiple distinct relational candidates.

**RPATH-06.** An ambiguous assignment MUST NOT appear in any personal inbox. Its existing visibility in `Panel global` SHALL remain governed by existing company scope and permissions, and it MUST NOT be attributed to an arbitrarily selected coordinator.

**RPATH-07.** An absent assignment SHALL remain unassigned. No read mapper, adapter, hydration step, selector, or preview flow may synthesize or persist an assignment.

**RPATH-08.** Every service query and API boundary involved in the read chain MUST apply the requested/current company predicate. Data from another company MUST NOT be projected, serialized, hydrated, counted, or rendered.

### 4.2 Backend loading and route entry

**RPATH-09.** A direct navigation or browser reload on a Coordination route MUST initiate or reuse the company-scoped backend active-surgery read before deriving buckets, counts, personal results, or empty states.

**RPATH-10.** Coordination MUST NOT treat an uninitialized or pending store as a successful empty result.

**RPATH-11.** Initial loading SHALL render an explicit loading state and MUST NOT flash a zero count, `No tenés cirugías asignadas`, or another real-empty message.

**RPATH-12.** A background refresh SHALL be distinguishable from initial loading. Previously successful data SHALL remain visible during refresh unless the existing shared loading contract explicitly requires replacement; in either case, the UI MUST indicate refresh and MUST NOT claim the inbox is empty before the refresh settles.

**RPATH-13.** A backend read failure SHALL render a distinct error state with a safe retry action, for example `No pudimos cargar la bandeja` and `Reintentar`. It MUST NOT be rendered as real empty or filtered empty.

**RPATH-14.** Retry SHALL repeat the same authenticated, company-scoped read. It MUST NOT switch company, actor, subject, or preview mode.

**RPATH-15.** Real-empty evaluation may occur only after successful backend loading and successful personal identity resolution. Filtered-empty evaluation may occur only when the corresponding unfiltered result is non-empty.

### 4.3 Bounded Districorr DEV bootstrap

**BOOTSTRAP-01.** A bootstrap MAY run only after Franco's explicit DEV-data approval and only when all server-side preconditions succeed: `OSSUM_DEPLOYMENT_TIER` equals exactly `dev`; `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` is non-empty; the target company ID exactly equals that value; and the target is the active `Districorr DEV` company under the active organization whose slug is exactly `ossum-dev`. Company name, slug, `NODE_ENV`, client input, or a discovered first match MUST NOT substitute for the exact configured company ID.

**BOOTSTRAP-02.** The bootstrap SHALL create or verify exactly two fixed, deterministically identifiable DEV-only coordinator contacts. Each contact SHALL be active, non-company, and linked actively to the exact target company with role exactly `coordinator`. The two identities MUST be distinct by contact ID and MUST be located on rerun by their fixed bootstrap identity keys, never by fuzzy name matching or array order.

**BOOTSTRAP-03.** Against the 21 active, non-archived target-company surgeries established by T0, the bootstrap SHALL deterministically assign exactly eight distinct surgeries to the first bootstrap coordinator and exactly eight different surgeries to the second bootstrap coordinator, leaving exactly five surgeries with no coordinator assignment. The assignment role SHALL equal exactly `coordinator`. No surgery may be assigned to both bootstrap coordinators, and no extra coordinator assignment may be created.

**BOOTSTRAP-04.** The partition SHALL be stable across reruns. Surgery selection and coordinator ordering MUST use fixed bootstrap identities and a deterministic ordering over immutable surgery IDs, or an equivalently frozen explicit ID set; mutable dates, labels, statuses, patients, insertion order, or random selection MUST NOT determine the partition.

**BOOTSTRAP-05.** All precondition reads, contact/link creation, assignment creation, invariant checks, and final cardinality checks SHALL execute in one database transaction. The transaction SHALL commit only when its final state is exactly: two eligible bootstrap coordinator contacts, eight assignments to each, sixteen uniquely assigned surgeries total, and five unassigned surgeries.

**BOOTSTRAP-06.** The bootstrap SHALL be idempotent. A rerun against the exact expected final state SHALL perform no create, update, delete, reassignment, or duplicate insert and SHALL return a typed no-op/success result. It MUST NOT rely on catching unique-constraint failures as its idempotency contract.

**BOOTSTRAP-07.** Any mismatch SHALL abort and roll back the whole transaction without reconciliation. Mismatches include, at minimum: wrong or missing exact company ID/marker; a production tier; an active-surgery count other than 21; one or more pre-existing non-bootstrap coordinator contacts or coordinator assignments; a partial bootstrap state; duplicate or changed bootstrap identities; wrong contact/link/assignment role; unexpected assigned surgery IDs; a surgery assigned to both coordinators; or final cardinalities other than 8/8/5. The bootstrap MUST NOT adopt, delete, overwrite, repair, or redistribute mismatching data.

**BOOTSTRAP-08.** The bootstrap MUST NOT run against production or any company other than the exact configured Districorr DEV company. It MUST NOT modify schema, migrations, Auth, organization/company records, patients, doctors, surgery fields, statuses, dates, clinical data, existing non-coordinator links, or production data. It creates only the two approved DEV coordinator contacts, their exact-company coordinator links, and the sixteen approved coordinator assignments.

**BOOTSTRAP-09.** The bootstrap is setup-only and MUST NOT be callable from the browser, a production route, the preview UI, or a general application startup path. It SHALL expose no client-visible company ID or authority input. Preview and normal Coordination reads remain incapable of creating or repairing this data.

## 5. Strict production personal inbox

**PERSONAL-01.** In production, the server SHALL derive the personal view subject from the real authenticated actor and current company. Client input MUST NOT select or override the subject.

**PERSONAL-02.** The temporary resolver SHALL consider only eligible active coordinator contacts belonging to the current company and SHALL apply one documented normalized-matching function consistently to the authenticated user's approved eligible identity and coordinator contact values.

**PERSONAL-03.** Identity resolution MUST return:

- `resolved(contactId)` only when exactly one eligible current-company contact matches;
- `unresolved` when zero contacts match; or
- `ambiguous` when more than one distinct contact matches.

**PERSONAL-04.** `unresolved` and `ambiguous` SHALL fail closed. The UI SHALL show a distinct blocked state, such as `No pudimos vincular tu usuario con un coordinador` or `Encontramos más de un coordinador posible`, and SHALL render no personal case rows, counts, assignment details, or cached data from another subject.

**PERSONAL-05.** Resolution MUST NOT guess, select the first match, use a display-name default, retain a prior user's subject, or fall back to Nelson.

**PERSONAL-06.** Production `Mi bandeja` MUST expose no functional coordinator selector and MUST ignore or reject attempted subject selection from URL, browser storage, request payload, or client state.

**PERSONAL-07.** After resolution, personal filtering SHALL include only cases whose resolved assignment contact ID equals the resolved personal contact ID. Unassigned, ambiguous, differently assigned, and cross-company cases MUST be excluded.

## 6. Global panel separation

**GLOBAL-01.** `Panel global` SHALL remain the production surface for consulting across coordinators according to the actor's normal server-enforced permissions.

**GLOBAL-02.** Access to `Panel global` MUST NOT depend on successful personal identity resolution. An unresolved or ambiguous personal identity MUST NOT grant global access, and MUST NOT remove global access the actor already has under normal permissions.

**GLOBAL-03.** The global panel MUST remain company-scoped and cross-coordinator. It MUST NOT be silently narrowed to the personal subject or a selected preview coordinator.

**GLOBAL-04.** Previewing `Panel global` changes presentation context only; its dataset SHALL continue to follow normal global-panel permissions and company scope, not the selected `contactId` personal filter.

**GLOBAL-05.** Existing global buckets, subgrouping, SLA, material availability, incident reasons, next-action derivations, counts, and access behavior SHALL remain unchanged outside the explicit assignment ambiguity and preview presentation requirements in this specification.

## 7. DEV preview capability

### 7.1 Server gates and fail-closed behavior

**PREVIEW-01.** Preview capability MUST be granted only when all of these server-side conditions are true in the same request context:

1. the server-only deployment tier equals the approved non-production DEV tier;
2. the explicit server-only preview feature flag is enabled;
3. the server-only `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` is non-empty and exactly equals both the requested route company ID and the authenticated context company ID;
4. a real session is authenticated through the normal Supabase Auth path;
5. the actor currently has access to that exact company; and
6. the actor has the approved admin-class server-side access.

**PREVIEW-02.** A missing, empty, malformed, unknown, contradictory, stale, or failed gate SHALL deny preview. Gates are conjunctive; no gate may compensate for another.

**PREVIEW-03.** Production deployments SHALL deny preview regardless of feature-flag value, client parameters, actor role, company, browser state, or hidden UI state. Production denial MUST also omit the selector and preview-specific labels from `Mi bandeja`.

**PREVIEW-04.** `NODE_ENV`, client-visible flags, URL visibility, browser storage, hidden controls, and client role checks MUST NOT grant preview or contribute authority to the server decision.

**PREVIEW-05.** Preview denial responses and UI errors MUST be non-disclosing: they MUST NOT enumerate coordinator contacts, reveal another company identifier, or explain which confidential gate failed.

### 7.2 Company-scoped subjects and tamper resistance

**PREVIEW-06.** An allowed preview context SHALL return only the minimum preview metadata and allowlisted eligible coordinator subjects from the exact approved Districorr DEV company.

**PREVIEW-07.** A personal preview target SHALL be selected by coordinator `contactId`; it MUST NOT be selected by user ID, email, display-name-only input, array index, or Auth identity.

**PREVIEW-08.** The server MUST validate the submitted `contactId` on every preview read. It SHALL accept the target only if the contact is still active, eligible, allowlisted, and belongs to the exact allowed DEV company.

**PREVIEW-09.** Unknown, malformed, stale, ineligible, inactive, non-allowlisted, or cross-company `contactId` values SHALL be rejected without fallback, data, or subject enumeration.

**PREVIEW-10.** Modifying a selector request, URL, browser state, or network payload MUST NOT bypass server validation. A valid contact ID from another company SHALL be treated as an invalid target and SHALL expose no existence or contact details.

**PREVIEW-11.** If capability or subject validity changes after page load, the next read SHALL fail closed, clear previewed case data, and show a non-disclosing unavailable state. Cached preview data MUST NOT remain interactive or be presented as current.

**PREVIEW-12.** The selected preview contact MAY exist in transient client navigation state but MUST NOT be written to domain records, user preferences, server persistence, cookies that establish authority, or Auth/session claims.

## 8. Read-only and identity-preservation requirements

**READONLY-01.** Preview SHALL change only the read-only view subject. The authenticated Supabase session, actor user ID, company membership, role, permissions, and audit actor MUST remain the real actor before, during, and after preview.

**READONLY-02.** Preview MUST NOT create an impersonated session or token, modify session claims, substitute a user ID, or attribute actions to the previewed coordinator.

**READONLY-03.** Every preview screen, including personal and global views, MUST omit or render disabled all controls that can initiate assignment, status, preparation, seguimiento, messaging, dates, logistics, bulk actions, preferences, or any other domain mutation.

**READONLY-03A.** Preview results SHALL render through a dedicated read-only component boundary used only for preview. Every descendant in that rendered subtree SHALL be read-only by construction: it MUST NOT import, instantiate, receive, expose, or transitively mount mutation hooks, mutation dialogs, editable Expediente views, mutation-capable row components, action menus, form submitters, uploaders, or callbacks that can invoke a domain or preference write.

**READONLY-03B.** The dedicated preview boundary and all descendants SHALL have zero mutation-capable network methods. Their network layer MAY issue only the approved authenticated, company-scoped GET reads. No descendant may construct or dispatch `POST`, `PUT`, `PATCH`, or `DELETE`, even behind a disabled, hidden, unreachable, or feature-gated control. Local filtering, disclosure, and read-only inspection MUST require no mutating request.

**READONLY-04.** Disabled mutation controls, if retained for context, MUST be non-focusable or have an accessible disabled state and MUST NOT register mutation handlers.

**READONLY-05.** While preview mode is active, the client MUST NOT issue `POST`, `PUT`, `PATCH`, or `DELETE` requests from the preview surface. This SHALL be verified with network inspection for selector changes, filters, navigation, retry, refresh, and row inspection.

**READONLY-06.** Server-side enforcement MUST independently reject a directly forged or replayed mutation carrying preview context, even when the UI control is hidden or disabled. Normal authorization remains necessary and preview mode cannot bypass it.

**READONLY-07.** A rejected mutation attempt MUST cause no domain write, assignment write, preference write, notification, audit entry attributed to the preview subject, or persisted preview selection.

**READONLY-08.** A persistent DEV banner SHALL identify both identities without conflation, for example `Vista previa DEV · Sesión: Ana Admin · Bandeja de: Nelson · Solo lectura`. On `Panel global`, it SHALL identify the real actor and `Panel global` rather than imply impersonation of one coordinator.

**READONLY-09.** Any existing security or audit event produced for access or denied mutation MUST attribute the real actor. The preview subject MAY be recorded only as non-authoritative read context in existing server observability; it MUST never replace actor identity.

## 9. UI state model and interaction requirements

### 9.1 Mutually distinguishable states

**UISTATE-01.** The personal inbox SHALL visibly distinguish all of these states: initial loading, background refresh, backend error, identity unresolved, identity ambiguous, preview unavailable/stale, real empty, filtered empty, and populated.

**UISTATE-02.** Exactly one primary state SHALL control the result area at a time. The precedence SHALL be: access/capability denial or blocked identity; initial loading; backend error; loaded populated/real empty; filtered empty within loaded data. Background refresh MAY overlay the last successful loaded state.

**UISTATE-03.** A real-empty state SHALL state that no assigned cases exist for the resolved subject, for example `No tenés cirugías asignadas`, and MUST NOT offer `Limpiar filtros` as its primary recovery action.

**UISTATE-04.** A filtered-empty state SHALL state that filters produced no matches, for example `No hay resultados con estos filtros`, and SHALL offer `Limpiar filtros`. It MUST NOT imply that the subject has no assigned cases.

**UISTATE-05.** A backend error SHALL offer safe retry. Blocked identity and preview denial SHALL NOT offer retry as though the outcome were a transient empty read unless the underlying backend read actually failed.

**UISTATE-06.** Counts and metrics MUST be derived only from a successful company-scoped read. They MUST NOT show false zeroes during initial loading, blocked identity, capability denial, or backend error.

### 9.2 Result hierarchy and preserved derivations

**UISTATE-07.** The inbox SHALL render one operational row per surgery. Assignment representations MUST NOT duplicate a surgery row.

**UISTATE-08.** Existing shared bucket, subgroup, SLA, availability, incident, and next-action derivations SHALL be reused; preview MUST NOT fork or redefine them.

**UISTATE-09.** Compact operational metrics SHALL precede results without displacing them beyond the approved responsive limits. Alert metrics SHALL receive emphasis only when nonzero.

**UISTATE-10.** High-value quick filters SHALL appear before secondary filters. Search and secondary status filters SHALL use progressive disclosure on constrained widths while preserving active-filter visibility and a clear path to reset.

## 10. Responsive UX and accessibility

**RESP-01.** At representative desktop widths, `Mi bandeja` SHALL use a flatter, wider composition and SHALL avoid nested-card layers that reduce the usable result width.

**RESP-02.** At `412x915`, representative populated results SHALL begin no later than the second viewport after the persistent application navigation, preview banner when applicable, compact metrics, and primary filters.

**RESP-03.** The mobile quick-filter strip SHALL be horizontally usable without clipping labels or blocking page scroll. Secondary filters SHALL be reachable through progressive disclosure and SHALL indicate when any hidden filter is active.

**RESP-04.** Interactive touch targets SHALL have a minimum target size of `44x44` CSS pixels, including selector triggers, filter controls, clear actions, retry, disclosure controls, and row navigation.

**RESP-05.** Every input, search field, selector, and disclosure control SHALL have an accessible name. Controls with visible text SHALL use the applicable Spanish UI label; icon-only controls SHALL provide an accessible Spanish label.

**RESP-06.** Keyboard focus SHALL be visible and SHALL follow visual order. Selector, filters, retry, clear-filters, disclosures, and row navigation SHALL be operable by keyboard without requiring pointer input.

**RESP-07.** State changes SHALL be announced through an appropriate live region without repeatedly announcing every row. Loading completion, errors, blocked states, filter result counts, and preview-subject changes SHALL be understandable to assistive technology.

**RESP-08.** The DEV preview banner SHALL remain legible and distinguishable at desktop and `412x915`; it MUST NOT rely on color alone to communicate `Solo lectura` or the actor/subject distinction.

## 11. Security, isolation, and non-disclosure

**SEC-01.** Actor company access SHALL be resolved before coordinator enumeration, selected-contact lookup, surgery reads, global-panel reads, or preview data return.

**SEC-02.** Actor, selected preview contact, assignments, surgeries, counts, filters, and global-panel results MUST all resolve within the same exact company context.

**SEC-03.** Cross-company, cross-subject, stale-session, and stale-capability attempts SHALL return no protected data and perform no write.

**SEC-04.** Client-side filtering MUST NOT be used as the sole mechanism to isolate companies or enforce preview eligibility. The server read boundary MUST return only data authorized for the company and mode.

**SEC-05.** Error and blocked-state copy MUST NOT disclose cross-company identifiers, contact existence, allowlist membership, admin eligibility details, server-only tier values, or feature-flag values.

**SEC-06.** Preview capability SHALL be absent/off by default. Disabling or removing the server-only flag SHALL immediately deny new preview reads without data repair or migration.

## 12. Regression and observability requirements

**REG-01.** Existing non-preview personal derivations and `Panel global` behavior SHALL remain equivalent for the same successfully loaded company dataset, except for strict subject resolution and explicit ambiguous-assignment handling defined here.

**REG-02.** Existing shared coordinator buckets, subgroups, SLA, material availability, incident reasons, next-action derivation, row identity, and normal global-panel permissions SHALL pass focused regression tests.

**REG-03.** Production SHALL contain strict personal behavior and the approved loading/state/UX corrections only. Preview selector, preview labels, and preview capability SHALL remain denied and absent.

**REG-04.** Focused final-diff checks SHALL confirm zero schema, migration, general seed, fixture/import, package-manifest, dependency, Auth-impersonation, production-selector, or preview-persistence changes, and zero data or assignment writes outside the exact bootstrap contract in §4.3.

**REG-05.** Production behavior and data SHALL remain unaffected by the DEV bootstrap and preview. Production SHALL contain no bootstrap execution path, preview capability, selector, preview label, server-only DEV company ID disclosure, or changed personal/global authorization. Production reads and writes SHALL behave exactly as before except for the separately specified strict personal, assignment-read, and honest state corrections.

**OBS-01.** Existing server observability SHALL distinguish at least these outcomes without adding persisted product telemetry: backend surgery-read failure, ambiguous assignment mapping, personal identity unresolved/ambiguous, preview denied, preview target rejected, stale capability, and preview mutation rejected.

**OBS-02.** Observability SHALL attribute the real actor/session context where authentication exists and SHALL use non-disclosing reason categories. It MUST NOT log secrets, tokens, coordinator lists, cross-company record contents, or claim the preview subject was the actor.

**OBS-03.** Successful and denied preview checks SHALL be diagnosable from server-side evidence sufficient to identify the failed gate category in trusted logs, while the client receives only a non-disclosing outcome.

**OBS-04.** This change MUST NOT add a telemetry table, audit schema, persistent preview-history model, or other persistence mechanism. Any requirement for new persisted observability SHALL stop and escalate.

## 13. Acceptance scenarios

### 13.1 Read path and assignment handling

```gherkin
Scenario: RP-1 Relational assignment survives the complete read chain
  Given surgery S1 belongs to company C1 and has a persisted relational coordinator assignment to contact K1
  When Coordination loads active surgeries for C1
  Then the service projection, API response, adapter, and hydrated store SHALL retain K1
  And S1 SHALL participate in K1's personal derivations exactly once

Scenario: RP-2 Legacy flat assignment remains compatible
  Given surgery S2 in C1 has no relational coordinator value and has the existing legacy flat assignment to K2
  When the read response is mapped and hydrated
  Then the flat value SHALL remain available
  And assignment resolution SHALL return resolved(K2) without creating or backfilling a relation

Scenario: RP-3 Equal relational and flat assignments deduplicate
  Given both assignment representations for S3 name contact K3
  When assignment candidates are resolved
  Then the result SHALL be resolved(K3)
  And the UI SHALL render one surgery row, not one row per representation

Scenario: RP-4 Conflicting assignments fail deterministically
  Given the relational representation names K4 and the legacy flat representation names K5
  When assignment candidates are resolved
  Then the result SHALL be ambiguous
  And S4 SHALL appear in neither K4 nor K5 personal inbox
  And the system SHALL not choose by order, source, name, or local state

Scenario: RP-5 Missing persistence is not repaired
  Given a representative surgery has no persisted coordinator assignment in either representation
  When Coordination loads it
  Then it SHALL remain unassigned
  And no assignment or domain write SHALL occur

Scenario: RP-5A Distinct relational candidates remain ambiguous despite one primary
  Given surgery S5 has eligible relational coordinator assignments to K1 and K2
  And exactly one of those rows has isPrimary=true
  When assignment candidates are unioned and exact-ID deduplicated
  Then the result SHALL be ambiguous
  And isPrimary SHALL only remain diagnostic metadata
  And S5 SHALL appear in neither personal inbox

Scenario: RP-5B Relational and legacy candidates use complete union cardinality
  Given eligible relational rows contain K1 and K1
  And the legacy flat representation contains K2
  When all candidate IDs are unioned and exact-ID deduplicated
  Then the unique set SHALL be {K1, K2}
  And the result SHALL be ambiguous without relational or primary precedence

Scenario: RP-6 Direct route entry loads before evaluating empty
  Given no surgery data has been hydrated in the browser
  When the actor directly opens or reloads Coordination
  Then a company-scoped backend read SHALL start
  And loading SHALL be visible
  And zero counts and real-empty copy SHALL remain hidden until the read succeeds

Scenario: RP-7 Backend failure is not empty
  Given the direct backend read fails
  When the request settles
  Then the UI SHALL show "No pudimos cargar la bandeja" with "Reintentar"
  And the UI SHALL show neither real-empty nor filtered-empty copy
  And retry SHALL preserve actor, company, subject, and mode
```

### 13.1A Bounded Districorr DEV bootstrap

```gherkin
Scenario: DB-1 Empty approved DEV baseline bootstraps exactly 8/8/5
  Given the server tier is exactly dev
  And the server-only preview company ID exactly identifies the active Districorr DEV company under organization ossum-dev
  And that company has exactly 21 active non-archived surgeries
  And it has zero eligible coordinator contacts and zero coordinator assignments
  When the approved bootstrap runs
  Then one transaction SHALL create exactly two fixed DEV coordinator contacts and their exact-company coordinator links
  And exactly eight distinct surgeries SHALL be assigned to each coordinator
  And exactly five surgeries SHALL remain unassigned
  And the transaction SHALL commit only after all 2/8/8/5 invariants pass

Scenario: DB-2 Exact rerun is an idempotent no-op
  Given the approved DEV bootstrap state already contains exactly two expected contacts, eight assignments for each, and five unassigned surgeries
  When the bootstrap runs again with the same exact server-only company ID
  Then it SHALL report success/no-op
  And it SHALL create, update, delete, reassign, or duplicate nothing

Scenario: DB-3 Partial or contradictory state aborts atomically
  Given any bootstrap precondition or expected identity, role, surgery set, or 8/8/5 cardinality differs
  When the bootstrap evaluates the target inside its transaction
  Then it SHALL abort and roll back the complete transaction
  And it SHALL not adopt, repair, delete, overwrite, or redistribute existing data

Scenario: DB-4 Production and wrong-company execution are impossible
  Given the deployment is production or the configured server-only company ID does not exactly equal the route, authenticated context, and approved Districorr DEV company
  When bootstrap execution is attempted
  Then execution SHALL be rejected before any data mutation
  And no schema, company, Auth, surgery, contact, link, assignment, or production data SHALL change
```

### 13.2 Strict personal and global separation

```gherkin
Scenario: PI-1 Unique production identity is personal
  Given a production actor has exactly one normalized eligible coordinator match K1 in current company C1
  And C1 contains cases assigned to K1 and K2
  When the actor opens "Mi bandeja"
  Then the server SHALL resolve K1
  And only cases resolved to K1 SHALL be returned or rendered
  And no coordinator selector SHALL be present

Scenario: PI-2 Unresolved production identity blocks
  Given the authenticated identity matches zero eligible coordinators in C1
  When the actor opens "Mi bandeja"
  Then resolution SHALL be unresolved
  And an explicit Spanish blocked state SHALL render
  And no personal case data or Nelson fallback SHALL render

Scenario: PI-3 Ambiguous production identity blocks
  Given the authenticated identity matches two eligible coordinators in C1
  When the actor opens "Mi bandeja"
  Then resolution SHALL be ambiguous
  And no first match, default, cached subject, or personal case data SHALL be used

Scenario: PI-4 Client subject tampering cannot change production inbox
  Given production "Mi bandeja" resolves to K1
  When a client adds a query parameter, local value, or forged payload naming K2
  Then the server SHALL ignore or reject the attempted override
  And no K2 personal data SHALL be returned

Scenario: GP-1 Global remains cross-coordinator by permission
  Given the actor has normal permission for "Panel global" in C1
  When the actor opens it
  Then the view SHALL include authorized company-scoped cross-coordinator results
  And the view SHALL not be narrowed to the personal or preview-selected coordinator

Scenario: GP-2 Personal resolution does not grant global access
  Given the actor resolves personally but lacks normal global-panel permission
  When the actor requests "Panel global"
  Then access SHALL remain denied under the existing permission contract
```

### 13.3 DEV capability, target isolation, and identity

```gherkin
Scenario: DP-1 Exact eligible DEV admin receives preview
  Given the deployment tier is the approved DEV tier
  And the server-only flag is enabled
  And OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID is non-empty and exactly equals the requested route company and authenticated context company
  And that ID identifies the exact approved Districorr DEV company
  And the actor has a real accepted Supabase session, current access to that company, and approved admin-class access
  When preview context is requested
  Then the server SHALL grant read-only preview
  And the server SHALL return only eligible allowlisted coordinator contacts from that company

Scenario: DP-2 Every missing gate denies
  Given any one of tier, flag, exact company, real session, company access, or admin-class access is missing, false, malformed, stale, or contradictory
  When preview is requested
  Then preview SHALL be denied without coordinator enumeration or protected data
  And the denial SHALL not reveal the failed confidential gate to the client

Scenario: DP-3 Production always fails closed
  Given a production deployment
  And a client sends valid-looking preview parameters with an admin session and an enabled-looking client flag
  When "Mi bandeja" is requested
  Then preview SHALL be denied
  And no preview selector or preview-specific label SHALL render

Scenario: DP-4 Valid contact ID selects only a view subject
  Given preview capability is granted in the approved DEV company
  And contactId K1 names an active eligible allowlisted coordinator in that company
  When the actor selects K1
  Then the read-only personal dataset SHALL be filtered to K1
  And the real actor, session, permissions, and audit identity SHALL remain unchanged

Scenario: DP-5 Tampered contact ID is rejected
  Given preview capability is granted for C1
  When the client submits an unknown, malformed, inactive, ineligible, non-allowlisted, or C2 contact ID
  Then the server SHALL reject the target without fallback
  And no contact existence, coordinator list, or surgery data from C2 SHALL be disclosed

Scenario: DP-6 Capability becomes stale
  Given K1 preview data is displayed
  When the flag is disabled, actor access changes, or K1 ceases to be an eligible target before the next read
  Then that read SHALL fail closed
  And cached preview data SHALL be cleared from the result area
  And a non-disclosing unavailable state SHALL render
```

### 13.4 Read-only enforcement

```gherkin
Scenario: RO-1 UI produces no mutating network calls
  Given an eligible admin is previewing a coordinator inbox or "Panel global"
  When the actor changes subject, filters, opens rows, refreshes, retries, and navigates between preview views
  Then the preview surface SHALL issue no POST, PUT, PATCH, or DELETE request
  And no mutating control SHALL be operable

Scenario: RO-1A Dedicated preview boundary is read-only by construction
  Given an eligible admin opens a personal or global preview
  When the preview result component tree is rendered and its imports, descendants, callbacks, and network clients are inspected
  Then the result tree SHALL be rooted at the dedicated read-only preview boundary
  And zero descendant SHALL be mutation-capable or mount an editable Expediente, mutation hook, dialog, action menu, form submitter, or uploader
  And every network request originating from the boundary SHALL use GET only

Scenario: RO-2 Forged mutation remains rejected
  Given preview mode is active
  When a client directly sends a mutation request with preview context
  Then server-side mode enforcement and normal authorization SHALL reject it
  And no domain, assignment, preference, notification, session, or audit-subject mutation SHALL occur

Scenario: RO-3 Actor and subject remain visibly distinct
  Given real actor "Ana Admin" previews coordinator "Nelson"
  When the preview renders
  Then a persistent banner SHALL state "Sesión: Ana Admin", "Bandeja de: Nelson", and "Solo lectura"
  And all server actor and audit attribution SHALL remain "Ana Admin"
```

### 13.5 States, responsiveness, accessibility, and regressions

```gherkin
Scenario: UX-1A Real empty is not filtered empty
  Given a successful resolved inbox has zero assigned cases
  When it renders
  Then it SHALL show real-empty copy and no primary clear-filter action

Scenario: UX-1B Filtered empty offers filter clearing
  Given the unfiltered inbox has cases and active filters match none
  When results render
  Then the UI SHALL show "No hay resultados con estos filtros" and "Limpiar filtros"
  And the UI SHALL not imply that the subject has no assigned cases

Scenario: UX-2 Refresh preserves state honesty
  Given populated results were loaded successfully
  When a background refresh starts
  Then refresh SHALL be indicated
  And the UI SHALL not flash a false zero or real-empty message

Scenario: UX-3 Mobile hierarchy is operational
  Given representative populated content at 412x915
  When "Mi bandeja" renders
  Then results SHALL begin no later than the second viewport
  And quick filters SHALL be horizontally usable
  And secondary filters SHALL be discoverable through progressive disclosure

Scenario: UX-4 Controls are accessible
  Given desktop or 412x915 rendering
  When a keyboard or touch user operates selector, filters, retry, clear, disclosure, and rows
  Then targets SHALL be at least 44x44 CSS pixels
  And labels, visible focus, visual-order focus sequence, and state announcements SHALL be present

Scenario: RG-1 Shared semantics do not fork
  Given the same successfully loaded company dataset before and after this change
  When shared bucket, subgroup, SLA, availability, incident, next-action, and global-panel derivations run
  Then outputs SHALL remain equivalent except for the explicit strict-personal and ambiguous-assignment behavior specified here

Scenario: RG-2 Production remains unaffected
  Given the production deployment and production data before this change
  When Coordination and all bootstrap/preview entry points are evaluated
  Then no bootstrap or preview capability, selector, label, or DEV company identifier SHALL be reachable or rendered
  And production data SHALL remain unchanged
  And normal production authorization SHALL remain unchanged

Scenario: OB-1 Trusted evidence preserves actor and non-disclosure
  Given an identity block, preview denial, target rejection, stale capability, backend failure, or forced preview mutation
  When the server records existing operational evidence
  Then the outcome category and real actor context SHALL be diagnosable in trusted logs
  And secrets, tokens, cross-company contents, coordinator enumeration, and false preview-subject attribution SHALL be absent
```

## 14. Required verification

### 14.1 Automated

1. **Bootstrap tests:** exact DEV tier/company/marker preconditions; empty-baseline 2/8/8/5 commit; deterministic partition; exact rerun no-op; partial/extra/wrong-role/wrong-count/wrong-company/production mismatch rollback; one transaction; no schema or out-of-scope writes.
2. **Service/projection tests:** relational assignment projection; exact company predicate; no assignment synthesis or writes from any read path.
3. **Adapter/hydration tests:** relational-only, flat-only, equal dual representation, conflicting dual representation, multiple relational IDs with exactly one primary, absent assignment, complete union cardinality, one row per surgery, and field preservation through hydration.
4. **Direct-route state tests:** initial load, refresh, successful populated read, backend error/retry, real empty, filtered empty/clear, and no false-zero flash.
5. **Personal resolver tests:** exactly one normalized eligible current-company match; zero and multiple matches; inactive and wrong-company exclusion; no Nelson/default/first-match/client override.
6. **Global-panel tests:** normal permission allow/deny, cross-coordinator company scope, independence from personal resolution, and no narrowing by preview `contactId`.
7. **Preview denial matrix:** every tier, flag, exact configured company-ID equality, session, company-access, admin-access, subject-eligibility, stale-capability, malformed-input, and production combination.
8. **Tenant-isolation tests:** actor/company mismatch, coordinator/company mismatch, surgery/company mismatch, global-panel company mismatch, and valid foreign contact-ID tampering all return no protected data.
9. **Read-only tests:** the dedicated preview boundary has no mutation-capable imports, descendants, callbacks, or network methods; every preview request is GET; forced mutation is rejected; no domain/preference/assignment write occurs; actor identity is unchanged.
10. **Component/accessibility tests:** state precedence, Spanish copy/action distinctions, persistent actor/subject banner, labels, focus behavior, disabled semantics, and live-state announcements.
11. **Regression tests:** shared coordinator buckets, subgroups, SLA, availability, incident reasons, next action, row identity, normal global-panel behavior, production bootstrap/preview absence, and unchanged production data/authorization.

### 14.2 Manual/browser QA

After the bootstrap has independently proven the exact 2/8/8/5 DEV state, and using real authentication, verify at desktop and `412x915`:

- production unique, unresolved, and ambiguous personal identity outcomes;
- direct navigation, initial loading, refresh, error/retry, real empty, filtered empty/clear, and populated states;
- several allowlisted coordinator previews and `Panel global` in the exact Districorr DEV company;
- persistent real-actor/preview-subject/read-only labeling;
- keyboard order, visible focus, accessible names, touch targets, quick-filter scrolling, secondary-filter disclosure, and result position;
- component-tree and browser network evidence showing a dedicated mutation-free preview boundary and GET-only preview calls; and
- production absence of preview selector/labels and denial of client-forged preview input.

### 14.3 Final diff and evidence review

The final review SHALL verify implementation order, focused tests, trusted denial evidence, and zero changes to schema, migrations, dependencies, Auth impersonation, persisted preview selection, or production subject selection. It SHALL also prove that all data and assignment writes are confined to the exact transactional DEV bootstrap in §4.3 and that production data is untouched.

## 15. Stop conditions and task readiness

Stop and escalate rather than widening this specification if:

- representative assignments require any creation, import, repair, backfill, migration, or schema work beyond the exact approved bootstrap in §4.3;
- deterministic personal resolution would require inventing identity fields or normalization semantics beyond the approved resolver contract;
- implementation requires Auth impersonation/redesign, provider change, role/permission architecture change, or a new dependency;
- server-only preview gating cannot be independent of `NODE_ENV` and client-controlled state;
- every reachable preview mutation cannot be denied server-side;
- company isolation cannot be proven for actor, subject, assignments, surgeries, and global panel;
- production would require a coordinator selector, hidden override, or fallback identity;
- the bootstrap cannot prove exact server-only company-ID targeting, one-transaction idempotency, deterministic 2/8/8/5 cardinalities, mismatch rollback, and production exclusion;
- the rendered preview cannot be contained by a dedicated component boundary with zero mutation-capable descendants and GET-only networking;
- assignment-write semantics or writes outside §4.3, business derivations, CX/preparation behavior, audit attribution, or unrelated Cirugías behavior would change; or
- observability would require a new persisted schema or telemetry store.

TASKS SHALL serialize ownership across the service → API/adapter → store → Coordination chain, define validation for each requirement family, and keep read-path completion as the exit gate before preview work begins.

## 16. Proposal traceability

| Proposal requirement | Specification coverage |
| --- | --- |
| Assignment service → adapter → store preservation and prerequisite | §§1, 4, scenarios RP-1–RP-5 |
| Approved idempotent Districorr DEV data bootstrap | §§2, 4.3, scenarios DB-1–DB-4 |
| Direct backend loading and explicit data states | §4.2, §9, scenarios RP-6–RP-7 and UX-1–UX-2 |
| Strict production personal identity; no Nelson fallback | §5, scenarios PI-1–PI-4 |
| Global panel remains cross-coordinator by permission | §6, scenarios GP-1–GP-2 |
| DEV server-only gates and production fail-closed | §7.1, scenarios DP-1–DP-3 |
| Exact `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` authority | §§4.3, 7.1, scenarios DB-1–DB-4 and DP-1–DP-3 |
| Exact company and `contactId` isolation/tamper rejection | §7.2, §11, scenarios DP-4–DP-6 |
| Read-only UI and server enforcement | §8, scenarios RO-1–RO-3 |
| Dedicated mutation-free preview component boundary | §8, scenario RO-1A |
| Real actor/session/permissions/audit preservation | §8, scenarios DP-4 and RO-2–RO-3 |
| Desktop/mobile hierarchy and accessibility | §§9–10, scenarios UX-1–UX-4 |
| No schema, migration, dependency, or Auth impersonation; writes limited to approved DEV bootstrap | §§2, 4.3, 8, 12, 15 |
| Regression and observability | §12, scenarios RG-1 and OB-1, §14 |
| Production unaffected | §12, scenarios DB-4 and RG-2, §14 |
