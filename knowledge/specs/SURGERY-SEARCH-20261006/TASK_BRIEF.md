# Surgery search — bounded DEV fix

- Task: SURGERY-SEARCH-20261006; risk T3 because the filter hook/page are protected.
- Owner/role/model: single Frontend/UI implementation owner, OpenCode / openai/gpt-6.1-sol.
- Mode: implementation; workspace: ANTIGRAVITY ux-ui.
- Approval: Franco explicitly requested implementation of the analyzed search fix and a reusable component. He will execute validations/build/manual QA himself.
- Outcome: selecting a suggestion must find its source surgery; desktop/mobile share the same props-driven search; no mock-contact suggestions or silent ignored search; explain restrictive filters and allow explicit recovery preserving the search.
- Allowed source: src/lib/cirugias/search.ts, src/lib/cirugias.types.ts, src/hooks/useCirugiasFilters.ts, src/components/cirugias/SmartSurgerySearch.tsx, src/components/cirugias/CirugiasModuleBar.tsx, src/components/cirugias/MobileCirugiasToolbar.tsx, src/app/cirugias/page.tsx; new focused search unit/component tests only.
- Allowed artifacts: this brief, own handoff/worklog and .opencode/locks/SURGERY-SEARCH-20261006.lock.md.
- Forbidden: schema, store, Auth, permissions, API/service contracts, business transitions, DB operations, unrelated sources/config/dependencies, build/server/browser execution, commit/push/deploy.
- Allowed commands: read/search/status/diff and edits only within the allowlist. Write runnable tests but do not execute validations, as requested.
- Diagnose evidence: actual production suggestion selector puts a surgery ID into a contact-ID chip; four source suggestions yielded zero matches. General accent-insensitive matching worked. Patient-only mobile defaults and untrimmed simple searches also yielded false empty results.
- Preserve AND between chip categories / OR within a category. Preserve legacy contact-chip support; mark new text chips explicitly. Never fall back to all records or remove filters automatically.
- Acceptance for Franco: suggestion selection and Enter/button/keyboard/remove; accents/case/spaces; duplicates; combined filters and search-preserving recovery; viewport/company switching; genuine no matches; TypeScript/build/manual desktop/mobile QA.
- Stop on overlapping active ownership, source drift, scope expansion or any forbidden action. No overlapping active target lock found; current source targets have no pre-existing diff.
- Handoff: Done / Changed / Files / Validations / Risks / Next; validation status NOT RUN until Franco tests the resulting version.

## Runtime-error correction

- User reported `TypeError: crypto.randomUUID is not a function` from Enter/Buscar in the produced bundle.
- Evidence: the sole `generateChipId` caller is the shared `addChip` path used by Enter, button and suggestion selection; its unguarded UUID call reproduces the reported failure whenever the method is absent.
- Minimal fix: reuse existing `src/lib/idGenerators.ts` `generateId`, which already guards method availability and provides a timestamp/random fallback. Do not modify that shared helper.
- Source scope: SmartSurgerySearch.tsx and its focused component regression test only. No build/test/browser execution; Franco retains validations.
