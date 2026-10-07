# Surgery authorized color correction — 2026-10-07

- Approved emerald-500 for dated Autorizada; preserve undated white presentation and labels. Local commit explicitly authorized; no push/deploy.
- Corrected both table and shared/mobile mappings plus soft-cell color and guide sentence. Existing tests had encoded yellow for both authorized and pending; no alias/fallback defect found.
- Regression reproduced before fix (6 failures); final67/67 tests and scoped TypeScript PASS.
- Synthetic component build/browser PASS at1366x768,1920x1080,390x844 in light/dark, contrast>=7:1. Authenticated live route not accepted; shared runtime unchanged and requires owner rebuild.
- Full pre-edit tsc exhausted default Node heap; global build not claimed. Foreign dirty files untouched and excluded from commit.
- Evidence/commands: knowledge/specs/SURGERY-AUTHORIZED-COLOR-20261007/HANDOFF.md.
