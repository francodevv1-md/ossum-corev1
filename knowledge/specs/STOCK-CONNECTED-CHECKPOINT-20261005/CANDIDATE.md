# Candidato Conectado de Stock (2026-10-05)

## 1. Resumen de Frontera y Acoplamiento

La UI de Stock (`src/app/stock/page.tsx`, `src/hooks/useStock.ts`, `src/components/stock/StockArticleSheet.tsx` y `src/lib/api/stock.ts`) requiere tipos, facetas y datos de perfiles comerciales generados en el backend.

Para evitar commits rotos contra `HEAD` (`2540980`), el paquete completo se estructura en **tres capas interdependientes** que deben entregarse de forma ordenada o conjunta:

```
[Capa 1: Schema Prisma & Migraciones]
          │
          ▼
[Capa 2: Backend Services, Validadores & API Routes]
          │
          ▼
[Capa 3: Clientes API, Hooks, UI & Suites de Tests]
```

---

## 2. Componentes Exactos del Candidato

### Capa 1: Modelos Prisma y Migraciones SQL (Orden Obligatorio)

1. **`prisma/migrations/20261001135215_add_article_classification_master_fields/`**
   - Agrega a la tabla `article`: `category`, `pm_anmat`, `is_sterile`, `unit_buy`, `storage_condition`, `temperature_min`, `temperature_max`, `disposable_type`, `implant_type`.
2. **`prisma/migrations/20261001142112_add_article_company_commercial_profile/`**
   - Crea tabla `article_company_commercial_profile` (`id`, `companyId`, `organizationId`, `articleId`, `referenceCost`, `referenceSalePrice`, `currency`, `priceListCode`, `preferredSupplierId`, `leadTimeDays`, timestamps).
   - FKs a `Company`, `article` y `ContactCompanyLink` (proveedor preferido).
3. **`prisma/migrations/20261001150132_add_article_price_lists_history/`**
   - Crea tablas `price_list` y `article_company_price_version` para versionado histórico de listas de precios.
4. **`prisma/migrations/20261001180000_add_min_stock_to_article_commercial_profile/`**
   - Agrega columna `minStock` (DECIMAL 18,4 default 0) a `article_company_commercial_profile`. *(Nota: `minStock` no está en la migración inicial de perfil comercial; requiere esta migración específica).*
5. **`prisma/schema.prisma`** (Hunks correspondientes a los 3 modelos):
   - Modelos: `ArticleCompanyCommercialProfile`, `PriceList`, `ArticleCompanyPriceVersion`.
   - Campos agregados en modelo `Article`: `commercialProfiles`, `priceVersions`, `category`, `pmAnmat`, `isSterile`.
   - Campos agregados en modelo `Company`: `articleCommercialProfiles`, `priceLists`, `articlePriceVersions`.

---

### Capa 2: Backend Services, Validadores y Rutas API

1. **`src/lib/services/stock-ledger.service.ts`** (Hunks específicos):
   - **Export de tipo**: `export interface StockFacets { families: string[]; brands: string[]; articleTypes: string[]; }`.
   - **Facetas en `getStockAvailability`**: Extracción de `families`, `brands` y `articleTypes` desde `eligibleArticles`; retorno de `facets` en la respuesta y filtrado en memoria por facetas seleccionadas.
   - **Inclusión de perfil comercial**: Inclusión de `commercialProfiles` (con join a `preferredSupplier.contact`) en `getStockAvailability` y `getArticleStockDetail`.
   - **Mapeo de datos en detalle**: Retorno de `cost`, `price`, `priceListCode`, `preferredSupplier`, `leadTimeDays`, `minStock` y objeto estructurado `commercialProfile`.
   - *Exclusiones explícitas de este archivo*: Se excluyen cambios de recepción OC (ya committeados en `1d33a49`), reservas de cajas y trazabilidad de despachos.
2. **`src/lib/services/article.service.ts`**:
   - Funciones `createArticle`, `updateArticle`, `getArticleById`, `searchArticles`, `resolveArticleIdentifier` con soporte para perfil comercial y clasificación (`formatCommercialProfile`).
3. **`src/lib/services/price-list.service.ts`**:
   - Servicio completo de gestión de listas de precios y versionado de precios por artículo.
4. **`src/lib/validators/article.ts`**:
   - Schemas: `articleCommercialProfileSchema`, `articleCommercialProfileUpdateSchema`, y campos `category`, `pmAnmat`, `isSterile`, `commercialProfile` en `articleCreateSchema` y `articleUpdateSchema`.
5. **`src/lib/validators/price-list.ts`**:
   - Schemas para listas de precios y versiones de precios.
6. **Rutas API**:
   - `src/app/api/companies/[companyId]/articles/[articleId]/prices/`
   - `src/app/api/companies/[companyId]/price-lists/`

---

