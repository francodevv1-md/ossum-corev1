# Geographic declaration checkpoint

## Done
- Existing complete geographic contract isolated over HEAD ba258b71596f01c471aebfd39ea7c0673dd41b97; no importer source changes.
- Three institution-map diagnostics disappear with the newly generated isolated client. Demo type gate resolved; not operational acceptance.

## Changed
- Four geographic enums, nineteen nullable ContactAddress fields and two indexes only.
- Existing migration preserved byte-for-byte (Git blob 5a40216d84d6bd11f28c7a0c86ac80e3855cd012), including three coordinate CHECK constraints. No artifact semantic changes.

## Files
- prisma/schema.prisma: GeographicEntityType, GeographicCoordinateType, GeographicCrs, GeographicValidationStatus and ContactAddress extension/indexes.
- prisma/migrations/20260910120000_contact_address_geography/migration.sql.
- Own task brief/lock/handoff; prior owned demo status documents updated after focused typecheck PASS. Script/test unchanged and hash-matched to HEAD.
- Unrelated StockMovement whitespace change excluded; commercial/Agenda/Cajas models preserved from HEAD, not included as new deltas. Antigravity Surgery/maps/source untouched.

## Validations
- Installed Prisma 7.8.0 format/validate/generate PASS in reused temporary candidate; client output candidate/generated/prisma only. Configuration uses synthetic local unreachable URL; no connection or datasource command.
- Offline schema-to-schema SQL diff from exact HEAD schema: four enum CREATE definitions, nineteen nullable/default-free columns, two indexes. Metadata equality checker PASS against original artifact, including enum mappings/native types/names/index definitions.
- Three original SQL CHECK definitions preserved: coordinate null pairing, latitude [-90,90], longitude [-180,180]. Ten pure logical null/boundary cases PASS; NOT PostgreSQL execution. CHECK constraints remain SQL-authoritative rather than inventing unsupported Prisma DSL annotations.
- Focused TypeScript: tsc.cmd --noEmit --incremental false -p tsconfig.demo-types.json PASS using newly generated client alias. Before: TS2339 latitude (67,44), TS2339 longitude (67,87), TS2353 provinceName (68,189). After: zero diagnostics, no suppression/casts/removed fields.
- Explicit pure regression: vitest.cmd run src/__tests__/unit/districorr-two-institution-map.test.ts PASS 2/2. Guarded importer main not invoked.
- Global isolated TypeScript completed: FAIL with only five pre-existing Surgery diagnostics (four missing Surgery type refs at 102/110/116/128; nullable ConsumoState at131). No geographic diagnostics. Do not certify the dirty original page as HEAD.
- Independent exact cached schema/SQL review successful-amber-eel PASS: four enums/nineteen nullable columns/two indexes match; all three CHECK definitions additive and null-compatible; no foreign models/default/FK changes. Static review only; no MiniMax attribution or reviewer DB execution.
- No DB, migration application, introspection, importers, seed/cleanup, shared client/runtime/build, Auth, config/dependency or deployment operations.

## Risks
- Static/offline checks do not prove migration application or constraint enforcement in PostgreSQL. Existing artifact is additive: optional fields without defaults leave old rows null, satisfying all three CHECK constraints.
- Installed dependencies reused; no clean-lockfile install claim. Shared worktree remains dirty with foreign work.

## Next
- Finish independent exact staged review and authorized local commit, verify index/preservation and release ownership. Then process separately queued two-hunk Surgery typing checkpoint and repeat global isolated TypeScript; no map inclusion.
- Review and validation gates completed; own source lock released. Commit uses only the verified geographic blob, unchanged SQL and owned task/demo documents. Post-commit replay will verify the now-committed type gate before processing the queued typing-only Surgery candidate.
