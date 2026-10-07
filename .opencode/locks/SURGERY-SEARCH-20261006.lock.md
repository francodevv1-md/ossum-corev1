# Surgery search ownership

- task: SURGERY-SEARCH-20261006
- agent role: single Frontend/UI implementation owner
- selected model: openai/gpt-6.1-sol
- status: released (UUID compatibility correction complete; validations remain assigned to Franco)
- owned files: src/lib/cirugias/search.ts; src/lib/cirugias.types.ts; src/hooks/useCirugiasFilters.ts; src/components/cirugias/SmartSurgerySearch.tsx; src/components/cirugias/CirugiasModuleBar.tsx; src/components/cirugias/MobileCirugiasToolbar.tsx; src/app/cirugias/page.tsx (search wiring/feedback only); new search-focused unit/component tests; own task artifacts and worklog.
- approval: explicit implementation request, reusable search, validations delegated to Franco.
- forbidden: all schema/store/Auth/API/domain edits, DB/runtime/build/browser commands, dependencies and Git publication. Preserve unrelated dirty/untracked work.
- validation: runnable regression tests authored; execution/review/build/manual QA pending Franco.

## Local commit approval

- Franco explicitly requested committing this task after the UUID correction. Only the exact search sources/tests and own brief/handoff/worklog/lock are authorized for staging and one local Conventional Commit.
- Current tracked search diff matches this package; Git index was empty before staging. Unrelated AGENTS.md, next-env.d.ts and other untracked work are excluded. No push, hooks bypass or extra runtime validation is authorized.
