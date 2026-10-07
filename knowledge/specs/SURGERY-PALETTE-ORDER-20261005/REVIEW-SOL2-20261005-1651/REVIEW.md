# Independent surgery palette review

## Done

- Package: `SURGERY-PALETTE-ORDER-20261005`.
- Reviewer: Sol2, independent reviewer, actual model `openai/gpt-6.1-sol`.
- Delivery workspace: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`; not `E:\OSSUM_COR_PROJECT`.
- Reviewed HEAD: `21385527dcfbc6ebc5b1507096d03a2c402d8c4d`, unchanged from the requested baseline and at both validation checkpoints. This is a dirty working-tree review, NOT a review of HEAD alone.
- **Source review: FAIL.** Findings F1 and F2 affect the allowed package sources; F3 is an active caller acceptance gap outside the original file allowlist. No independent approval is granted.
- **Full requested acceptance: FAIL / incomplete.** Confirmed source gaps remain; real browser acceptance is separately **BLOCKED**, and DB acceptance is separately **BLOCKED** by the existing hold. Passing mocked tests does not overrule these outcomes.

## Changed

- No application source, tests, configuration, dependencies, business rules, Auth, permissions, API, adapters, schema, store, original handoff or foreign locks were edited.
- Created only this new review folder and `.opencode/locks/SURGERY-PALETTE-ORDER-SOL2-REVIEW-20261005-1651.lock.md`.
- Source scope was declared read-only before validation. The review reserved only its own artifacts, not application files, runtime, ports, `.next`, fixtures or Git index.
- Parent and delivery `AGENTS.md` were read. Palette and surgery-typing source locks were released. No overlapping application writer was identified in inspected local locks. `DEV-QA-READINESS-SESSION-20261003` still reserves DEV5000/shared `.next`; that ownership was neither assumed nor transferred.
- Preserved the pre-existing dirty `ExpedienteHeader.tsx` authorization-action hunk at lines 308–319. Only its palette import at line 30 and date-aware visual lookup at line 106 belong to this palette package. Its whole dirty diff is not attributed to this package.

## Files

### Evidence artifacts

All paths below are relative to this review folder:

- `SNAPSHOT-BEFORE.json`: initial exact palette allowlist, 12 entries including the existing implementation lock.
- `IMPORT-PREFLIGHT.json`: 51 local runtime-import dependencies for the two explicit tests, setup and Vitest configuration; external import list and risk-marker inspection.
- `SNAPSHOT-VALIDATION-BEFORE.json`: full 90-file source/test/import/config/caller/document context manifest captured before the final validation replay.
- `SNAPSHOT-AFTER.json`: same 90 paths after final validation.
- `SNAPSHOT-COMPARISON.json`: unchanged HEAD and 90/90 unchanged file hashes; no affected review invalidation was required.
- `VITEST.log` / `TSC.log`: first actual independent reproduction.
- `VITEST-FINAL.log` / `TSC-FINAL.log`: final replay after the complete manifest capture.
- `DIFF-CHECK.log`: exact scoped tracked whitespace check.
- `GIT-STATUS-BEFORE.txt` / `GIT-STATUS-AFTER.txt`: dirty workspace status evidence, not package attribution.
- `CLOSURE-CHECK.json`: final unchanged HEAD/90-file check after writing the report. Two new foreign SAFE-TEST-INVENTORY artifacts appeared in Git status during review; their released lock reserves only a disjoint read-only inventory/docs scope. They were not touched and did not change any reviewed hash.

### Exact primary snapshot SHA-256

Before and after validation hashes match. Paths are relative to the delivery workspace.

| Reviewed file | SHA-256 |
| --- | --- |
| `src/lib/shared-constants.ts` | `906E4CB9E8D6E1DC2D082C41E8371343C9D7C3D996DAE35430231854B00EADD3` |
| `src/lib/cirugias.constants.ts` | `7769D0852BA40FB3EA25324926EA1F111EF3D0E1C1902E9393C4640277E84D29` |
| `src/lib/cirugias/cirugias-columns.tsx` | `F061CF915E2DA58771B4A556A6070A8CE0C1F81C364947D243A77E6B16E9DDF6` |
| `src/components/cirugias/CirugiaStatusCell.tsx` | `EC10DF22FCFFB8C33AF8C7E445F1954D00A3F8FE30A4987E417250AE98886047` |
| `src/components/cirugias/CirugiaRow.tsx` | `B19D2C7D195F756641AF3BFD702B73FA232F394F708DB8A4DD2715B2F18DF7EE` |
| `src/components/cirugias/CirugiasGridRow.tsx` | `A6C4601031E0DE1CC5BB39C3D2001E36C87F76B22023FD7802E0793E45D5A51A` |
| `src/components/cirugias/MobileCirugiaCard.tsx` | `A4621F9F50B9C21CE698D621AD7B87FD577886222ECCE6B045A167917CCC4391` |
| `src/components/cirugias/view-customization/ColorReferenceDialog.tsx` | `DE7AA7A0A86CEA3CFE63A95F7EDD5AC319B485AAFE6C496FD562850AADE9DEE2` |
| `src/components/expediente/ExpedienteHeader.tsx` | `EFCA958BDE2F098F787D396F311CBE2362AF898141F0BE3772920D992B966F60` |
| `src/__tests__/unit/cirugias-estado-prep-separation.test.ts` | `8372B7305832E2DF8798E45C419EA09E44463402A02B2886B7F8FACB229FBC81` |
| `src/__tests__/components/SurgeryPalette.test.tsx` | `2A62AE01C034D88416A93C7A403D01AE3C1904EB6068A948D587C84340668380` |
| `.opencode/locks/SURGERY-PALETTE-ORDER-20261005.lock.md` | `C46193A2ADB4F64C892BD55B1027303B4EB916A0F0B7B45FBE7558CC4D5A4BB9` |

Complete hashes for additional read-only callers and validation inputs are in the 90-file manifests. Caller inspection does not expand the write allowlist. Any subsequent change to a reviewed file invalidates its affected conclusions and requires fresh review.

## Validations

### Executed results

| Check | Actual result | Boundary |
| --- | --- | --- |
| Explicit two-file Vitest allowlist | **PASS: 42/42, 2 files**, twice; final start 2026-10-05 16:57:24 local, duration 2.06s, exit 0 | jsdom component tests and local mock-data/in-memory store unit checks, not DB integration or real browser |
| Offline TypeScript | **FAIL**, twice, exit 2; only `next.config.ts(10,3): TS2353: 'eslint' does not exist in type 'NextConfig'` | No scoped palette-source error reported; global typecheck is NOT PASS |
| Scoped tracked `git diff --check` | **PASS**, exit 0 | CRLF normalization warnings only; no application edits |
| Snapshot stability | **PASS**, unchanged HEAD and 90/90 unchanged file hashes | Initial 12-file allowlist also unchanged before complete-manifest replay |
| Independent source acceptance | **FAIL** | F1/F2/F3 below; no source correction performed |
| Real browser / both themes / mobile / hover / sticky | **BLOCKED** | Runtime reservation and safe authenticated read/fixture prerequisites not transferred or established for this review |
| DB integration / persistence acceptance | **BLOCKED** | Sol1 DB hold remains; no connections, queries, forensics, seed or cleanup |
| Build / restart / Next typegen / Prisma generation | **NOT RUN** | Shared runtime/output ownership excluded; no implicit whole-suite test execution |

Installed versions read from local package metadata: Node `v25.2.1`, Vitest `4.1.6`, TypeScript `5.9.3`, Next `16.3.8`, React `19.2.6`, Tailwind `4.3.0`.

Import/setup safety: Vitest uses jsdom and `src/__tests__/setup.ts`; setup supplies in-memory localStorage plus ResizeObserver/matchMedia stubs. The unit suite changes a local prototype preparation state in its test process only. Its adapter imports a pure coordinator read-model helper, not Prisma/DB. The two adapter `process.env` markers are NODE_ENV development checks, not secret reads. No DB client, network-fetch call or dotenv import was found in the inspected local runtime import closure. Tests were invoked directly, not through package lifecycle scripts. No integration file or global suite was selected.

TypeScript Diagnose: reproduce with the exact offline command; scope to foreign `next.config.ts:10`; evidence is the sole TS2353 diagnostic plus installed Next 16.3.8. Current official Next.js upgrade documentation, retrieved through Context7 `/vercel/next.js`, confirms removal of the `eslint` config option in Next 16. Minimal correction belongs to the configuration owner, not this reviewer: remove the unsupported config block in a separately owned change and retain direct ESLint execution. No fix, check disabling or configuration modification was attempted here. The historical failure was not accepted without rerunning it.

### Acceptance matrix from source and focused tests

| Requirement | Result and evidence |
| --- | --- |
| Eight existing color groups | **PASS (static/mocked)**: shared badges and strong table visuals agree on white, yellow, light sky blue, emerald green, dark blue, violet, burgundy and grey. Solid styles use dark text on the three light backgrounds. |
| Labels and persisted transitions unchanged by this package | **PASS (scoped diff inspection only)**: presentation lookups return keys/styles; displayed labels remain the original state. No API/schema/adapter/store/transition/permission edit belongs to the package. This is not a persisted-state integration test. |
| Ninth permission category deferred | **PASS (scoped source)**: no added state or permission override in palette changes. Foreign authorization UI is not certified by this review. |
| Autorizada with explicit empty/null/whitespace date is white and still labeled Autorizada | **PASS in scoped helper, table/row, mobile and Ficha-header wiring**; actual component test covers the status cell. **FAIL for live modal consistency**, F3. Undefined date intentionally remains the static state palette, so callers must pass date context. |
| Pending yellow only with a date | **FAIL**, F2: explicit undated Pendiente stays yellow. |
| Badge/table/row tint/mobile/Ficha agreement | **PASS (static wiring for scoped surfaces)**: grid row, column, legacy row status, mobile badge and Ficha header pass date to the shared lookup; row tints derive from the same visuals. Actual browser rendering is **BLOCKED**. |
| Readability in both themes | **PASS for source class choices and mocked solid-label assertions**, not computed contrast/browser certification. Tests do not load compiled Tailwind or render both actual themes. Real both-theme acceptance is **BLOCKED**. |
| Filters, selectors and guide order | **PASS for Cirugías static wiring and guide render**: ALL_STATES and STATE_FILTER_OPTIONS retain the required grouped order; toolbar, mobile sheet, ChangeState selector and guide iterate these lists. Calendar uses a separate partial legacy list; see limitation below. |
| Missing draft consumption is not Sin consumo | **PASS (source)**: color-key helper reads only state/date, never consumption; absent consumption in the existing secondary badge renders `—`. Grey CX styling requires the explicit existing `Sin consumo` state. No missing draft consumption is reclassified by this package. |
| Green/dark blue do not claim backend evidence | **FAIL**, F1: implementation handoff disclaims evidence, but the in-app guide explicitly claims it. No backend evidence was fetched or validated. |

Relevant existing tests inspected, **NOT RUN** outside the explicit allowlist: `CirugiasDataGrid.test.tsx`, `ExpedienteHeader.test.tsx`, `ChangeStateDialog.test.tsx`. The grid fixture already supports Realizada with null consumption; header tests support Pendiente with `autorizado: false`; existing dialog tests focus on authorization evidence/actions, not date-aware palette. They do not cover the findings below. The two executed suites do not render mobile cards, the Ficha header or the live state modal and cannot establish those browser outcomes.

## Risks

### F1 — P2 / acceptance-blocking: guide treats color as consumption/invoice evidence

- Location: `src/components/cirugias/view-customization/ColorReferenceDialog.tsx:52–60`.
- Verified evidence: Realizada meaning is `Cirugía realizada con consumo cargado.`; Finalizada meaning is `Cirugía realizada y facturada.`. Palette functions depend on state/date only. Existing `HANDOFF.md:16` explicitly says these colors are not authoritative evidence. Existing adapter maps performed/finalized by state and separately defaults `facturado` to false (`surgery-adapter.ts:406–411,507`); scoped column context supplies consumption independently (`cirugias-columns.tsx:23–26,225–239`). No evidence validation feeds the guide.
- Practical impact: staff can read a green/dark-blue badge as confirmation of recorded consumption/invoicing even when these facts are absent or unverified. The developer handoff caveat is invisible to end users.
- Smallest correction for separate writer: retain colors/state labels/order; change these two guide descriptions, or add one conspicuous shared in-app caveat, to state that colors reflect the existing operational status and do not verify backend consumption or invoicing. Example matching existing UI language: `Estado Realizada. El color no confirma por sí solo la existencia de consumo registrado.` / `Estado Finalizada. El color no acredita por sí solo una factura emitida.` Do not fetch or infer evidence, add transitions or change business rules to solve a presentation defect.
- Regression requirement: extend the existing palette test to assert the actual rendered caveat, not just color-class membership/order.

### F2 — P2 / acceptance-blocking: explicit undated Pendiente remains yellow

- Location: `src/lib/shared-constants.ts:23,34–37`; consumers include `cirugias.constants.ts:272–273`, `MobileCirugiaCard.tsx:40`, `CirugiasGridRow.tsx:41`, `ExpedienteHeader.tsx:106`.
- Verified evidence: `getCxStateColorKey` special-cases only Autorizada. For the exact input `(state="Pendiente", date="")`, it returns Pendiente and therefore yellow. User acceptance limits yellow to pending/authorized surgeries **with a date**; an undated case is white whether authorized or unauthorized. The existing read adapter can produce this input from pending/draft with null surgeryDate (`surgery-adapter.ts:389–397,498,501`). This is a deterministic source trace, not a claimed live DB fixture reproduction.
- Practical impact: undated pending cases appear scheduled/yellow in table, mobile and Ficha instead of white; the currently passing tests encode static Pendiente without testing an explicit empty date.
- Smallest correction for separate writer: apply the existing explicit-empty-date presentation branch to Pendiente as well as Autorizada, keeping the displayed/stored label untouched and retaining the undefined-date static fallback for state-only options. No adapter/store/API/authorization-policy change is needed for this demonstrated undated input.
- Regression requirement: extend the existing palette test with Pendiente null/empty/whitespace dates → white and explicit valid date → yellow; preserve the label Pendiente. Do not infer permission or authorization evidence from color. Separately, the palette alone cannot certify authorization facts for every historical Pendiente record.

### F3 — P2 / active-caller acceptance gap: state modal loses date context

- Location: `src/components/cirugias/dialogs/ChangeStateDialog.tsx:32,46–48,129–151`; live caller `src/app/cirugias/page.tsx:802–807`; Ficha opener `ExpedienteHeader.tsx:106,109–112,158–169`.
- Verified evidence: the current/new comparison badges index CX_STATE_VISUALS by state directly, and the dialog prop type has no date. The Ficha header uses `getCxStateVisual(s.state,s.date)`. Opening the modal for Autorizada with an empty date therefore produces white in Ficha but yellow in the modal comparison. The route passes the surgery object, but the dialog ignores its date. Static state-option dots need not infer a case date; current/new case previews do.
- Practical impact: the same undated authorized surgery changes visual meaning when the user opens its state selector, contradicting the date-specific rule.
- Attribution/scope: this dialog is outside the palette lock's original write allowlist and already has foreign authorization-evidence changes. This review inspected it as an actual caller only; none of those changes are attributed to the palette writer. The gap cannot be silently waived to grant full acceptance.
- Smallest correction for separate writer: under a fresh explicitly declared presentation-only scope, add optional read-only date to the dialog's surgery prop and use the existing shared date-aware lookup for its current/new comparison badges. Preserve state labels, static option order, upload/evidence logic, confirmation handlers and permissions unchanged. The existing caller already supplies the surgery; no API or Auth change is required.
- Regression requirement: date-empty/date-present Autorizada comparison badges, followed by regression of the existing dialog evidence/actions. This additional suite was not authorized for execution in this review; inspect its import graph and explicitly allowlist it in the correction package first.

### Disclosed legacy preview/calendar limitation — assessed, not waived

- Legacy `ExpedientePreview.tsx:23–25,73`, `ExpedientePreviewSummary.tsx:7–9,39`, `ExpedientePreviewStatusChips.tsx:7–9,22`, and `FichaCirugia.tsx:43` use state-only palettes. An undated Autorizada would be yellow if these components were mounted. No runtime callers for these components were found in the searched `src` tree; the current Cirugías route uses `SurgeryContextTray` and the full Ficha header instead. Do not describe dormant source as a verified live visual regression.
- Calendar still uses static state palettes (`calendario/page.tsx:49,466,752,999,1089`). Its day/week/month surgery map explicitly excludes empty dates (`:231–239`), and upcoming surgeries use a date range (`:323–331`). Thus the empty-date mismatch is not demonstrated for its currently reachable case pills. Its aggregated distribution is state-only, not an individual undated case. This is not a browser PASS and does not certify every calendar interaction.
- Calendar's separate `SURGERY_STATE_OPTIONS` list (`statusHelpers.ts:84–94`) preserves the relative order of its existing entries but omits Sin fecha and Sin consumo. It is not a complete eight-group selector. Altering that unrelated shared helper is outside this review/write allowlist.
- **Acceptance consequence:** this disclosed limitation does not independently prove a currently reachable undated calendar/legacy-preview defect, but it prevents claiming universal date-aware coverage of those surfaces. Full acceptance is still denied because F1/F2 and the active modal F3 are confirmed, and browser coverage is blocked. No expansion into the surgical roadmap or silent waiver was made. If legacy surfaces are required for universal acceptance, assign only their date-presentation/option completeness correction under a separately declared scope; do not transplant or refactor the application.

## Next

### Exact correction handoff

Assign a separate writer; reviewer remains read-only. Fresh owner must verify delivery HEAD, dirty hunks, snapshot hashes and current locks before writing.

1. Fix F1 in `ColorReferenceDialog.tsx` and F2 in `shared-constants.ts`; extend only the existing `SurgeryPalette.test.tsx` for these regressions. Preserve all existing state labels, palette order and undefined-date option behavior.
2. Explicitly reserve the additional F3 presentation-only dialog/test scope before touching it. Do not reuse the released palette lock as implicit ownership; preserve foreign authorization-evidence behavior exactly.
3. Rerun the exact two-file offline allowlist and offline typecheck. Do not modify foreign Next configuration to manufacture a PASS. Any extra dialog suite needs its own inspected explicit allowlist.
4. Request a fresh independent review of the corrected hashes. Coordinate browser acceptance separately with the runtime owner and authorized safe reads; do not lift the Sol1 DB hold.

### Replay commands

From `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/components/SurgeryPalette.test.tsx src/__tests__/unit/cirugias-estado-prep-separation.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Read-only snapshot verification before trusting this review:

