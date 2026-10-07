# Surgery palette and order

- task: SURGERY-PALETTE-ORDER-20261005
- owner/role/model: Sol coordinator and recovery sole writer / openai/gpt-6.1-sol
- status: released (source frozen; independent acceptance BLOCKED, no active writer or reviewer)
- workspace: E:/OSSUM_COR_ANTIGRAVITY/ux-ui; HEAD21385527dcfbc6ebc5b1507096d03a2c402d8c4d
- approval: Franco requested #8711 correction and explicitly deferred non-authorizing-user category.
- brief: align existing state palettes and visual order; undated authorized cases white, dated authorized cases yellow through presentation only; retain persisted state and labels, no inferred consumption/facturation facts.
- files: src/lib/shared-constants.ts; src/lib/cirugias.constants.ts; src/lib/cirugias/cirugias-columns.tsx; src/components/cirugias/{CirugiaStatusCell,CirugiaRow,CirugiasGridRow,MobileCirugiaCard}.tsx; src/components/cirugias/view-customization/ColorReferenceDialog.tsx; src/components/expediente/ExpedienteHeader.tsx (one presentation lookup only, preserve dirty foreign changes); src/__tests__/unit/cirugias-estado-prep-separation.test.ts; new src/__tests__/components/SurgeryPalette.test.tsx; this lock.
- preflight: source delegate autonomous-amethyst-walrus failed; no edits or lock found. Existing surgery typing locks released; no overlapping palette source writer found. Reviewer jittery-gray-panther is read-only.
- permitted: exact focused mocked test allowlist after import inspection; offline tsc --noEmit --incremental false; read-only diff/hashes. No implicit integration selection.
- excluded: ninth state; Auth/security/permissions; persisted state transitions; API/services/adapters/store/types; DB connections/tests/query/seed/cleanup/forensics (Sol1 hold); schema/dependencies; shared DEV5000/.next/build/restart/typegen; Git writes/publication.
- validation: palette/order/date presentation and readable white/yellow status labels; independent read-only final review. Global tsc initially fails next.config.ts:10 unsupported eslint property; do not fix foreign configuration.
- stop: ownership overlap, excluded scope, two proven minimal Diagnose failures.
- coordinator evidence: two explicit mocked suites PASS42/42; offline global TypeScript FAIL only pre-existing next.config.ts:10 eslint; scoped diff --check PASS. No DB/browser/build/runtime/Prisma/Git writes.
- final reviewer: fat-bronze-felidae ERROR Delegation failed; advisory jittery-gray-panther also ERROR. Actual results retrieved after notifications; no review PASS. Independent review BLOCKED by unavailable delegation, no delegates remain active. Successor must reserve new scoped ownership before any edits; source retained unchanged for external read-only review.
- coordinator artifact: knowledge/specs/SURGERY-PALETTE-ORDER-20261005/HANDOFF.md (new only).
