# Coordination contract stabilization

## Outcome and approval
Make personal Coordinadores and global Administración de Coordinación use the same backend-authoritative contracts, real IDs, company scope and existing role policy. User approved implementation and released earlier overlapping intake ownership. T3 safeguards apply to the bounded shared service/API chain. No Browser QA by explicit user instruction.

## Checkpoints
0. Preserve dirty baseline, verify locks, run focused tests and establish TypeScript/build baseline.
1. Reuse scoped coordination reads and identity resolution; complete DTO date precision; handle auth/company races and pagination honestly.
2. Persist coordinator assignment through the existing model and eligible company contacts; verify old/new personal and global reads.
3. Persist supported management fields with existing validators/transitions, consume canonical responses and reread; preserve partial failures.
4. Connect notes/events/operational requests to existing services; reject false successes and local mock fallbacks.
5. Fix temporal and advanced filtering/pagination against authoritative data.
6. Paired-surface tests, permissions/tenant denial, independent review, TypeScript/build.

Each checkpoint requires evidence, minimal fix, focused validation and adjacent regression before advancing. Tests must exercise actual wire validators/routes, not just mocked successful client helpers. Database integration must be explicitly identified as real PostgreSQL or mocked; real writes require a verified disposable DEV target.

## Baseline
- Existing dirty source and untracked work preserved; no checkout/reset/commit.
- Initial 7 focused suites: 82 passing / 2 failing. Both failures are coordination-view-route expectations for roles opposite current central policy (admin/coordinator global). Diagnose against existing policy, do not change permissions to satisfy stale tests.
- Unmodified direct TypeScript: default heap OOM; 8 GB retry timed out at 180 seconds. Investigate build-generated directories captured by tsconfig before attributing errors to source.
- Longer unchanged global TypeScript run completed with exit 1 (5,524 files, ~2.9M lines, ~6.26 GB). `cloudflare-env.d.ts` imports generated `.open-next/worker.js`, pulling bundled JavaScript and changing global DOM/Response types. Unrelated missing exports in Compras/Comparativa and other preexisting test contracts are recorded in the temporary baseline log. Do not fix outside scope.
- Real PostgreSQL read-only preflight PASS: existing approved DEV fingerprint matches; configured company active; required Surgery, SurgeryContactAssignment, SeguimientoEntry and InternalNotification columns exist. No business writes, no secrets disclosed, no migration required by this preflight.
- Validation artifacts: `C:/Users/franc/AppData/Local/Temp/opencode/coordination-contract-20261007/`. Global baseline is `types-global-baseline.log`; source-only diagnostic intentionally excludes Cloudflare generated glue and generated routes and is not a substitute for global TypeScript.
- Initial isolated build PASS, exit 0, 74 seconds, 66 static pages; preexisting missing exports in Compras/Comparativa produce warnings. Existing `ignoreBuildErrors: true` makes independent TypeScript evidence mandatory. Build snapshot hashes retained; final implementation needs a refreshed snapshot and final build.

## Boundaries
Reuse current components, adapters, identity resolver, services, audit and models. No broad refactor, schema assumption, new dependencies or unrelated fixes. Budget work remains separately owned. Parent owns documentation and final validation; directed implementer exclusively owns reserved coordination source. No parallel writers in the API/service chain.

## Acceptance
No name-substring identity or fabricated coordinator. No local-only success. No silently ignored editable fields. Every completed mutation can be read back with matching IDs, company, responsible party, date/time precision and derived state by both authorized surfaces. Failures, pending/partial saves and company/user switches must remain truthful.
