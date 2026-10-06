# Focused native Ficha-opening recovery

Franco approved 2026-10-06: diagnose and fix only the demonstrated Cirugías→Ficha opening blocker, without Auth, permissions, schema or business-rule changes. One minimal confirmed cause/fix and focused regression evidence; no broad cleanup or restoration of a previous worktree.

## Evidence and current baseline

- Actual synthetic target/session validated; native code/row exists once. The expected Ficha Header menu remains unavailable after double-click. No mail POST occurred.
- Current HEAD: `cef953941d82fef929ba10c75eb49ee987766e3c`. Another owner already corrected Header's missing `getCxStateVisual` dependency using the existing color map/default and committed its bounded date package. Preserve it; do not redo that correction.
- Source selection resolves the same row ID through the store; rendering expanded view depends on selected entity existence. Inspect that actual path and native row/menu interactions before making a fix.
- Native row actions also expose the existing “Ver expediente” command; use it as a comparative diagnostic, not a fabricated route or business-state injection.
- Some current file hashes differ from the earlier image-mail acceptance snapshot. Read the current behavior first; do not transplant old code or discard another owner's changes. Previous mocks/rendering prove only their recorded version.
- Proven mail-source drift: current tracked modal and Novedades match their older baseline behavior, with fixed recipients/sample clinical data and missing evidence props; current retained tests reproduce 26/26 FAIL. Recover only the originally approved own mail behavior in these callers plus sibling Coordinator envelope/audit compatibility. The original image-mail lock is reopened for that bounded recovery; all foreign committed Header/date/branch work remains untouched.

Source candidates and exclusions are recorded in the current live QA lock. Only reserve/write the necessary caller after evidence, with one owner; independent review before final real mail invocation. Browser contexts remain bounded/closed on failures and no double-send marker may be removed or bypassed.

## Current recovery result

- Recovered only originally approved mail behavior in SendEmailModal, Novedades mail wiring and Coordinator response compatibility on the current baseline; preserved foreign Header/date/branch corrections. No Header/store/selection or domain changes were applied without a demonstrated cause.
- Seven unchanged focused suites **72/72 PASS**, exit0, 2.81s, independently source-reviewed **PASS**. The previous 26/26 failure was caused by the missing own UI work, not by weakening the tests.
- Comparative native “Ver expediente” diagnosis now stops earlier with **E2E blocked by expired authentication state**. The old session's expiry was verified inside the browser through the existing redacted session verdict helper; no token values or Auth code changes.
- Browser closed, no mail attempt marker/provider dispatch. Refresh through manual login and a new local state outside Git; only then can the current Ficha opening be accepted or diagnosed further.

## Final fresh-session recovery and acceptance

The correct manual capturer saved a fresh authenticated session outside Git. Native row-menu “Ver expediente” opened the actual Ficha Header with no UI failure or writes; the mail runner now reuses this existing command. No selection/store/Header application fix was needed. Actual modal preview initially hit upload loading; bounded diagnosis confirmed the disabled control and the QA runner waits until enabled, preserving the application's loading guard. Actual PNG dimensions/bytes and individual/company signature then passed.

One authorized native send subsequently passed provider acceptance, exact-message `delivered`, persisted Seguimiento and modal completion. See `LIVE_VALIDATION.md` for the current result; the expired-session and blocked evidence above is historical. Exclusive send receipt retained, no retries. Owned QA browsers closed; source/runtime locks released without stopping the DEV server or altering foreign source.
