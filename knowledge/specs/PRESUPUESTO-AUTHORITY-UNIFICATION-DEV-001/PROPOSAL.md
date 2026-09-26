# Proposal: Presupuesto Authority Unification

## Intent

Replace the split Presupuesto workflow—visible Zustand/localStorage records plus a separate Prisma/API model—with one company-scoped Prisma/API authority. Preserve the approved commercial/version history and make Sales, New Surgery, Expediente, PDF, and email consume the same IDs and contract.

## Scope

### In Scope
- One active Presupuesto family per Surgery; standalone quotations remain allowed.
- Editable `Borrador`; immutable emitted versions; revisions create a new draft; the prior version becomes `Reemplazado` atomically only when its replacement is emitted.
- Only `Emitido` and `Aprobado` may be emailed.
- Persist the domain-required commercial record: visible number, company/branch, client/payer, optional Surgery, dated version/responsible user, items, quantities, prices, discounts, item VAT, discriminated totals, payment terms, price list, validity, legend/clarifications, notes, and firm-price detail where applicable.
- Database/service invariants, optimistic concurrency, transactional audit, migration artifact/application to the confirmed disposable DEV target, API/UI integration, tests, and browser validation.

### Out of Scope
- Production/staging/deploy; Auth or role changes; fiscal billing; Orden/Pedido backend; unrelated Cirugías refactors; provider/dependency changes; commit, push, or PR.

## Capabilities

### New Capabilities
- `presupuesto-authority`: canonical commercial contract, family/version lifecycle, immutability, concurrency, and audit.
- `presupuesto-workflow-integration`: API-backed Sales, New Surgery, Expediente, PDF, and email behavior.

### Modified Capabilities
- None; no repository-level OpenSpec capability currently governs Presupuestos.

## Approach

Add the minimum persistence fields and database constraints required for family/current-draft integrity and optimistic revision. Centralize commands in the existing service, validate at API boundaries, and audit each accepted mutation in the same transaction. Introduce a small API client/hook and adapt existing Presupuesto surfaces; remove visible Presupuesto writes from the local store only after parity. Execute in reviewable schema, backend, UI, and validation slices.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `prisma/schema.prisma`, migration | Modified/New | Commercial snapshots and invariant enforcement |
| `src/lib/{services,validators,api}` | Modified/New | Canonical contract and commands |
| Presupuesto API routes | Modified | CRUD, version, state, emit, email |
| Sales/New Surgery/Expediente | Modified | Replace local authority end to end |
| focused tests | Modified/New | State, race, tenant, audit, UI evidence |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Concurrent drafts/emissions | High | DB uniqueness, expected revision, serializable commands |
| Dirty-file overwrite | High | Exclusive locks; isolated accepted baseline or stop |
| Legacy contract drift | Medium | Adapter cutover and no dual writes |

## Rollback Plan

Before cutover, revert only owned files and rebuild the disposable DEV database from accepted migrations if required. After cutover, disable new mutations and roll forward; never rewrite emitted history or unrelated work.

## Dependencies

- Franco approval recorded in this package and Engram #6118.
- Confirmed disposable Supabase DEV ref `yywqcdromnmmelijvspi`; identity must be re-proven without exposing secrets.

## Success Criteria

- [ ] Every visible Presupuesto surface reads/writes the API authority; no local dual write remains.
- [ ] Commercial, family/version, immutability, email, concurrency, tenant, and audit tests pass.
- [ ] Prisma gates, typecheck, focused tests, build, and authenticated browser QA pass.
