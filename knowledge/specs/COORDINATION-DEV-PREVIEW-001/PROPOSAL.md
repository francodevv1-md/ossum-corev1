# Proposal — COORDINATION-DEV-PREVIEW-001

Status: proposed; approved product and security decisions recorded; ready for DESIGN and SPEC  
Change: `COORDINATION-DEV-PREVIEW-001`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact chain: **PROPOSAL** → DESIGN → SPEC → TASKS → APPLY

---

## 1. Summary

Make Coordination trustworthy and testable without weakening production identity or authorization boundaries. This change combines four dependent outcomes:

1. restore coordinator assignments across the backend surgery read path so assigned surgeries reach Coordination;
2. make production `Mi bandeja` strictly personal, with other coordinators consulted only through `Panel global`;
3. provide a fully read-only DEV preview that lets an eligible administrator inspect coordinator inboxes and the global panel while preserving the real authenticated actor; and
4. improve the `Mi bandeja` hierarchy and loading, error, empty, and filtered-empty states so real operational cases can be tested accurately on desktop and mobile.

The assignment read-path correction is a hard prerequisite. Preview and inbox filters cannot be considered valid while coordinator assignments are dropped between the service, API adapter, and Zustand hydration.

This proposal does not approve or require a schema change, migration, dependency, Auth impersonation, production coordinator selector, or data write from preview mode.

---

## 2. Problem and current-state evidence

### 2.1 Assigned surgeries disappear from Coordination

The diagnosed failure is in the read chain, not primarily in bucket, status, or date logic:

```txt
surgery service select → API response/adapter → store hydration → Coordination filters
```

Coordinator `SurgeryContactAssignment` data is omitted before the hydrated surgery reaches Coordination. Eligible surgeries are consequently represented as `Sin asignar` and excluded from the personal coordinator filter. Direct inbox entry also lacks a complete backend loading/error contract, so an unresolved load can be mistaken for a legitimate empty inbox.

### 2.2 Personal identity is currently unsafe to infer

There is no approved stable `User` ↔ coordinator `Contact` relation. Existing client behavior may expose coordinator switching and may fall back to `Nelson`; neither behavior is acceptable as the production identity contract.

Until a future separately approved stable relation exists, production personal resolution must use a unique normalized match between the authenticated user's eligible identity and an active coordinator contact in the current company. Zero or multiple matches are explicit blocked states. The system must never guess, choose the first result, or fall back to Nelson.

### 2.3 DEV needs multi-coordinator coverage without impersonation

An administrator must be able to verify several coordinator inboxes and `Panel global` in the Districorr DEV company. Changing Auth identity, actor identity, permissions, or audit attribution would make that test unsafe and misleading. The preview therefore changes only the read-only view subject; the authenticated actor remains unchanged.

### 2.4 The inbox hierarchy obscures real test outcomes

The current layout can push actionable results down, retain a selector that conflicts with personal semantics, and conflate loading, real-empty, filtered-empty, and failure outcomes. The approved UX direction is a flatter, wider desktop composition, a compact mobile-first operational hierarchy, progressive filters, and explicit data states.

---

## 3. Goals

1. Preserve coordinator assignment data end-to-end from the surgery service through adapter mapping and store hydration.
2. Ensure Coordination initiates the backend surgery read and presents explicit loading and error states before evaluating empty-state logic.
3. Bind production `Mi bandeja` to exactly one resolved coordinator belonging to the authenticated user's current company, failing closed when resolution is missing or ambiguous.
4. Keep cross-coordinator consultation in production in `Panel global`; remove any production personal-inbox coordinator selector or query-driven override.
5. Permit eligible DEV administrators to preview allowlisted coordinator inboxes and `Panel global` as read-only views in the exact Districorr DEV company.
6. Enforce preview eligibility on the server using a server-only deployment tier, explicit feature flag, exact company allowlist, real authenticated session, current company access, and approved admin-class access.
7. Preserve the real session, user, permissions, and audit actor throughout preview; never impersonate another user.
8. Improve `Mi bandeja` scanability and state clarity enough to validate real assigned cases at desktop and mobile widths.
9. Keep implementation possible with current models and dependencies, with no data mutation introduced by this change.

---

## 4. Human approvals already granted

Franco approved the following product and security decisions on 2026-07-16:

1. Production `Mi bandeja` is strictly personal.
2. Other coordinators are consulted from `Panel global`, not by switching the owner of the production personal inbox.
3. DEV must support testing multiple coordinator inboxes and the global panel.
4. DEV preview is admin-only, fully read-only, company-isolated, server-gated, and fail-closed.
5. Temporary production `User` ↔ coordinator resolution uses a unique normalized match; unresolved and ambiguous outcomes block explicitly, with no Nelson fallback.
6. Preview gating uses a server-only deployment tier, explicit flag, and the exact Districorr DEV company. `NODE_ENV` and client-side gates are insufficient and must not be trusted.
7. Preview preserves the real actor, session, permissions, and audit identity and does not impersonate Auth.
8. The assignment service → adapter → store read path is fixed before preview is enabled.
9. The approved `Mi bandeja` UX/state hierarchy improvements are included so real cases can be tested.
10. No schema, migration, new dependency, or data write is part of this change.

