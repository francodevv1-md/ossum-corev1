# ADR — Stock V1 Authorization, Multi-Company Enforcement, and Audit Boundaries

## Metadata

- **Status:** ACCEPTED — A-09 and A-10 approved by Franco on 2026-07-20
- **Date:** 2026-07-20
- **Owner:** Security / Multi-company Architecture
- **Approver:** Franco
- **Approval date:** 2026-07-20
- **Scope:** Stock V1 authorization and audit boundaries A-09 and A-10 only
- **Supersedes:** None
- **Superseded by:** None
- **Decision independence:** A-09 and A-10 were approved exactly as verified as part of Franco's blanket approval of A-01 through A-12.
- **Authorization effect:** None
- **Authorization boundary:** Only the next documentary SDD execution-plan phase is authorized.

This acceptance approves only the two architecture directions recorded below, exactly as verified and without semantic drift. It does not select an Auth provider, close `ADR-AUTH-FINAL.md`, approve a role taxonomy or role-to-capability mapping, create a permission matrix, authorize productive Auth, select a schema or RLS policy, or authorize any implementation, protected-file change, schema, permission implementation, or production activity. Only the next documentary SDD execution-plan phase is authorized.

## Context

The approved Stock V1 domain baseline requires strict company isolation, attributable critical actions, immutable accepted history, and explainable Stock effects. It includes exceptional and sensitive actions—such as supplier receipt without a purchase order, correction, reversal, opening position, reservation/release, dispatch, Consumption, Return disposition, and Transfer checkpoints—whose exact access ownership remains deliberately unresolved. The approved UX baseline requires explicit denied states, no invented roles, no client-side security reliance, and no accepted-success presentation before the server confirms the business outcome and required Stock consequence.

Current repository patterns can resolve an authenticated internal actor, active company membership, and a company-local role in DEV, and some services use inline role checks. These patterns are implementation evidence only. They do not establish the final Auth provider, productive session architecture, role model, Stock capabilities, or permission matrix. `ADR-AUTH-FINAL.md` remains DRAFT and independently blocks productive Auth closure.

The accepted Cajas authorization ADR establishes a compatible direction for centralized, provider-neutral capability policy with domain adapters. Stock V1 needs an independently approvable boundary that applies that direction to the wider Stock surface without inventing role names or final mappings. Stock also needs a precise distinction between immutable domain evidence—which explains accepted Stock truth—and transversal `AuditEvent` records—which attribute and correlate security-relevant activity but do not constitute Stock state.

## Inherited constraints

This ADR preserves, without reopening, the following approved or canonical constraints:

- Stock from one company must not be visible, reserved, moved, corrected, or otherwise acted upon as Stock of another company.
- Backend enforcement is mandatory; frontend availability, disabled actions, route parameters, and client-provided identifiers are not authorization.
- RLS may provide defense in depth but cannot replace backend membership, capability, and resource-company validation.
- Critical Stock actions require actor, company, time, cause, and relevant source context to remain attributable.
- Accepted Stock history is never destructively rewritten; correction and reversal use linked evidence.
- Domain evidence for an accepted checkpoint is not interchangeable with generic audit history.
- Denial or failure must not create accepted Stock evidence, movements, reservations, releases, projections, source-document success, or financial/commercial effects.
- No role name, role taxonomy, role-to-capability mapping, permission matrix, Auth provider, session mechanism, or productive-Auth decision is approved by the Stock domain or UX baselines.

## Decision drivers

1. Preserve provider neutrality while `ADR-AUTH-FINAL.md` remains unresolved.
2. Keep business capabilities stable when provider claims, session mechanisms, or role mappings later change.
3. Require consistent server-side authorization before any critical Stock side effect.
4. Enforce company membership and resource-company consistency independently rather than trusting a selected company identifier.
5. Prevent alternate routes or internal calls from bypassing policy.
6. Keep domain-specific contextual checks close enough to Stock ownership without duplicating role assumptions across services.
7. Make denied behavior side-effect-free and resistant to cross-company resource-existence disclosure.
8. Preserve immutable, queryable Stock evidence as domain truth while maintaining correlated transversal auditability.
9. Allow RLS or equivalent persistence controls to strengthen containment without becoming the sole business authorization source.
10. Avoid authorizing schema, APIs, permission implementation, or productive Auth through a documentary architecture decision.