### Capa 3: Clientes API, Hooks, UI y Modelos de Presentación

1. **`src/lib/api/stock.ts`**:
   - Export de `StockFacets`, agregado de `facets` a `StockAvailabilityResponse` y enriquecimiento de `ArticleStockDetailResponse` con `commercialProfile`, `minStock`, `cost`, `price`, `leadTimeDays`, `preferredSupplier`.
2. **`src/lib/api/articles.ts`** y **`src/lib/api/price-lists.ts`**:
   - Clientes API tipados para perfiles comerciales y precios.
3. **`src/hooks/useStock.ts`**:
   - Estado de `facets` y memoización de query con soporte de paginación.
4. **`src/lib/stock/stock-ui-model.ts`**:
   - Tipos de presentación UI, helpers de formato (`fmtDate`, `fmtQty`) y estilos visuales de familias.
5. **`src/app/stock/page.tsx`**:
   - Vista de tabla de stock, paginación nativa cliente (25/50/100, Chevron, conteo de registros), toolbar con filtros dinámicos por facetas y menú contextual.
6. **`src/components/stock/StockArticleSheet.tsx`**:
   - Ficha modal completa con navegación por pestañas: General, Datos Maestros, Precios/Comercial, Stock/Existencias, Movimientos/Historial y Trazabilidad.
7. **Componentes auxiliares y limpiezas**:
   - `src/components/stock/StockArticleTabs.tsx`
   - `src/components/stock/StockColumns.tsx`
   - `src/components/stock/ArticleCodesDialog.tsx`
   - `src/components/stock/CajasPhysicalUnitsSection.tsx`
   - Eliminación de componentes mock/legacy: `BoxFicha.tsx`, `PlantillaFicha.tsx`, `ResolveDifferenceDialog.tsx`, `StockArticleView.tsx`, `src/data/stock-mock.ts`.

---

## 3. Pruebas Unitarias y de Componentes por Módulo

### Pruebas Backend & Servicios:
- `src/__tests__/unit/stock-ledger-facets.test.ts` (Cálculo de facetas y filtrado dinámico).
- `src/__tests__/unit/article-master-classification.test.ts` (Campos de clasificación maestra en artículos).
- `src/__tests__/unit/article-company-commercial-profile.test.ts` (Validación y persistencia de perfiles comerciales).
- `src/__tests__/unit/article-price-lists-history.test.ts` (Listas de precios y versiones históricas).

### Pruebas UI & Componentes:
- `src/__tests__/unit/stock-page-pagination.test.tsx` (Paginación de tabla de stock).
- `src/__tests__/unit/stock-page-actions.test.tsx` (Acciones y apertura de sheets/diálogos).
- `src/__tests__/unit/stock-accessibility-responsive.test.tsx` (Accesibilidad y responsiveness).
- `src/__tests__/unit/stock-new-article-honesty.test.tsx` (Comportamiento de alta de artículos).
- `src/__tests__/unit/stock-performance.test.tsx` (Rendimiento de renderizado).
- `src/__tests__/components/StockArticleSheet.actions.test.tsx` (Acciones de ficha de artículo).
- `src/__tests__/components/StockArticleSheet.history.test.tsx` (Historial de movimientos en ficha).
- `src/__tests__/components/StockArticleSheet.image.test.tsx` (Visualización de imágenes).
- `src/__tests__/components/StockArticleSheet.master-data.test.tsx` (Solapa de datos maestros).
- `src/__tests__/components/StockArticleSheet.traceability.test.tsx` (Solapa de trazabilidad).
- `src/__tests__/components/StockArticleSheet.vat.test.tsx` (Tratamiento impositivo IVA en ficha).

---

## 4. Estrategia y Mensajes de Commit Propuestos

### Opción A: Paquete Integral Conectado (Recomendado para evitar commits intermedios con tipos incompletos)
- **Mensaje**: `feat(stock): add commercial profile, price lists, dynamic facets and complete article sheet UI`
- **Archivos**: Capas 1, 2 y 3 juntas (migraciones + backend services + UI + 15 suites de tests).

### Opción B: Dos Commits Secuenciales
1. **Commit 1 (Backend & Schema)**: `feat(stock): add article commercial profile, price lists schema and facet calculation` (Capas 1 y 2).
2. **Commit 2 (Frontend UI)**: `feat(stock): add article detail sheet tabs, dynamic facets UI and pagination` (Capa 3).

---

## 5. Ownership y Bloqueos Pendientes

- **Lock compartido en Schema**: `prisma/schema.prisma` contiene actualmente cambios de Agenda Personal (`PersonalCalendarEvent`) siendo revisados por GPT2.
- **Acción requerida**: Aguardar la finalización/commit del checkpoint de Agenda Personal para que `prisma/schema.prisma` quede libre de conflictos antes de aislar el schema de Stock.
