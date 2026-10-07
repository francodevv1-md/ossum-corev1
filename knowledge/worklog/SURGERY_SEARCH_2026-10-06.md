# Surgery search — 2026-10-06

- Approval: bounded implementation of Cirugías search and reusable component. Franco explicitly owns subsequent validations.
- Diagnose: production suggestion selector passed surgery IDs to contact-ID matchers; four suggestion categories reproduced false zero results in the prior read-only analysis. Mobile default matching and whitespace handling were inconsistent.
- Implementation: props-driven shared desktop/mobile component; scoped data only; explicit text chips; shared matching/normalization; search-only counts and user-triggered recovery preserving search; runnable real selection-to-filter regression tests.
- Protected-file ownership: own brief/lock; no overlapping active target writer found. Search-only page changes; foreign changes preserved.
- NOT RUN: tests/typecheck/build/browser/independent acceptance review, per user instruction. No DB, API/Auth/schema/store mutations, dependency/config changes, server restart or Git publication.
- Handoff: knowledge/specs/SURGERY-SEARCH-20261006/HANDOFF.md. Lock released; awaiting Franco's build/manual QA results.

## Runtime-error correction

- Franco reported `crypto.randomUUID is not a function` in the built bundle. Our new unguarded generator was the cause; Enter/Buscar/suggestions all route through the same `addChip` callback.
- Replaced it with the existing guarded `generateId("chip")` helper without changing that helper. Added real component regressions with UUID unavailable for all three entry points.
- Tests/build/browser remain NOT RUN at Franco's request. Own lock released again; no scope expansion.
