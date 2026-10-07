---
task: CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007
agent_role: implementation-owner
selected_model: minimax/MiniMax-M3
status: released
owned_files:
  - src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts
  - src/lib/services/cuit-lookup.service.ts
  - src/lib/services/cuit-lookup.service.internal.ts (new)
  - src/__tests__/unit/cuit-lookup.service.test.ts
  - src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx
  - knowledge/architecture/ADR-027H-FISCAL-CONSULTA-CUIT-USO-PRODUCTIVO.md (new draft)
  - knowledge/KNOWLEDGE_INDEX.md
  - knowledge/worklog/CONTACTS_CUIT_LOOKUP_FOLLOWUP_2026-10-07.md (new)
  - knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md
created: 2026-10-07
parent_approval: Engram #9272
previous_adr: ADR-027G-FISCAL-CONSULTA-CUIT-VIA-TUSFACTURAS (approved 2026-10-07)
notes:
  - Three non-blocking nits from prior sibling review; behavior must be unchanged.
  - ADR-027H is a draft (no implementation, no code).
  - No commit, no push, no deploy, no schema, no Auth, no new deps, no browser.
