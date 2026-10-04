# Tracked receiving DEV replay

## Done
Consolidated 200 mocked checks and independent production-source re-review PASS. Native tracked receiving/canonical readback, accepted-operation replay/concurrent rollback/reload and fresh NONE regression now have actual DEV PASS in retained-case segments. Only actual recipient WARNING persistence/deduplication remains **BLOCKED**; no uninterrupted complete tracked-spec PASS.

## Changed
The saved `--fresh` journey is bounded to five new synthetic tracked articles, four new orders and their own receipt/replay/conflict/race checks. Existing NONE fixture is read-only and supplies already verified QA supplier/actor identity. No backfill, retry, cleanup, server start, Auth automation or dependency installation.

## Files
- `e2e/compras-oc-tracked-receipt.spec.ts`
- `playwright.compras-tracked.config.ts`
- `scripts/qa/run-compras-tracked-process.mjs`
- `VALIDATION.md` — consolidated mocked/typecheck/review evidence.

## Validations
From `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`:

```powershell
# Offline discovery only: no browser, DB or business writes.
node scripts/qa/run-compras-tracked-process.mjs --list

# Only after fresh manual QA login and authenticated exact-company preflight:
node scripts/qa/run-compras-tracked-process.mjs --fresh
```

The same saved command is for both coordinator and Franco. Configure prerequisites locally without exposing secret/session contents:

```powershell
$env:CORE_FLOW_BASE_URL='http://127.0.0.1:5000'
$env:CORE_FLOW_COMPANY_ID='codevdistricorr1000000000'
$env:CORE_FLOW_ARTIFACT_DIR='C:\Users\franc\AppData\Local\Temp\opencode'
$env:COMPRAS_STOCK_FIXTURE_PATH='C:\Users\franc\AppData\Local\Temp\opencode\ossum-compras-stock-fixture-20261003.json'
$env:COMPRAS_STOCK_APPROVED_SYNTHETIC_MUTATION='codevdistricorr1000000000:OC-RECEIPT-STOCK-TRACE-DEV-20261003:native-new-oc:1+3:replay-conflict-overflow'
$env:COMPRAS_STOCK_REVIEW_APPROVED='OC-RECEIPT-STOCK-TRACE-DEV-20261003:independent-source-review:NONE:receipt-stock-audit:no-outbound'
$env:COMPRAS_STOCK_DEV_ISOLATION_ATTESTED='codevdistricorr1000000000:existing-approved-disposable-dev:5000'
$env:COMPRAS_TRACKED_APPROVED_SYNTHETIC_MUTATION='codevdistricorr1000000000:OC-TRACKED-RECEIPT-DEV-001:fresh:5-articles:4-orders:tracked-replay-conflict-serial-race'
$env:COMPRAS_TRACKED_REVIEW_APPROVED='OC-TRACKED-RECEIPT-DEV-001:independent-source-review:tracked:receipt-stock-identity-warning-audit:no-outbound'
```

These attestations encode the existing approval for this unchanged identified disposable DEV target; they are not proof of isolation for a different target. The fixture file is external synthetic metadata, not an authentication file. No existing NONE receipt is replayed or mutated by the tracked journey. The old NONE live regression can be run separately through its existing approved runner with a fresh synthetic SKU; prior NONE real PASS is historical, not a new run in this continuation.

Set `CORE_FLOW_STORAGE_STATE` to a **new external path** before manual capture. The existing `ossum-qa-stock-session-20261003-2315.json` is expired according to the stock runner's offline gate. Never overwrite/read it into chat or bypass the expiry gate even though normal application preflight refreshed successfully in memory.

```powershell
# CORE_FLOW_STORAGE_STATE must already identify a new external file path.
# A human completes login in headed Chromium; no credentials in commands.
node scripts/qa/dev-session.mjs capture
node scripts/qa/dev-session.mjs preflight
node scripts/qa/run-compras-tracked-process.mjs --fresh
```

The spec requires exact-company authenticated Admin identity matching the approved synthetic fixture's actor. Existing Admin/Logistics production receiving permissions are unchanged; no QA user/role creation or permission edits are authorized by these commands.

