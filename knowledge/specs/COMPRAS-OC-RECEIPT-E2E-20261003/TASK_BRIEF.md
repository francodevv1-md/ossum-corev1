# Saved OC partial and complete receipt

- Outcome: native UI creates one uniquely marked synthetic purchase order, emits/sends operationally, receives a partial quantity then exact remaining quantity; assert API state/received/remaining quantities after reload, reject over-receipt without mutation.
- Owner: coordinator openai/gpt-6.1-sol; directed QA writer, separate read-only source/fixture explorer and independent review.
- Mode: implementation/testing; all existing app/source/schema/Auth/config files read-only.
- Allowed files: three new files in lock plus isolated artifacts. Allowed commands: read-only source/Git, focused safe discovery/syntax; existing-session loopback preflight; one actual sequential synthetic run after target/fixtures/outbound review.
- Forbidden: schema/migration execution, app/Auth/permissions/security fixes, stock/ledger writes, fiscal/payments/mail, reset/delete/cleanup, install, commit/deploy. No speculative field fixes or mock success.
- Target: existing identified disposable DEV company codevdistricorr1000000000; verify actual membership and backend OC availability before writes. Do not re-request target confirmation for the same verified target.
- Fixtures: use only independently verified owned synthetic provider; if none exists, one minimal clearly QA-labeled supplier Contact through existing API, without user-role/Auth changes. Native free/Z item if supported avoids existing catalog/stock mutation. Leave fixtures/OC for inspection.
- Source evidence: current orden-compra service receipt updates OC item received quantities, state and audit only. It does not write stock ledger. Do not label this as physical stock receipt certification or change domain behavior.
- Tests: UI create (native IDs/CUID, not UUID assumptions), operational emit/send, partial/full receipt and real negative over-receipt; persisted state + quantities + reload, no external emails. One worker/no retries/browser20minute cap/private artifacts. Never leak credentials/session contents/source patient records.
- Stop: target mismatch, missing tables/migration (do not apply), unsafe real provider selection, unreviewed outbound side effects, expired state (fresh manual capture, no Auth fixes), ownership conflict, protected source bug or two unsuccessful minimal Diagnose cycles.
- Handoff: Done / Changed / Files / Validations / Risks / Next; exact replay command, real-vs-mocked status, no success based on test discovery.

## Ownership approval
Franco clarified Antigravity is closed and prior work was yesterday in response to the precise Compras reservation question. Reconciled stale editing lock as released; this only permits bounded QA ownership, not takeover of schema/migrations or certification of old feature completion.

## Necessary minimal corrections and fixtures
Source explorer found draft UI has no Emitir action despite the existing hook/API transition. Existing OrdenCompraError declares409 but extends Error, so existing generic mapper returns500 for overreceipt. These are technical blockers within the approved native OC receipt outcome, not new business rules: expose the already-existing emitir hook on draft rows, and inherit existing ApiError to preserve existing declaredstatus/code. Scope only page/service + two focused tests in lock, directed single writer, Diagnose reproduction first, independent review. Existing Auth/roles/guards/transition rules remain unchanged; no source ownership outside those paths.

Native creation requires catalog articles and offers no free/Z input or observation marker. Do not add unrequested new form features: use one minimal clearly synthetic catalog Article fixture (sku QA-OC-ARTICLE-20261003, traceabilityNONE, stock0) via existing API; no commercial profile, supplier mappings, real stock or ledger entries. Create one synthetic provider only if not already independently verified. Native order is identified by exact synthetic supplier/article and returned CUID; unique run marker stays in private owned receipt, not an invented UI input. Existing API has collection GET only; filter owned ID locally, do not assume GET /{id}.
