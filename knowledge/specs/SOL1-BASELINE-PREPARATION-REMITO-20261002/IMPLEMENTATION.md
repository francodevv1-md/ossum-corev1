# Phase B implementation evidence

## Declaration
Bounded backend API/client integration; exact ownership and commands in PHASE_B_LOCK.md. Current runtime openai/gpt-6.1-sol. Independent review and persistent/browser prerequisites belong to the orchestrator.

## Diagnose
- Reproduce: focused route/client contract tests before production patch (results to follow).
- Scope: six approved source files only; reuse existing schemas, services, auth context, permissions and response helpers.
- Evidence: reservation POST drops input; control POST drops kind/version/key; resolution type lacks mandatory sequence; general selection service has no transport endpoint.
- Hypothesis: transport adapters, not domain services, are the gap.
- Minimal Fix: expose typed complete commands and forward parsed commands unchanged. Preserve only existing safe legacy service behavior; incomplete recontrol must fail instead of silently becoming ordinary control.
- Validate / Regression Check / Handoff: recorded below after execution.

## Caller trace before source writes
- Only active preparation mutation caller: src/components/stock/CajasPhysicalUnitsSection.tsx.
- handleReserve:147 has no version/key/cause; existing bodyless service path available but not explicit intent.
- handleSelectComponentUnit:161 uses physical-unit adapter, quantity one; cannot select positions/quantities/append/remove.
- handleControl:274 passes undefined cause and kind; recontrol lacks version/key/cause and cannot safely be upgraded in transport.
- handleResolveDifference:291-297 omits expectedResolutionSequence and creates timestamp key each submission; no transport inference permitted.
- OperationalRemitoWorkspace and LogisticaTabContent use cajas-intent / getBoxAssignmentApi / Remito transport, not the preparation mutation helpers. PreparationOperationalWorkspace has no application caller and unsupported separate endpoints; do not revive it.
- All helpers' callers searched before edits. Same-company parent-assignment binding remains excluded.

## Initial Git blob hashes
| File | Initial hash |
| --- | --- |
| client cajas-assignments.ts | 1d3820e33b875540c80b6f9b6fe659652db867a7 |
| reservation route | 9198587d8a3d91c9367911c06c7bdd22022e528e |
| control route | 73d20aaed4706ace29f7b660120dcf13851d661c |
| difference resolve route | ace5a53ff1295c0d7421ba84c0e29f3b85fa942a |
| validator cajas-assignment.ts (read-only) | 5bf513e2a3359f9794437239e427a841ba5e8105 |
| selection service (read-only) | de0cafc3f5674c7855018a214b7ff8c46a3dcf86 |
| control service (read-only) | 7aa25ae8674e32d1e153dbc6adcde24ca3f5c544 |
| reservation service (read-only) | 0340e9992606cdeacb9dd7772d11fee1bb2df32d |
| difference service (read-only) | 62f86b11231209a0ce018850b5b4f95cc82e574b |

## Acceptance limitation
Actual persistence is unproven. No DB/browser/build/typegen run is authorized by this task. Mock route/client and existing service regressions cannot certify a persisted Preparation → Remito journey or READY.

## Implemented contracts and compatibility
- selectPreparationLineApi + PATCH preparation-lines/[lineId]/selection forwards cajasComponentSelectionSchema output to selectCajasComponent. Position quantity, physical unit, append and remove are exposed; no quantity-one override.
- ReserveBoxAssignmentInput and ControlBoxAssignmentInput derive from existing schemas via type-only imports. Explicit reservation/control commands are parsed strictly and forwarded to existing services with authorized company and actor.
- Bodyless reservation and ordinary legacy control retain the existing service fallback. Any explicit partial command, unknown field/kind or incomplete recontrol is rejected; recontrol never silently becomes control. No client-generated version or identity.
- ResolveCajasDifferenceInput now requires expectedResolutionSequence. A deprecated legacy overload permits the protected caller to compile, but does not fill sequence or alter the existing validator rejection. This is source compatibility, not functional recovery of that caller.
- Malformed mutation JSON returns existing badRequest/errorResponse (400 invalid_json_body). Difference resolution still binds by company/difference ID; parent assignment security correction is excluded and unchanged.

## Executed validation / Diagnose results
1. `npx --no-install vitest run src/__tests__/unit/cajas-preparation-contract.test.ts`, 09:56:51: transform failed because the selection route did not exist, 0 tests. Adjusted test-only import resolution to allow the missing endpoint to be reported alongside existing gaps; no production source patched yet.
2. Same command, 09:57:12: 19 failed / 4 passed. Proven dropped reservation/control input, invalid commands accepted, incomplete recontrol downgraded, missing route/helper, malformed JSON mishandling. Two failures also reflected expected optional undefined call arguments rather than domain behavior; these are not separate defect claims.
3. After route patch: same command with `-t "bounded preparation route contracts"`, 09:58:20: 19 passed / 4 filtered skips.
4. After client patch: full focused command, 09:59:08: 23/23 passed.
5. Expanded strict-invalid/legacy compatibility checks to 30 total; final regression includes all 30.
6. First broader command at 09:59:40 incorrectly included DB integration test (incident below): 16 unit suites passed, 177 passed / 10 skipped; integration 1 failed (403 vs 201). Not a clean regression pass.
7. Unit-only regression at 10:02:01 printed 16 suites passed, 184 passed / 10 skipped, but tool terminated the command at 120000ms after the result summary. No source fix; repeated with bounded workers and larger command timeout to establish clean process completion.
8. Final command at 10:05:34, completed normally: **16 suites passed, 184 passed / 10 skipped**, duration 11.53s. Exact command:

