# Agenda checkpoint recovery

## Done
- Recovered partial-PATCH service correction and regression tests after delegation timeout; original HEAD remains `2540980e431aa77caaf68c1ff7af263c4ca73a9b`.

## Changed
- Service compares supplied or persisted start/end bounds before update and rejects inverted spans with 400/validation_failed.
- Regression covers invalid single-bound updates without writes, valid partial updates, equality, title-only changes and cancellation.

## Files
- `src/lib/services/personal-calendar.service.ts`
- `src/__tests__/unit/personal-calendar.service.test.ts`
- This task folder. Original schema, calendar UI, backend-surgeries client and package files retain parent preflight Git blob hashes; index remains empty.
- Isolated candidate/baseline: `C:/Users/franc/AppData/Local/Temp/opencode/agenda-checkpoint-20261005/`.

## Validations
- Parent replay: `.\node_modules\.bin\vitest.cmd run src/__tests__/unit/personal-calendar.validator.test.ts src/__tests__/unit/personal-calendar.service.test.ts src/__tests__/unit/personal-calendar-routes.test.ts` — 3 suites, 17/17 PASS, 1.09 seconds, mocked tests only.
- Independent stable-chain static review `lively-green-muskox`: SQL/schema mappings and existing HEAD dependencies consistent; no Articles/Prices runtime dependency. Service correction was excluded from that review and inspected by parent afterward.
- Parent executed installed Prisma 7.8.0 `validate` separately in candidate and baseline with synthetic DIRECT_URL pointing to localhost port 1; no database query. Both FAIL P1012, same five missing inverse relations.
- Missing inverses: CajasAssignment.stockReservations; CajasStockScopeReference.stockReservations; User.createdStockReservations; User.releasedStockReservations; User.createdStockPhysicalUnits.
- Generate, TypeScript, build and PostgreSQL acceptance NOT RUN by parent after failed prerequisite. No clean-checkout compilation PASS claimed; baseline defect blocks the standalone candidate.
- Delegation returned no execution report, so its unreported checks are not acceptance evidence.

## Risks
- Previous read-only verdict "isolable" described source dependencies, not validated baseline compilation. Executable checkpoint now requires a separately owned five-relation Stock baseline repair first; these declarations already exist among foreign dirty schema hunks and were not incorporated.
- No DB authorization inferred; PostgreSQL test remains unexecuted and unsafe without controlled disposable target/fixtures.
- Shared DEV5000/.next and Preparation-to-Remito DB hold preserved.

## Next
- GPT1 coordinates explicit ownership/approval for the minimal Stock baseline prerequisite, then reruns the isolated Agenda candidate gates. No Articles/Prices or UI incorporation, staging or commit without its own authorization.

## Approved continuation evidence
- Franco explicitly authorized declarative baseline repair and local Agenda/Stock commits, without database operations. Baseline repair committed separately as `d16cb00`, exactly five inverse declarations; independent review `involved-moccasin-python` PASS also includes the recovered service fix and regression assertions.
- Reused the existing isolated candidate; original and candidate service/test blob hashes match. Candidate contains baseline repair and Agenda only, not Articles/Prices, geography or UI.
- Repeated three explicit suites in the original tree and isolated candidate: 17/17 PASS in both. Prisma 7.8 validate/generate PASS; generated output is confined to temporary `candidate/generated/prisma`, never shared node_modules.
- Schema-to-schema SQL diff from repaired baseline contains only personal_calendar_event with the same physical columns/constraints as the authored migration (statement order differs only).
- Focused TypeScript check of Agenda source, direct dependencies and three suites PASS using temporary tsconfig.agenda-checkpoint.json and temporary @prisma/client path alias to the newly generated client. Neither validation-only generator output nor TypeScript aliases belong to the commit.
- Full repository TypeScript attempt exceeded 60 seconds without diagnostics: NOT PASS. Build and PostgreSQL acceptance NOT RUN at this point; scoped checks are not whole-app acceptance. No shared .next/runtime touched.
- Local checkpoint contains 10 functional files, three Agenda-only schema blocks, and this task's three documentation files. Wider demo/review docs are excluded.
