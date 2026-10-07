## Done
- Approved change2: actual downloadable PDF for remitos only, no HTML disguised as PDF.
## Changed
- Fresh authenticated scoped GET; local installed Takumi renderer; existing escaped operational template, A4/selectable text/multipage output. Clear loading/error/retry, scope/reload/unmount cancellation and object URL cleanup.
- Minimal listing integration and explicit accessible filter labels; user design/motion preserved.
## Files
- `src/lib/remito-pdf.ts`, `src/hooks/useRemitoPdfDownload.ts`, exact own hunks in `src/components/expediente/ComprobantesAsociados.tsx`, new `src/__tests__/components/RemitoPdfDownload.test.tsx`.
- Own task brief/validation/replay scripts/lock. No existing test/API/Auth/schema/helper/dependency changes.
## Validations
- 42/42 current-worktree and staged-panel tests; scoped TS; real PDF render/parser/visual review; dev/production browser download; isolated bundle/Webpack asset checks; read-only review PASS.
## Risks
- Synthetic data validation only; full app/live DB not certified. Approximately4MB lazy WASM asset on first download. Existing template identity/placeholders unchanged; unsupported glyphs report error.
## Next
- Local task-only commit, no push. User can use Comprobantes → NR → Acciones → Descargar PDF. PR/FV/CO downloads remain unavailable, modifications and unrelated tooltip claims not enabled.
