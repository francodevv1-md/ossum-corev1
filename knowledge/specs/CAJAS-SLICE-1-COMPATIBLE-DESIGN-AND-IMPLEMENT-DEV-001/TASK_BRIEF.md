# TASK BRIEF — CAJAS-SLICE-1-COMPATIBLE-DESIGN-AND-IMPLEMENT-DEV-001

## 1. Context & Objective
- **Task ID:** `CAJAS-SLICE-1-COMPATIBLE-DESIGN-AND-IMPLEMENT-DEV-001`
- **Objective:** Implement Cajas Modelo (composición estándar versionada por empresa) using the existing Cajas schema without modifying legacy adapters or introducing physical boxes, stock movements, reservations, or surgical effects.
- **Approved by:** Franco (Cajas program approved; execution bounded strictly to Slice 1).
- **Worktree:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
- **Database:** Confirmed disposable PostgreSQL DEV database.

## 2. Design Reconciliation (Phase 0)
- **Existing Schema Inventory:**
  - `CajasArticleReference` (`cajas_article_reference`): Company-scoped verified snapshot linking to `Article` (`sourceArticleId`).
  - `CajasBoxFormula` (`cajas_box_formula`): Company-scoped formula root for a box composite article (`boxArticleReferenceId`), tracking `nextVersion`.
  - `CajasFormulaCurrent` (`cajas_formula_current`): Pointer to the current active formula version (`currentFormulaVersionId`).
  - `CajasFormulaVersion` (`cajas_formula_version`): Immutable version record (`versionNumber`, `previousVersionId`, `acceptedAt`, `acceptedById`, `cause`, `commandAcceptanceId`).
  - `CajasFormulaLine` (`cajas_formula_line`): Immutable expected composition line (`lineNumber`, `articleReferenceId`, `expectedQuantity`, `unit`, `skuSnapshot`, `descriptionSnapshot`).
  - `CajasCommandAcceptance` (`cajas_command_acceptance`): Audit & command acceptance envelope for immutable checkpoint (`checkpoint = formulaVersion`).
- **Database State:**
  - Verified that all the above tables exist and are active in the connected DEV database.
  - **No DDL / migration needed** because existing schema models fully satisfy Slice 1 requirements.
- **Ownership & Boundaries:**
  - **Article / Stock:** Owns article catalog, SKU, descriptions, units, and company eligibility. A Caja is an `Article` (composite SKU / articleType `caja`).
  - **Cajas (Slice 1):** Owns `CajasBoxFormula`, `CajasFormulaVersion`, `CajasFormulaLine`, representing expected formula compositions with immutable versions.
  - **Stock Ledger / Logistics:** Untouched in Slice 1. Zero `StockMovement`, zero reservations, zero remitos.
  - **Legacy `boxId`:** Untouched soft references remain preserved.
- **Models NOT touched in Slice 1:**
  - `CajasStockScopeReference`, `CajasStockRecordReference`, `CajasAssignment`, `CajasPreparation`, `CajasPreparationLine`, `CajasReservationCorrelation`, `CajasControl`, `CajasControlLine`, `CajasCompositionChange`, `CajasCompositionChangeLine`, `CajasDifference`, `CajasDifferenceResolution`, `CajasDispatch`, `CajasDispatchLine`, `CajasDispatchAccounting`, `CajasDisposition`, `CajasReturnConfirmation`, `CajasReturnLine`, `CajasConsumptionConfirmation`, `CajasConsumptionLine`, `CajasConditionProjection`.
  - Slices 2–5 remain untouched.

## 3. Implementation Plan
1. **Validators (`src/lib/validators/cajas-formula.ts`):**
   - `cajasFormulaCreateSchema`: `articleId`, `lines: [{ articleId, expectedQuantity, unit? }]`, `cause?`.
   - `cajasFormulaVersionPublishSchema`: `lines: [{ articleId, expectedQuantity, unit? }]`, `cause?`.
   - Rejects negative/zero quantities, duplicate components in the same version, and cross-company articles.
2. **Domain Service (`src/lib/services/cajas-formula.service.ts`):**
   - `getOrCreateArticleReference(db, companyId, articleId, actorUserId)`: Auto-ensures `CajasArticleReference` exists for the given company and article.
   - `createBoxFormula(db, companyId, input, actorUserId)`: Creates formula, version 1, lines, current pointer, audit event, and command acceptance.
   - `listBoxFormulas(db, companyId)`: Lists box formulas with current version details and line count.
   - `getBoxFormula(db, companyId, formulaId)`: Gets formula, current version composition lines, and version history.
   - `publishFormulaVersion(db, companyId, formulaId, input, actorUserId)`: Adds a new immutable version `N+1`, creates lines, updates `currentSelector`, records audit event.
3. **API Routes:**
   - `GET /api/companies/[companyId]/cajas/formulas`: List box formulas.
   - `POST /api/companies/[companyId]/cajas/formulas`: Create box formula (initial version).
   - `GET /api/companies/[companyId]/cajas/formulas/[formulaId]`: Get formula with current composition and version history.
   - `POST /api/companies/[companyId]/cajas/formulas/[formulaId]/versions`: Publish new formula version.
4. **Client API & UI (`src/lib/api/cajas-formulas.ts`, Stock/Catálogo UI):**
   - Client API functions.
   - UI in Stock page / Sheet to view and manage Cajas Modelo compositions with honest loading/error states.
5. **Unit Tests (`src/__tests__/unit/cajas-slice1-formula.test.ts`):**
   - Multi-company isolation.
   - Rejection of invalid quantities and cross-company articles.
   - Immutable version publishing (version 1 remains intact when version 2 is published).
   - Audit event & command acceptance creation.
   - Zero stock movements or surgical effects.
