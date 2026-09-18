# Contact Backend Authority — Design

## Data ownership

- `Contact`: global identity, trade name, notes and reusable addresses; Franco confirmed these values may be shared across linked companies on 2026-09-03.
- `ContactCompanyLink`: non-null company code, broad roles, legacy role, active state, payer/commercial profile, doctor profile and delivery notes.
- `ContactGroup.slug`: stable frontend key, unique per company; memberships continue to reference groups.

## Write path

Routes parse with `src/lib/validators/contact.ts`. The service performs Contact, company link, memberships and main-address writes in one Prisma transaction. A PostgreSQL `BEFORE INSERT` trigger serializes allocation per company with an advisory transaction lock, so every direct writer receives the next canonical code; explicit duplicate codes return conflict.

## Read path

Company-link queries contain company, active, role, contact type and text-search predicates before pagination. The service flattens company fields, stable group slugs and the main address. The HTTP list envelope remains unchanged, so existing array consumers continue to work.

## Migration safety

Columns begin nullable where backfill is required. Legacy roles remain untouched, broad roles and codes are derived, canonical groups are inserted for every company, duplicate main flags are demoted without deleting addresses, and uniqueness/non-null constraints are created afterward. Database execution is allowed only after explicit confirmation that the target is disposable DEV; that confirmation was received before applying this migration.