These approvals authorize progression through DESIGN and SPEC for this bounded change. They do not authorize a schema migration, Auth redesign, provider change, production preview exposure, mutation-capability bypass, or unrelated Cirugías refactor.

---

## 5. Scope and behavioral boundaries

### 5.1 Assignment read-path prerequisite

- Extend only the existing surgery read projection and mapping needed to carry coordinator assignments already persisted for the requested company.
- Map the coordinator assignment deterministically into the existing client surgery representation used by shared Coordination helpers.
- Preserve company isolation at the service and API boundaries.
- Trigger or reuse backend active-surgery loading before Coordination derives buckets, counts, or empty states.
- Do not synthesize assignments, backfill records, alter assignment writes, or infer persisted ownership from local Zustand-only values.

If representative surgeries do not have persisted coordinator assignments, this read-path change must report that fact and stop; it must not create or repair assignment data.

### 5.2 Production `Mi bandeja`

- Resolve the view subject server-side from the real authenticated user and current company.
- The temporary resolver may return only one of: `resolved`, `unresolved`, or `ambiguous`.
- `resolved` requires exactly one eligible active coordinator contact after approved normalized matching within the current company.
- `unresolved` and `ambiguous` render explicit blocked states and no personal case data.
- No coordinator selector, client query parameter, local override, default name, or first-match behavior may change the production personal view subject.
- `Panel global` remains the production surface for consulting other coordinators.

### 5.3 DEV coordinator preview

Preview capability exists only when every server-side condition succeeds:

1. the server-only deployment tier is exactly the approved non-production DEV tier;
2. an explicit server-only preview feature flag is enabled;
3. the requested company is exactly the approved Districorr DEV company identifier;
4. the request has a real authenticated session accepted by the normal Auth path;
5. the actor has current access to that same company; and
6. the actor has the approved admin-class server-side access.

Any missing, malformed, unknown, or contradictory value denies the capability. Production deployments must deny it even if a client attempts to send preview parameters. `NODE_ENV`, `NEXT_PUBLIC_*`, browser state, URL visibility, hidden controls, and client role checks are not authorization inputs.

When eligible, the server returns only company-scoped preview context and allowlisted coordinator subjects needed for read-only filtering. A selected preview subject is identified by coordinator contact ID, not a user identity. The selected subject must belong to the exact allowed company and eligible coordinator set.

Preview mode:

- changes only the read-only view subject;
- preserves the real authenticated actor and all normal permissions;
- does not create an impersonated session or token;
- does not rewrite audit identity;
- cannot call, reveal, or enable mutating controls from the previewed surface;
- cannot submit assignment, status, preparation, seguimiento, message, date, logistics, bulk, or other domain writes;
- does not persist the selected coordinator on the server or in domain data; and
- fails closed if capability or selected-subject validation changes after page load.

The preview selector and preview-specific labels must never render in production `Mi bandeja`. A visible DEV banner must distinguish the real actor from the previewed coordinator and state that the view is read-only.

### 5.4 `Mi bandeja` UX and state hierarchy

The UI pass is bounded to operational reading and filtering:

- use a flatter, wider desktop layout with less nested-card weight;
- keep the mobile-first inbox hierarchy compact so results appear no later than the second viewport under representative content;
- show compact operational metrics, emphasizing alert metrics only when nonzero;
- place high-value quick filters first in a horizontally usable mobile strip;
- move secondary search/status filters into progressive disclosure on constrained widths;
- keep one surgery row per case and preserve existing shared bucket, subgroup, SLA, availability, incident, and next-action derivations;
- preserve the personal owner identity as fixed in production;
- provide distinct states for initial loading, refresh, backend error, blocked identity resolution, true empty inbox, and filters producing zero matches; and
- ensure errors offer a safe retry while filtered-empty states offer filter clearing without implying that no assignments exist.

Loading must not flash a false zero count or true-empty message. A refresh must not discard already rendered data unless the existing shared loading contract requires it. Error copy must not disclose cross-company identifiers or preview eligibility details.

---

## 6. Explicit non-goals