## Trust boundaries

### Untrusted client and presentation boundary

Browser state, UI capability hints, disabled controls, cached membership, company selectors, request paths, request bodies, headers, and submitted resource identifiers are untrusted. They may improve UX but cannot grant access or prove that a resource belongs to the requested company. A denied surface must not be represented as empty Stock, and a denied action must not be represented as successful, pending, or not found merely for convenience.

### Authentication boundary

An approved server-side authentication mechanism must establish an internal actor identity. This ADR consumes that provider-neutral identity result but does not select how tokens, cookies, sessions, refresh, revocation, or provider claims produce it. Authentication proves actor identity; it does not by itself prove company membership or action capability.

### Membership and policy boundary

The trusted server must establish active membership for the target company and evaluate the requested Stock capability through a centralized policy boundary. Provider claims and role labels may later be inputs to an approved mapping, but domain services consume a capability decision rather than embedding provider-specific claims or final role names. Domain policy adapters supply Stock-specific resource and operation context without absorbing Stock validation or effect logic into the central policy layer.

### Domain service boundary

Every protected Stock read or command must enter through a trusted domain boundary that requires authorization context. Critical commands must be denied before accepted business mutation begins. Where mutable resource context or time-of-check/time-of-use risk exists, the trusted boundary must validate or revalidate company and policy-relevant facts within the same approved consistency boundary as the mutation. This requirement does not select a transaction, locking, or service implementation.

### Persistence and defense-in-depth boundary

Persistence constraints and RLS, if separately approved, may reject cross-company or otherwise unauthorized data access as defense in depth. They cannot be the only enforcement mechanism, cannot substitute for action-specific capability evaluation, and cannot justify late failure after an earlier business side effect. Administrative or service credentials must not silently bypass application policy.

### Evidence and audit boundary

Immutable Stock evidence belongs to the domain and explains accepted operational truth: the accepted cause, affected Stock scope, quantity or identified unit, disposition or custody consequence, source operation, and linked correction/reversal relationships. A correlated `AuditEvent` belongs to transversal audit and records who performed or attempted a security-relevant action, in which company and module context, against which target, and with which outcome metadata permitted by policy.

The two records have different responsibilities:

- Stock evidence is queryable domain truth and remains necessary even if audit retention or representation changes.
- `AuditEvent` is not a Stock movement, reservation, position, checkpoint, source document, or substitute for immutable domain evidence.
- Accepted critical actions must correlate their domain evidence and audit attribution through a stable operation/correlation context defined later; correlation does not merge their ownership or lifecycle.
- Denied attempts create no accepted Stock evidence and no success audit. Security-relevant denials may produce a distinct denial audit under a separately approved retention, sensitivity, and noise policy.
- Audit payloads and history views must obey the same company isolation and filtered-access requirements as the protected domain data.

## Considered option families

### A-09 — Provider-neutral capability policy

#### Option A — Centralized capability policy with Stock domain adapters

Use a centralized server-side capability policy contract over provider-neutral actor and company-membership context. Stock-owned adapters contribute action and resource facts needed for contextual decisions; Stock services invoke the policy before protected work. A future, separately approved mapping can translate roles or other grants into capabilities without changing Stock domain commands.

**Advantages**

- Separates Stock authorization semantics from provider claims and role names.
- Gives routes and internal service callers one denial contract.
- Reduces drift among receipts, reservations, movements, counts, corrections, reversals, and opening-position actions.
- Allows contextual company/resource checks without placing Stock business validation in a generic authorization utility.
- Aligns with the accepted Cajas authorization direction and allows Cajas permissions to be adapted rather than duplicated.
- Supports later least-privilege review and a separately approved capability matrix.

**Tradeoffs**

- Requires governance for capability vocabulary and policy ownership.
- Requires domain adapters to keep contextual facts precise and company-scoped.
- The central layer can become an inappropriate business-rules engine if its boundary is not controlled.
- Existing inline role checks would require a separately approved adaptation plan.

#### Option B — Domain-local guards over shared identity and membership

Let each Stock-related service define its own access rules while consuming a shared authenticated actor and company-membership context.

**Advantages**

- Keeps contextual checks close to each operation.
- Has lower initial abstraction overhead.

**Tradeoffs**

