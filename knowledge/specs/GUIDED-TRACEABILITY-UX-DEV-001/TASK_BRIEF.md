# Guided Traceability UX DEV

## Approval

Franco approved implementation on 2026-08-24. DEV database is disposable.

## Objective

Guide receiving operators through `identify article → collect only missing required traceability → confirm unit` without exposing GS1 implementation details in the operational path.

## Rules

- Resolve an article through GTIN, manufacturer reference, supplier code, or alternative identifier.
- A structured GS1 scan fills every available supported value: GTIN, AI 240, lot, serial, and expiration.
- An unstructured scan is written only to the field requested by the guided UI; OSSUM never infers its semantics.
- Article traceability requirements are minimum requirements: none, lot, serial, lot-or-serial, or lot-and-serial. Expiration is independent.
- Additional valid traceability is retained and never invalidates an otherwise complete unit.
- Legacy `LOT_SERIAL_EXPIRY` becomes strict `LOT_AND_SERIAL` plus required expiration. No existing article is relaxed automatically.
- AI/raw payload/parser metadata is diagnostic evidence, visible only through an operational details disclosure.

## DEV boundary

Additive schema migration and data backfill only on the confirmed disposable DEV database. No Auth, Cirugías, supplier-specific parsing, dependencies, production, staging, deploy, or commits.

## Validation

Prisma format/generate/migration status; focused policy, receipt-service, scanner, and UI tests; browser QA against the DEV receipt flow.

## Identity Completion (2026-08-24)

- AI (240) resolves through `MANUFACTURER_REF`; the matching identifier remains in the existing scan candidates evidence.
- Plain barcode scans resolve only through the approved permanent identifier routes: GTIN, manufacturer reference, supplier code, and alternative code.
- Focused identity and receipt tests passed.
