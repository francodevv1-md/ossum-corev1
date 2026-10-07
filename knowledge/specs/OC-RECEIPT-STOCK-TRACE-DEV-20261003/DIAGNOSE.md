# Diagnose — physical receipt adoption

## Reproduce
- Source investigation: OC receipt updated quantities/state only. Existing standalone Receipt confirmation had nested transaction behavior even for typed TransactionClient.
- Critical review independently reproduced accepted receipt POST + swallowed failed list GET, closing modal/losing operation key; repeat could double-credit a delivery.
- Validator accepted oversized keys/location and lone surrogate; URI encoding threw500 before tx.

## Scope
Existing OC/Receipt chain and mandatory audits, approved physical receiving guard, receiving UI/hook, read-only stock origin identifiers, focused mocked tests and a new isolated E2E. No schema, global permission/Auth/RLS, stock writer replacement, historical backfill or held suites.

## Evidence
- Source writer timed out after leaving implementation; execution stopped. Coordinator took handoff and ran80mocked checks PASS. Critical annual-turquoise-anteater review still found P1/P2: green tests did not cover actual hook behavior.
- Recovery dull-teal-eagle reproduced8fail/51pass, then94pass/8files. Real hook + dialog/API mocks test GET error including4xx, POST rejection distinction, frozen same object/key/payload and reconciliation success. Unicode/size checks fail400 before tx.
- Re-review immense-moccasin-wolverine PASS, independently59checks/2files. QA PRE-LIVE sufficient-brown-shark PASS.
- Actual fresh fixture API verified active supplier, NEW SKU eligibility/policyNONE, native catalog membership, physical/reserved/transit0, empty movements. No existing received OC modified.

## Hypothesis
Physical inventory must be the stock effect of the same accepted operation—not a second loosely coupled writer. Network/reload ambiguity must not create a new client key; backend replay must inspect accepted evidence before rejecting final OC state.

## Minimal Fix
- Under scoped OC lock: normalize bounded intent, validate all positive lines/scope/NONE policy, check accepted key+intent, create delta Receipt/lines, invoke transaction-aware shared confirmation/movement helper, update OC and audit in same tx. Notifications only after commit/best effort.
- Existing stock guard/capability reused per explicit approval, no coordinator ingress. Explicit location, no display fallback.
- Receiving-only post-commit refresh failure becomes reconciliation error, not rejected POST. Key/location bounds128/200 and Unicode guard.
- Stock read projection adds only persisted receipt/line/key/actor IDs; write helper/balance/tenant queries untouched. Existing client imports shared type.
- QA corrections: support pre-existing seed actor ID rather than assuming CUID; bind fixture names/location to verified SKU suffix; typed snapshot arrays for TypeScript; native static assets and current selectors.

## Validate
94focused mocked checks PASS (coordinator repeated). Two live uninterrupted isolated runs PASS: one primary, one exact `--fresh` replay command preparing different zero-stockSKU. For each: delta1+3 yields physical/available/position4; twoReceipt/twoRECEIPT_IN links and creator+audit pointers verified; same key replays partial/full and changed-intent/overflow409 leave entire snapshots unchanged; nativeStockUI Disponible4 and reload PASS.

## Regression Check
- Co-role denial before effects, Admin/Logistics guard preserved; create/emit/send roles/behavior unchanged.
- Mocked invalid input, stock failure rollback, eligibility/traced-policy rejection, uncertainty replay and independent receipt repeat-confirm behavior checked in approved allowlists only.
- Real backend unexpected-failure/concurrency fault injection NOT RUN; atomicity is source/mocked proof plus real rejected-operation invariance, not every possible database failure certification.
- Whole tsc finishes with only foreign next.config.ts eslintproperty error; no own-file errors, no suppressed gates or excluded config edits. Full build NOT RUN.
- All browser contexts closed within limits. No production/data cleanup, migrations, fiscal, external mail, global role/Auth/RLS changes, commit/deploy.

## Handoff
Claim real DEV NONE-policy quantity ingress/origin trace/replay safety only. Preserve completed case receipts and update user-facing replay instructions; future traced policies or typed relationships are separately scoped.