- Duplicates capability meaning and can produce inconsistent denial behavior.
- Encourages inline role assumptions before a final role model exists.
- Makes alternate-route and cross-domain review harder.
- Produces fragmented audit context and least-privilege testing.

#### Option C — Auth-provider claims or role strings as the Stock policy

Authorize Stock operations directly from provider claims or application role labels embedded in routes and services.

**Advantages**

- Appears simple for a small number of checks.
- Can reuse current DEV context fields directly.

**Tradeoffs**

- Couples Stock behavior to an Auth and role model that remains unapproved.
- Makes later provider or mapping changes invasive.
- Cannot safely express contextual resource-company and operation-state policy by itself.
- Risks turning temporary DEV patterns into productive architecture.

### A-10 — Multi-company enforcement and audit/evidence boundary

#### Option A — Explicit backend enforcement chain plus correlated, separate evidence and audit

For every protected Stock operation, the trusted backend independently verifies authenticated internal identity, active target-company membership, required capability, and consistency between the target company and every protected resource or linked source. Critical accepted actions append immutable Stock/domain evidence where required and create a correlated transversal audit record; neither substitutes for the other. RLS may be added only as defense in depth.

**Advantages**

- Makes company isolation and action authorization explicit and testable.
- Rejects client-supplied cross-company references before business effects.
- Preserves explainable Stock truth independently from audit representation.
- Supports consistent no-side-effect denial and safe resource-existence behavior.
- Allows persistence controls to strengthen, rather than define, business authorization.

**Tradeoffs**

- Requires every trusted entry point and internal command path to carry policy context.
- Requires later design of safe resource lookup, correlation, audit sensitivity, and failure behavior.
- Correlated domain and audit records introduce consistency and observability obligations without allowing either record to replace the other.
- Company-scoped policy revalidation may add query and transaction-design complexity.

#### Option B — Membership-only backend enforcement

Validate authenticated membership in the requested company, then allow Stock operations without action-specific capability or resource-company verification.

**Advantages**

- Simple broad company gate.
- Compatible with coarse existing read patterns.

**Tradeoffs**

- Violates least privilege for critical Stock actions.
- Trusts route/company context without proving linked resources share it.
- Cannot distinguish read, operational confirmation, correction, reversal, or exceptional paths safely.
- Makes permission changes and critical actions harder to audit meaningfully.

#### Option C — RLS- or persistence-led enforcement with audit as domain history

Rely primarily on RLS or persistence rejection for company isolation and use generic audit records as the historical explanation of Stock changes.

**Advantages**

- Can provide strong row-level containment when correctly configured.
- Reduces the apparent number of application checks and record families.

**Tradeoffs**

- Conflicts with the canonical requirement for backend validation independent of RLS.
- Can reject too late, after non-database or earlier business side effects.
- Cannot replace contextual capability policy.
- Conflates security/attribution history with immutable Stock domain evidence.
- Makes Stock reconstruction dependent on a generic audit format and retention policy.

## Accepted decision

**Accepted by Franco on 2026-07-20:** Option A for both A-09 and A-10, exactly as verified and without semantic drift, as one coherent security direction:

1. **A-09:** establish a centralized, provider-neutral server-side capability policy contract with Stock domain adapters. Do not define role names or a final role-to-capability mapping in this ADR.
2. **A-10:** require the backend to verify authenticated internal identity, active target-company membership, required capability, and resource-company consistency before protected reads or critical mutations. Keep RLS as optional defense in depth. Preserve immutable Stock/domain evidence as distinct from, but correlated with, transversal `AuditEvent` attribution.

The recommendation defines ordering and ownership of security decisions, not their source-code shape. Authentication supplies identity; membership establishes company eligibility; capability policy decides whether the action is allowed; resource-company checks constrain the actual target; domain validation decides whether the business command is valid; immutable evidence records an accepted domain fact; and audit records transversal attribution and security context.

## Accepted security invariants

