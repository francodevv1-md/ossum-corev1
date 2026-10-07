# Change 2 — downloadable remito PDF

- Approval: user explicitly approved continuing after completed change 1 (076d449). Deliver real NR PDF only, then close. No unrelated tooltip/module promises, fiscal changes or other types.
- Owner/model: GPT-6.1 Sol / openai/gpt-6.1-sol. Bounded related frontend change; sensitive shared-panel import/menu scope locked. Independent read-only review after validation.
- Reuse: installed takumi-pdf 0.15.0, documented browser no-init + wasm-url imports. Existing authenticated fetchRemito and escaped buildOperationalRemitoPrintHtml. PDF bytes are generated locally from freshly read authorized data; nothing uploaded or persisted.
- Identity: verify exact id/company/backend surgery before generation. Missing identity disables action; failed/stale reads or generation must not download. Pending work invalidated on unmount/reload/scope change.
- Format: A4, selectable text, recipient/address/actual items/quantity/returns/state/date/logistics/observations matching known print layout. No invented company/contact data or fake verification link. CSS adapted only inside PDF render options; existing printing unchanged.
- Allowed files/ownership: own lock, new useRemitoPdfDownload.ts, remito-pdf.ts, minimal import/hook/status/error/menu integration in existing ComprobantesAsociados.tsx, new focused tests and this task directory. Existing panel design/motion changes are foreign; only exact own panel hunks may be staged.
- Forbidden: schema/Auth/API/services/providers/global config/dependencies, source helper, other documents' functionality, existing unrelated work, production/DB/deploy/push/PR.
- Validation: actual renderer PDF signature and parser/text/page count; UI tests for authenticated scope/error/races/object URL cleanup; existing27-test suite; scoped TS; isolated browser/bundle; static review. No claim of full app build/live DB or printer testing.
- Stop: required dependency/provider/security/schema change or active file overlap. Correct render/layout failures through evidenced minimal fixes, never return HTML with PDF MIME/extension.
- Focused integration correction: received design merged adjacent label/count spans into accessible names like `Remitos1`, breaking an existing test. Added explicit spaced aria labels without altering user design/motion. Own panel staging includes only PDF integration and this accessibility label; no foreign CSS/motion.
- Validation harness sources/configs live only in this task directory; temporary PDFs/bundles/staged panel snapshots stay in the approved OpenCode temp folder.
- Output: single Done/Changed/Files/Validations/Risks/Next, plain-language concise user summary. Local conventional task-only commit; no attribution or push.
