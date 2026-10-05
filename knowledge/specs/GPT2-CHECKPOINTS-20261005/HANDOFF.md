# Approved checkpoint execution

## Done
- Reused recovered Agenda candidate and fix; did not restart implementation.
- Baseline `d16cb00`: exactly five inverse declarations, static physical-contract unchanged, isolated validate PASS and independent review PASS.
- Agenda `3933911`: 10 functional files + Agenda-only schema additions + three task documents; 17/17 mocked tests in original and isolated candidate, focused TypeScript PASS, isolated validate/generate PASS, independent service/schema review PASS.

## Changed
- Stock nullable updates now persist explicit clears as null while omitted fields remain unchanged.
- Stock detail status uses persisted commercial minStock rather than hard-coded five; quantities, reservations and movement algebra unchanged.
- Price list create/update and price version creation now share one transaction with audit, reusing a supplied transaction without nesting. Synthetic rollback/client-identity/reuse regressions included.

## Files
- Backend candidate: isolated Stock-only prisma/schema.prisma; four existing Stock migration.sql artifacts; services article, stock-ledger, price-list; validators article, price-list; API clients articles, stock, price-lists; article prices collection route and two price-list routes; four backend unit suites.
- Include Company three commercial/price inverses, User.createdPriceVersions, ContactCompanyLink.articleCommercialProfiles, Article.category/pmAnmat/isSterile and commercialProfiles/priceVersions, three commercial/price models. Exclude all geographic fields/enums/migration and unrelated shared-file changes.
- SQL classification migration actually adds category/isSterile/pmAnmat only. Older CANDIDATE.md nine-field claim is stale; actual artifacts and isolated schema agree.
- UI candidate after backend: Stock page, useStock, stock-ui-model, StockArticleSheet/Tabs/Columns, ArticleCodesDialog; eleven named UI suites and five legacy deletions. Exclude CajasPhysicalUnitsSection diff and all Cajas API/intents/routes/Preparation/Remito chain.

## Validations
- Parent reproduced nullable regression FAIL (undefined instead of null) and minStock regression FAIL (Bajo stock instead of Disponible); corrected, three suites 24/24 PASS.
- Price subagent close-copper-whitefish reports red audit-failure persisted-state reproduction and 24/24 synthetic tests after transaction fix. Parent isolated four-suite replay 48/48 PASS.
- Isolated Stock Prisma validate/generate PASS (7.8.0), physical schema diff matches four Stock artifact effects plus already committed Agenda. No DB operations.
- Focused Stock TypeScript initially FAIL with seven TS2339 never-narrowing errors from the transaction guard. Minimal typeof-method guard fixed them; focused source/contracts/routes/test typecheck PASS against newly generated temporary client.
- Parent original UI replay 11 suites/45 mocks PASS. Independent UI review endless-teal-yak excludes physical-units diff because it depends on absent HEAD selectPreparationLineApi and changed reservation/control signatures.
- Full TypeScript attempt exceeded 60 seconds without diagnostics: NOT PASS. Whole-app build not certified. HEAD layout uses next/font/google; full build is not an offline/no-prerender DB acceptance check. Browser and PostgreSQL operational checks NOT RUN.
- All temporary generated client/tsconfig aliases are validation-only, not staged. Shared node_modules client and runtime/.next are not generated or rebuilt.

## Risks
- Migration artifacts are versioned only; never applied in this task. UI mocks/source review are not browser or persistence acceptance.
- Shared worktree remains dirty with foreign work. Commits use exact validated blobs/explicit file lists only, no hooks bypass, no global add/reset/stash/cleanup.

## Next
- Independent exact backend diff review, local backend commit, then isolated reviewed UI candidate checks and local checkpoint. Preserve physical-flow hold and report unexecuted operational gates explicitly.
