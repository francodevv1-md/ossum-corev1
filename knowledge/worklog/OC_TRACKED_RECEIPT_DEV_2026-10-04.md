# OC tracked receiving DEV — 2026-10-04

## Done
Resumed existing backend/UI without rewriting production source. Consolidated 200 mocked tests and independent source re-review PASS. Real synthetic DEV tracked native ingress, canonical readback, accepted-key replay, company-wide serial rejection/concurrency/rollback and reload checks PASS. Fresh NONE regression PASS. Actual recipient WARNING readback remains blocked.

## Changed
One explicit NONE fixture prop in old hook/dialog tests. Saved scoped Playwright runner/spec/config and retained-case diagnostics/verification. QA-only fixes: TypeScript inference, truthful company-wide OC readback, guarded partial-fixture resume, exact identity/item/allocation bijections, pinned readpath containment, native UUID key validation against persisted acceptance, frozen intent before POST and45s cold read budget with bounded browser timers. No backend/UI/schema/Auth/role/provider changes.

## Files
`knowledge/specs/OC-TRACKED-RECEIPT-DEV-001/{TASK_BRIEF,HANDOFF,VALIDATION,REPLAY,UI_PREFLIGHT.mjs,READBACK.mjs,VERIFY_ACCEPTED.mjs}`; task lock; `e2e/compras-oc-tracked-receipt.spec.ts`; `playwright.compras-tracked.config.ts`; `scripts/qa/run-compras-tracked-process.mjs`; old reconciliation test fixture. Shared WORKLOG.md and foreign dirty files preserved.

## Validations
- Mocked: exact eight-suite allowlist200/200, independent production-source review confident-harlequin-guppy PASS.
- PRE-LIVE/RESUME: reviews prime-aquamarine-shark, wee-violet-damselfly; follow-up canonical/race assertions resolved and containment visual-tan-thrush PASS.
- Manual headed QA actor capture + exact-company authenticated200 preflight PASS. Same fresh external state reused; no credentials automation.
- Native LOT_EXPIRY/LOT_SERIAL_EXPIRY: quantity2+2, expired accepted/no block, two visible/durable audit warnings; four invalid dates400 unchanged.
- Canonical strengthened read-only check: four exact ReceiptLines/movements, two serial units, location/date/lot/serial/actor/OC/Receipt links PASS.
- Accepted verification: exact/reordered replay200 unchanged, changed trace409, cross-article duplicate409 unchanged; race winner `cmutybc57003jxohuzfe9rcaq`, loser `cmutybde2003oxohu3n5vynae`, one200/one409, one additional identity/Receipt/movement, full winner links and loser/original data unchanged; reload PASS.
- Fresh NONE: existing saved command new SKU/native OC, stock0→1→4, two receipts/movements, replay/conflict/overflow/reload PASS.
- Global tsc: only foreign next.config.ts unsupportedeslintTS2353. Build NOT RUN over readiness-owned `.next`.
- Full original tracked runner NOT PASS: checks completed in retained-case segments after Diagnose; explicit recipient prerequisite still fails. All contexts closed, no cleanup or Git/deploy.

## Risks
In-app notification recipient filtering excludes actor; actual WARNING content/metadata/persistence/dedup requires another existing authorized QA recipient state. Durable audit warnings are not claimed as a recipient-notice PASS. No downstream Cajas/expiry-safe serialized lifecycle certification.

## Next
Manual QA recipient login, bounded readback and accepted-key no-new-notice verification. Preserve consumed fixtures; do not rerun zero-ingress resume or one-time race verification. Exact commands/guards in task REPLAY.md; finish independent evidence review and release QA lock.
