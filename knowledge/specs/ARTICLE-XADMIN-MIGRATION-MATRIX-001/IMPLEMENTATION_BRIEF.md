# Implementation Brief — Article Taxonomy and XADMIN Classification Migration

- **Status:** CLOSED — independent review PASS; no implementation authority
- **ID:** `ARTICLE-XADMIN-TAXONOMY-IMPLEMENTATION-001`
- **Source contract:** `MIGRATION_MATRIX.md`
- **Scope:** Future Article taxonomy catalogs, compatibility transition, and reviewed legacy classification migration planning
- **Documentation ownership:** released

## Objective

Replace ambiguous Article free-text classifications with the approved separation while retaining legacy evidence losslessly:

```text
Operational: articleType = STANDARD | COMPOSITE
Product: Category → Subcategory → optional third level
Clinical: Clinical Family
Commercial: Brand · Manufacturer · optional Product Line
```

`COMPOSITE` is valid only when `CajasBoxFormula.currentVersionId` is present. `StockIdentifiedUnit` identifies physical boxes independently. Fabricado/Reventa remains legacy evidence without automatic semantic mapping.

## Required implementation slices

1. Define catalog ownership, canonical IDs, active status, aliases, and hierarchy validation for Product Classification, Brand, Manufacturer, Product Line, and Clinical Family.
2. Define Article references to those catalogs and retain raw XADMIN source evidence, mapping status, confidence, and review reason.
3. Replace old Article type labels with `STANDARD | COMPOSITE` only after Cajas service guards support formula/current-version evidence and existing physical units remain visible and assignable.
4. Provide reusable single-select catalog controls for Article form/editing and descendant-aware multi-select filters for Stock.
5. Restrict master-catalog rename, merge, deactivate, and reparent actions to governed Settings workflows with audit; permit only bounded quick creation from Article forms.
6. Execute a reviewed, lossless migration process: stage source first, preserve every row, map only accepted aliases, and report `MAPPED`, `REVIEW_REQUIRED`, `UNMAPPED`, `REJECTED`, or `UNCHANGED_LEGACY` without silent drops.

## Explicit non-goals

- Schema edits, migrations, backfills, DB access, seed/import execution, or data mutation.
- API, UI, Auth, permissions, audit, Cajas, Stock, or service implementation.
- Automatic conversion of Fabricado/Reventa, Department, Rubro, Sección, or description into canonical classifications.
- Sector mapping until an authoritative source includes it.

## Gates before implementation

1. Confirm catalog semantics, hierarchy depth, and canonical alias rules.
2. Produce exact schema/API/UI/permission design under explicit ownership and locks.
3. Reconcile and deploy Cajas compatibility guards using `CajasBoxFormula.currentVersionId`; verify physical unit visibility and assignment before any article-type change.
4. Approve a migration plan with disposable DEV database confirmation before any data action.
5. Run focused migration, authorization, selector, filter-descendant, and regression validation before release.

## Acceptance criteria for a future implementation

- `articleType` persists only `STANDARD` or `COMPOSITE`.
- `COMPOSITE` requires `CajasBoxFormula.currentVersionId`; a physical box requires `StockIdentifiedUnit`.
- Product, clinical, and commercial axes remain independently selectable and filterable.
- Parent Category filters include descendants.
- Alias search resolves to one canonical catalog ID without producing duplicate filter values.
- Legacy source rows are preserved and no ambiguous row is auto-mapped.
- Catalog structural mutations are audited and governed outside Article quick creation.

## Stop conditions

- Any need to infer Category, Clinical Family, composite behavior, or procurement semantics from description-only or Fabricado/Reventa evidence.
- Any overlap with the parallel taxonomy owner without an explicit lock transfer.
- Any schema, migration, backfill, DB, Auth, permission, Cajas guard, API, or UI action without its separate approved gate.

## Closure

- Independent documentation review: PASS.
- The documentation-only ownership for this brief and the reconciliation artifacts is released.
- The next package is a separately owned and separately approved exact technical design for schema/API/UI and Cajas compatibility. It does not inherit authority from this closed brief.
