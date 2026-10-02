# Runtime acceptance — confirmed disposable DEV

## Done
- Real bounded panel persistence journey validated on http://localhost:5000 after Franco confirmed `la dev es descartable` and supplied port 5000.
- Chromium headed session documentation-checklist-dev-001 opened at 08:02:54 UTC and closed within the 20-minute budget. No server/process restarted, Auth/permissions changed, credentials entered by automation, or token/cookie contents inspected/disclosed.
- Source implementation unchanged from independently reviewed four-file snapshot.

## Changed
- Synthetic existing demo surgery CX-DEV-2026-0001 (technical ID sgdevsurgery1000000000000), company codevdistricorr1000000000: explicitly initialized documentation-v0.1 once, nine persisted items, four required.
- Medical order item cmuqopag300015whu1s3zk2oz: pending → received → approved → observed; observation persisted and recovered after full page reload/reopen.
- Exercised observed → received, genuine backend stale-CAS rejection, explicit refresh and successful observation save. Final item state observed; text `QA documentación DEV: borrador conservado tras conflicto.` Other eight items left pending.
- No mutation of the second synthetic surgery CX-0008; its absent checklist remained absent.

## Files
- Browser snapshots/logs and temporary storageState remain outside Git under C:/Users/franc/AppData/Local/Temp/opencode. Never copy storageState contents into task artifacts.
- For future reuse resolve the temporary file through CORE_FLOW_STORAGE_STATE and revalidate auth; do not assume indefinite freshness. No source/test/config/dependency edits during runtime acceptance.

## Validations
- Port 5000 listening; application-origin company `/me` response after reload: 200. Used the application's actual authenticated request, not fabricated credentials.
- Initial generic `/api/me/companies` probe: 404 because this worktree uses `/api/companies/{companyId}/me`. Raw page.request GET to company `/me`: 401 because it does not use the application's bearer injection. These probes were NOT counted as auth passes; the actual application's `/me` preflight subsequently returned 200. No Auth fix attempted.
- GET technical surgery documentation: 200, checklist null/status not_required/items empty. Merely opening did not initialize anything.
- Explicit initialization POST: 200, empty request body, nine items and aggregate 0/4.
- Medical order received PATCH: 200, expectedUpdatedAt 2026-10-02T08:11:31.491Z → accepted updatedAt 2026-10-02T08:11:50.354Z; approved stays 0/4.
- Approved PATCH: 200, previous accepted timestamp used → accepted updatedAt 2026-10-02T08:11:51.142Z; aggregate 1/4.
- Observed PATCH: 200, observation in actual payload; accepted updatedAt 2026-10-02T08:12:09.638Z. UI showed accepted text and backend summary observed.
- Full page reload → reopen demo expediente → documentation GET: 200, same checklist/item IDs, state observed and exact stored observation. This is backend read-after-reload evidence, not a mocked fixture or local toast assertion.
- Controlled conflict: forwarded the real UI PATCH to the real API with an intentionally stale expectedUpdatedAt (one-shot Playwright request interception; no synthetic error response). Backend returned 409/documentation_write_conflict. UI retained draft, showed refresh instruction and disabled saving.
- Explicit dialog refresh → actual GET → retry: 200; outgoing expectedUpdatedAt equaled fresh GET item timestamp; accepted final observation as above. No silent automatic overwrite/retry.
- Mobile viewport 390×844: checklist present, zero document horizontal overflow, observation visible in panel text. Keyboard-focused refresh activated with Enter → actual GET 200.
- Switched via actual UI to CX-0008: GET 200 on technical ID sgdevmockcx80000000000000, checklist null and no prior observation; returned via UI to demo surgery: GET 200 with original checklist and final observation recovered. No cross-surgery stale state seen.
- Browser remained the same context throughout; temporary state saved outside Git and browser closed. An initial mobile-menu overlay intercepted a card click; normal Close menu action resolved it, no force click/source fix. Harness sandbox lacked URL constructor in response callback; pathname predicate replaced with safe string matching. No application defect inferred from either automation issue.

## Risks
- PARTIAL package validation remains: no real alternate-company/read-only authorized context supplied; those dimensions remain covered by the 24 HTTP-boundary tests and existing permission regressions, not live impersonation.
- Global production build/typegen remains deferred: live DEV server/concurrent owner use shared .next output; never infer build success from a running DEV server. Existing TypeScript/scoped lint/55 test evidence remains separate.
- One browser console error after intentional conflict is expected 409 network failure; no claim of globally clean console or whole-ERP validation.
- Existing outside-panel status chips remain legacy and were not changed.

## Next
- Coordinate exclusive build output and use existing authorized alternate-company/read-only test contexts if complete runtime matrix is required. No more DB-disposability or routine implementation-phase approval is needed.
