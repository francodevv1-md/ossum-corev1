# Task Brief — Phase E Logistics Operations UX

## Objective

Implement the approved, server-authoritative operational logistics workspace only in Ficha CX → Logística.

## Scope

- Consume the E1 operations projection and `none | exact | ambiguous` resolver.
- Render physical allocations, trace, differences, capabilities, scanner, and existing Phase B/C/D actions without reconstructing state or permissions in the client.
- Keep the change scoped to `LogisticaTabContent` and dedicated logistics UI helpers.

## Exclusions

Backend contracts, schema, migrations, stock rules, Auth, other Ficha tabs, dependencies, Git, deploy, billing, purchases, and replenishment.

## Delivery

Working-tree DEV package only. No commit or PR is requested or permitted; PR sizing/chaining is not applicable.

## Validation

Focused component tests, TypeScript typecheck, visual/self review for responsive operational states, and browser QA by an independently authenticated verifier.
