# Handoff — tracked receipt continuation

## Done
Implemented tracked backend and UI for all six policies. User explicitly confirmed company-wide non-repeating serials and receiving expired material with notice/no block. Previous task's NONE stock/traceability remains the baseline, not something to rewrite.

## Changed
Allocation normalization/validation/atomic receipt and physical identity creation; per-line trace metadata; warning response/persistence/notice; canonical policy UI and frozen uncertain intent. Recovery fixes addressed missing expired-specific in-app warning and incorrectly rejected exact Decimal spellings. No schema, global Auth/permission/RLS, Cajas lifecycle or real-data changes.

## Files
Exact source/test paths and ownership in current lock and ANTIGRAVITY_CONTINUE_PROMPT.md. Source differences include previous validated work; preserve foreign deltas and do not revert the worktree globally.

## Validations
- Coordinator ran initial backend139mocked checks PASS and tsc only foreign next.configeslint failure.
- Critical backend review found P1 notice and P2 Decimal spelling despite those passes.
- Recovery agent reports147mocked checks/4files PASS after8failing regressions. Continuation independent production-source re-review confident-harlequin-guppy PASS; no blocking source defect found.
- Continuation coordinator reproduced missing NONE metadata in the old hook/dialog fixture (3 FAIL/197 PASS), corrected that fixture only, then ran full consolidated allowlist: **200/200 mocked checks, eight suites PASS**. Existing production backend/UI unchanged.
- Actual authenticated/200 exact-company preflight PASS on unchanged readiness-owned DEV5000, existing external saved state reused and browser closed; not business acceptance. Offline saved-runner gate subsequently reports **E2E blocked by expired authentication state**; saved file remains expired even if the app refreshed in memory. Fresh manual state required, no bypass.
- New tracked spec/config/runner syntax/discovery PASS; independent PRE-LIVE QA review prime-aquamarine-shark PASS. Coordinator fixed reproduced QA-only TS inference errors; latest tsc only foreign next.configeslint. Three QA artifacts authored after writer timeout, not an operational PASS.
- **Current real DEV PASS:** native tracked LOT_EXPIRY/LOT_SERIAL_EXPIRY, valid expired ingress/advisory, canonical four lines/movements and two serial identities, exact/reordered accepted-key replay, changed trace409, cross-article serial409 unchanged, actual concurrent serial race200/409 with loser rollback and winner links, reload. Saved checks were completed in retained-case segments, not one uninterrupted full-spec PASS. New isolated NONE stock regression also real PASS.
- **Remaining BLOCKED:** actual recipient WARNING readback/deduplication; emitter excludes actor and notification API reads current recipient only. The saved second check fails explicitly, not green-by-skip. Needs another authorized existing QA recipient's manual state, no Auth/role changes.

## Risks
No complete serialized-unit/expiry-safe downstream lifecycle claim. Existing Cajas use/selection policies remain outside scope; expired receiving allowed by user does not authorize modifying them. Global typecheck/build not clean because excluded next.configeslint issue. Other agents/tasks exist; take scoped ownership and do not assume all processes stopped.

## Next
Tests, source re-review, actual tracked ingress/readback/replay/concurrency and fresh NONE regression complete. Only actual recipient WARNING persistence/deduplication remains; request manual login with another existing authorized QA Admin/Logistics recipient, without user creation or permission changes. Current QA/docs ownership remains reserved while awaiting that precondition; backend/UI source is released/read-only. Do not rerun used-case --resume/VERIFY_ACCEPTED/READBACK as a fresh test: guards intentionally refuse consumed zero-ingress/race fixtures. See REPLAY.md for exact saved commands and one-time evidence. All browsers closed; runtime unchanged.

## Manual login and actual DEV continuation — execution history
- Franco answered “Si abrilo”; headed manual capture PASS, new unique external state and authenticated exact-company preflight PASS. The earlier expired-state blocker is historical, not the current result.
- Two initial fresh attempts stopped on cold preflight reads with zero writes. The next fresh attempt created exactly five tracked synthetic SKUs and four synthetic OCs under `QA-OC-TRACKED-5704fb06-0eb7-484f-be1f-2b046432ef6e`; four strict invalid-calendar-date requests rejected400 with unchanged snapshots. No cleanup/new fixture creation after those partial fixtures.
- Added explicit untouched-case `--resume` with independent guard review. Reviewer findings about exact item bijection and identities of owned articles were corrected; wee-violet-damselfly PRE-RESUME PASS. A failed native attempt was reconciled by saved read-only READBACK showing all four received0, physical0, movements0, identities0, no receipt audits before continuing.
- Next same-case native receiving **HTTP200 / Recibida / received2+2 / two expired warnings**; visible advisory/post-acceptance warning and dialog closure passed. Original spec then stopped on a cold canonical GET15s (read budget now45s), not a proven business-trace defect. Frozen native intent is saved before POST and sanitized response after POST.
- Saved read-only `READBACK.mjs` executed `PASS_CANONICAL_RECEIVING`: four ReceiptLines/four movements, two ACTIVE serial identities, lot/serial/expiration/location/actor/OC/Receipt links and two durable expired audit warnings. Subsequent reviewer requested stronger one-to-one/count containment checks; assertions strengthened and revalidation pending. Do not treat the old source review as certification of those new checks.
- Main OC `cmutyb50s0038xohuqs84k5ff` is now received. **Do not run zero-ingress --resume or UI_PREFLIGHT again on it.** Three sibling OCs remain untouched; no accepted-key replay/race yet. Saved `VERIFY_ACCEPTED.mjs` targets this exact accepted key and same siblings, no article/OC creation; independent final guard recheck pending.
- Current receipt `cmutz3iqf0048xohu593e5jqf`; accepted evidence prefix `...resume-a872ca9b-4f57-44f4-b014-3d215c1c41e9-native-intent.json`. Recipient WARNING readback is still blocked without another authorized existing QA recipient session. No complete live PASS yet.

## Completed retained-case acceptance
- Canonical READBACK repeated **PASS** after exact four-order/two-item/four-allocation bijections, unique lines/movements/serial identities and readpath containment assertions were strengthened. Reviewer canonical/race findings resolved; final containment source recheck visual-tan-thrush PASS.
- VERIFY_ACCEPTED **real DEV PASS**: exact key and reordered allocation/Decimal spellings200, full snapshots unchanged; changed trace409; cross-article duplicate serial409 unchanged; two simultaneous distinct-article serialRACE requests returned one200/one409, exactly one additional unit/Receipt/movement, original receipts/units/order/stock/audits unchanged, full winner line/movement/identity/audit/actor/location links and loser rollback; reload unchanged.
- QA-only native-key assertion corrected after a pre-browser failure: the production UI generates an unprefixed UUID. Saved key is checked against actual accepted OC audit and Receipt idempotency key, main replay posts require exact saved key, sibling new keys remain namespaced. No business source changes.
- One fresh isolated NONE regression via existing stock runner **real PASS**: new QA SKU/native OC, stock0→1→4, two receipts/movements, accepted retries/conflicts/overflow and reload unchanged. No earlier stock backfilled or mutated.
- Do not claim recipient notice PASS or uninterrupted full-spec PASS. All test sessions used the same fresh manual actor state; all contexts closed, no source/Auth/schema/roles/Git/runtime changes.
