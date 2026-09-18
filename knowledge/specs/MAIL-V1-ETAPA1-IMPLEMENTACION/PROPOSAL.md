# Proposal — MAIL-V1-ETAPA1-IMPLEMENTACION

Status: proposed  
Change: `MAIL-V1-ETAPA1-IMPLEMENTACION`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)

---

## Summary

Implement a first operational `Correo` tab inside each Cirugía/Expediente so teams can manually attach and review surgery-related email conversations from a mock mailbox flow, without introducing a global inbox, send/reply features, real Gmail integration, schema changes, or auth changes in this stage.

---

## Why this change

Operational email is part of the real surgery workflow, but today the repo has no expediente-embedded mail workspace. This stage creates the minimum usable foundation aligned with OSSUM COR's surgery-centric model while preserving current guardrails: backend-light, no provider lock-in, no schema migration, and no critical refactor of Cirugías.

---

## In scope

- Add `Correo` as a main visible Expediente tab.
- Support multiple conversations per surgery.
- Support manual attach via modal from a mock mailbox/provider.
- Persist linked conversation data server-side through internal persistence boundaries.
- Show snapshot data with manual refresh only.
- Allow one conversation to be linked to multiple surgeries, with warning and mandatory reason.
- Store attachment metadata for imported conversations.
- Allow optional internal persistence only for explicitly selected critical attachments.
- Apply configurable access rules for coordinadores, manager de cirugías, ingresos, ventas, and depósito.
- Use `sistemas@districorr.com.ar` as the reference mailbox for this stage.

---

## Out of scope

- Global inbox or mailbox dashboard.
- Gmail or other real provider integration.
- Send, reply, draft, forward, or compose actions.
- Automatic sync, polling, or push updates.
- Auth redesign, permission platform redesign, or multi-company model redesign.
- Prisma schema changes, migrations, or storage-provider decisions.
- Refactor of the broader Cirugías domain outside the minimum tab integration path.

---

## Product shape

The Expediente becomes the only visible entry point for mail in V1.

Inside `Correo`, users should be able to:

1. See linked conversations for the current surgery.
2. Open a manual attach modal backed by mock mailbox data.
3. Review conversation summary, participants, timestamps, linked surgeries, and attachment metadata.
4. Confirm linking to the current surgery.
5. If the same conversation is linked elsewhere, proceed only after warning acknowledgement and mandatory reason capture.
6. Refresh the surgery snapshot manually to pull the latest internal state.
7. Mark selected attachments as critical for optional internal persistence.

---

## Implementation direction

Use a layered path that fits the current repo state:

- UI integration in the existing Expediente tab system.
- New mail-focused UI components under the expediente domain.
- Internal server-side boundary for mail snapshots and link operations.
- Mock provider adapter behind a stable interface so a real provider can replace it later.
- Transitional permission config kept internal and explicit for this stage.

This stage should prefer additive work over refactors and avoid touching blocked files such as `prisma/schema.prisma`.

---

## Expected repo impact

Primary implementation areas likely include:

- `src/components/expediente/ExpedienteFullView.tsx`
- `src/lib/cirugias.constants.ts`
- `src/app/expediente/page.tsx`
- new expediente mail UI components (new folder/files)
- new internal mail service / validator / mock-adapter files under `src/lib/**` and/or `src/app/api/**`

Sensitive areas to minimize or avoid unless required by later approved design:

- `src/types/index.ts`
- `src/app/cirugias/page.tsx`
- `src/lib/store.ts`
- `prisma/schema.prisma`

---

## Risks and open design points

- The repo is still prototype-heavy and client-driven, so the spec/design must define a temporary server-side persistence boundary without pretending the final backend foundation already exists.
- Multi-surgery linking needs explicit auditability of warning acknowledgement and reason capture.
- Permission configurability must be scoped narrowly enough to avoid crossing into auth redesign.
- Attachment persistence rules must clearly separate metadata-only vs selected critical binary persistence.

---

## Success criteria for the next phases

- Spec defines conversation, link, attachment, refresh, warning, and permission rules in detail.
- Design maps the feature onto current Expediente UI and a mock-backed internal service boundary.
- Tasks stay within additive, approval-safe scope and avoid schema/auth/provider changes.

---

## Proposed next step

Proceed to `sdd-spec` for detailed behavior, data contract, and acceptance criteria before any implementation work.
