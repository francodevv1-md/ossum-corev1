# Preparation handoff — approval #6999

## Final outcome — LIVE SYNTHETIC FLOW PASS
- Actual `--invoice-only-replay` completed with `PASS` after fresh authenticated `/me` 200, company/admin confirmation, exact QA lineage and zero existing Invoice reconciliation. This completes the approved flow across the recorded, reconciled attempts—not an assertion that the first attempt passed.
- Invoice `cmu4x1o4c0000j4hu1x7nzrwg` persisted in **Borrador**, **ARS 200**, source budget `cmu4w7zq80003o0hus9lnlras`, Surgery `cmu4w7w9k0000o0hu1h2j3brg`. Verified exactly one Invoice for this QA Surgery, exact source item linkage, null visible number and issuedAt, no consumption source.
- Real Pending UI created the draft. Subsequent authoritative read and hard reload proved persistence and removal of the source from Pending Invoice. Budget stayed Aprobado / CURRENT / revision 3; it was not re-emitted or reapproved in this final attempt.
- Third journal `budget-invoice-6999-invoice-manifest.json` records all completed steps and PASS. Both prior failed-attempt journals remained byte-identical. No duplicate contact/Surgery/budget creation; final mode allowed only the one Invoice POST.
- All QA records are intentionally retained under marker `QA-6999-1468eadc-5e6b-4349-b970-e16a9cea081e`. No deletion, prior-record mutation, fiscal issuance, external sending, Auth/config/schema changes, migration, commit or deployment occurred during final validation.
- Browser explicitly closed via CDP before its hard deadline; bootstrap status `closed`, cleanup triggered. Session/state contents remain local outside Git and are not reproduced here.
- Final code evidence remains 179/179 offline tests, independent reviews #7023/#7032, full TypeScript zero and guarded build #7034 with 56/56 pages. This live check was API/UI validation, not a new test-suite/build run.
- Scope limit: verified Sales canonical budget → operational Invoice draft on this synthetic fixture. No fiscal workflow, existing-record migration, core UI unification, normalized stock/traceability, goods receipt or financial email acceptance is implied. Historical first-request exceptions remain unavailable despite demonstrated defects and subsequent successful flow.

