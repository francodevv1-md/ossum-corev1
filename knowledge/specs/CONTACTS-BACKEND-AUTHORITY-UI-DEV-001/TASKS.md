# Contact Backend Authority — Tasks

## Review Workload Forecast

- 400-line budget risk: High
- Chained PRs recommended: Yes
- Decision needed before apply: No
- Resolved path: bounded backend/data work-unit slice explicitly assigned by the user; no commit or PR action.
- Chain strategy: pending

## Backend/data slice

- [x] Extend Contact schema and add a non-destructive migration artifact.
- [x] Add centralized create/update/list validation.
- [x] Make service reads database-filtered and flatten backend authority fields.
- [x] Make create/update transactional, including groups and main address.
- [x] Add server-side sequential code allocation with unique-race retries.
- [x] Complete Contacto/API adapter round-trip and contacts API client.
- [x] Add focused validator, adapter, migration and service tests.

## Other work units

- [x] Frontend Contactos authority integration and redesign.
- [x] Focused TypeScript/build/browser verification after UI integration.
