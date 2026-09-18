# Synthetic transaction QA — approval #6999

## Status
- **Final: subsequent live replay completed with PASS.** Final reconciliation is recorded in `HANDOFF.md`; no replay remains pending.

## Initial scope / declaration
- Owner: QA preparation / openai/gpt-6-astra. Initial scope was preparation only; execution was delegated to a later approved run.
- Approval: Engram #6999, new synthetic DEV records only; retain rows. No prior-record updates/deletes, documents, external send, fiscal emission, production, Auth, schema, migrations or commits.
- Allowed files: these three NEW documents and `C:/Users/franc/AppData/Local/Temp/opencode/budget-invoice-6999.cjs`. Runtime manifest/state remain outside Git.
- Initial allowed work: dedicated source reads, apply_patch, node syntax/offline selfcheck. No live API/DB/browser, env/secret/state inspection, installs or product/test changes.
- Initial validation: offline negative guard/idempotence checks; source-derived selectors/payloads/side-effect review. Subsequent execution completed the live synthetic flow recorded in the HANDOFF.

## Finite flow
1. Attach existing CDP from safe bootstrap status only after fresh manual login. Verify actual bootstrap deadline, same worktree, loopback origin, no service worker, sole app tab; authenticated `/me` 200 with matching active company and existing admin role. Parent attests unchanged confirmed disposable DEV source at execution; no config values read here.
2. Immediately save fresh `CORE_FLOW_STORAGE_STATE` outside Git. Never load prior state. Observe the app's actual Authorization-bearing fetch in browser memory; no token leaves browser evaluation.
3. Create one new QA contact (patient required), then one new Surgery via canonical APIs. Use that same QA contact as client and payer; existing branch read-only. No medical identifiers, documents, email, phone, date of birth or real patient data. No contact snapshots, Surgery edits or direct DB calls.
4. Actual Sales UI: select new Surgery by backend ID; new budget with QA title/notes and one manual free-description line, quantity 2 × ARS 100, zero discounts/VAT = ARS 200. Canonical estimative legend, explicit dates and QA commercial terms. Save → Emitir → Aprobar; expected revisions 1 → 2 → 3.
5. Hard refresh and verify persisted approved CURRENT source. Actual Pending UI: locate only new budget ID, verify source/amount, Crear borrador → Guardar borrador exactly once.
6. Verify exactly one Invoice for new Surgery, state `Borrador`, matching source, currency/total/items, null visible number/issuedAt; refresh Pending and verify source removed. Close attached app context; retain rows/manifest.

## Source review / side effects
- `surgery.validator.ts`: mandatory patientId; initial pending. `surgeries/route.ts`: resolves active IDs read-only when no snapshots; create canonical sequence and audit permitted.
- `contact.service.ts`: minimal create + new company link; no address/groups requested. Contact route audit is after transaction: failed/ambiguous response may still mean created; never retry.
- `presupuesto.service.ts`: new family isolates emit replacement from prior budgets; emit and approve are DB/audit only. Fresh Surgery has no other family; verify sole family before emission.
- `invoice.service.ts`: source creation copies approved CURRENT budget lines, row/advisory locks, draft + audit; no consumption supplied and no emission. `audit.ts` is database-only; Prisma singleton has no send extensions.
- `api/client.ts` + auth client: Bearer token from existing Supabase session. Runner observes actual app fetch in page closure, without extracting session/storage or altering Auth.
- Sales form/page and Pending page/hook inspected for exact labels, native selectors, backendId, state/source/amount rules. Contact detail has no GET; resume uses exact QA-label search.

## Execution contract
- Six writes maximum: contact POST, Surgery POST, budget POST, own budget emitir POST, own budget state PATCH approve, Invoice POST from own budget. Each armed for one exact body/path/method; journal fsync precedes network release.
- All other non-GET/HEAD requests rejected, including own-record edits/deletes, invoice emission, fiscal/email/provider/Server Action requests. External HTTP(S) blocked. Existing GET-only app-shell notifications allowed; no mark-read writes.
- GET allowlist: Sales/Pending documents and local static assets; current-company me, branches, active contact catalogs/QA-label lookup, Surgery catalog/own detail, budget catalog/own detail, approved budgets, validated consumos, invoices/own detail, notification count/list. No raw response/console/screenshot/trace logs.
- Manifest records only QA marker/new IDs, phase journal, tenant digest, boolean evidence. Single fixed manifest and exclusive runner lock prevent replay/concurrent runs. Never replace/delete manifest to start again. An attempted write lacking a durably captured successful ID/state blocks automatic continuation and requires bounded read-only reconciliation by parent.
- Stop two minutes before the earlier of bootstrap deadline and start+20m. Persist manifest, disable writes, close context. Known-success resume verifies own records first, then skips completed commands; PASS replay is read-only.
- Stop on scope/company mismatch, unavailable existing role/catalog, stale or missing session, 401, rejected/ambiguous mutation, unexpected write, source mismatch, external-side-effect discovery or deadline. No blind retries or cleanup.

### Exact mutation allowlist
All paths prefixed by the current verified `/api/companies/{company}`; no query strings. `Q` is this run's UUID QA label; IDs come only from successful responses journaled by this runner.

| Step | Method / suffix | Exact scope |
| --- | --- | --- |
| Contact | POST `/contacts` | firstName=notes=Q, isCompany=false; no groups/address/snapshots/identifiers |
| Surgery | POST `/surgeries` | own contact patientId, read-only branchId, description=source=notes=Q |
| Budget | POST `/presupuestos` | own Surgery and own contact client/payer; exact form body and one Q line, 2×100 ARS, rates 0 |
| Emit | POST `/presupuestos/{ownBudget}/emitir` | expectedRevision=1 |
| Approve | PATCH `/presupuestos/{ownBudget}/state` | command=approve, expectedRevision=2 |
| Invoice | POST `/invoices` | only presupuestoId=ownBudget |

Contact groups/address arguments are omitted: their helpers return immediately, avoiding group upserts or address changes. New patient/contact is also the commercial client/payer; no prior contact is selected. Existing `admin` is the intersection of the inspected contact, Surgery, budget and Invoice mutation policies; absence is a stop, never a role change.

## Final evidence checklist
- [x] Fresh authenticated `/me` 200/current company and deadline margin recorded.
- [x] QA lineage journaled without duplicate contact or Surgery creation.
- [x] UI budget creation, emit and approval completed; hard refresh matched CURRENT/revision 3.
- [x] Pending source and ARS 200 verified; exactly one UI-created Invoice was persisted.
- [x] Invoice remained Borrador with null number/issuedAt, exact source/items/amount, and disappeared from Pending after refresh.
- [x] Approved flow completed with no forbidden writes; QA rows retained and only safe structured evidence recorded.
