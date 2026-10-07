# CONTACTS-FRAGILITY-FIXES-20261007 — Task Brief

## Goal
Close four fragility findings on the Contactos stack with surgical, evidence-backed fixes. No schema, no Auth, no deploy, no foreign scope. All four items build on the prior approved `CONTACTS-CORRELATIVE-DEV-20261007` and `CONTACTS-CREATE-STABILITY-20261007` packages; the prior work is **preserved and uncommitted** in the worktree.

## Scope (finite)
1. **Stale search invalidation** — `ContactLookupField.tsx`: typing must cancel the in-flight lookup for the previous code. Use a `requestRef` (already declared at line 75) bumped on every manual keystroke, captured before the awaitable search, and rejected on resolve. On modal open and on selection, clear feedback (no stale "found"/"not found" displayed). No setInterval, no polling. Test: type A then B before A resolves, B wins.
2. *(no-op — explicit map mark)* Preview route already separate; not in this package.
3. **Institution address allow via selected contact** — `useCirugiaActions.ts` currently looks up the contact via `store.getContactoById` and compares `manualAddress`. New path: when the dialog already passes the selected `Contacto` object (approved prior change), the helper can derive coordinates from the passed `Contacto` without the store lookup. Keep the prev-compat path so the existing test that precargas store keeps passing. Address validation only for `institution` role. Add a minimal test.
5. **Coordinator legacy role mapping** — when the form creates a contact with `groups` including `coordinadores` and `role: 'interno'`, persist a duplicate `link` with `role: 'coordinator'` (legacy) so `surgery.service.findFirst({ linkId, role: 'coordinator' })` matches. Modify `createContact` to keep current signature (5 params including `actorUserId`) backwards compatible. Add a test reproducing create → surgery creation flow.
6. **PATCH audit in same tx** — wrap the update + audit + isActive toggle in a single `prisma.$transaction` so audit failure aborts the mutation. Use the same `tx` client for the audit `actor` and `entityId/companyId`. Apply both `'updated'` (only when fields other than `isActive` change) and `'reactivated'`/`'deactivated'` actions. Return the freshly loaded contact with proper Decimal conversion. Test: forced audit-delegate failure rolls back the update (no DB change). Test injection hook only inside test files.
7. **Last + next correlative badge in master page** — `src/app/contactos/page.tsx`: read-only badge `Último C-#### · Próximo C-####` from existing list data, no extra request. Use the existing list (already loaded) and extract numeric suffix max + 1. Add component test.

## Allowed files
- `src/lib/services/contact.service.ts`
- `src/components/contactos/ContactLookupField.tsx` (foreign dirty — limited targeted change for #1 only)
- `src/components/contactos/ContactSearchModal.tsx`
- `src/components/contactos/ContactoFormDialog.tsx`
- `src/hooks/useCirugiaActions.ts`
- `src/app/contactos/page.tsx`
- `src/lib/api/contacts.ts` (only if client needs exposing)
- New test files under `src/__tests__/`
- `knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/`
- `knowledge/worklog/CONTACTS_FRAGILITY_FIXES_20261007.md`

## Forbidden
- `prisma/schema.prisma`, migrations
- `src/lib/db.ts`, `src/lib/store.ts` (state)
- Auth, roles, permissions
- AiLateralRail, Expediente, Remitos, cloudflare, surgery page/hooks
- New dependencies
- `git commit`, `git push`, `git reset --hard`, `git checkout --` on any other file
- Browser/Playwright
- Real DB writes without `--confirmed-disposable-dev`

## Constraints
- Pre-existing approved contact stability (createContact audit-in-tx, unique schema, retry up to 5x) **must remain intact**.
- `useCirugiaActions` public signature **must not change**.
- `createContact` signature must remain backwards compatible (5th param `actorUserId`).
- `ContactLookupField.tsx` edit must be **targeted** to staleness only; do not regress the prior approved address-validated `onChange`/`contact` change path.
- All changes are additive over uncommitted prior package work; do not stash, do not revert.

## Validation gates
- After each item, run focused Vitest on that test.
- After all items, run own `run-checks.mjs` (prior tests + new tests).
- Scoped `typecheck.mjs` (only owned/affected files + their imports).
- Focused ESLint on touched files.
- `git diff --check` on owned files only.
- Independent sibling review (delegate subagent) or self-review fallback at depth limit.
- Engram `mem_save` bugfix observations and final `mem_session_summary` (parent only — non-blocking).

## Handoff
Caveman `Done / Changed / Files / Validations / Risks / Next` with exact test counts and evidence.
