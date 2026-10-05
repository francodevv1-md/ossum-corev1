# Populated QA evidence

## Pre-live
- Franco explicitly approved only necessary synthetic nonfiscal invoices/payments in disposable Districorr DEV.
- Existing saved external session passed `dev-session.mjs preflight`: authenticated200 expected company, reused without overwrite. No financial writes by that command.
- Source business-effect review central-cyan-orca PASS; see SOURCE_EFFECTS.md. Expected DB-only notices/audit included, not fiscal/mail/external business messages.
- QA author ideal-blue-silverfish completed two isolated artifacts; discovery1testlisted (not runtime). Existing source remains untouched. Active owned lock is in `.opencode/locks`, not an absent task-local LOCK.md.
- Coordinator awaits final runner review before actual data mutations. Current actual four-case fixture coverage NOT RUN.
- Initial runner review charming-copper-jellyfish BLOCKED two pre-live guards: redirect-following could bypass initial route allowlist; fresh invoice readback omitted paidTotal/balance and discarded the canonical create read. No actual writes executed. Coordinator corrected routing via fetch(maxRedirects0/maxRetries0) with reject-all3xx; bound canonical IDs/states/zero-paid/full-balance before emit/payment. Pending checkpoint retained on failed guard. Also adopted AX-verified combobox locators from earlier actual Cartera evidence and clarified source attestation is no-business-outbound (Auth/DB network is expected).

## Saved commands
From `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`, with coordinator-approved exact gates, fixed run UUID and locally configured external storageState/artifact directory:

```powershell
.\node_modules\.bin\playwright.cmd test --config=knowledge/specs/COLLECTIONS-POPULATED-QA-DEV-20261004/populated.config.ts --list
.\node_modules\.bin\playwright.cmd test --config=knowledge/specs/COLLECTIONS-POPULATED-QA-DEV-20261004/populated.config.ts
```

Do not change the run UUID on partial recovery. Ambiguous POST requires checked owned readback, never blind retry. Accepted synthetic records remain; no cancellation/deletion/cleanup authorized.

## Actual results
- PASS: focused strict TypeScript for populated.config.ts/populated.spec.ts (`--strict --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --lib ES2022,DOM --noEmit`). This does not certify global repo TypeScript.
- PASS: discovery1testlisted; no runtime conferred by discovery.
- Final pre-live source review: financial/redirect guards resolved and stable hashes reported by round-green-hummingbird; its selector direction was mistakenly reversed. Current combobox role selectors are the desired ones (prior actual AX evidence). Chief-pink-panda independently confirmed PRE-LIVE PASS; coordinator hash gate matched config30D55DDF74F9/spec722D1541EA28 before execution.
- Actual guarded runtime FAIL/BLOCKED before owned financial mutation. Private checkpoint: invoice/payment maps empty, pendingnull, passedfalse. No programmed invoice create/emission or payment POST reached its pending-before-dispatch gate.
- Subsequent bounded offline external-session status: `E2E blocked by expired authentication state`. No session values output. Initial runtime error was redacted; do not infer an application defect or exact original failure mechanism from this later expiration check.
- Browsers closed. No existing source/Auth/services/config/schema/runtime changes, fiscal calls, finance fixtures, cancellation or deletion by this task.

## Next prerequisite
Fresh manual login and external storageState for the same DEV target; reuse it and rerun the same reviewed fixed-run script. Do not alter Auth or bypass guards. If the old20minute window has elapsed, open a new bounded browser session only after user availability is confirmed; preserve the run identifier/checkpoint and recorded failed evidence. Renew a local time window only after verifying no pending/accepted operations, not to retry an uncertain POST.