## Historical execution record
- **Surgery replay and Sales flow passed live:** reused contact `cmu4u476e0000pshumod522s3`, created Surgery `cmu4w7w9k0000o0hu1h2j3brg` and budget `cmu4w7zq80003o0hus9lnlras`; UI emit/approve succeeded. Hard refresh proved Aprobado / CURRENT / revision 3 / ARS 200. Pending UI displayed the exact source and amount.
- Invoice POST returned HTTP 500 / `internal_error`. Read-only reconciliation returned zero invoices for this QA Surgery and confirmed the budget unchanged, approved/current/revision 3. No blind retry; the second journal retains the attempted Invoice entry.
- Invoice advisory-lock result deserialization defect was independently repaired/reviewed (#7032), with 179 offline tests and guarded build #7034 PASS. Before the subsequent successful replay, the persisted Invoice remained unverified; Final outcome records that later PASS and reconciliation.
- The Invoice-only replay was subsequently executed and passed; its final reconciliation is recorded above. This historical preparation is not an instruction to replay.
- No further contact/Surgery/budget create or state mutation is eligible in this mode. Offline origin/lineage, guard and replay selfchecks pass. Any ambiguous response stops; no cleanup, fiscal issuance, delivery or prior-record edits.

## Execution result — 2026-09-17
- **Reconciled retry prepared, not executed:** source allocator cast repair accepted #7023 (174/174 tests), guarded build #7025 PASS. Run existing script with `--execute --confirmed-dev-current-source --reconciled-single-replay` only after a fresh manual session. It preserves the original manifest, uses a separate replay journal, verifies original company/contact/marker and rechecks zero Surgery rows immediately before one guarded Surgery POST. On success it resumes the same approved budget→Invoice-draft flow. No repeated contact creation. Syntax/offline guards including replay-origin checks pass.
- **STOPPED at Surgery creation; full transaction QA did not pass.** Fresh `/me` authenticated preflight passed. One QA contact was created; Surgery POST returned HTTP 500. No budget or Invoice was created.
- QA marker: `QA-6999-1468eadc-5e6b-4349-b970-e16a9cea081e`. Created synthetic contact: `cmu4u476e0000pshumod522s3`. Retained; no cleanup or retry authorized by this result.
- Same-session read-only reconciliation: GET surgeries scoped to the newly created patient returned 200 and zero rows. Browser resource timing independently recorded Surgery POST status 500. Underlying server exception was not retained, so root cause is unclassified.
- Durable manifest retains `contact: done`, `surgery: attempted` and reconciliation evidence. Do not remove/reset it or rerun creation blindly. A zero-row read does not certify every possible ancillary side effect of the failed request.
- Initial preflight timeouts were a harness defect: blocking the same-host Next development HMR socket prevented hydration/API reads. Unrestricted read-only reload observed `/me` 200; permitting only the exact local `ws:/_next/webpack-hmr` restored guarded preflight PASS. External sockets remain blocked. No application/Auth/config fix was made.
- Parent independently checked current effective DATABASE_URL, DIRECT_URL and default-company configuration equality against the approved original source using isolated loaders; all three matched, values not exposed.
- Next: bounded diagnosis of Surgery HTTP 500; core Surgery implementation changes require explicit scope authorization. Do not weaken guards, bypass the public API, use an existing Surgery, or claim budget-to-Invoice acceptance.

## Done
- **COMPLETE — live synthetic flow PASS.** The bounded replay was executed and reconciled as recorded in Final outcome.

## Changed
- Guarded canonical API fixture creates (one mandatory QA patient/contact + one Surgery); actual Sales UI create/emit/approve; actual Pending UI creates exactly one operational Invoice `Borrador` for ARS 200.
- Durable pre-send intent journal, response-ID allowlist, immutable QA marker, exclusive local runner lock, tenant digest, known-success resume verification. No automatic retry of failed/ambiguous writes; no cleanup of QA rows.
- Fresh actual `/me`200 + active-company/admin gate, browser-only observed Authorization adapter, immediate fresh external storageState, real deadline minus two minutes. External HTTP(S)/WebSockets and nonallowlisted app writes blocked; attached app context closes at completion/stop.

## Files
- `knowledge/specs/CLEAN-BUDGET-INVOICE-SYNTHETIC-QA-20260917/{CHANGE_PACK,LOCK,HANDOFF}.md` — scope, exact requests, source review, evidence checklist; lock **review**.
- `C:/Users/franc/AppData/Local/Temp/opencode/budget-invoice-6999.cjs` — sole new runner; no product/existing-test edits.
- Runtime only: same temp root `budget-invoice-6999-manifest.json`, transient `budget-invoice-6999-running.lock`, fresh `budget-invoice-6999-fresh-{pid}.json` via `CORE_FLOW_STORAGE_STATE`. Outside Git; never publish storageState. Manifest contains QA IDs only, no real identities/company IDs/session values.

## Validations
- `node --check C:/Users/franc/AppData/Local/Temp/opencode/budget-invoice-6999.cjs` — PASS.
- `node C:/Users/franc/AppData/Local/Temp/opencode/budget-invoice-6999.cjs --selfcheck` — **OFFLINE_PASS**: six step gates, wrong method/path/prior ID/body/revision, external origin, deadline margin, one-shot replay/ambiguous intent, contiguous manifest, browser adapter credential containment/projection using an in-memory stub. No network, app imports, test suite or browser.
- Read API client/auth adapter, Surgery validator/routes/service/contact resolver, contact validator/route/helpers, budget UI/form/client/validator/routes/service, Pending UI/hook, Invoice routes/service, audit and Prisma singleton. Exact source contracts recorded in CHANGE_PACK.
- Git status before/after: own NEW spec directory is the only additional repository path; pre-existing dirty paths retained. No installs/commits/builds.
- Live UI/API validation completed and passed as recorded in Final outcome.

## Risks
- Runtime requires a fresh manually authenticated current bootstrap, same approved disposable DEV effective source (parent attestation), existing admin, branch and remaining deadline. No config values queried during preparation; the runner cannot independently infer DB environment from a loopback URL.
- Contact audit follows its creation transaction; HTTP failure can leave a created contact. Any `attempted` entry blocks automatic resume, including if a response was lost. Parent must reconcile read-only; never remove the manifest or rerun creates to resolve ambiguity.
- Historical runner safeguards remain relevant for traceability only; no replay is pending or authorized by this handoff.
- Source review found no automatic external send/fiscal path in the six mutations. Browser interception is not a server-side egress firewall; stop if these write paths change before execution.

## Next
- No replay is pending. Retain QA records pending separate cleanup permission; any new execution requires a new approved scope.
