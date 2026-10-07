# Remitos — critical flows and remaining work

Status: R1–R8 repaired within their scopes and independently reviewed; R8 stock-only projection final580/580 scoped regression PASS. See per-unit validation files and `FRAGILITY_MAP.md`. **Not whole-application or complete Remitos acceptance.**
Reference baseline: `ec981cfeb189943eb212ddedbd024f090e44676d`. Findings below use function names; the two R2 select replacements shorten original line offsets.

## Actual shared flow

| Flow | Frontend entry | Transport / backend authority | Required invariant |
| --- | --- | --- | --- |
| Scoped list/detail | `useRemitos` in global page, CX Logistics, CX Consumption, CX Summary, coordinator Tracking | `api/remitos` GET → company route/guards → `listRemitos` / `getRemito` | Technical company/surgery/remito IDs; page is not total; latest scope/read owns displayed state |
| Draft creation/edit | `OperationalRemitoWorkspace`; draft dialogs; shared hook | POST / PATCH → `remitoCreateSchema` / `remitoDraftUpdateSchema` → `createRemito` / `updateRemitoDraft` | Nonempty positive items; stored snapshots retained; observed version belongs to edited document; issued document not editable |
| Explicit issuance | Workspace, global Remitos page, CX Logistics | POST `/{id}/emitir` → `remitoEmitSchema` → `emitirRemito`; optional Cajas dispatch | Dedicated numbering; Cajas requires exact assignment/preparation/trace/observed version/idempotency intent; transaction rollback and exact replay |
| Dispatch/delivery | Global page/CX Logistics/Seguimiento delivery pathway | state PATCH → transition schema → `updateRemitoState`; delivery has separate Seguimiento producer | State transition does not itself prove consumption/return; concurrent requests cannot overwrite terminal states |
| Consumption | CX Consumption | Consumption routes/services linked to Remito; trace read adapter | Remitted ≠ consumed; per-remito linkage; quantities/precision/state authority retained |
| Return | Global return dialog; canonical Devolucion flow | Legacy `/{id}/devolucion` → `registrarDevolucion` → create/pending/confirm; canonical `confirmDevolucion` | Returned ≤ remaining; one accepted operation applied once; Cajas accounting required where linked |
| Projection/audit | CX trace/transit, stock availability, document audit | `stock-ledger.service`, trace services, audit serializer | One physical effect counted once; state labels match canonical catalog; actual actor and changed content recorded |
| Print/PDF | global print, CX print, Comprobantes print/PDF | Loaded/fresh backend document → escaped template/renderer | Printing does not issue/move stock; actual PDF bytes; no generated company/fiscal data |

No legacy lower-case state migration is included. `src/lib/remitos.constants.ts` serves older prototype types, while active backend catalog uses `Borrador` / `En_transito` / `Parcialmente_devuelto`; merging these blindly would affect unrelated callers.

## Completed short units

### R1 — shared reader lifecycle
- Source: `src/hooks/useRemitos.ts` only; five callers unchanged.
- Reproduced nine failures before source correction. Equal-valued inline filters requested four times instead of once; late responses overwrote latest scope/list/detail/errors; identity changes exposed previous data.
- Fix: value-stable filter memo; per-scope object identity and read revisions; synchronous visibility mask on identity changes; discard late read/error/finally; prevent obsolete callbacks/readback. Scope includes company/user/Auth readiness/filters without modifying Auth policy.
- Mutation invalidates pre-write reads. Independent review caught a newly introduced canceled-read loading deadlock; two failing checks reproduced it before two loading-reset lines fixed it. No attempt to cancel an already accepted server mutation or invent retry semantics.
- 22 hook checks pass, including StrictMode replay, current selection, auth/user change, mutation success/error/late creation, obsolete callbacks, unmount and rejection deadlock.

### R2 — hydrated mutation response
- Source: exactly two `select: remitoReadSelect` replacements in `src/lib/services/remito.service.ts` (`createRemito`, `updateRemitoState`). Existing GET/edit/emit already use it.
- Reproduced two wire-shape failures before source correction. Create omitted item SKU/unit/trace/metadata/returned quantity/timestamps; state mutation omitted entire items plus branch/snapshots/logistics fields despite `RemitoApiRow` promise.
- Select-aware Prisma doubles plus actual service/response serialization now match GET shape and preserve Decimal strings/date serialization. Three checks pass.
- No route, permissions, state transitions, transaction semantics, stock, schema or persistence policy changed. New fields are exactly fields already exposed by authorized GET.

## Prioritized follow-up units

Each unit: own source lock, failing runnable check first, minimal fix, focused regression/typecheck and short handoff. No browser QA. No approval inferred for real DB writes or production.

