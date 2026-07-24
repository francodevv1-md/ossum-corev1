# ADR — Cajas Capability-Based Authorization

## Metadata

- **Status:** ACCEPTED — Option A approved by Franco on 2026-07-19
- **Date:** 2026-07-19
- **Owner:** Architecture / SDD Design Author
- **Approver:** Franco
- **Scope:** Authorization architecture for approved Cajas capabilities and existing permissions
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** This proposal may be approved, revised, or rejected independently from the other Cajas ADR proposals.
- **Authorization effect:** None. Approval would not change the Auth provider, approve role mappings, modify permissions, authorize implementation, or close `ADR-AUTH-FINAL.md`.

## Context and approved product constraints

DG-05 approves capability-level behavior, not roles:

- Cajas consultation follows current access rules.
- Editing `Contenido esperado` requires the Articles/Stock capability.
- Preparation, preparation control, and `Recontrolar caja` require the operational capability.
- Dispatch/Remittance and Return reuse their existing permissions.
- V1 does not require preparation and control to be performed by different people.
- Formula editing, preparation, control, re-control, dispatch, return, and difference resolution are auditable.
- An unavailable action remains visible but disabled with an explanation.
- Any direct backend/API invocation must also be denied with no version, snapshot, record, assignment, Stock movement, current-condition change, or other business side effect.

Every action is company-scoped. The approved DGs do not define new role names, map capabilities to current roles, select an Auth provider, or modify the current identity/session architecture.

## Current evidence and gaps

The current DEV stack has a server-side auth context, internal-user mapping, company membership through `UserCompanyAccess`, and read/mutation guards. D02 also found inconsistent domain role contracts and no dedicated centralized permission layer that expresses the approved Cajas capabilities. Some permissions remain inline by service. `ADR-AUTH-FINAL.md` is DRAFT and explicitly blocks productive Auth closure.

Therefore, existing identity and company-membership patterns are useful evidence, but they cannot be treated as approval for a final provider, role taxonomy, capability mapping, session strategy, or productive Auth design.

## Decision drivers

1. Enforce approved capabilities server-side with zero side effects on denial.
2. Preserve existing Remittance/Return permission ownership.
3. Avoid inventing Cajas-specific roles or coupling domain behavior to provider claims.
4. Apply least privilege and company membership consistently.
5. Keep UI explanations aligned with, but not authoritative over, server policy.
6. Produce auditable allow/deny context for critical mutations.
7. Permit future role mapping without rewriting domain services.
8. Respect the unresolved `ADR-AUTH-FINAL.md` boundary.

## Viable option families

### Option A — Central capability policy layer with domain policy adapters

Define stable capability identifiers and evaluate them in a centralized server-side policy boundary using authenticated identity, company membership, and contextual resource facts. Domain services invoke policy checks before mutations; existing Remittance/Return permissions are adapted rather than replaced.

**Advantages**

- Separates business capabilities from provider and role names.
- Offers consistent denial semantics and audit context.
- Supports later mapping changes without changing every domain service.
- Makes least-privilege review and tests easier.

**Tradeoffs**

- Requires governance for capability naming and policy ownership.
- Contextual checks may still need domain-specific adapters.
- A central layer can become overly broad if it absorbs business validation.

### Option B — Domain-local guards over a shared identity/company context

Each Cajas, Stock, Remittance, and Return service owns its authorization rules, while all use the same authenticated actor and company-membership context.

**Advantages**

- Rules remain near the protected operation.
- Lower initial abstraction overhead.
- Domain-specific context can be evaluated directly.

**Tradeoffs**

- Capability meaning and denial behavior may drift across services.
- Role assumptions can be duplicated inline.
- Cross-domain actions may perform inconsistent checks.
- Auditing and policy review are harder to centralize.

### Option C — Provider/RLS-led authorization

Encode primary authorization in Auth-provider claims and/or database row-level policies, with application checks as a secondary layer.

**Advantages**

- Strong database-level containment can provide defense in depth.
- Provider claims may simplify some broad access checks.

**Tradeoffs**

- Conflicts with the canonical rule that RLS cannot replace backend validation.
- Couples business capabilities to provider/session design that remains unapproved.
- Complex action-specific no-side-effect rules are difficult to express solely at row level.
- Existing service transactions could fail late rather than deny before side effects.

## Proposed direction for review

**Non-binding proposal:** adopt Option A: a server-side capability policy layer with domain policy adapters, while retaining provider-neutral identity and explicit company-membership checks. Database/RLS controls, if later approved, remain defense in depth rather than the business authorization source.

The direction would establish:

- stable capability concepts for Articles/Stock formula editing and Cajas operations;
- adapters to existing Remittance and Return permissions rather than replacement permissions;
- policy inputs based on authenticated internal actor, active/target company membership, action, and relevant resource context;
- authorization before entering any mutating business transaction;
- re-checks within trusted service boundaries where time-of-check/time-of-use risk exists;
- one denial contract that yields no domain, Stock, audit-success, or projection side effect;
- UI action availability derived from server-compatible capability information, with disabled explanations but no security reliance on UI state; and
- audit of successful critical actions and security-relevant denied mutation attempts according to a later approved audit policy.

This proposal deliberately leaves every role-to-capability mapping and Auth-provider/session choice unresolved.

## Consequences

### Positive

- Approved capabilities remain stable even if role names or provider details change.
- Domain services receive a consistent security contract.
- Existing Remittance/Return permission ownership can be preserved.
- Least-privilege and company-isolation tests become explicit.
- UI and API denial behavior can share vocabulary without sharing trust.

### Negative

