# Tasks — E1 Logistics Operations Read Projection

## Review Workload Forecast

- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: High
- Chain strategy: not-applicable — working-tree DEV package; no commit or PR is requested or permitted

The required service, two routes, validator, and focused unit/integration coverage are expected to exceed the normal 400-line review budget. Franco explicitly resolved this as a working-tree DEV package with no commit or PR; PR sizing and chaining are not applicable.

## Plan

- [x] 1. Add the read-only projection service and bounded normalized scan validator.
- [x] 2. Add company-scoped GET projection and POST read-only resolver routes.
- [x] 3. Add focused service and route tests, then run typecheck.
