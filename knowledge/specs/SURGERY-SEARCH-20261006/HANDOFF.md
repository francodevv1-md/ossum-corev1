# Surgery search handoff

## Done
Implemented only the diagnosed search flow in ANTIGRAVITY. Acceptance remains pending Franco's validation.

## Changed
- Runtime-error correction: removed the introduced unguarded `crypto.randomUUID` call. All chip entry points reuse the existing guarded `generateId("chip")` helper, including its non-UUID fallback. Added three regression cases with the method unavailable; these remain NOT RUN.
- Source suggestions and filter share normalized text values; typed text chips no longer contain a surgery/contact ID mismatch.
- Desktop/mobile use the same component and commit with selection, Enter or Buscar; keyboard navigation, removal and normalized duplicate prevention included.
- Legacy contact chips remain supported; AND between categories / OR within a category is unchanged. Simple text is no longer ignored when chips exist.
- Genuine misses stay empty. If non-search filters hide matching surgeries, explicit recovery removes those filters/presets while preserving search text/chips/options. No automatic widening or fabricated results.
- Draft input resets when caller trust context changes. Suggestions consume only the caller-supplied dataset; matching results are not capped by the five-suggestion-per-category limit.

## Files
- src/components/cirugias/SmartSurgerySearch.tsx — reusable UI, no store/API/Auth dependency.
- src/lib/cirugias/search.ts — pure suggestion/matching helpers and minimal record type.
- src/lib/cirugias.types.ts — explicit text-chip discriminator, backwards-compatible with legacy contact chips.
- src/hooks/useCirugiasFilters.ts — consistent matcher, search-only count and search-preserving recovery.
- src/app/cirugias/page.tsx — scoped data, zero-result feedback and caller wiring.
- src/components/cirugias/CirugiasModuleBar.tsx, MobileCirugiasToolbar.tsx — component reuse.
- src/__tests__/unit/surgery-search.test.ts, src/__tests__/components/SmartSurgerySearch.test.tsx — actual helper/hook/selection regression checks.

## Validations
NOT RUN: tests, TypeScript, build, browser QA and independent acceptance review, explicitly delegated to Franco. Only source/diff inspection performed; no runtime, DB, external calls or generated files changed.

## Risks
- Not yet validated in the running application. Build success alone does not establish browser behavior.
- Searches cover loaded, non-archived surgeries in the current company/branch, not a global contact directory or unloaded document metadata.
- Text suggestions match names/text, not unique person identity; legacy exact contact chips retain their existing matching behavior.
- Existing unrelated dirty/untracked work was not adopted or overwritten. No commit or deploy.

### Local commit approval

After the UUID correction, Franco explicitly requested a local commit of this task. The commit includes only search sources, regression tests and this package's documentation/lock. It does not certify unexecuted tests/build/browser checks; unrelated workspace files and Git publication remain excluded.

## Next
Franco: `npm run build`, then manual desktop/mobile checks of suggestion selection, Enter/Buscar, chip removal, case/accents/spaces, genuine misses, restrictive filters/recovery and scope switching. Optional focused regression command:

```sh
npm test -- src/__tests__/unit/surgery-search.test.ts src/__tests__/components/SmartSurgerySearch.test.tsx
```

### Reuse from a client component

Provide already-authorized surgery records and controlled chips. Use the existing filter hook, or `matchesSurgerySearchText` for a standalone text filter. The search UI neither fetches data nor owns authentication/persistence.

```tsx
<SmartSurgerySearch
  key={scopeKey}
  surgeries={authorizedSurgeries}
  chips={searchChips}
  onChipsChange={setSearchChips}
/>
```

The caller owns data loading/errors, active filters and company/branch scope. `scopeKey` should change when the authorization/data context changes so an old draft is not retained.
