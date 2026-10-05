# GPT2-DEMO-TYPES-20261005

## Done
- RESOLVED for the type gate by the explicitly approved GPT2-GEOGRAPHY-CHECKPOINT-20261005 candidate: focused TypeScript now reports zero diagnostics. Historical diagnosis below records the three failures against ba258b7 before geographic declaration isolation; operational acceptance remains pending.
- Scope is only this package. Antigravity's Surgery typing task is independent and untouched.

## Changed
- No script or regression source changes. Only this task's brief, lock and handoff were created; lock released.
- No schema/migration changes, staging or commit. No importer main function, DB, secrets, build or runtime execution.

## Files
- `scripts/dev/districorr-two-institution-map-20261002.ts:67`: reads persisted latitude/longitude to reject existing-geography drift.
- `scripts/dev/districorr-two-institution-map-20261002.ts:68`: Prisma ContactAddress upsert writes the missing geography contract.
- `src/__tests__/unit/districorr-two-institution-map.test.ts`: unchanged existing pure fixture/marker regression; importing FACILITIES does not invoke the guarded main function.
- HEAD `prisma/schema.prisma:385–403`: ContactAddress has only base address fields, no geographic fields or enums.
- Foreign pending dependency: four enums GeographicEntityType, GeographicCoordinateType, GeographicCrs, GeographicValidationStatus; ContactAddress geographic extension and two indexes; `prisma/migrations/20260910120000_contact_address_geography/migration.sql` (untracked, not incorporated or executed).

### Exact script-required fields missing from ContactAddress
| Field | Declared pending type |
|---|---|
| provinceName | String? |
| entityType | GeographicEntityType? |
| latitude / longitude | Decimal? @db.Decimal(10, 7) |
| coordinateType | GeographicCoordinateType? |
| crs | GeographicCrs? |
| source / sourceVersion | String? |
| sourceRetrievedAt | DateTime? @db.Timestamptz(6) |
| validationStatus | GeographicValidationStatus? |
| validationNotes | String? @db.Text |

Required enum mappings: entityType ADDRESS; coordinateType CENTROID/ADDRESS; GeographicCrs.EPSG_4326 maps to EPSG:4326; GeographicValidationStatus.MANUAL_VERIFIED maps to manual_verified.

The complete foreign extension additionally declares georefId, provinceGeorefId, departmentGeorefId/departmentName, municipalityGeorefId/municipalityName, geometry and geometrySource. Its artifact adds 19 nullable columns, four enums, two indexes and three coordinate CHECK constraints (pairing, latitude range, longitude range). This task does not authorize adopting any of these blocks.

## Validations
- Reused isolated candidate under `C:/Users/franc/AppData/Local/Temp/opencode/agenda-checkpoint-20261005/candidate`; script/test Git blob hashes equal original and original files remain clean.
- Installed Prisma 7.8.0 validate/generate PASS; output confined to temporary `generated/prisma`. Temporary tsconfig aliases point @prisma/client at that client. Synthetic offline DIRECT_URL used for configuration only; no datasource command/query.
- Reproduce: installed `tsc.cmd --noEmit --incremental false -p tsconfig.demo-types.json` from the temporary candidate (includes only script, regression and direct imports).
- Before: TS2339 at (67,44), latitude absent; TS2339 at (67,87), longitude absent; TS2353 at (68,189), provinceName not accepted by ContactAddressCreateInput.
- After diagnosis: the same three diagnostics remain unresolved; no type-suppression or behavior-changing patch attempted. No post-fix PASS claimed.
- Explicit installed `vitest.cmd run src/__tests__/unit/districorr-two-institution-map.test.ts` from temporary candidate: 1 suite, 2/2 PASS. Pure fixture/marker assertions do not verify the script's Prisma persistence contract.
- Review MiniMax: NOT RUN/pending; no model-specific MiniMax invocation is exposed by the available tools. No alternative model was labeled MiniMax. No source candidate exists for commit review.
- Final HEAD unchanged, original index empty, script/test unchanged. No commit hash produced.

## Risks
- This is a missing schema dependency, not an isolated script typing mistake. Merely narrowing read properties does not make Prisma accept unsupported upsert fields; casts, raw SQL substitution or deleting fields would hide/change the contract and violate scope.
- Regenerating from the dirty geographic worktree would mask the committed-checkout incompatibility and is not evidence for HEAD coherence.

## Next
- Route this handoff to MiniMax for diagnosis review and GPT1 for separate ownership/authorization of the existing geographic schema/migration checkpoint (declaration/versioning distinct from DB application). Then regenerate from that new committed snapshot and repeat this exact focused typecheck and suite. Until then keep only GPT2-DEMO-TYPES-20261005 BLOCKED; do not stage Antigravity's moving Surgery work.

## Approved dependency resolution
- Franco approved geographic schema/artifact isolation and local checkpoint without DB/importer execution. Full four-enum/nineteen-field/two-index contract matches the existing three-CHECK SQL artifact, not an eleven-field workaround.
- Prisma 7.8.0 isolated generate and focused tsconfig.demo-types.json check PASS; prior three diagnostics all disappear. Existing pure test remains 2/2 PASS, script/test unchanged.
- Evidence: knowledge/specs/GPT2-GEOGRAPHY-CHECKPOINT-20261005/HANDOFF.md. Only this type blocker is resolved; DB/real constraint enforcement/importer operational acceptance not run. Historical MiniMax review NOT RUN is not relabeled as another model's review.