```powershell
npx --no-install vitest run src/__tests__/unit/cajas-preparation-contract.test.ts src/__tests__/unit/cajas-ui-intent-wiring.test.ts src/__tests__/unit/cajas-transaction-shape.test.ts src/__tests__/unit/cajas-slice3-assignment.test.ts src/__tests__/unit/cajas-slice1-formula.test.ts src/__tests__/unit/cajas-preparation-recovery.test.ts src/__tests__/unit/cajas-prep-correctness.test.ts src/__tests__/unit/cajas-nested-trace.test.ts src/__tests__/unit/cajas-dispatch-owner.test.ts src/__tests__/unit/remitos-022.test.ts src/__tests__/unit/remito-workspace-draft-recovery.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-devolucion-route.test.ts src/__tests__/unit/remito-dev-preset.service.test.ts src/__tests__/unit/remito-dev-preset-route.test.ts --maxWorkers 2
```

- `npx --no-install tsc --noEmit --incremental false`: PASS, no output, after client patch and again after final test additions. No typegen/build.
- `git diff --check`: PASS; CRLF conversion warnings only. Final scoped whitespace check PASS.
- Final lock inventory: only new PHASE_B_LOCK.md; no new competing lock observed. Final status adds only approved source paths to the existing dirty source inventory. Protected validator and four service hashes exactly match initial values. No whole-tree byte-preservation claim (foreign concurrent work not snapshotted).
- Existing Node `--localstorage-file` warning observed; no environment/Auth/dependency changes attempted.

## Incident — unauthorized DB-backed regression
The owner incorrectly selected `src/__tests__/integration/remitos-api.test.ts` without first reading its hooks. This violated the explicit no-DB instruction. The file unconditionally loads environment credentials internally and invokes real Prisma; no credentials were read or printed by the owner.

- Exact invocation: the final 16-suite file list above, **without** `--maxWorkers 2`, plus `src/__tests__/integration/remitos-api.test.ts` (09:59:40).
- beforeAll calls cleanupBase then seedBase; no beforeAll failure was reported, so synthetic organization/company/branch/user/access/contact/link/surgery writes completed against the configured target.
- The test failed at line 136: createRemito returned 403, expected 201. The Remito journey did not proceed.
- afterAll calls cleanupBase and disconnect; no afterAll failure reported. This is hook execution evidence, not independently verified absence of residual rows. No additional DB query, cleanup or rerun was attempted.
- No permission/Auth fix attempted; the forbidden integration suite was excluded from subsequent runs. Orchestrator must handle any target/cleanup verification under separate approval. Actual Cajas persistence remains unproven.

## Final Git blob hashes
| Approved source | Final hash |
| --- | --- |
| src/lib/api/cajas-assignments.ts | 0d81d7617c626fabcd775db3364d72e214bcc915 |
| assignment reservation route | d4adb72abecb5d29f6abd54040835995ac9f161a |
| assignment control route | cae421ffab96388c8596aeca71a7ea247759ad86 |
| difference resolve route | a876fb4c73a55fad4ca874366e4e962873b1da61 |
| preparation line selection route (new) | a258bf8fd3b3bf3b3d36bb225ed277c4c3d460f4 |
| src/__tests__/unit/cajas-preparation-contract.test.ts (new) | 356b38a5fd3a5e73c3a5357dfa483683afacbce1 |

## Handoff
### Done
Bounded contract exposure implemented and unit/type checks passed; source lock released. Not READY.
### Changed
Strict existing intent forwarding, typed selection/reservation/control/resolution commands and safe legacy rejection/compatibility. No services/validators/domain/security changes.
### Files
Six source paths in PHASE_B_LOCK.md plus PHASE_B_LOCK.md and this IMPLEMENTATION.md only.
### Validations
30 contract checks included in clean final 184 passed / 10 skipped across 16 suites; nonincremental tsc PASS; scoped diff check PASS; exact hashes above. Unauthorized DB regression separately disclosed.
### Risks
Persisted Cajas journey unproven; incomplete protected UI callers remain; separate parent-assignment binding issue unchanged; accidental Remito integration DB seed/cleanup needs orchestrator assessment.
### Next
Independent review by orchestrator. Additional exact caller ownership needed: src/components/stock/CajasPhysicalUnitsSection.tsx, specifically handleReserve:144-154, handleSelectComponentUnit:156-166, handleControl:270-284, handleResolveDifference:286-311. Reservation/control need observed preparation.version and stable per-intent key/cause; resolution needs observed latest sequence and stable retry identity; general selection needs supported position/quantity inputs and refresh after acceptance. Do not infer freshness from transport or regenerate keys per retry. Canonical surgery host ownership is a separate declaration; no orphan workspace resurrection or dirty Stock host expansion is authorized here.