| Unit | Evidence / status | Minimum next check and exit criterion |
| --- | --- | --- |
| R3 — Cajas issuance client boundary | **Repaired:** initial31 failures reproduced, shared resolver/callers corrected. Independent review caught actual wire trace mismatch and auth-loss/reload gaps; three more failures reproduced and repaired. | Original43 cases plus identity/retry/wire regressions green; final276 tests across19 files, scoped typing/re-review PASS. Type-only DTO trace fields included to match unchanged API. See `R3_BRIEF.md` and `R3_VALIDATION.md`; no browser/DB/full-app acceptance. |
| R4 — request typing/validation/errors | **Repaired:**27 runtime failures and11 typing diagnostics reproduced; partial/null PATCH types, literal schema enums, shared exact Decimal(18,4) request boundary, malformed emission JSON400 and canonical Devolucion error inheritance corrected. Supplemental2 underflow failures reproduced and fixed. | Final372 tests across24 files, expanded scoped typing and independent re-review PASS. See `R4_BRIEF.md` / `R4_VALIDATION.md`. API/schema boundary only; direct internal/canonical return numeric logic and transaction/concurrency work remain R7. No DB/UI/domain/stock change or global certification. |
| R5 — state authority/concurrency | **Repaired within scope:**21/24 initial checks fail; conditional company/state/updatedAt write in generic state and sibling Seguimiento delivery, local stale-write409, generic return targets require confirmed Devolucion. Franco clarified cancellation must remain viable: incumbent allowed cancellations preserved, no physical-dispatch prerequisite or automatic reverse stock. | Final436/436 across30 files, scoped typing/whitespace and independent57/57 review PASS; see `R5_VALIDATION.md`. Separate mocked-service Seguimiento route suite9 failures documented. Canonical return opposite-direction races still R7; Cajas compensation/accounting policy separate. Not all producers/DB/global certification. |
| R6 — draft deletion | **Repaired:**17/25 new checks fail before correction. Authenticated actual actor, atomic company/draft/version claim before child writes, only unreferenced owned lines removed then parent, FK409 rollback and deleting-actor audit. Optional item FK evidence preserved, not silently SetNull. | Final461/461 across31 files and scoped typing/whitespace PASS; independent90/90 review PASS. See `R6_VALIDATION.md`; existing API end-to-end contract, no new UI or real DB. Full concurrent dependency-insertion isolation unverified; no schema cascade/migration, no real-data deletion. |
| R7 — return transaction/replay/concurrency | **Repaired within scope:**16/41 initial failures,4 supplemental receipt/writer failures and3 review-discovered hook failures reproduced/fixed.1 outer transaction through incumbent owners; parent lock/shared exact Decimal quantities, same-key accepted receipt with actual item/creator proof; guarded competing state writers. Hook coalesces identical in-flight returns. Generic Cajas return rejects before orphan creation; explicit accounting preserved. | Final parent502/502 across32 files, scoped typing/whitespace and independent re-review144/144+typing+3 independent in-memory checks PASS. See `R7_VALIDATION.md`: actual client/route/guard/service and Cajas accounting/ledger on staged lock/rollback doubles. Both cancellation winner orders covered, fresh cancellation preserved. No real PostgreSQL/global certification; same-key replay only, client key retained in-view not across remount. |
| R8 — stock/transit projection | **Repaired within scope:**16/30 predicate/select-aware failures reproduced; additive canonical En_transito read recognition, per-company/Remito/item/article posted DISPATCH_OUT−RETURN_IN coverage, unposted documentary deduction only, normalized ID/SKU aggregation. Incumbent Emitido/aliases/delivery/draft eligibility retained; no new state or reversal policy. | Final580/580 across38 files, scoped typing/whitespace and independent34/34 R8,59/59 selected regression PASS. See `R8_VALIDATION.md`;10−2 gives physical8/available8 without duplicate deduction, partial/mixed/return evidence handled, transition preserves transit. Other agent owns Surgery in_transit adapters separately, no overlap. Offline proof, not whole-stock/live DB acceptance. |
| R9 — changed-content audit and final gates | **Static evidence:** `serializeRemitoForAudit` excludes edited item/logistics/metadata content; global source TypeScript fails in unrelated modules. Coordinator reader also falls back from backendId to visible surgery id. | Audit old/new content and true actor; remove reader ID fallback only under its dedicated caller scope; per-unit regression matrix plus source/global build gate. Do not merge all modules or silently redefine business rules. |

Static findings are code-backed risks, **not claims that every failure path was executed**. Domain concurrency/DB constraint/stock checks need their own red reproduction before changes. Original audit and existing unit mocks are insufficient for PostgreSQL certification.

## Reuse boundary
- Reuse `remitoReadSelect` for complete backend projections, `api/remitos` for transport, `useRemitos` for shared reader lifecycle, incumbent validators/services for authority, existing escaped print/PDF builders for output.
- Do not add a new generic repository/factory/state engine, replace all document models, propagate guards to every component, or build a second local Remitos source.
- R2 removes duplicate projections; R1 fixes the common reader instead of patching five consumers. Wider reuse remains blocked until issuance/returns/projections and typing gates are addressed.
