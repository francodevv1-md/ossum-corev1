# Surgery in_transit canonical state — 2026-10-07

- User: Franco, 2026-10-07. Authorization: 100% for the in_transit canonical state correction as a separate package, distinct from SURGERY-STATUS-BACKEND-AUTHORITY-20261007, excluding schema migrations (cxStatus is a String field, not a Prisma enum), Auth/roles productive, production/staging, real data, deploy, push and PR.
- Validator/source-of-truth: `src/lib/validators/surgery.validator.ts`. `cxStatus` in Prisma stays `String @default("pending")`; canonical codes live in `CX_STATUS` and are projected to UI Spanish via `CX_STATUS_LABELS` and the adapter normalizer.
- New canonical state: `in_transit` with UI label `En tránsito`. `scheduled` is preserved as `Programada` (its own flow with the executed Remito gate).
- Round-trip coverage: `En tránsito`/`en tránsito`/`in transit`/`in_transit` all map to `in_transit`; inbound `in_transit` from the backend projects to `En tránsito` in the adapter.
- Transitions: `authorized → in_transit`, `pending → in_transit`, `scheduled → in_transit`, `in_transit → performed | suspended | cancelled`. Terminal states (`cancelled`, `finalized`) stay terminal.
- Validation evidence: 17 new in_transit-canonical tests + 32 refresh legacy-state tests + 7 unchanged terminal-automation tests = 56/56 PASS; scoped `tsc --noEmit` clean.
- No SQL change, no server restart, no shared runtime touch.
- Worklog/Handoff: knowledge/specs/SURGERY-IN-TRANSIT-CANONICAL-20261007/HANDOFF.md.
- Engram observation: `obs-d4d5e5b1a0c5f6e7` (separate observation; see related prior `obs-4d7453b7d1419530` for the fragile map and `obs-501286deb613052b` for the prior status fix).
