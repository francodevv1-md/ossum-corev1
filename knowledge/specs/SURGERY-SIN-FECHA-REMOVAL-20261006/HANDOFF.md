# Surgery legacy state removal — worklog and handoff

## Done
- Removed `Sin fecha` from actual surgery-state vocabulary, selectors, state filters, pipeline membership and automation definitions.
- Delegated implementation and separate read-only review completed; no blocking findings. Ownership released.

## Changed
- Nine actual states, matching the existing canonical surgery domain document.
- Exact legacy local `state: "Sin fecha"` normalizes immutably to `Sin autorizar` at store ingestion and browser hydration. Persist version 2 retains earlier version-0 supplier cleanup and version-1 legitimate records, then writes normalized synthetic storage.
- API compatibility converts the legacy alias to `unauthorized` and correctly renders canonical `unauthorized` as `Sin autorizar`.
- Missing-date conditions, filters and white presentation colors remain independent. No conversion of authorized/pending rows based on blank dates; no guesses about existing canonical pending rows.
- Guide now has one actual `Sin autorizar` entry; absence of a date is explicitly not a separate surgery state.

## Files
- Twelve scoped source files; five existing tests updated and one focused regression test added. Exact allowlist in TASK_BRIEF.md and the ownership lock.
- No schema, backend service/validator/transition, API-route, Auth/security or dependency change.
- Earlier approved palette/guide hunks retained. Independent review verified 18 frozen source/test hashes; implementation preservation evidence confirms 873 foreign dirty/untracked files unchanged.

## Validations
- Parent exact nine-suite replay: **99/99 PASS**, 6.63 seconds. Includes synthetic persisted-data migration/writeback, normalization immutability, selectors, adapter mappings, date tabs, palette and dialog/header regressions.
- Eighteen changed TS/TSX files passed syntax diagnostics; bounded actual types/store-helper/automation semantic checks passed. Not a full application typecheck.
- Independent source review: no blocking findings.
- Offline Chromium: **96 color checks plus four actual guide snapshots PASS** using real component markup and project CSS, widths 1280/390 and light/dark themes. No removed guide entry; nine actual labels. Browser closed; no live app/API/DB access.
- `git diff --check` PASS. Backend service/validator/schema/API-route diff check empty.
- Browser fixture initially lacked jsdom's NodeFilter global; explicit jsdom export and React act-environment flag fixed only the external disposable harness. No product change for this test-environment issue.

## Risks
- Two pre-existing ChangeStateDialogEvidence failures were reproduced and left untouched. They are not part of the 99 passing checks.
- Full application build/typecheck and live runtime acceptance are not certified. Existing production runtime still needs owner rebuild/restart.
- No database records were inspected or migrated. Existing out-of-band legacy DB strings remain physically untouched and only normalize at the compatibility boundary; no real-data cleanup authorization inferred.

## Next
- Rebuild/restart the app to load the new code; browser-local legacy entries normalize on the next hydration.
- No commit, push, deploy, DB operation or server restart performed.