- A new policy boundary and capability registry require ownership and documentation.
- Contextual policies still need careful domain integration.
- Existing inline role checks may need gradual adaptation after separate approval.
- Capability discovery for UI can introduce stale display states that still require server rejection.

### Risks

- Capabilities could be mapped too broadly to existing roles.
- A service might omit a policy call or authorize before loading company-scoped context.
- Existing dispatch/return permissions could be accidentally replaced rather than reused.
- Denied attempts could leak resource existence across companies.
- Authorization checks inside a multi-step transaction could occur after an early side effect.
- This ADR could be misread as closing productive Auth; it does not.

### Migration and compatibility implications

- Existing inline guards remain evidence and compatibility constraints until separately approved migration tasks replace/adapt them.
- Current DEV identity resolution may supply policy inputs, but no provider commitment is created.
- Role mapping must be introduced through a separately reviewed matrix and rollout plan.
- API clients must handle explicit denied states without treating them as empty or generic failure.
- Existing company-scoped services require regression tests during any guard adaptation.

## Boundaries and non-goals

- No Auth provider, session, token, cookie, refresh, revocation, or key-rotation decision is made.
- No role names, role taxonomy, role-to-capability mapping, or permission matrix is approved.
- No two-person control rule is introduced.
- No source file, API route, middleware, RLS policy, or permission-library implementation is selected.
- No productive Auth activation is authorized.
- No business rule beyond `CAPABILITY-01`–`CAPABILITY-06` is introduced.
- No cross-company administration or external-user policy is invented.

## Security, multiempresa, and audit implications

- Authentication, company membership, capability, and resource-company checks are distinct and all required where applicable.
- Client-supplied company or resource identifiers are never sufficient authorization.
- Denials must be side-effect-free and should avoid confirming the existence of inaccessible resources.
- RLS may be defense in depth only; backend policy remains mandatory.
- Critical successful actions record actor, company, action, target, and relevant context.
- Denied mutation attempts should be auditable when useful and safe, but exact retention/noise policy remains open.
- Capability changes and role mappings themselves require audit under canonical Knowledge.

## Validation obligations

A future implementation plan must verify:

- consultation follows existing read access without inventing roles;
- formula edit, operational actions, Remittance, and Return each use the correct approved capability/permission owner;
- users with read access but without action capability see explicit denied action states;
- direct unauthorized invocation returns denial and commits no version, evidence, assignment, movement, condition, or success audit;
- cross-company read/write attempts are rejected without resource leakage;
- capability checks cannot be bypassed through alternate routes or internal service calls;
- transaction tests prove authorization occurs before side effects;
- current existing Remittance/Return permission behavior has regression coverage;
- least-privilege role-matrix tests are added only after Franco separately approves that matrix; and
- productive Auth remains blocked until `ADR-AUTH-FINAL.md` is approved.

## Protected approvals still required

- Closure and Franco approval of `ADR-AUTH-FINAL.md` before productive Auth.
- A separate role-to-capability and permission-matrix decision by Franco.
- Exact security/multi-company Task Brief and file allowlist.
- Approval for any adaptation of existing inline guards or permission files.
- Audit policy details for denied attempts and capability changes.
- Any RLS/provider/session changes require their own approval.
- Independently verified TASKS amendment and separate APPLY approval.

## Open technical questions not settled by approved DGs

1. What exact stable identifiers name the approved capabilities without encoding role names?
2. Which contextual facts belong in central policy versus domain validation?
3. How are existing Remittance and Return permissions adapted without semantic drift?
4. How does the UI obtain action availability while remaining safe under stale membership/capability data?
5. Which denied attempts should be audited, retained, and rate-limited?
6. How are capability changes propagated and invalidated across sessions after Auth architecture is approved?
7. What policy applies to external users and filtered history?
8. Which emergency or administrative override, if any, exists? No override is proposed here.
9. Which capability or existing permission, if any, authorizes difference-resolution actions? This mapping remains open and requires Franco approval in a future Task Brief.

## Approval checklist — separate Franco decision

- [x] Franco accepts the proposed Option A direction.
- [ ] Franco requests revisions before a decision.
- [ ] Franco rejects this direction and requests another option family.
- [x] Franco confirms that no role mapping or Auth-provider decision is approved here.
- [x] Franco confirms `ADR-AUTH-FINAL.md` remains DRAFT and independently blocking.
- [x] Franco records a separate decision for this ADR, independent of the other three Cajas ADRs.

**Current approval state:** Franco approved Option A on 2026-07-19. This acceptance approves only the centralized server-side capability-policy direction; role mapping, the exact capability or existing permission for difference resolution, Auth-provider/session decisions, productive Auth, permission changes, exact files, implementation, Cirugías/Expediente refactoring, TASKS amendment, and APPLY remain separately gated.

## References and traceability

- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/SPEC.md`: `STATE-04`, `FORMULA-01`, `CAPABILITY-01`–`CAPABILITY-06`, `HOST-01`–`HOST-05`, `STOCK-10`; scenarios `STATE-02`, `DG05-01`–`DG05-02`, `DG06-01`–`DG06-02`.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/DESIGN.md`: §§6.3, 7.4, 9–12, 14–15, 17.
- `knowledge/specs/CAJAS-UX-SDD-PROPOSAL-001/TASKS.md`: D02 and blocked packages B02–B09.
- `knowledge/architecture/ADR-AUTH-FINAL.md` — DRAFT boundary remains controlling.
- `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md`.
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md`.
- `knowledge/architecture/AUDIT_EVENT_POLICY.md`.
- Related proposals: `ADR-CAJAS-CORE-PERSISTENCE.md`, `ADR-CAJAS-STOCK-TRANSACTIONS.md`, `ADR-CAJAS-OPERATIONAL-INTEGRATIONS.md`.
