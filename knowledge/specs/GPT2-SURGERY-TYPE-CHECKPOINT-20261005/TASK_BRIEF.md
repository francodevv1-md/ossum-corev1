# Surgery mechanical type checkpoint

- Base: committed 1b2145e geographic checkpoint; reuse isolated candidate with matching HEAD page blob 0800830f1a3ad1c6664453660f64759e700dbf63 and schema-generated temporary client.
- Change only two delivered hunks: import type { Surgery } from @/types; read store.getConsumoBySurgeryId(s.id)?.state without ?? null. No cast, logic/map changes or original page writes.
- Prior proof: four TS2304 Surgery references and one TS2345 nullable consumption-state diagnostic remain in global HEAD compilation after geographic fixes.
- Gates: independent exact snapshot review; TypeScript against generated client; explicit CirugiasTable, CirugiasDataGrid, MobileCirugiaCard, cirugias-optabs, useCirugiaActions-create-backend-only suites; exact reviewed snapshot selective staging; local commit; regenerate from committed result and global isolated typecheck.
- Preserve original page/map/other hunks and active owners; do not stage frozen or moving worktree page as a whole. No DB/importer/migrations/Auth/physical flow/build/runtime changes.
