# ANTIGRAVITY-FISCAL-RUNTIME-IMPORT-DEV-001 — Task Brief

## Objective

Import the smallest complete DEV-only fiscal runtime/evidence package into the Antigravity worktree after the approved canonical fiscal migration, without provider, database, or issuance activity.

## Scope

- Server-authoritative, company-scoped read-only fiscal evidence projection and route.
- Minimal fiscal cancellation guard for operational invoice annulment.
- Read-only Facturación evidence action, hook, and dialog using authoritative invoice IDs and active company scope.
- Focused isolated tests only.

## Exclusions

- Schema/migration edits or application, database calls, provider calls, credentials/configuration, issuance, retry, webhook, Auth/role/security changes, and unrelated billing UI.

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Medium

## Validation

- Focused Vitest fiscal service/evidence/route/hook/dialog/page tests.
- Scoped ESLint, TypeScript, and `git diff --check`.
- No application server, database, or external provider request.
