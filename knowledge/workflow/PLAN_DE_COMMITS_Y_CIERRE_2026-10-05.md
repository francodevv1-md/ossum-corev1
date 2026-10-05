# Plan de Commits y Cierre de Checkpoints (2026-10-05)

## 1. Estado Inicial e Inspección

- **HEAD**: `1d33a49` (`feat(compras): add tracked purchase order receiving`)
- **Branch**: `ux/antigravity-redesign`
- **Índice Git (`git diff --cached`)**: Vacío (0 archivos staged). No hay staging ajeno residual tras el commit `1d33a49`.
- **Locks vigentes en `.opencode/locks/`**:
  - `COLLECTIONS-LOCAL-COMMIT-20261004.lock.md`: Liberado (bloqueo original por staging ajeno resuelto al integrarse `1d33a49`).
  - `COLLECTIONS-PORTFOLIO-DEV-20261004.lock.md`: Liberado (48 tests vitest pasando).
  - `COLLECTIONS-POPULATED-QA-DEV-20261004.lock.md`: Liberado (QA con datos poblados bloqueada honestamente por expiración de sesión manual).
  - `OC-TRACKED-RECEIPT-DEV-001.lock.md`: Liberado tras commit `1d33a49`.
  - `DEV-QA-READINESS-SESSION-20261003.lock.md`: Reservado (puerto 5000 / sesión DEV; solo lectura, sin writers activos).

---

## 2. Mapa de Paquetes Funcionales

### Paquete 1: Cartera / Collections Dashboard (Listo para Checkpoint)
- **Resultado que aporta**: Tablero de cobranzas (`/ventas/cartera`), cálculo de saldos y envejecimiento de deuda (`issuanceAge`), filtros por cliente y comprobantes con totales consolidados, sin mutaciones directas de base de datos.
- **Archivos**:
  - `src/app/ventas/cartera/page.tsx`
  - `src/lib/collections-dashboard.utils.ts`
  - `src/__tests__/unit/collections-dashboard.utils.test.ts`
  - `src/__tests__/components/CollectionsDashboard.test.tsx`
  - `knowledge/specs/COLLECTIONS-PORTFOLIO-DEV-20261004/`
  - `knowledge/specs/COLLECTIONS-POPULATED-QA-DEV-20261004/`
- **Propietario**: Ventas / Cartera (`COLLECTIONS-PORTFOLIO-DEV-20261004`).
- **Dependencias**: Ninguna con otros archivos sucios. 100% aislado.
- **Validaciones**:
  - Disponibles: 48 tests unitarios y de componentes pasando (`vitest` 48/48 PASS).
  - Pendientes: QA operativa con datos poblados (bloqueada por expiración de sesión DEV).
- **Estado**: **Listo para checkpoint local**.
- **Mensaje propuesto**: `feat(ventas): add collections portfolio dashboard and aging calculation`

---

### Paquete 2: Agenda Personal / Personal Calendar Events (Parcial / Pendiente de Aislamiento de Schema)
- **Resultado que aporta**: Endpoint `/api/companies/[companyId]/personal-events`, servicio, validadores y suite de tests para la gestión de eventos de agenda personal.
- **Archivos**:
  - `src/app/api/companies/[companyId]/personal-events/`
  - `src/lib/api/personal-calendar.ts`
  - `src/lib/services/personal-calendar.service.ts`
  - `src/lib/validators/personal-calendar.validator.ts`
  - `src/__tests__/unit/personal-calendar.service.test.ts`
  - `src/__tests__/unit/personal-calendar.validator.test.ts`
  - `src/__tests__/unit/personal-calendar-routes.test.ts`
  - `src/__tests__/integration/personal-calendar-postgres.test.ts`
  - `prisma/migrations/20261002110500_add_personal_calendar_events/`
  - `knowledge/specs/COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001/`
  - `knowledge/specs/COORDINATION-NOTIFICATIONS-CALENDAR-INDEPENDENT-REVIEW-001/`
- **Propietario**: Coordinación / Calendario.
- **Dependencias**: Comparte modificaciones no committeadas en `prisma/schema.prisma` con el módulo de Artículos/Precios.
- **Validaciones**: 14 tests unitarios pasando (`vitest` 14/14 PASS). Integración PostgreSQL requiere ambiente DB específico.
- **Estado**: **Parcial** (requiere commit conjunto o extracción atómica de schema sin alterar otros modelos).
- **Mensaje propuesto**: `feat(coordinacion): add personal calendar events backend and routes`

---

### Paquete 3: Maestro de Artículos / Listas de Precios y Perfiles Comerciales (Parcial)
- **Resultado que aporta**: Modelo de listas de precios con histórico, perfiles comerciales por empresa (stock mínimo, lead time) y clasificación maestra.
- **Archivos**:
  - `prisma/migrations/20261001135215_add_article_classification_master_fields/`
  - `prisma/migrations/20261001142112_add_article_company_commercial_profile/`
  - `prisma/migrations/20261001150132_add_article_price_lists_history/`
  - `prisma/migrations/20261001180000_add_min_stock_to_article_commercial_profile/`
  - `src/app/api/companies/[companyId]/articles/[articleId]/prices/`
  - `src/app/api/companies/[companyId]/price-lists/`
  - `src/lib/api/price-lists.ts`
  - `src/lib/services/price-list.service.ts`
  - `src/lib/validators/price-list.ts`
  - `src/__tests__/unit/article-master-classification.test.ts`
  - `src/__tests__/unit/article-company-commercial-profile.test.ts`
  - `src/__tests__/unit/article-price-lists-history.test.ts`
  - Cambios en `src/components/stock/*` y `src/lib/services/article.service.ts`.
