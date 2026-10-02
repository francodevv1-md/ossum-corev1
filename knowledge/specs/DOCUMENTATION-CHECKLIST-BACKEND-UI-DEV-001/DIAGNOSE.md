# Diagnose

## Progress accessibility
- Reproduce: focused Vitest run; aggregate test fails because progressbar aria-valuenow is null, expected 100.
- Scope: panel progress accessibility only; shared UI file read-only.
- Evidence: src/components/ui/progress.tsx destructures value and uses it only for indicator transform, not Radix Root.
- Hypothesis: wrapper omits determinate ARIA value; backend aggregate and visual percentage are correct.
- Minimal Fix: pass explicit aria-valuenow from the same backend approved/total percentage in the owned panel. No shared component edit; assertion retained.
- Validate / Regression Check: rerun focused panel and existing documentation contract suites; results in HANDOFF.md.
- Handoff: no dependency/config/permission changes.

## Effect lint
- Reproduce: scoped eslint rejects synchronous setLoading/setError via refresh() in mount effect.
- Scope/Evidence: useSurgeryDocumentation mount line; initial loading already true.
- Hypothesis: mount unnecessarily repeats event-handler state setup; no extra state transition is required to begin initial GET.
- Minimal Fix: separate async load from explicit refresh state setup. Mount calls load, events call refresh. No lint suppression or delayed workaround.
- Validate: first correction retained an ESLint diagnostic through the async helper catch/finally. Second minimal cycle uses promise fulfillment/rejection/finally callbacks for asynchronous state updates; no synchronous state setter in the effect's called body. No suppression or assertion weakening. Final ESLint/Vitest evidence in HANDOFF.md.

## Global TypeScript
- Reproduce: npx tsc --noEmit --incremental false.
- Evidence: 4 missing Surgery names and one nullable ConsumoState in src/app/cirugias/page.tsx; InputJsonValue/JsonValue mismatch in presupuesto.service.ts:914.
- Scope: forbidden core/other owner's files; no documentation file diagnostics.
- Minimal Fix: none here. Preserve concurrent work and report global gate separately; no claim of global green.
