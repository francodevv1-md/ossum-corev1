# Validation — Remitos / Surgery DEV

## Source and approval
- Worktree: `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`; branch `ux/antigravity-redesign`.
- User confirmed the connected target as disposable DEV and explicitly approved synthetic Surgery/Remito creation, issuance, persistence and applicable stock acceptance. The former Sol1 hold is excepted only for this validation. No historical incident investigation or cleanup.
- Effective Next development environment: `.env.local`, `.env`; no inherited `DATABASE_URL`; runtime/public Supabase project alignment verified without disclosure.
- Runtime target fingerprint: `eea50a90db40433affbd` (hostname/port/database/user fingerprint, not credentials).
- Preflight connected successfully and verified the required existing tables. No schema/migration/Auth/permission/backend changes were necessary.

## Diagnose — summary identity and truthful states
- Reproduce: new component test against the original source produced **11 failures / 2 passes**. Visible `CX-0042` was sent instead of the backend relation ID; eight linked rows displayed five; failure/loading/unavailable labels were absent.
- Scope/evidence: `surgery-adapter.ts` deliberately distinguishes `id`/visible number from `backendId`; Logistics already uses the latter. Summary's sole application caller passed `surgery.id` and requested `take: 5`.
- Hypothesis: incorrect relation identity hides valid Remitos; a limited result was mislabeled as total and failures appeared empty.
- Minimal fix: caller sends trimmed `backendId`, no visible/local fallback. Existing API/hook reused with `take: 100`; a full page displays `≥100`, not an exact unbounded total. Missing identity/company, loading and API errors have explicit states.
- Validate: writer **13/13 PASS**; parent independently reran **13/13 PASS** after server restart.
- Regression: parent **47/47 PASS** across the three exact inspected files below; independent read-only source review found no introduced blocker.

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/components/RemitosSummaryCard.backend.test.tsx src/__tests__/components/TraceHardening.test.tsx src/__tests__/unit/remito-service.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Default parallel forks exceeded the initial 120-second runner budget after restart, with worker-termination timeout warnings. The same explicit file set passed in 8.75 seconds using documented threads/single-worker CLI options. This is runner mitigation, not a proven application defect; no test configuration/product changes were made to manufacture a pass.

## Real persistence acceptance — PASS

Safety review approved the bounded script before execution. Command:

```powershell
$env:OSSUM_REMITOS_DEV_ACCEPTANCE = 'approved-disposable-dev'
node node_modules/tsx/dist/cli.mjs scripts/qa/remitos-functional-dev.ts --execute eea50a90db40433affbd
```

Executed once successfully before server restart; **not repeated** after restart.

| Check | Result |
| --- | --- |
| Real identity resolution/permissions | Missing actor 401; persisted viewer membership 403; no mocked Auth |
| Input/ownership | Nonpositive quantity 400; foreign Surgery 404; no denied Remito persisted |
| Creation | Borrador, null number, technical Surgery linkage, Decimal `1.25`, recipient snapshot persisted |
| Draft update | Accepted update and audit; stale `expectedUpdatedAt` rejected 409 |
| Explicit issuance | Generic state endpoint cannot issue; dedicated endpoint allocates number/date |
| Reload / immutability | Number, issuance timestamp and recipient snapshot survive reload; emitted draft edit and repeated generic issue reject 409 |
| Multiple documents | Two manual Remitos on the same Surgery receive numbers 1 and 2; third Cajas Remito receives 3 |
| Company isolation | Foreign-company detail 404 and list empty, even for an actor with membership in both synthetic companies |
| Audit | `remito.created`, `remito.draft_updated`, `remito.issued` persisted |
| Manual stock boundary | Manual document issuance did not invent stock dispatch |
| Cajas prerequisites | Missing dispatch intent 400 and absent current control 409; transaction rolls back number/stock effects |
| Actual controlled dispatch | Existing formula → physical unit → assignment → stock selection → reservation → clean control → Remito issuance; outgoing quantity 0.5 |
| Stock linkage / partial balance | One `DISPATCH_OUT` links Surgery/Remito/item and original stock location; reservation and pending accounting retain 0.5 |
| Replay | Exact repeated command keeps number/date, one dispatch and one stock movement; changed quantity on same key rejects 409 |

These are real PostgreSQL operations through actual Request/Response route handlers and domain services using the **existing DEV header identity resolver**. They are not a live HTTP server/middleware, Supabase JWT, production or browser certification. Cajas fixture setup uses existing services, not bypassed preparation records.

## Retained synthetic fixture inventory
- Prefix: `qa-remitos-cx-1791336542785-26f453e6`.
- Organization: `<prefix>-org`; companies: `<prefix>-company`, `<prefix>-foreign`; branch: `<prefix>-branch`.
- Users: `<prefix>-actor`, `<prefix>-viewer`; patient: `<prefix>-patient`; surgeries: `<prefix>-surgery`, `<prefix>-foreign-surgery`.
- Manual Remitos: `cmuxfj0in0004rohuqcr86lsn`, `cmuxfj4cg0009rohu48osrdxv`.
- Cajas Remito: `cmuxfjf040014rohu8v9h2k9r`.
- Assignment: `ca_6e11603265804cd7a572`; preparation line: `cpl_29e54b7e4cc14a1f9c62`.
- All synthetic records retained. No cleanup/reset/deletion or historical scans were executed. Further cleanup requires its own authorization.

## Remaining gates / boundaries
- Browser: **BLOCKED**. Opening `http://localhost:5000/cirugias` redirected to `/login?next=%2Fcirugias`. Test tab closed promptly; no login/session bypass. Current production server is shared and was not restarted.
- Build: **NOT RUN**. Avoid overwriting shared `.next` while the existing `next start -p 5000` runtime is serving. Current UI source must be rebuilt by its runtime owner before authenticated browser acceptance; old build is not evidence of this patch.
- TypeScript: initial nonincremental command exceeded 120 seconds without diagnostics. The explicit global retry completed with errors in existing/foreign worktree tests and components (including Cajas, purchases, billing, membership routes and the foreign NewSurgeryDialog change), plus `Response.json(): unknown` errors in the new acceptance script. Diagnose for our script: reproduced TS18046/TS2339; scoped to the response helper; added a generic typed response envelope using the existing Remito DTO and array type for list requests. This is type-only and does not rerun DB writes. Final compiler-API validation of the same complete project: **149 global diagnostics / 0 diagnostics in all four owned source/test/script files**. Scoped gate PASS; global gate FAIL. `node --check scripts/qa/remitos-functional-dev.ts` also PASS. No errors outside ownership were repaired.
- Read-only diff check: PASS. Existing dirty/untracked work preserved; no commit/staging/push/PR/deploy.
- Existing global issuance table lock, bounded-page/latest selection and hook stale-request limitations were not redesigned in this task. Legacy returns/consumption, fiscalization and unrelated endpoints are outside this acceptance.
- A `pg` deprecation warning occurred while existing services ran: client query queueing is deprecated in future pg9. Current acceptance passed; no dependency upgrade or unrelated refactor.

## Frozen source verification
- FichaTabContent SHA256: `05C8C5A37C179FFB1EA46B2CF39F6F631C8F3787491459B9B95EF03926C23096`.
- RemitosSummaryCard SHA256: `2F37161BC8A797420831284A50082B9201B937EF9DD78311925FA85CCB832557`.
- Regression test SHA256: `03BE9692322AE6B32F8EEBD239AF945715C719D2E1F78CDE431DF6CAAC3686EC`.
- Parent verified hashes match writer handoff; exact product diff is one changed caller line plus nine changed summary lines. Schema, Remito service and Auth context show no task diff.