- **Propietario**: Stock & Maestro de Artículos.
- **Dependencias**: `prisma/schema.prisma` compartido; interacción con `article.service.ts`.
- **Validaciones**: Tests unitarios de clasificación y precios.
- **Estado**: **Parcial** (en proceso de consolidación).
- **Mensaje propuesto**: `feat(stock): add price lists history and commercial profiles`

---

### Paquete 4: Compras / Reposición y Forecast de Movimientos (Parcial)
- **Resultado que aporta**: Sugerencias de reposición, forecast y aceptación de compras.
- **Archivos**:
  - `src/app/api/companies/[companyId]/compras/forecast/accept/`
  - `src/components/compras/ReplenishmentSuggestionsSection.tsx`
  - `src/lib/services/compras-forecast.service.ts`
  - `src/lib/services/compras-movimientos.service.ts`
  - `src/__tests__/unit/compras-reposicion.test.ts`
  - `src/__tests__/unit/compras-movimientos.service.test.ts`
  - `src/__tests__/unit/compras-movimientos.test.ts`
  - `e2e/compras-oc-receipt.spec.ts`
  - `knowledge/specs/COMPRAS-OC-RECEIPT-E2E-20261003/`
- **Propietario**: Compras.
- **Dependencias**: Integración con stock ledger.
- **Validaciones**: Tests unitarios pasando. Falta validación E2E de aviso a destinatarios.
- **Estado**: **Parcial**.
- **Mensaje propuesto**: `feat(compras): add replenishment suggestions and forecast movement service`

---

### Paquete 5: Cirugías / Comprobantes Asociados & Gate de Autorización Intake (Parcial)
- **Resultado que aporta**: Desacoplamiento del panel de comprobantes asociados del contenedor padre y validación de gate de autorización de ingreso de cirugías.
- **Archivos**:
  - `src/hooks/useSurgeryComprobantes.ts`
  - `src/__tests__/components/ComprobantesAsociados.http.test.tsx`
  - `src/components/expediente/ComprobantesAsociados.tsx`
  - `knowledge/specs/SURGERY-COMPROBANTES-BACKEND-READ-DEV-001/`
  - `knowledge/specs/SURGERY-COMPROBANTES-PARENT-CLEANUP-DEV-001/`
  - `e2e/surgery-intake-approval.spec.ts`
  - `knowledge/specs/SURGERY-INTAKE-AUTHORIZATION-E2E-20261003/`
  - `src/__tests__/unit/surgeries-intake-authorization.test.ts`
- **Propietario**: Cirugías / Expediente.
- **Dependencias**: Cambios menores en hooks compartidos.
- **Estado**: **Parcial**.
- **Mensaje propuesto**: `feat(cirugias): decouple comprobantes asociados read and add intake authorization gate`

---

### Paquete 6: Facturación / Billing Gate & Consumos Override (Parcial)
- **Resultado que aporta**: Guardias de liquidación y ruta para override de facturación en consumos.
- **Archivos**:
  - `src/app/api/companies/[companyId]/consumos/[consumoId]/billing-override/`
  - `src/lib/api/billing-gate.ts`
  - `src/lib/services/billing-gate.service.ts`
  - `src/__tests__/unit/liquidation-billing-gate.test.ts`
- **Propietario**: Facturación.
- **Estado**: **Parcial**.
- **Mensaje propuesto**: `feat(facturacion): add billing gate validations and consumption override route`

---

### Paquete 7: Preparación → Remito (Bloqueado)
- **Resultado**: Emisión de remitos desde preparación física de cajas.
- **Estado**: **Bloqueado** explícitamente según `DB_TESTS_BLOCKED.md` y directivas del proyecto. No se toca en este ciclo.

---

### Paquete 8: Herramientas de Desarrollo y Datos Demo Districorr (Soporte Interno)
- **Resultado**: Scripts de carga y manifests para 10 casos de prueba y mapeo de instituciones.
- **Archivos**:
  - `scripts/dev/districorr-staff-ten-case-20261002.manifest.ts`
  - `scripts/dev/districorr-staff-ten-case-20261002.ts`
  - `scripts/dev/districorr-two-institution-map-20261002.ts`
  - `src/__tests__/unit/districorr-staff-ten-case-import.test.ts`
  - `src/__tests__/unit/districorr-two-institution-map.test.ts`
  - `knowledge/specs/DISTRICORR-*`
  - `knowledge/worklog/STAFF_TRAINING_BOOTSTRAP_2026-10-02.md`
  - `knowledge/worklog/TWO_INSTITUTION_MAP_2026-10-02.md`
- **Estado**: **Listo para checkpoint secundario / Herramientas dev**.
- **Mensaje propuesto**: `chore(dev): add districorr demo fixtures and institution mapping scripts`

---

## 3. Registro de Commits Ejecutados

| Hash | Paquete | Archivos | Validaciones | Notas |
| --- | --- | --- | --- | --- |
| `8bde032` | Paquete 1: Cartera / Collections | 16 archivos (página, utilidades, 2 suites tests, specs) | 48 tests vitest PASS | Checkpoint local completado. QA poblada pendiente de sesión DEV. |
| `7698be8` | Paquete 8: Districorr Demo / Seed Scripts | 26 archivos (scripts, manifests, unit tests, specs, worklogs) | 22 tests vitest PASS | Checkpoint local completado. Mapeos de demo y soporte de 10 casos. |