- No Prisma schema change, migration, seed, fixture import, data backfill, or database write.
- No new package or dependency.
- No Auth impersonation, token substitution, synthetic login, actor switching, permission bypass, role redesign, or Auth provider change.
- No production coordinator selector in `Mi bandeja`, including query-string, local-storage, or hidden client overrides.
- No preview capability in production and no reliance on `NODE_ENV` or any client-visible flag as a security gate.
- No write operation from preview mode and no persistence of preview selection.
- No creation, reassignment, repair, or normalization write for coordinator assignments.
- No stable `User` ↔ `Contact` schema relation in this phase; the approved normalized match is temporary and fail-closed.
- No change to coordinator bucket, SLA, preparation, CX state, or global-panel business semantics.
- No broad Cirugías, Expediente, permissions, audit, multi-company, or navigation refactor.
- No replacement of backend/PostgreSQL truth with Zustand or client-derived identity.

---

## 7. Acceptance summary

1. A surgery with a persisted coordinator assignment in company C reaches the client store with that assignment intact and appears in the correct Coordination derivations for C.
2. A direct visit to Coordination initiates backend loading and cannot present a true-empty state before loading completes.
3. Backend failure renders a distinct error/retry state; loading, true-empty, filtered-empty, unresolved identity, and ambiguous identity are distinguishable.
4. A production user with exactly one unique normalized coordinator match sees only that coordinator's personal inbox.
5. A production user with zero or multiple matches sees an explicit blocked state and no fallback coordinator data.
6. Production `Mi bandeja` has no functional coordinator selector or client-controlled subject override. Other coordinators remain available through `Panel global` according to normal permissions.
7. An eligible real admin in the exact Districorr DEV company and enabled DEV deployment can select an allowlisted coordinator contact and inspect that inbox or the global panel under a visible read-only preview banner.
8. The same request is denied when any server gate fails, including production tier, disabled/missing flag, wrong company, absent session, missing company access, non-admin actor, unknown coordinator, or coordinator from another company.
9. Previewing never changes the authenticated user, session, permissions, audit actor, assignment records, domain records, or persisted preferences.
10. Preview mode exposes no effective write path: controls are absent or disabled and forced mutation attempts remain rejected by normal server authorization/mode enforcement.
11. Desktop and mobile inbox layouts surface real results promptly, preserve one row per surgery, and provide usable quick filters plus progressive secondary filters.
12. Existing `Panel global` and shared coordinator derivations remain behaviorally consistent outside the explicitly approved personal/preview distinctions.

---

## 8. Proposed phases

### Phase 0 — Contract freeze and ownership

- DESIGN and SPEC define the exact normalized identity inputs, eligible coordinator criteria, server capability response, read-only enforcement points, state model, UX copy, and test matrix.
- TASKS names one owner and lock per sensitive service/adapter/store/UI/API chain.
- No implementation begins with unresolved overlap in sensitive Cirugías or Coordination files.

### Phase 1 — Assignment read path and data states

- Correct the service projection, API adapter, and store hydration so persisted coordinator assignments survive end-to-end.
- Connect Coordination to backend active-surgery loading.
- Add loading, refresh, error, true-empty, and filtered-empty behavior and focused regression tests.
- Validate representative persisted assignments before proceeding.

**Exit gate:** assigned DEV surgeries load under the correct company and coordinator without synthetic data. If not, stop before preview.

### Phase 2 — Strict production personal context

- Add the server-side temporary unique normalized resolver.
- Remove or neutralize production client-controlled personal subject selection.
- Render resolved, unresolved, and ambiguous outcomes explicitly.
- Preserve `Panel global` for authorized cross-coordinator consultation.

**Exit gate:** no production route or client state can select another personal inbox, and no unresolved identity exposes coordinator cases.

### Phase 3 — Server-gated DEV preview context

- Implement the fail-closed server-only capability gate and company-scoped read-only context contract.
- Return only eligible coordinator subjects from the exact approved DEV company.
- Enforce read-only mode server-side in addition to removing/disabling UI mutations.
- Preserve real actor/session/permissions/audit identity.

**Exit gate:** the denial matrix passes, including production-tier and cross-company attempts.

### Phase 4 — Preview UI and approved hierarchy improvements

- Add the DEV-only selector, real-actor/preview-subject banner, and global/personal preview navigation under the server-issued capability.
- Apply the approved desktop/mobile hierarchy, compact metrics, quick filters, progressive secondary filters, and explicit states.
- Retain shared derivations and avoid new business rules.

### Phase 5 — Validation and controlled rollout

- Run typecheck/build as applicable, focused service/adapter/store/context/component tests, permission and cross-company negative tests, and desktop/mobile browser QA.
- Verify representative personal inboxes and `Panel global` in Districorr DEV.
- Review the final diff for zero schema, migration, dependency, Auth impersonation, preview write, and production selector changes.

---

## 9. Rollout and rollback

