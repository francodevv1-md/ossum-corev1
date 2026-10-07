# Ownership lock

- task: SURGERY-AUTHORIZED-COLOR-20261007
- agent role / selected model: Frontend UI / GPT-6.1 Sol
- mode / status: implementation / released
- owned files: src/lib/cirugias.constants.ts; src/lib/shared-constants.ts; src/components/cirugias/view-customization/ColorReferenceDialog.tsx (authorized color explanation only); src/__tests__/components/SurgeryPalette.test.tsx; knowledge/specs/SURGERY-AUTHORIZED-COLOR-20261007/; knowledge/worklog/SURGERY_AUTHORIZED_COLOR_20261007.md; this lock
- approval: Franco selected emerald-500, preserved white undated presentation, authorized local commit, then requested execution.
- preflight: four source/test files clean against HEAD ec981cf; existing palette locks released; unrelated dirty files excluded. Runtime 5000/5001 and shared .next are not owned.
- Git index: reserve only during exact allowlist staging/commit after checking it is empty.
- stop: overlapping writer, staged foreign work, unexpected owned-file edits, broader scope required.
- release: source implementation and scoped offline/browser fixture QA complete. No shared runtime ownership acquired. Integration owner reserves index only for the authorized exact allowlist commit, then releases it.
