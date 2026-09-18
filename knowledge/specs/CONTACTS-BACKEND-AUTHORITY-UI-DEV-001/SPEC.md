# Contact Backend Authority — Delta Spec

## Requirements

1. Contact identity and reusable addresses are global and may be shared across linked companies; company code, roles, commercial, medical and delivery profiles are stored on `ContactCompanyLink`. Franco confirmed this shared-data behavior on 2026-09-03.
2. Each company link has a canonical `C-0001`-style code unique within its company. Omitted codes are allocated by a company-serialized database trigger for every write path.
3. List reads are active-only by default, may include inactive links explicitly, search in the database before pagination, and cap `take` at 500.
4. Create and update use one strict Zod contract and transactionally synchronize stable group slugs and one main address.
5. API responses remain arrays for list callers and flatten company profile, group slugs, and main address for the frontend adapter.
6. The migration preserves rows, legacy role values, backfills roles/codes, seeds canonical company groups, and adds constraints only after backfill. Execution requires explicit confirmation that the target is disposable DEV; that confirmation was received before applying it.

## Acceptance Scenarios

- Creating without a code returns the next available company code.
- Concurrent creates serialize code allocation per company without duplicate codes.
- An explicit malformed or duplicate code is rejected.
- `includeInactive=true` returns active and inactive company links; omitted defaults to active only.
- Search predicates are sent to Prisma before `skip`/`take`.
- A Contacto payload round-trips all persisted form fields through the adapter.
