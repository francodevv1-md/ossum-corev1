---
name: ossum-safe-changes
description: "Trigger: schema, migration, accounting, purchases, complex business logic. Scope OSSUM changes using canonical rules and verified DEV evidence."
license: Apache-2.0
metadata:
  author: ossum-cor
  version: "1.0"
---

# OSSUM safe changes

## Activation Contract
Use for schema/migrations, accounting/purchases and complex cross-module domain logic. Not for cosmetic UI or simple reads. This skill does not approve protected changes.

## Hard Rules
- Read root AGENTS.md, current ownership and relevant approval before edits.
- Trace callers through UI → client → validator/API → service → database. Reuse existing rules; never invent accounting or Surgery transitions.
- Use version-matched Prisma docs; the deprecated prisma-postgres alias is not migration guidance.
- Preserve company scoping, permissions, audit and precision/rounding conventions. Never alter Auth/security to pass tests.
- Execute migrations only within the approved package on its identified disposable DEV target. Never reset or mutate real data.

## Decision Gates
| Scope | Load only the applicable reference |
| --- | --- |
| Surgery lifecycle | SURGERY_EXPEDIENTE.md and CENTRAL_OPERATIONAL_FLOW.md |
| Quotations | PRESUPUESTOS.md |
| Purchases | COMPRAS_PROVEEDORES.md |
| Accounting/payment | FACTURACION_COBROS.md and FISCAL_BOUNDARY_TUSFACTURAS.md |
| Stock/logistics | STOCK_CAJAS_TRAZABILIDAD.md or PREPARACION_REMITOS_CONSUMO.md |
| Schema | Current schema, affected migrations and current architecture ADR |

## Execution Steps
1. Create a compact internal brief: business outcome, affected files, exclusions, validation. Reserve shared files.
2. Establish the existing behavior and minimum acceptance checks. Ask only if materially different business outcomes remain ambiguous.
3. Implement the smallest authorized change. Declare additive schema/migration artifacts when necessary; do not apply to an unconfirmed target.
4. Run focused checks including invalid transitions, monetary boundaries or persistence as applicable. For failed checks, Diagnose before fixing.
5. Run applicable type/build and Prisma format/generate checks; obtain independent review for critical changes. Record evidence and release ownership.

## Output Contract
Use Done / Changed / Files / Validations / Risks / Next. Distinguish PASS, FAIL, BLOCKED and NOT RUN; identify unresolved business decisions without turning technical phases into user approvals.

## References
- ../../../AGENTS.md — delivery and approval boundaries.
- ../../../knowledge/domain/ — domain documents named above.
- ../../../knowledge/architecture/ — current ADRs.