1. Merge and validate Phase 1 independently before any preview capability is enabled.
2. Deploy the strict personal resolver with non-disclosing blocked-state handling; this change does not add persisted telemetry or logging data.
3. Keep the server-only preview flag absent/off by default.
4. Enable preview only in the approved DEV deployment and for the exact Districorr DEV company after the denial matrix passes.
5. Exercise multiple coordinator inboxes and `Panel global` with representative persisted assignments and real admin authentication.
6. Production rollout contains strict personal behavior and UX/data-state fixes only; the preview gate remains denied and no selector is rendered.

Immediate rollback for preview is disabling/removing the server-only feature flag. Because preview writes no domain or configuration data, rollback requires no data repair. If strict personal resolution produces unexpected blocked users, retain fail-closed behavior and correct the resolver contract in a newly reviewed task; do not restore Nelson or client-selection fallbacks.

---

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Assignment data is absent rather than merely omitted from reads | Validate persisted representative assignments after Phase 1; stop instead of creating data. |
| Normalized matching links the wrong coordinator | Require exactly one company-scoped eligible match; ambiguous and unresolved results block explicitly. |
| Preview leaks into production | Require all server gates, deny unknown values, omit client authority, test production-tier denial, and keep the flag off by default. |
| Cross-company coordinator enumeration | Resolve company access first and return only eligible contacts from the exact allowed company; use non-disclosing denials. |
| UI-only read-only mode is bypassed | Enforce preview mode and normal authorization server-side; forced write requests must fail. |
| Real actor and preview subject are confused | Keep Auth unchanged and render both identities with a persistent read-only DEV banner. |
| Loading is mistaken for an empty inbox | Model loading, refresh, errors, true-empty, and filtered-empty separately and test direct navigation. |
| Shared global/personal derivations diverge | Reuse existing helpers and test equivalence; do not fork bucket/SLA/business rules. |
| Sensitive-file overlap causes unrelated regressions | Serialize ownership across the service → adapter → store → Coordination chain and stop on active overlap. |

---

## 11. Stop conditions

Stop and return to Franco/SDD review if any of the following occurs:

1. representative coordinator assignments are not persisted and would require writes, import, backfill, or schema work;
2. the temporary resolver cannot produce a deterministic unique normalized match without inventing identity rules;
3. implementation requires a schema migration, Auth impersonation/redesign, new dependency, provider change, or permission architecture change;
4. preview cannot be denied independently of `NODE_ENV` and client-controlled state;
5. preview read-only behavior cannot be enforced server-side for every reachable mutation path;
6. company isolation cannot be proven for the actor, selected coordinator, surgeries, and global panel;
7. a production coordinator selector or fallback identity would be needed;
8. the change would alter coordinator assignment writes, CX/preparation transitions, SLA rules, audit attribution, or unrelated Cirugías behavior;
9. an active owner overlaps any sensitive file in the service/adapter/store/API/Coordination chain; or
10. tests reveal that loading/error/blocked states can expose another coordinator's data or masquerade as a legitimate empty inbox.

Fail closed under every stop condition. Do not widen the proposal silently.

---

## 12. Required validation direction

- **Service/adapter/store:** persisted coordinator assignment survives projection, serialization, mapping, and hydration; company predicates remain intact; absent assignments are not synthesized.
- **Personal resolver:** exact unique normalized match; unresolved and ambiguous blocks; wrong-company contacts excluded; no Nelson/default/first-match path.
- **Capability endpoint/service:** exhaustive allow/deny matrix for tier, flag, exact company, real session, company access, admin role, and selected contact eligibility.
- **Read-only enforcement:** every reachable preview mutation is absent/disabled in UI and rejected when called directly; no domain or preference write occurs.
- **Identity/audit:** current user/session/permissions/audit actor remain the real actor before, during, and after preview.
- **UI states:** initial loading, refresh, backend error/retry, blocked resolution, true empty, filtered empty/clear, populated results, and stale-capability denial.
- **Browser QA:** representative desktop and `412x915` mobile flows for strict personal inbox, multiple DEV coordinator previews, and `Panel global`.
- **Regression:** existing shared coordinator buckets, subgroups, SLA, material availability, incident reasons, next-action derivation, and normal global-panel access remain unchanged.
- **Diff audit:** no changes to schema, migrations, package manifests, Auth impersonation, data/fixtures, or production preview selector.

---

## 13. Proposal decision

The approved change is coherent with the current multi-company, backend-first direction and can proceed to `sdd-design` and `sdd-spec` within the boundaries above. It is not ready for APPLY until those artifacts freeze the temporary resolver contract, server capability contract, complete read-only enforcement surface, state machine, file ownership, and validation matrix.

The mandatory implementation order is: assignment read path and loading/error states first; strict production personal context second; server-gated DEV preview third; preview UI and hierarchy refinement fourth. No later phase may compensate for a failed earlier gate.
