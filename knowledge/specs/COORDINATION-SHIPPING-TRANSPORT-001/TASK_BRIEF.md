# Task Brief — Coordination Shipping and Transport Durability

- **Approval:** Franco explicitly confirmed `confimro pa metele` on 2026-08-15 after the schema ownership blocker was disclosed.
- **Objective:** persist the material shipping date and planned transport captured by Coordination management, rehydrate both fields, and keep Seguimiento as evidence rather than authority.
- **Schema ownership:** exclusively transferred to Gentle Fast / GPT-5.6 Sol for this additive slice. Foreign baseline blob `d5d3f59bc24b9d8b85ddef46a23d99e3965b1ea1` must be preserved byte-for-byte except for the two Surgery fields.
- **Owned files:** `prisma/schema.prisma`, one new migration, Surgery validator/service/detail route/read DTO/adapter/client type, Coordinator management dialog, and focused tests.
- **Lock:** `released`.
- **Initial implementation exclusion:** migration execution required a separate disposable-DEV confirmation; backfill, Auth/permissions, Remito authority changes, Stock/Cajas edits, production, and deployment remained excluded.
- **Validation:** exact scoped schema diff, Prisma format/validate/generate, focused tests, TypeScript, ESLint, build, migration artifact review, and independent review.
- **DEV execution:** Franco confirmed the configured database is disposable DEV on 2026-08-15. `prisma migrate deploy` applied only `20260815233000_coordination_shipping_transport_001`; follow-up status reported the schema up to date and Prisma validation passed.
