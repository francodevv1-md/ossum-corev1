# SURGERY-AUTHORIZED-COLOR-20261007

- Risk: protected presentation constants; apply scoped approval, ownership, Diagnose and validation safeguards.
- Owner / model / mode: Frontend UI, GPT-6.1 Sol, implementation + QA.
- Objective: distinguish dated Autorizada (emerald-500) from Pendiente (yellow), consistently in desktop/mobile and existing badge consumers.
- Approval: user selected emerald-500 and local commit; execution request `arranca nomas`.
- Allowed files: exact lock allowlist. Guide sentence must match the new color; labels and state semantics remain unchanged.
- Forbidden: all other files, API, state transitions, schema, Auth, DB, foreign work, shared .next and live servers.
- Allowed commands: scoped tests, typecheck with no incremental output, isolated UI compilation/browser fixtures, read-only inspection, exact scoped local commit.
- Forbidden commands: dependency installs, database writes, foreign process termination/restarts, push, PR, deploy, destructive Git operations.
- Validation: reproduce palette regression before fix; relevant component/unit suites; TypeScript baseline/final comparison; browser fixtures at 1366x768, 1920x1080, 390x844 in light/dark themes.
- Stop: ownership overlap, unexpected edits, scope/security/data changes required.
- Output / handoff: Done / Changed / Files / Validations / Risks / Next; distinguish synthetic component QA from authenticated live acceptance.

## Diagnose

- Reproduce: both maps assign Autorizada the same yellow as Pendiente; existing tests explicitly expect this duplication.
- Scope: presentation-only constants and explanatory color guide; preserve empty-date white fallback and stored labels.
- Evidence: CX_STATE_VISUALS.Autorizada uses #FACC15/bg-yellow-400; shared CX_STATE_COLORS.Autorizada uses bg-yellow-400. Desktop and mobile consume different maps.
- Hypothesis: duplicated mapping, not a malformed state string. Exact stored label is Autorizada.
- Minimal fix: update both mappings, existing soft-cell mapping and guide color sentence; regression assertions exercise all variants and mobile.
- Validation: regression suite RED before source edit (6 failures); GREEN after edit (67/67 across five suites). Scoped tsc passed with zero diagnostics. Global pre-edit tsc exhausted default Node heap (exit 134); no global PASS claimed.
- Regression: all four status variants, mobile, date-aware modal, header, guide, existing state order and explicit undated fallback preserved. All nine actual states have distinct strong colors. Previous tests deliberately encoded duplicated yellow; a historical copy/paste cause is not established.
- Browser: six synthetic component cases passed at 1366x768, 1920x1080 and 390x844, light/dark; no horizontal overflow/page errors. Authorized solid label contrast >=7:1. Production-mode isolated Vite compilation passed. A fixture selector initially counted the white mobile card surface too; constrained it to the actual badge, reran successfully.
- Handoff: see HANDOFF.md. Shared runtime unchanged; authenticated live URL stalled/blank, so live route acceptance remains pending its owner's rebuild/session recovery.
