# Ownership

- task: DISTRICORR-TWO-INSTITUTION-MAP-DEV-001
- agent role: orchestrator/backend integration
- selected model: openai/gpt-6.1-sol
- owned files: this task folder; prisma/schema.prisma geography enums/ContactAddress fields only; prisma/migrations/20260910120000_contact_address_geography/migration.sql; scripts/dev/districorr-two-institution-map-20261002.ts; src/__tests__/unit/districorr-two-institution-map.test.ts.
- status: released
- prisma/schema.prisma: Franco explicitly confirmed release of the previous Documentos de Ajuste reservation. Only four existing-canonical geography enums and additive ContactAddress geography fields/indexes; preserve foreign changes and existing tenancy.
- database scope: exact two user-provided institution/case associations and geography only in approvedDEV company. Other sourcecases/Auth/staff/Cajas remain untouched.
- migration scope: execute only the exact reused additive geography artifact, not migrate deploy or other pending migrations. No tenant/security/GPS migration. Own DEV5000 process may be restarted only to load the generated client.
- release evidence: Prisma format/generate,2/2focusedunits, scopedTypeScript0errors, independent review, actual2markerload/readback, authenticatedmapHTTP200 and migrationrecord verified. OwnDEVserver remains20096/8128 on5000; coordinate before another build/restart.
