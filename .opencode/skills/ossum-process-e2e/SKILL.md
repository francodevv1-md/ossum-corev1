---
name: ossum-process-e2e
description: "Trigger: operational E2E, surgery intake, approval, purchase order, blocked Playwright. Build replayable OSSUM process tests without Auth workarounds."
license: Apache-2.0
metadata:
  author: ossum-cor
  version: "1.0"
---

# OSSUM process E2E

## Activation Contract
Use when authoring/running saved operational browser tests or diagnosing their prerequisites. Interactive CLI browsing alone is not completion evidence.

## Hard Rules
- Follow AGENTS.md; use the installed TypeScript Playwright runner and existing configs/helpers before adding tooling.
- Never read session/secret values into chat or artifacts. No hardcoded credentials, Auth bypass, real data mutation, reset or automatic fiscal/mail issuance.
- Browser sessions have a 20-minute ceiling. Do not solve expired sessions by changing Auth.
- Reuse a fresh manual-login storageState outside Git; automated credential login requires explicit approval.

## Decision Gates
| Evidence | Classification/action |
| --- | --- |
| No server/browser/session or fixture authorization | BLOCKED before business writes; explain the missing prerequisite. |
| Expired state/401 | Auth prerequisite blocked, not a process regression; refresh manual login. |
| Mocked routes/service calls | Component/contract evidence, not real E2E. |
| --list succeeds | Discovery only, not PASS. |
| Saved real browser test and persisted-state assertions pass | Process E2E evidence for that exact scope/target. |

## Execution Steps
1. Inspect package scripts, config and existing process specs. Choose one existing command/config and explicit synthetic fixture scope; respect active ownership.
2. Check server reachability/browser availability. Perform authenticated/200 preflight and intended-company/fixture checks before mutation.
3. Save a test for the business steps, expected outcomes and negative cases. Use stable role/label/testid selectors and web-first assertions; avoid arbitrary sleeps.
4. Assert backend-persisted outcomes (API or reload), not just toast visibility. Isolate runs with authorized fixtures; cleanup only explicitly owned disposable data.
5. Run the same command Franco will replay; keep local redacted reports/traces. Treat artifacts as potentially sensitive and never publish them automatically.
6. Diagnose observed failures minimally; park blocked work and continue independent eligible tests. Report prerequisites, command, executed assertions and actual result.

## Output Contract
Done / Changed / Files / Validations / Risks / Next, with PASS/FAIL/BLOCKED/NOT RUN, exact command and mock-vs-real classification. No completion claim based on source existence.

## References
- ../../../AGENTS.md — ownership, Auth prerequisite and browser budget.
- ../../../knowledge/workflow/DEV_ENV_AND_PROCESS_TESTS.md — environment, coverage and replay instructions.
- ../../../e2e/ — existing tests and helpers.
