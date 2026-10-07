# READINESS — Aceptación Operativa Agenda y Stock (HEAD 2138552)

**Fecha**: 2026-10-05  
**Autor**: Antigravity (Frontend/UI)  
**Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`  
**Snapshot auditado**: HEAD `2138552` (`fix(cirugias): resolve surgery type and optional consumption state`)  
**Estado general**: **Casos preparados, ejecución pendiente** (no se afirma aceptación realizada ni persistencia por mera inspección).  
**Exclusiones explícitas**: Mapa geolocalizado (worktree sin commit) y circuito de Cajas / Preparación / Remito (paquete operativo independiente).

---

## 1. Estado de Conexión por Módulo en HEAD

| Módulo | Backend & API | UI / Pantallas en HEAD | Estado de Aceptación |
|---|---|---|---|
| **Agenda Personal (`3933911`)** | • Prisma `PersonalCalendarEvent`<br>• Rutas `/api/companies/[companyId]/personal-events`<br>• `personal-calendar.service.ts`<br>• `src/lib/api/personal-calendar.ts` | **Sin UI conectada en este snapshot**.<br>No existen componentes React en HEAD que consuman `personal-calendar.ts`. | **Aceptación de API / Contratos Backend únicamente**.<br>La aceptación operativa visual queda en pausa hasta el desarrollo de la UI. |
| **Stock & Artículos (`512d95c` + `ba258b7`)** | • Perfiles comerciales y listas de precios<br>• Rutas `/api/companies/[companyId]/stock`, `/articles`, `/price-lists`<br>• Servicios: `stock-ledger.service.ts`, `article.service.ts`, `price-list.service.ts` | **UI Completa Conectada**:<br>• `src/app/stock/page.tsx`<br>• `StockArticleSheet.tsx` (9 pestañas)<br>• `StockColumns.tsx`, `useStock.ts` | **Casos UI + API preparados** (ejecución pendiente con entorno DEV activo). |

---

## 2. Casos Mínimos de Aceptación — Stock

### Caso 1: Listado, Filtros y Paginación (Solo Lectura)
- **Objetivo**: Verificar render de la tabla con datos del ledger/facetas y navegación de páginas.
- **Acciones**:
  1. Navegar a `/stock`.
  2. Verificar conteo total de artículos y render de columnas (Código, Artículo, Categoría, Marca, Disponible, Reservado, Tránsito, Estado, Costo, Precio).
  3. Probar buscador de texto (filtrado por código y nombre).
  4. Probar filtros facetados: Familia (Implantes, Instrumental, etc.), Tipo de Artículo, Marca, Método de trazabilidad.
  5. Probar vistas predefinidas (`STOCK_VIEWS`).
  6. **Paginación**: Con dataset de al menos 26 artículos sintéticos, verificar tamaño de página 25 (Pág 1 con 25 registros, Pág 2 con 1 registro) y navegación entre páginas.
  7. Ordenamiento por cabeceras (ascendente / descendente).
- **Criterio de Aceptación**: Datos responden a las facetas del backend, paginación navega limpiamente y los contadores reflejan el total real.

### Caso 2: Ficha de Artículo y Pestañas Dinámicas (Solo Lectura)
- **Objetivo**: Comprobar apertura de `StockArticleSheet` y navegación entre sus 9 pestañas.
- **Acciones**:
  1. Click en cualquier fila de artículo del listado.
  2. Verificar apertura del sheet lateral con título, código, tipo y badges de estado.
  3. Recorrer las pestañas:
     - **General**: Datos maestros, familia, marca, dimensiones (si es Equipo) o mantenimiento (si es Instrumental).
     - **Identificación**: Código maestro, GTIN, visualización de códigos en `ArticleCodesDialog` (copia, descarga e impresión únicamente).
     - **Stock**: Existencias desglosadas por depósito/lote (`ExistenciasTable`).
     - **Compras**: Proveedor preferido, stock mínimo, costo de reposición.
     - **Comercial**: Tratamiento/alícuota IVA, listas de precios asignadas.
     - **Trazabilidad**: Método de trazabilidad (cantidad, lote, serie, vencimiento).
     - **Cajas**: Visualización de fórmulas/unidades (sin ejecutar operaciones de cajas).
     - **Adjuntos**: Galería de imágenes / documentos técnicos.
     - **Historial**: Tabla de movimientos históricos (`MovimientosTable`).
- **Criterio de Aceptación**: Pestañas cargan sin errores; secciones dinámicas según tipo de artículo responden a `fichaSections`.

### Caso 3: Valores Comerciales desde Backend (Solo Lectura)
- **Objetivo**: Validar que los campos de perfil comercial provienen de la base de datos PostgreSQL y no de mocks.
- **Acciones**:
  1. Abrir pestañas **Compras** y **Comercial**.
  2. Verificar visualización de `minStock`, `costo`, `precio`, `ivaRate` y tratamiento IVA.
  3. Verificar que la tabla de listas de precios cargue los registros desde `/api/companies/[companyId]/price-lists` con sus vigencias e importes.
- **Criterio de Aceptación**: Los valores reflejan la estructura de `ArticleCommercialProfile` y `ArticlePriceVersion`.

### Caso 4: Resiliencia, Accesibilidad y Responsividad (UX)
- **Objetivo**: Garantizar comportamiento en estados de carga, vacío, navegación por teclado y móvil.
- **Acciones**:
  1. **Carga**: Simular retardo; verificar loader (`Loader2`).
  2. **Vacío**: Filtrar por término inexistente; verificar mensaje claro de "Sin resultados" con botón para limpiar filtros.
  3. **Teclado**: Presionar `Escape` para cerrar sheets/diálogos; verificar restauración de foco.
  4. **Móvil**: En viewport móvil (< 768px), verificar adaptabilidad del layout y sheets a pantalla completa.
- **Criterio de Aceptación**: Sin desbordes no controlados, trampas de foco ni estados bloqueantes.

### Caso 5: Mutaciones Reales y Persistencia tras Recarga (Escritura)

| Mutación | Control UI (Path:Line) | Handler UI (Path:Line) | Endpoint API & Guard | Campos Afectados |
|---|---|---|---|---|
| **A. Guardar Perfil Comercial** | Botón `Guardar perfil comercial`<br>`StockArticleSheet.tsx:1840` | `handleSaveCommercial`<br>`StockArticleSheet.tsx:1657` | PATCH `/api/companies/[companyId]/articles/[articleId]`<br>Guard: `requireArticleMutationAccess` (`admin`, `operator`) | `minStock`, `referenceCost`, `referenceSalePrice`, `priceListCode`, `preferredSupplierId`, `leadTimeDays` |
| **B. Guardar IVA** | Botón `Guardar IVA`<br>`StockArticleSheet.tsx:1775` | `handleSaveVat`<br>`StockArticleSheet.tsx:1607` | PATCH `/api/companies/[companyId]/articles/[articleId]`<br>Guard: `requireArticleMutationAccess` (`admin`, `operator`) | `vatTreatment`, `vatRate` |
| **C. Agregar Versión de Precio** | Formulario + Botón `Registrar precio`<br>`StockArticleSheet.tsx:1120` | `handleAddVersion`<br>`StockArticleSheet.tsx:939` | POST `/api/companies/[companyId]/articles/[articleId]/prices`<br>Guard: `requireArticleMutationAccess` (`admin`, `operator`) | `priceListId`, `price`, `currency`, `effectiveAt`, `notes` |
| **D. Crear Lista de Precios** | Modal + Botón `Crear lista`<br>`StockArticleSheet.tsx:1180` | `handleCreateList`<br>`StockArticleSheet.tsx:976` | POST `/api/companies/[companyId]/price-lists`<br>Guard: `requireArticleMutationAccess` (`admin`, `operator`) | `code`, `name`, `description`, `currency` |

- **Criterio de Persistencia**: Tras ejecutar cualquiera de las mutaciones A, B, C o D, realizar recarga forzada del navegador (`F5`) → reabrir la ficha → verificar que los valores actualizados persistan desde PostgreSQL.

---

## 3. Clasificación: Casos de Lectura vs. Mutación

| Caso | Tipo | Impacto en DB | Dataset / Fixture Requerido |
|---|---|---|---|
| **Caso 1: Listado y Paginación** | Solo Lectura | Ninguno (Idempotente) | Al menos 26 artículos sintéticos con stock |
| **Caso 2: Ficha y Pestañas** | Solo Lectura | Ninguno (Idempotente) | Artículo de cada tipo (Equipo, Implante, etc.) |
| **Caso 3: Valores Comerciales** | Solo Lectura | Ninguno (Idempotente) | Artículo con perfil comercial y lista de precios |
| **Caso 4: UX, Vacío y Móvil** | Solo Lectura | Ninguno (Idempotente) | Cualquier estado |
| **Caso 5: Mutaciones Reales** | **Mutación de Datos** | Modifica tablas de Artículos y Precios | **Fixture mutable aislado** (no concurrente) |

---

## 4. Prerrequisitos Exactos de Ejecución en DEV

1. **Servidor Web / Next.js**:
   - Compilado y ejecutándose sobre el commit exacto **HEAD `2138552`**.
   - No asumir que el servidor compartido remoto corresponde a este commit; verificar commit SHA activo.

2. **Migraciones de Base de Datos del Árbol Git (Verificación Estática)**:
   Las migraciones reales existentes en el árbol Git de HEAD `2138552` son:
   - **Baseline histórico**: `prisma/migrations/0_ossum_cor_canonical_baseline`
   - **Agenda (`3933911`)**: `prisma/migrations/20261002110500_add_personal_calendar_events`
   - **Stock Clasificación (`512d95c`)**: `prisma/migrations/20261001135215_add_article_classification_master_fields`
   - **Stock Perfil Comercial (`512d95c`)**: `prisma/migrations/20261001142112_add_article_company_commercial_profile`
   - **Stock Listas de Precios (`512d95c`)**: `prisma/migrations/20261001150132_add_article_price_lists_history`
   - **Stock Min Stock (`512d95c`)**: `prisma/migrations/20261001180000_add_min_stock_to_article_commercial_profile`
   - **Contactos (`1b2145e`)**: `prisma/migrations/20260910120000_contact_address_geography`
   *(Otras migraciones históricas en el árbol: `20261001163000_add_stock_physical_units`, `20261001170000_add_stock_reservations`, `20261001190000_cajas_component_reservations`).*  
   > [!IMPORTANT]  
   > No ejecutar `migrate deploy` sin revisión y autorización explícita de la base de datos descartable de DEV designada.

3. **Sesión Autenticada y Roles Reales**:
   - **Lectura**: Usuario con cualquier membresía activa en la empresa DEV (`requireCompanyReadAccess` / `requireCompanyMembership`).
   - **Mutaciones (Caso 5)**: Usuario con rol `admin` u `operator` (`ARTICLE_MUTATION_ROLES = ["admin", "operator"]` en `src/lib/permissions/article.ts:4`).
   - `storageState` o cookie de sesión válida sin credenciales expuestas en logs.

4. **Dataset y Fixtures Sintéticos en Base de Datos**:
   - Al menos **26 artículos sintéticos** autorizados en la empresa DEV para probar paginación de 25 items.
   - Al menos 1 lista de precios activa asignada.
   - 1 fixture mutable aislado para pruebas de edición de stock mínimo, IVA y precios.

---

## 5. Primer Recorrido Viable (Secuencia Paso a Paso)

1. **Paso 1 (Sanity & Listado)**: Ingresar a `/stock` con usuario `admin` u `operator` → comprobar render de tabla y contadores de facetas del backend.
2. **Paso 2 (Paginación)**: Verificar visualización de los primeros 25 artículos y navegar a la página 2 para constatar el artículo 26.
3. **Paso 3 (Búsqueda & Filtro)**: Filtrar por Familia "Implantes" → verificar que la grilla reduzca las filas acordemente.
4. **Paso 4 (Apertura de Ficha)**: Click en un artículo filtrado → recorrer pestañas *General*, *Stock*, *Comercial*.
5. **Paso 5 (Mutación Controlada de Stock Mínimo)**: En pestaña *Compras/Comercial*, modificar *Stock Mínimo* a `15` y click en `Guardar perfil comercial` (`StockArticleSheet.tsx:1840`).
6. **Paso 6 (Verificación de Persistencia)**: Presionar `F5` → reabrir la ficha del mismo artículo → constatar que *Stock Mínimo* permanece en `15` tras la recarga.