1. **No implicit trust:** client state, UI visibility, company parameters, resource identifiers, and provider claims alone never authorize a Stock operation.
2. **Distinct checks:** authentication, active company membership, capability, resource-company consistency, and domain validity are separate requirements where applicable; passing one never implies the others.
3. **Provider neutrality:** Stock policy depends on an internal actor and approved capability decision, not on one provider's claim names, token format, or session mechanism.
4. **No role invention:** this ADR creates no role names and no final role-to-capability or exceptional-action mapping.
5. **Complete entry-point coverage:** API routes, Server Actions, background or internal commands, retries, and cross-domain calls cannot bypass the same trusted policy boundary.
6. **Company consistency:** every Article, position, deposit/custody context, identified unit, reservation, movement, source document, correction, reversal, and linked evidence reference used by an operation must be consistent with the authorized company where applicable.
7. **Safe denial:** denied operations commit no Stock/domain effect, projection update, source-document success, accepted evidence, or success audit and do not disclose inaccessible resource existence.
8. **Authorization before mutation:** policy and applicable resource-company checks occur before accepted business side effects; later persistence rejection is not the primary control.
9. **Defense in depth only:** RLS or equivalent persistence policy may tighten containment but cannot replace backend authorization or capability evaluation.
10. **Evidence integrity:** accepted Stock evidence remains immutable according to the approved domain baseline; correction or reversal links new evidence rather than editing or deleting prior facts.
11. **Audit separation:** `AuditEvent` supplements but never replaces Stock/domain evidence, current position, movement, reservation, source document, or checkpoint record.
12. **Correlated acceptance:** each accepted critical action must support correlation among actor, company, command/outcome, immutable domain evidence, required Stock consequence, and transversal audit without requiring one generic record to own them all.
13. **Audit isolation:** audit content, linked history, and denial telemetry must not expose another company's Stock, traceability, source documents, or resource existence.
14. **No productive Auth implication:** no approval under this ADR closes `ADR-AUTH-FINAL.md` or enables productive Auth.

## Failure and denied behavior

### Authentication failure

- Reject before protected resource or capability evaluation where safe.
- Create no Stock/domain effect or accepted evidence.
- Return an authentication failure contract without exposing company or resource facts.
- Any authentication-security telemetry remains governed by the future approved Auth/audit policy, not by Stock evidence.

### Company-membership or capability denial

- Reject before mutation and before returning protected Stock detail.
- Produce no reservation, release, movement, correction, reversal, opening position, projection change, source-document success, immutable accepted evidence, or success audit.
- Avoid distinguishing “resource exists in another company” from a safely equivalent inaccessible result.
- The UI may show an explicit denied surface or disabled/explained action using server-compatible information, but the server denial remains authoritative.
- A security-relevant denial may create a separate denial `AuditEvent` only under a later approved policy that controls sensitivity, retention, rate/noise, and viewer access.

### Resource-company inconsistency

- Treat any mismatch among request company, membership company, Stock resource, deposit/custody, physical identity, source operation, or linked evidence as denial or integrity failure before business effects.
- Do not repair, reassign, or infer company ownership from client input.
- Do not reveal which mismatched identifier was valid in another company.

### Stale authorization or resource context

- Re-evaluate applicable membership, capability, and resource-company facts at the trusted confirmation boundary.
- If the decision or protected context changed, reject the command, preserve only non-accepted draft input where separately authorized, and require refresh/review.
- Do not convert a stale denial into an optimistic or queued success.

### Business validation, persistence, or audit failure after authorization

- Authorization success does not imply business acceptance.
- A business validation or consistency failure produces no accepted Stock effect or evidence.
- For a critical accepted action whose audit attribution is required, the future technical design must prevent an outcome where domain evidence is treated as accepted while its required audit correlation is silently lost. The exact atomicity, outbox, retry, or reconciliation mechanism remains undecided.
- Unknown outcomes must be reconciled against immutable domain evidence before retry; repeated attempts must not duplicate domain effects or success audit records.

## Consequences

### Positive

- Stock authorization remains stable across later Auth-provider, session, and role-mapping decisions.
- Company isolation becomes an explicit server contract rather than a convention inferred from routes or UI state.
- Critical and exceptional Stock paths can receive least-privilege mappings later without rewriting domain commands.
- Cajas and wider Stock can share policy architecture while preserving their domain adapters and existing permission ownership.
- Immutable Stock evidence remains suitable for causality, history, correction, and reconciliation.
- `AuditEvent` can serve transversal attribution and security review without becoming an unofficial Stock ledger.
- Denied and cross-company behaviors become independently testable.

### Negative