## Risks
- **BLOCKED Auth prerequisite:** offline configuration emitted exactly `E2E blocked by expired authentication state`; no new tracked fixture/business mutation executed.
- **BLOCKED recipient notice acceptance:** receiving actor is excluded by existing emitter and `/notifications` reads only the authenticated recipient. Audit warning evidence is not a substitute for actual recipient WARNING persistence/deduplication. The second saved test deliberately reports this missing prerequisite as a failure, so the runner cannot claim full acceptance PASS. A separately authorized existing QA recipient session/readback is needed before completing that check; no Auth/permission workaround.
- Journey source covers available native LOT_EXPIRY/LOT_SERIAL_EXPIRY, strict dates, expired advisory/acceptance, canonical ReceiptLine/StockMovement/identity/audit readbacks, exact/reordered replay, changed-trace409, cross-article duplicate serial rollback and isolated concurrent serial race. **Authored/discovered/reviewed is not an executed PASS.**
- OC readback is latest100 company-wide, not supplier-filtered. Fail closed near the cap; no list API expansion here.
- Global tsc still FAIL only foreign `next.config.ts:10` unsupported `eslint`; build NOT RUN over reserved `.next`. All own QA TypeScript errors were corrected and typecheck repeated.
- Private manifests/results stay outside Git; no authenticated screenshots/traces/videos. A failed fresh run retains partial fixtures for Diagnose; do not blindly rerun `--fresh` or cleanup. Browser budget18minutes, runner19minutes, zero retries.

## Next
Obtain manual login for another existing authorized QA Admin/Logistics recipient and verify actual persisted WARNING/replay deduplication. Actor login and fresh NONE regression are complete. Update final evidence/review and release lock when the recipient gate is resolved. Do not restart the readiness-owned runtime or modify real records, Auth, schema, permissions, fiscal/mail or Git publication.

## Current retained-case results and safe replay
Fresh manual actor login is now complete. Native receiving, strengthened canonical readback, accepted-key verification/concurrent rollback/reload and fresh NONE regression have actual DEV PASS. Only recipient WARNING persistence/deduplication remains BLOCKED; no uninterrupted full tracked spec PASS.

Saved commands actually used after configuring the exact gates above:

```powershell
# READBACK: read-only, verified accepted ingress before the sibling race.
$env:COMPRAS_TRACKED_FRESH='OC-TRACKED-RECEIPT-DEV-001'
node knowledge/specs/OC-TRACKED-RECEIPT-DEV-001/READBACK.mjs

# VERIFY_ACCEPTED: one-time same-case check; external saved business intent, NOT Auth state.
$env:COMPRAS_TRACKED_ACCEPTED_INTENT_PATH='C:\Users\franc\AppData\Local\Temp\opencode\QA-OC-TRACKED-5704fb06-0eb7-484f-be1f-2b046432ef6e-resume-a872ca9b-4f57-44f4-b014-3d215c1c41e9-native-intent.json'
node knowledge/specs/OC-TRACKED-RECEIPT-DEV-001/VERIFY_ACCEPTED.mjs

# Existing fresh NONE regression, with the same current manual actor state.
node "C:\Users\franc\AppData\Local\Temp\opencode\ossum-compras-stock-run-20261003.mjs" --fresh
```

`CORE_FLOW_STORAGE_STATE` must reference the fresh unique external actor file captured in this session; never paste its contents. Commands for both agent and Franco are the same. The retained-case scripts are saved acceptance evidence, not general-purpose repeating fixture mutators: race fixtures are now consumed, so subsequent VERIFY_ACCEPTED/initial READBACK or zero-ingress --resume must fail closed. Never change keys, relax guards or create another ingress to make them green. `--fresh` creates a new isolated case; do not invoke merely to repair a failed partial case. Current recipient prerequisite still prevents full runner PASS.

Explicit `--resume` is available only for a validated external FAIL/native-dialog manifest with no nativeReceipt/receipt/movement/unit effects, followed by actual untouched identity/policy/eligibility/order/item/quantity/stock-history checks; skips all catalog/OC creation and transitions. It was reviewed and used before this main receipt was accepted. **It is not allowed now on the received main case.**
