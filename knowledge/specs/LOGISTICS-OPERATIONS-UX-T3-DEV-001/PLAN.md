# Plan — Phase E Logistics Operations UX

## Review Workload Forecast

- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: High
- Chain strategy: not-applicable — working-tree DEV package; no commit or PR is requested or permitted

## Steps

- [x] Confirm E2/E3 expose complete descriptors for all operational stages.
- [x] Add the scoped authoritative workspace with signals, map, scanner, physical table/cards, inspector, blockers, differences, and descriptor-only action confirmation.
- [x] Add focused component tests and pass TypeScript validation.
- [x] Apply review correction: descriptor failures refresh the projection; absent authoritative next-task/stage data renders unavailable rather than client-derived state.
- [x] Add local allocation filter and filtered-empty state; preserve projected capability-denial reasons.
- [x] Evidence: `src/__tests__/components/LogisticsOperationsWorkspace.test.tsx` covers loading, retry/stale refresh, capability denial, focus restoration, and modal focus cycling. Commands: focused Vitest suite; exact six-file Vitest suite; targeted ESLint; `npm run typecheck`.
