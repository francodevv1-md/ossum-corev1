# SDD Init — GPT-027F.0

Status: initialized
Workspace: `E:\OSSUM_COR_PROJECT`
Artifact store: filesystem primary, Engram secondary

---

## Scope

This artifact captures the SDD init baseline for OSSUM COR without changing product behavior.

---

## Detected Stack

- Framework: Next.js 16 App Router (`src/app`)
- Language: TypeScript with path alias `@/*`
- UI: React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- State: Zustand with persisted local storage prototype store
- Validation/typing: Zod present, strict TypeScript enabled
- Data access: Prisma client present, placeholder SQLite schema still in repo
- Auth: `next-auth` installed, not authoritative for final architecture
- Domain direction: backend + PostgreSQL are documented as the target source of truth, but not implemented as the active runtime architecture yet

---

## Conventions Observed

- App routes under `src/app/**/page.tsx`
- UI components grouped by domain under `src/components/<domain>`
- Reusable primitives under `src/components/ui`
- Client hooks under `src/hooks/use*.ts`
- Shared domain utilities/constants under `src/lib/*`
- Centralized prototype types in `src/types/index.ts`
- Current code style is mostly double quotes and semicolon-light TypeScript/TSX
- Product/domain comments are often Spanish; generated technical artifacts should default to English

---

## Architecture Snapshot

- Current implementation is prototype-first and client-heavy
- `src/lib/store.ts` is a large Zustand store acting as the temporary operational source of truth
- Mock data under `src/data/*` still feeds major flows
- `src/lib/db.ts` provides a Prisma singleton, but `prisma/schema.prisma` is still placeholder-level and blocked from real evolution in phase 0
- `src/app/api/route.ts` exists only as a trivial placeholder endpoint
- Cirugías/Expediente follows a modular UI split with page orchestration + hooks + domain components
- Root project rules explicitly prohibit treating frontend/Zustand as final architecture

---

## Testing Capability

- Unit/component runner: Vitest (`npm test`)
- DOM testing: Testing Library + jsdom
- E2E runner: Playwright (`e2e/*.spec.ts`)
- Current E2E inventory: 5 Chromium tests across 2 files
- Current unit/component inventory: 28 test files detected under `src/__tests__`

### Validation Snapshot

- `npm test`: runs successfully as a command, but suite is not fully green
- Current observed result: 24 failing tests, 574 passing, 10 skipped
- Main repeated failure pattern: Zustand persist storage incompatibility in tests (`storage.setItem is not a function`)
- `npx playwright test --list`: works, confirming E2E wiring is present

---

## Strict TDD Support Assessment

Strict TDD support is **not currently present**.

Reasons:

- Test infrastructure exists, but the baseline is not green
- Persisted Zustand store behavior is leaking into tests
- Next build is configured with `typescript.ignoreBuildErrors = true`
- `reactStrictMode` is disabled
- There is no explicit repo policy or automation enforcing test-first or red-green-refactor discipline

Practical assessment: **partial test capability, not strict TDD-ready**.

---

## SDD Init Outcome

- SDD init context persisted in `knowledge/specs/GPT-027F.0/INIT.md`
- Engram session started and prompt/context stored for recall
- No product code, schema, migration, auth, or backend foundation changes were made