- A centralized policy contract and domain adapters require explicit ownership and review discipline.
- Existing inline role checks cannot be adopted as final mappings and may need later approved migration.
- Every protected internal path must carry enough actor, company, action, and resource context for a reliable decision.
- Separate domain evidence and audit records require correlation, consistency monitoring, and access controls.
- Safe non-disclosing denial can complicate diagnostics and operator support.

### Risks

- A later role matrix could grant broad Stock capabilities without least-privilege review.
- Capability checks could be present at route level but bypassed by internal service calls.
- Resource-company validation could occur after a side effect or use client-provided ownership data.
- A central policy utility could absorb mutable Stock business rules and become difficult to govern.
- RLS or privileged service credentials could be mistaken for sufficient authorization.
- Audit payloads could leak protected Stock or cross-company resource identifiers.
- A generic `AuditEvent` could be treated as immutable Stock evidence, weakening causal history and reconciliation.
- Domain evidence and audit correlation could diverge if a later design permits partial acceptance.
- Denial telemetry could create excessive noise, sensitive retention, or a resource-existence side channel.
- This ADR could be misread as approval of productive Auth or a capability matrix; it is neither.

## Compatibility and adoption implications

- Current DEV identity resolution and active-company membership may provide compatibility inputs, but they do not become the final Auth architecture.
- Current role strings and inline guards remain evidence only; this ADR does not validate, rename, expand, or map them.
- The accepted Cajas capability-policy direction remains compatible and should be adapted into the shared policy boundary rather than duplicated or replaced.
- Existing Remittance, Consumption, Return, and Cajas permission ownership must not be silently changed by Stock policy adoption.
- Historical `AuditEvent` records must not be reclassified as missing Stock movements or immutable checkpoint evidence.
- No historical Stock evidence, company relationship, actor, capability decision, or audit correlation may be invented during later adoption.
- Any rollout requires a separately approved coverage inventory, anti-bypass review, role-to-capability matrix, compatibility plan, and rollback strategy.

## Explicit non-decisions and downstream blocks

This ADR does not decide or authorize:

- an Auth provider, token, cookie, session, refresh, revocation, key-rotation, identity-linking, or productive-Auth architecture;
- any role name, role taxonomy, role-to-capability mapping, user grant, permission matrix, emergency override, separation-of-duties rule, or two-person approval;
- exact capability identifiers, registry representation, policy API, adapter interface, denial code, middleware, route, service, validator, repository, cache, or source file;
- exact rules for who may perform exceptional no-PO receipt, correction, reversal, opening-position acceptance, or any other sensitive Stock action;
- a database model, column, relation, constraint, index, migration, seed, RLS policy, provider feature, service credential, or audit-storage mechanism;
- an `AuditEvent` schema, correlation-key format, payload, retention period, denial-audit selection, redaction, archival, or access policy;
- a Stock movement, reservation, position, projection, immutable-evidence, correction, reversal, or source-document schema;
- transaction, locking, consistency, outbox, retry, reconciliation, concurrency, idempotency, or TOCTOU implementation;
- APIs, Server Actions, background jobs, queues, UI components, capability-discovery endpoints, or offline behavior;
- changes to Stock, Articles, Cajas, Preparation, Remittance, Consumption, Return, Purchases, Cirugías, Surgery/Record, or Expediente;
- productive data access, implementation, tests, migrations, protected-file changes, APPLY, production rollout, or any phase beyond the next documentary SDD execution-plan phase.

`ADR-AUTH-FINAL.md` remains DRAFT and independently controlling. All schema, Auth, security, permissions, multi-company implementation, and protected phases remain blocked until their own Task Briefs, exact file allowlists, independently verified artifacts, and required Franco approvals exist. The only authorized continuation is the next documentary SDD execution-plan phase.

## Validation criteria for this ADR

This accepted ADR remains internally valid only if all of the following remain true:

1. A-09 and A-10 are visibly marked as accepted by Franco on 2026-07-20 exactly as verified.
2. Status is `ACCEPTED`, `Supersedes` is `None`, and `Authorization effect` is `None`.
3. A-09 recommends centralized provider-neutral capability policy with Stock domain adapters.
4. No role name, final capability identifier, role-to-capability mapping, permission matrix, provider, or productive session design is invented.
5. A-10 requires the backend to verify authenticated identity, active membership, capability, and resource-company consistency as distinct checks.
6. Client state and provider claims alone are never authoritative for Stock authorization.
7. RLS is described only as optional defense in depth and never as sole enforcement.
8. Denied and cross-company operations create no accepted business side effect, domain evidence, or success audit and do not disclose inaccessible resource existence.
9. Immutable Stock/domain evidence is clearly distinct from correlated `AuditEvent` records, and neither is represented as a substitute for the other.
10. Accepted critical actions remain attributable and correlatable without selecting an audit schema or transaction mechanism.
11. `ADR-AUTH-FINAL.md` remains DRAFT and productive Auth remains blocked.
12. No schema, permission implementation, API, source file, migration, RLS policy, audit-storage mechanism, or phase beyond the next documentary SDD execution-plan phase is authorized.
13. The approved Stock domain and UX baselines and accepted Cajas Stock direction are inherited without reopening their product or transaction decisions.
14. Exactly two decisions, A-09 and A-10, appear in the decision register.

## Decision register — approved by Franco

| ID | Accepted architecture decision | Accepted direction | Franco decision |
| --- | --- | --- | --- |
| `A-09` | **Provider-neutral capability policy** | Use a centralized server-side capability policy contract with Stock domain adapters. Keep provider/session choices, role names, exact capability identifiers, and final role-to-capability mappings unresolved. | **ACCEPTED by Franco — 2026-07-20** |
| `A-10` | **Multi-company enforcement and audit/evidence boundary** | Require backend verification of authenticated identity, active company membership, capability, and resource-company consistency; use RLS only as defense in depth; keep immutable Stock/domain evidence distinct from but correlated with transversal `AuditEvent`. | **ACCEPTED by Franco — 2026-07-20** |

**Decision count:** exactly two accepted decisions, `A-09` and `A-10`.

Franco explicitly approved both rows as part of the blanket approval of A-01 through A-12 on 2026-07-20. The accepted wording is unchanged from the verified recommendations. No Auth, provider, role, capability mapping, permission, schema, security implementation, or other downstream authority follows from this acceptance; only the next documentary SDD execution-plan phase may proceed.

## Open technical questions reserved for later approval

1. What exact provider-neutral capability identifiers and naming governance should a future matrix use?
2. Which approved role or grant maps to each Stock capability, including exceptional no-PO receipt, correction, reversal, and opening position?
3. Which contextual facts belong in the central policy contract versus Stock domain validation?
4. How are existing Cajas, Remittance, Consumption, and Return permissions adapted without semantic drift?
5. How does a future UI obtain non-authoritative action availability while safely handling stale membership or capability data?
6. Which denied attempts require audit, redaction, retention, rate controls, and restricted viewing?
7. What correlation contract links command, immutable Stock evidence, source-domain evidence, Stock consequence, and `AuditEvent`?
8. What approved mechanism prevents or reconciles partial loss of required audit correlation after a critical accepted action?
9. What RLS or persistence constraints, if any, add useful containment without weakening application enforcement?
10. How are authorization changes invalidated across sessions after productive Auth architecture is approved?
11. What filtered history and capability behavior applies to external users?
12. Is any emergency override permitted? None is proposed here.

## References and provenance

- `knowledge/specs/STOCK-V1-DOMAIN-BLUEPRINT-001/PROPOSAL.md` — approved Stock domain baseline; verified working-tree blob `926476e1d5e275768296329e099e32e04069224e` before authoring.
- `knowledge/specs/STOCK-V1-UX-BLUEPRINT-001/PROPOSAL.md` — approved Stock UX baseline; verified working-tree blob `95d8d986e7dc426b48a7b4480966a558a54d52ed` before authoring.
- `knowledge/architecture/ADR-CAJAS-STOCK-TRANSACTIONS.md` — accepted Cajas Stock transaction direction; verified working-tree blob `5f470c58113c8990ea8bd83aaa811730f9417a55` before authoring.
- `knowledge/architecture/ADR-CAJAS-AUTHORIZATION.md` — accepted provider-neutral capability-policy direction for Cajas; no Stock role mapping inherited.
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md`.
- `knowledge/architecture/AUDIT_EVENT_POLICY.md`.
- `knowledge/architecture/ADR-AUTH-FINAL.md` — DRAFT; remains independently blocking.
- `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` — current V0/DEV evidence only, not productive Auth closure.
