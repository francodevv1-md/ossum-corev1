# DEV QA readiness and reusable session

## Outcome
Provide a repeatable redacted local environment checker and manual-login session capture/read-only authenticated preflight. Identify actual blockers before operational writes.

## Declaration
- ID: DEV-QA-READINESS-SESSION-20261003
- Owner: orchestrator; directed implementation delegated to QA tooling agent.
- Model: openai/gpt-6.1-sol; delegated model host-selected, not asserted.
- Mode: implementation/testing; separate read-only reviewer.
- Allowed files: three new scripts named in lock and this isolated spec folder/lock.
- Allowed commands: node syntax/tests/checker, read-only Git inspection, browser/runtime availability checks. Local-only read-only session checks when configured. Coordinator may provision the installed Playwright version's Chromium binary after verified absence; no npm dependency changes.
- Forbidden: new npm dependencies, commit/push, database writes, schema/Auth/roles changes, production/staging, deployment, credential/session values in logs.
- Validation: runnable synthetic node tests, syntax checks, real local redacted readiness, independent review. Browser/session status reported separately.
- Handoff: Done / Changed / Files / Validations / Risks / Next with exact replay commands.
- Stop: ownership overlap, unknown target before writes, real data/remote target, secret leakage, two proven unsuccessful minimal Diagnose cycles.

## Runtime continuation approved 2026-10-03
Franco asked how to open Chromium and explicitly confirmed takeover of the Cloudflare runtime reservation: “si confirmo toma esa reserva”. Coordinator owns DEV5000/shared .next exclusively for starting Next DEV, plus Next-generated next-env.d.ts without manual source edits. Existing source/config/Compras ownership remains unchanged. Allowed: local server startup with private temporary logs, headed manual login/session capture and read-only membership preflight; no concurrent build/typegen, credentials automation or business writes. Resolve the expected company from the existing locally configured DEV company without printing env values; successful membership is not authorization for fixture mutations.

## Scope and limits
Reuse installed Next env loading and Playwright. Do not normalize existing Prisma/app loaders in this package: those files have unrelated owners. Capture state outside Git using an explicit local path, manual login, no passwords in tooling. Preflight must use the application's actual bearer-session transport, not assume cookie-only authentication. No fixture creation or business mutations until target and synthetic-company scope are explicitly identified; preserve active Compras lock. Existing build/test weaknesses are not silently repaired here.
