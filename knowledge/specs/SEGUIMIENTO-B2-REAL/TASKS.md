# TASKS.md — SEGUIMIENTO-B2-REAL

Status: implemented  
Change: `SEGUIMIENTO-B2-REAL`  
Artifact store: filesystem  
Dependencies: PROPOSAL.md, DESIGN.md (already approved)

---

## Guardrails for all slices

- `prisma/schema.prisma` edits allowed (B2 real requires a persistence model).
- Migration allowed (additive only: new `SeguimientoEntry` table, no destructive changes).
- No changes to existing models (Surgery, User, Company, etc.).
- No changes to Auth, guards, or multi-company infrastructure.
- Use existing `getApiAuthContext`, `requireCompanyReadAccess`, `requireCompanyMutationAccess`.
- Reuse `apiFetch` and `ApiClientError` on the frontend.
- Frontend edits limited to `NovedadesTabContent.tsx`, new hook/adapter files, and `ExpedienteFullView.tsx` (props passthrough only).
- Keep the B1 design language (feed-first, chronological, entry-type labels, filters) while replacing derived data with real API data.
- No Historial changes. No Correo changes.

---

## Slice 1 — Persistent Seguimiento model + service

### Goal

Add the `SeguimientoEntry` model to Prisma, run migration, and create the server-side service.

### Files

- `prisma/schema.prisma`
- `src/lib/services/seguimiento.service.ts` (new)
- `prisma/migrations/*` (generated)

### Tasks

- [x] Add `SeguimientoEntry` model to `prisma/schema.prisma` with fields:
  ```
  id          String   @id @default(cuid())
  surgeryId   String
  surgery     Surgery  @relation(fields: [surgeryId], references: [id], onDelete: Cascade)
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  entryType   String   // 'note' | 'authorization_evidence' | 'file_photo_evidence' | 'mail_evidence'
  content     String   @db.Text
  summary     String?  // optional short summary for feed scanning
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  evidenceRef Json?    // flexible reference to evidence source (e.g. { mailLinkId, fileUrl, ... })
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  ```
- [x] Add indexes: `@@index([surgeryId, createdAt])`, `@@index([companyId])`, `@@index([entryType])`
- [x] Add `seguimientoEntries SeguimientoEntry[]` relation on Surgery model.
- [x] Run `npx prisma format`, `npx prisma validate`.
- [x] Run `npx prisma migrate dev --name add_seguimiento_entry`.
- [x] Create `src/lib/services/seguimiento.service.ts` with:
  - `listSeguimientoEntries(prisma, surgeryId, companyId, filters?)` — list entries with optional `entryType` filter, ordered by `createdAt` desc.
  - `createSeguimientoEntry(prisma, data)` — create a new entry (entryType, content, summary?, evidenceRef?, authorId, surgeryId, companyId).
- [x] Export types for the service return shapes.

### Validation

- `npx prisma validate` passes.
- `npx prisma generate` regenerates client with `SeguimientoEntry`.
- Migration creates the table in Supabase.
- Service functions compile without errors.

---

## Slice 2 — API routes

### Goal

Expose `GET` (list) and `POST` (create note) routes scoped to surgery.

### Files

- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/route.ts` (new)
- `src/lib/validators/seguimiento.validator.ts` (new)

### Tasks

- [x] Create `src/lib/validators/seguimiento.validator.ts` with:
  - `validateSeguimientoListQuery(query)` — validates optional `entryType` and `take` params.
  - `validateSeguimientoCreateBody(body)` — validates `entryType` (required, one of the four types), `content` (required, non-empty string), `summary` (optional string), `evidenceRef` (optional object).
- [x] Create `GET /api/companies/[companyId]/surgeries/[surgeryId]/seguimiento`:
  - Use `getApiAuthContext(request, companyId)`, `requireCompanyReadAccess(ctx)`.
  - Parse query: `entryType?`, `take?` (default 50, max 100).
  - Call `listSeguimientoEntries` from service.
  - Return `{ data: entries }` or `{ error }` shape consistent with existing API.
- [x] Create `POST /api/companies/[companyId]/surgeries/[surgeryId]/seguimiento`:
  - Use `getApiAuthContext(request, companyId)`, `requireCompanyMutationAccess(ctx, ['admin', 'coordinator', 'operator'])`.
  - Validate body with `validateSeguimientoCreateBody`.
  - Call `createSeguimientoEntry` from service.
  - Return `{ data: entry }` with 201 status.
- [x] Verify surgery exists and belongs to company before creating/linking entries (use prisma to check `surgery.companyId === companyId`).

### Validation

- `GET` without token returns 401.
- `GET` with valid token and surgery returns 200 with array (empty if no entries).
- `POST` with valid body creates entry and returns 201.
- `POST` without `content` returns 400.
- `POST` with disallowed role returns 403.
- `POST` for surgery in different company returns 404.

---

## Slice 3 — Frontend API hook and adapter

### Goal

Create a React hook that fetches and creates seguimiento entries via the API, replacing the current `notes`/`history` prop passthrough.

### Files

- `src/hooks/useSeguimientoFeed.ts` (new)
- `src/lib/api/seguimiento-adapter.ts` (new)

### Tasks

- [x] Create `src/lib/api/seguimiento-adapter.ts` with:
  - `SeguimientoEntryView` type — UI-friendly shape for a feed entry (id, entryType, content, summary, authorName, createdAt, evidenceRef).
  - `mapApiEntryToView(entry)` — maps raw API response to `SeguimientoEntryView`.
- [x] Create `src/hooks/useSeguimientoFeed.ts` with:
  - Uses `useAuth()` for `activeCompany`.
  - `entries: SeguimientoEntryView[]` — fetched entries.
  - `loading: boolean` — initial fetch state.
  - `error: string | null` — fetch error.
  - `addNote(content: string, summary?: string): Promise<void>` — creates a note entry via POST, refetches list on success.
  - `addingNote: boolean` — mutation loading state.
  - `refetch(): Promise<void>` — manual refetch.
  - Fetches from `GET /api/companies/{companyId}/surgeries/{surgeryId}/seguimiento`.
  - Returns empty array with empty state intent when no entries exist.

### Validation

- Hook fetches data on mount when `activeCompany` and `surgeryId` are available.
- `addNote` posts to API, refetches list, and returns success/error.
- `addingNote` is true during mutation.
- Empty state is distinguishable from loading state.

---

## Slice 4 — Refactor NovedadesTabContent for real data

### Goal

Replace the derived `notes`/`history`/`onAddNote` props with real API-backed data and inline note creation. Preserve the B1 visual design language (feed-first, chronological, entry-type labels, filters, day separators).

### Files

- `src/components/expediente/NovedadesTabContent.tsx`
- `src/components/expediente/ExpedienteFullView.tsx` (props passthrough only)

### Tasks

- [x] Update `NovedadesTabContent` props interface:
  - Remove `notes: SurgeryNote[]`
  - Remove `history: HistoryEntry[]`
  - Remove `onAddNote: () => void`
  - Keep `surgery: Surgery`
- [x] Integrate `useSeguimientoFeed` hook inside the component.
- [x] Replace derived `TimelineItem[]` construction with real `SeguimientoEntryView[]` from the hook.
- [x] Add a note composer (inline text input + submit button) at the top of the feed:
  - Textarea for note content.
  - Submit button with loading state (`addingNote`).
  - Shows success/error toast via sonner.
  - Clears input on success.
- [x] Keep existing feed rendering structure:
  - Reverse chronological order.
  - Entry-type badges/icons (notes, authorization, files, mail).
  - Day group separators.
  - Author attribution.
  - Filter chips (by entryType).
- [x] Loading state: show skeleton or spinner while initial fetch is in progress.
- [x] Empty state: show a helpful message ("No hay actualizaciones todavía") with CTA to write the first note.
- [x] Error state: show error alert with retry button.
- [x] In `ExpedienteFullView.tsx`, update the `NovedadesTabContent` mount to pass only `surgery` prop.

### Validation

- Tab renders loading state on first mount.
- After fetch, renders feed entries in reverse chronological order.
- Empty state renders with "no entries" message and CTA.
- Note composer creates entry, refetches list, and shows new entry at top.
- Filter chips filter entries by type correctly.
- Error state with retry works.
- TypeScript compiles without errors.

---

## Slice 5 — End-to-end hardening

### Goal

Validate the full flow works end-to-end and no regressions are introduced.

### Files

- Files from previous slices only.

### Tasks

- [x] Run `npx prisma validate` — must pass.
- [x] Run `npx prisma generate` — must regenerate client with SeguimientoEntry.
- [x] Run `npm run typecheck` — must pass.
- [x] Run `npx tsc --noEmit` — must pass.
- [x] Run `npm run build` — must compile.
- [x] Run `npm test` — no regressions (existing tests still pass).
- [x] Manual verification: existing Expediente tabs (ficha, comercial, consumo, documentacion, logistica, correo, historial) still render correctly.
- [x] Manual verification: Seguimiento tab loads, shows entries, allows note creation.

### Validation

- All quality gates pass.
- No broken tabs in Expediente.
- Seguimiento tab is functional.

---

## Suggested executor order

1. **Slice 1** — Schema + service (backend foundation)
2. **Slice 2** — API routes
3. **Slice 3** — Frontend hook
4. **Slice 4** — NovedadesTabContent refactor
5. **Slice 5** — Hardening

Slices 1 and 2 must be sequential. Slice 3 can start after Slice 2. Slices 4 depends on 3.
