# Task Brief — Supplier Receipt Flow DEV 001

- objective: make physical receipt an internal stage of Supplier Remittances, never a second document-upload flow
- approved flow: Articles → Supplier Remittance → Physical Receipt → Differences → Stock Confirmation
- scope: supplier-remittance workspace, receipt launch/resume route, legacy receipt redirect, sidebar cleanup, focused tests
- data strategy: reuse existing `GoodsReceipt`; correlate with supplier remittance through the existing idempotency key without schema or migration changes
- UX: inherit the operational Remitos workspace language; expose pending, in-progress, discrepancy, blocked, and confirmed states with text plus semantic color
- excluded: schema, migrations, Auth, roles, production data, deployment, dependencies, physical scanner logic
- validation: focused Vitest, ESLint, diff check, desktop/mobile browser QA, independent review
