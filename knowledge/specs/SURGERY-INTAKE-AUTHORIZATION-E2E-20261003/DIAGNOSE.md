# Diagnose evidence

## Reproduce
- Exact replay: set CORE_FLOW_BASE_URL/CORE_FLOW_STORAGE_STATE/CORE_FLOW_ARTIFACT_DIR as REPLAY.md, then `node scripts/qa/run-surgery-process.mjs`.
- Initial runner rejected verified fixtures; real session preflight independently PASS.
- Saved test initially timed out at navigation; final corrected harness advanced to native-intake and tripped its safety guard.

## Scope
Three new QA files only; no application source edits. Four preverified baseline synthetic contacts received necessary additive canonical context groups. No new surgery, Seguimiento note or status mutation.

## Evidence
- Seed: realistic synthetic person names do not include DEV/DEMO. The test's name-keyword heuristic was incorrect. Exact baseline IDs/codes and seeded @ossum.local addresses identify the permitted records more reliably.
- Read-only websocket A/B probe: untouched local socket → membership GET observed; closing socket → membership GET absent, unexpired saved state still present. Next16.3.8 actual local path is `/_next/hmr`.
- Last private report: `intake-report-bc537a79-df36-4989-a9cf-33c2c8e4e299.json`; ~29s; native-intake timeout; `create=0,note=0,status=0,tripwire=true`. No automatic retries. No case-created receipt.
- Independent source review grumpy-plum-bison: form defaults coordinator name to `Sin asignar` with no ID (`src/lib/cirugias.types.ts:147,159`). `buildContactSnapshot` and native create action (`src/hooks/useCirugiaActions.ts:56–75,173–193`) emit a named no-ID placeholder snapshot rather than null. Create route forwards it; contact resolution accepts named snapshots and can match/create a coordinator. The test's null guard must not be weakened.
- Core defect is established by source trace; final runtime report alone does not identify which guard predicate tripped. Do not claim full runtime reproduction of that specific payload yet.

## Hypothesis
Runner/test-tool defects caused the prerequisite failures and were fixed inside approved QA scope. Separately, the native unassigned-coordinator snapshot contradicts the intended no-coordinator case and makes the planned positive mutation unsafe without a bounded protected-hook correction.

## Minimal Fix
- Applied QA only: exact baseline ID/code/seed-email gates instead of display-name keywords; explicit safe phase/error-class/mutation counters; exact loopback HMR paths allowed, all other sockets remain blocked.
- Proposed, NOT APPLIED: emit null coordinatorContact when no coordinator is selected, preserving selected coordinator behavior. This is protected core-flow source, outside the test-only brief. Ask Franco once for the narrow source correction and ownership before editing.

## Validate
- Real runner exact-company session + four synthetic fixtures: PASS after fix.
- HMR fix: real saved test advanced through navigation/membership/fixture verification to native-intake.
- Real full journey: FAIL/BLOCKED before surgery writes, not PASS.
- Discovery: one test. Syntax checks passed. No app build/typecheck required/executed for test-only source; shared DEV server remains running.

## Regression Check
- All browser contexts closed; every live run below20minute budget.
- No imported source cases/contacts, coordinator assignments, Auth/roles, source/schema/migration, cleanup, outbound mail/fiscal or Git/deploy changes.
- Server evidence rejection/exception persistence/reload assertions are authored but NOT RUN beyond creation, because no case was created.

## Handoff
Preserve the create guard. Obtain narrow protected-hook approval, reproduce the actual outbound create payload safely, apply minimum root fix with adjacent selected-coordinator tests, re-review and rerun the same command. Do not replace runtime evidence with discovery/source tests.

## Approved correction and actual continuation
- Franco explicitly approved the null unassigned-coordinator fix. Five focused regressions first reproduced3fail/5pass; after minimum caller-only correction10mocked tests passed. Selected cached/uncached payloads preserved; shared builder unchanged.
- Independent hook review PASS. Missing baseline Git blob resolved without Git writes: invert only the two approved code snippets, normalize canonical LF, hash stdin with source path; original recorded hash cef9f91961d547b2939594e84da18a9f32d53ede matched. Independent verifier PASS confirms foreign canonical content preserved.
- Old saved state expired; opened one fresh headed capture and saved new state outside Git without overwrite. Fresh actual company preflight PASS; no Auth modifications.
- First post-fix real run sent exact null coordinator fields and created one surgery. Test wrongly expected UUID; Prisma schema and actual response use CUID. Recovered only the exact owned pending QA case through four fixed links, unique marker, time window and empty assignments; no duplicate/cleanup.
- Applied QA correction: CUID contract; record created receipt before format assertion; explicit validated external receipt-resume branch with fresh pending/marker/contact/evidence checks. Resumed same case: realUI gate, backend409/no state change, one actor-attributed exception, authorized state and full reload PASS.
- Actual PASS receipt: QA-INTAKE-1645b3c9-9a68-4482-b947-4bdb2eabb8a2.json, resumedOwnedNativeCreation=true, create0/note1/status1 in resume run; prior native run create1. No fresh uninterrupted post-correction run claimed.
- TypeScript own counter-narrowing errors corrected without weakening numeric count checks. Current global tsc has only foreign next.config.ts unsupported eslint property; excluded config was not edited. Full build NOT RUN.
