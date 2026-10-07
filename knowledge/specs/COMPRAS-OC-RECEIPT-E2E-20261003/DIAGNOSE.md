# Diagnose

## Reproduce
Source gaps identified before mutation: draft UI lacked Emitir despite hook/API existing; OrdenCompraError extended Error so errorResponse returned500 instead of declared409. Five focused checks failed before source changes.

## Scope
Bounded OC page and domain error constructor; new tests only. No schema, Auth/roles/security/transition-rule changes, global error mapper or existing real records.

## Evidence
- Source writer petite-red-moose:5fail/6pass before fix;13mocked checks/4files after correction, independently repeated by calm-fuchsia-grouse.
- Real authenticated backend OC list200, provider/article reads200. Prepared two exact synthetic fixtures through existing APIs; native catalog includes exact article.
- Initial browser navigation deadline15s stopped before any mutation. Direct local OC page probe returned200/116ms after cold compilation. Increased navigation/membership deadline60s inside bounded global runtime.
- Subsequent saved-state age probe confirmed expired. Old app SDK could refresh in a plain browser but strict business guard rejects outbound refresh. Runner now classifies stale file with exact `E2E blocked by expired authentication state` before browser/business writes. No Auth fixes.

## Hypothesis
Two source wiring/mapping defects and QA navigation/session prerequisites—not a missing domain transition or quantity-validation rule.

## Minimal Fix
- Draft-only Emitir reuses existing hook/transition.
- OrdenCompraError inherits existing ApiError, preserving constructor/status/code and class identity; unexpected ordinary errors still500.
- Test matches actual native catalog-only create and collection-only readback, not unsupported free/Z/observations or nonexistent GET/{id}.
- One fresh headed manual capture saved new state outside Git without overwrite; no passwords/tokens in source/output. No arbitrary guard relaxation or happy-path API fallback.

## Validate
One uninterrupted real native saved run PASS: create1/emitir1/enviar1/recibir2/rejected1, partial1+remaining3, overreceipt4rejected409 with unchanged fullOCstate, final+3→received4/remaining0/Recibida persisted after reload. Private receipt QA-OC-541f4f66-b119-4b27-a0ed-e67ed1738c90-result.json. No case resume, duplicate OC or cleanup.

## Regression Check
13mocked checks cover draft/non-draft states, selected ID/rejection toast, existing menu actions, default409/custom422/class identity and unexpected500 plus service/validator regressions. Global tsc completes with only excluded next.config.ts unsupported eslintproperty, no own-file errors. No full build run; shared server stays owned by readiness task.

## Handoff
Claim operative OC lifecycle and quantities only, not physical stock, supplier email/fiscal or fullERP. Reuse saved command/currentstate while valid; stale state is prerequisite, not functional regression. Preserve all real data; no retry/reset/delete to hide failures.