```powershell
$review = 'knowledge/specs/SURGERY-PALETTE-ORDER-20261005/REVIEW-SOL2-20261005-1651'
$snapshot = Get-Content "$review/SNAPSHOT-VALIDATION-BEFORE.json" -Raw | ConvertFrom-Json
if ((git rev-parse HEAD) -ne $snapshot.head) { throw 'Review invalidated: HEAD changed' }
$changed = @($snapshot.files | Where-Object {
  !(Test-Path -LiteralPath $_.path) -or
  (Get-FileHash -LiteralPath $_.path -Algorithm SHA256).Hash -ne $_.sha256
})
if ($changed.Count) { $changed.path; throw 'Review invalidated: reviewed file changed' }
'PASS: reviewed snapshot unchanged'
```

Do not use `npm test`, whole directories, integration selections, `npm run typecheck` (Next typegen), build/restart, Prisma generation or any DB command as a substitute.

### Browser validation handoff — BLOCKED, no runner PASS claimed

No browser was started; the 20-minute browser budget was not consumed. Before a later visual run: establish runtime-owner permission for reuse without restart/build; verify the same source snapshot, safe target and explicitly authorized synthetic read fixtures; establish valid manually authenticated state outside Git. Do not print credentials/session contents, navigate DB-backed fixtures under the hold or submit any mutations.

Required read-only matrix after prerequisites: both themes, desktop grid and mobile card, all eight color groups; Autorizada and Pendiente with/without date; Ficha header and modal comparison; row tint/hover/sticky, white/yellow/light-blue legibility; toolbar/mobile filters, state-selector order and rendered guide caveat. Confirm label preservation and that absent draft consumption stays an unknown/empty secondary indicator, not grey Sin consumo. Use an existing coordinated browser runner where available and save its exact replay command. This review has no executable browser replay result and does not invent one.

**Final verdict: source review FAIL; full acceptance FAIL/incomplete; browser BLOCKED; DB acceptance BLOCKED.**
