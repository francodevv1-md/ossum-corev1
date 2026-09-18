# Task Brief — Supplier Remittance Zustand Cleanup DEV 001

- objective: remove only the three legacy supplier-remittance demos from initial and persisted Zustand state
- approved records: `RP-0001`, `RP-0002`, `RP-0003`
- preserve: every other user-created local supplier remittance
- scope: Zustand initial state, one-time persist migration, focused unit test
- excluded: GoodsReceipt/PostgreSQL data, schema, Auth, roles, APIs, production data, deployment
- validation: focused Vitest, ESLint, TypeScript changed scope, diff check
