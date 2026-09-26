# REPO_MAP.md — Mapa concreto del repo

Estado: vigente (reescrito 2026-07-07, DOC-027F.0C-SANEO)  
Tipo: mapa para ahorrar tokens; basado en lectura real del repo (no en planificación).

> No reemplaza CodeGraph/Graphify. Es mapa humano-curado. Para diagnóstico profundo del circuito y decisiones ver `docs/ia-autorizaciones/PLAN_CONTINUIDAD_REAL_OSSUM_COR.md`.

---

## Stack y dependencias principales

- **Next.js 16** (App Router + API Routes; `--webpack` build).
- **React 19**, TypeScript 5, Tailwind CSS 4 (con `tailwindcss-animate`, `tw-animate-css`).
- **shadcn/ui** + **Radix UI** primitives (~50 componentes en `src/components/ui/`).
- **Prisma 7.8** (`@prisma/client` + `@prisma/adapter-pg` + `pg` Pool).
- **Supabase** (`@supabase/supabase-js`) para PostgreSQL gestionado + Auth + Storage.
- **Zustand 5** + persist middleware como capa UI/mock (transición del prototipo, no fuente final).
- **TanStack Query 5** + **TanStack Table 8** (data fetching y tabla de cirugías).
- **react-hook-form** + **zod 4** para formularios y validación client.
- **framer-motion** para motion. **date-fns** para fechas. **recharts** para gráficos. **lucide-react** para iconos.
- **AWS SDK S3** client para R2 storage (recibos digitales).
- **googleapis** para Gmail OAuth (mail stage1).
- **Vitest 4** + **@testing-library/react** + **jsdom** + **Playwright** para testing.
- **next-themes**, **next-intl**, **sonner** (toasts), **react-day-picker**, **react-syntax-highlighter**, **sharp**, **yjs**, **MDX editor**, **dnd-kit**, **react-resizable-panels**, **input-otp**, **cmdk**, **unique-names-generator**, **uuid**.

> Nota: `next-auth` está declarado como dependencia pero no es la auth activa; la auth vigente es Supabase JWT + `getApiAuthContext`. `zustand` se mantiene como cache UI provisional.

---

## Scripts npm relevantes

| Script | Comando | Uso |
|---|---|---|
| `dev` | `next dev --hostname 127.0.0.1 --port 3000` | Dev server multiplataforma, limitado a loopback para QA local. |
| `build` | `next build --webpack` | Build Next.js (no Vite/Turbopack). |
| `typecheck` | `next typegen && tsc --noEmit` | Gen types + check TS. |
| `lint` | `eslint .` | Lint whole repo. |
| `test` | `vitest run` | Test suite completa. |
| `test:watch` | `vitest` | Tests en watch. |
| `test:unit` | `vitest run --include 'src/__tests__/unit/**'` | Solo unit. |
| `db:push` | `prisma db push` | Push sin migraciones. |
| `db:generate` | `prisma generate` | Regenera Prisma Client. |
| `db:migrate` | `prisma migrate dev` | Crea y aplica migración. |
| `db:reset` | `prisma migrate reset` | Reset destructivo. |
| `db:seed` | `prisma db seed` (`tsx prisma/seed.ts`) | Seed multiempresa. |

**Forbidden commands** (sin Task Brief + aprobación Franco): `db:migrate`, `db:reset`, `db:push`, instalación de dependencias.

---

## Rutas de la app (páginas)

Lista completa de `src/app/**/page.tsx` (46 rutas + 2 rutas de recibo público anidadas; agrupadas por dominio):

### Generales / Sistema
- `/` (`src/app/page.tsx`)
- `/login`
- `/configuracion`
- `/roles`
- `/auditoria` (vista de `AuditEvent`)
- `/notificaciones` (bandeja de `InternalNotification`)

### Cirugías / Expediente
- `/cirugias` (módulo principal, mock-driven)
- `/cirugias-api` (vista técnica read-only, consume `GET surgeries`)
- `/expediente` (Expediente unificado con tabs)

### Coordinación / Calendario
- `/coordinadores`
- `/coordinadores/mi-bandeja` (inbox del coordinador)

- `/calendario`
- `/tablero`
- `/tableros-operativos`
- `/estadisticas`
- `/reportes`

### Contactos / Catálogos
- `/contactos`
- `/instrumentadores`
- `/clasificaciones`
- `/documentacion`

### Logística / Stock / Movimientos
- `/remitos`
- `/consumo`
- `/stock`
- `/cajas`
- `/logistica`
- `/material-transito`
- `/vencimientos`
- `/trazabilidad`

### Ventas
- `/ventas/comprobantes`
- `/ventas/facturacion`
- `/ventas/cobros`
- `/ventas/presupuestos`
- `/ventas/pendientes-facturar`
- `/ventas/notas-credito`
- `/ventas/notas-debito`
- `/ventas/recibos` (lista de recibos digitales)
- `/ventas/recibos/nuevo` (alta de recibo)
- `/ventas/recibos/[receiptId]` (detalle)
- `/ventas/recibos/publico/[token]` (vista pública firmable, sin auth)
- `/ventas/recibos/publico/[token]/final` (post-firma)

### Compras
- `/compras/proveedores`
- `/compras/ordenes-compra`
- `/compras/movimientos`
- `/compras/ordenes-pago`
- `/compras/facturas-compra`
- `/compras/necesidades-compra`
- `/compras/forecast`

---

## API surface (`src/app/api/**/route.ts`)

> Toda ruta bajo `/api/companies/[companyId]/` pasa por `getApiAuthContext(request, companyId)` y guards `requireCompanyReadAccess` / `requireCompanyMutationAccess(roles)`.

### Compañía-Scoped (`/api/companies/[companyId]/`)
- **Me / Auth**: `/me` (GET — usuario actual, rol, empresa activa desde `AuthProvider`).
- **Audit**: `/audit-events` (GET, paginación).
- **Mentionable users**: `/mentionable-users` (GET — usuarios disponibles para menciones).
- **Contacts**: `GET|POST /contacts`, `PATCH /contacts/[contactId]` con `AuditEvent`.
- **Surgeries**:
  - `GET /surgeries` (list company-scoped, `surgeryReadSelect` enriquecido con patient/doctor/institution).
  - `GET /surgeries/[surgeryId]`, `PATCH /surgeries/[surgeryId]/status`.
  - `POST /surgeries/ai-extract` (autorización IA stateless).
  - `GET|PUT /surgeries/view-preferences` (preferencia activa de columnas por usuario+empresa).
  - `POST /surgeries/legacy-sync` (sincronización mock→backend controlada por allowlist).
- **Seguimiento**: `GET|POST /surgeries/[surgeryId]/seguimiento`, `PATCH /surgeries/[surgeryId]/seguimiento/[entryId]`.
- **Operational notifications** por cirugía: `/surgeries/[surgeryId]/notifications/operational`.
- **Mail links** (correo): `/surgeries/[surgeryId]/mail-links` list/POST, `/mail-links/[linkId]` (GET/DELETE), `refresh`, `attachments/persist`, `attachments/[attachmentId]/download`.
- **Mailbox conversations**: `/surgeries/[surgeryId]/mailbox/conversations`, conversations/[externalConversationId]/attachments/[attachmentId]/preview, `/extract-text`.
- **Notifications internas**: `/notifications` (list), `/notifications/[notificationId]/read`, `/notifications/read-all`, `/notifications/unread-count`.
- **Digital receipts** (Under `/digital-receipts` y `/digital-receipts/[receiptId]`):
  - List / creation: `GET|POST /digital-receipts`.
  - Defaults plantilla: `GET /digital-receipts/defaults`.
  - GET/PATCH/details: `/[receiptId]`.
  - Issue (emisión): `/[receiptId]/issue`.
  - Artifacts: `/[receiptId]/artifact`, `/[receiptId]/artifacts`.
  - Events (timeline propio): `/[receiptId]/events`.
  - Accesses (reissue): `/[receiptId]/accesses/[accessId]/reissue`, `/[receiptId]/accesses/[accessId]`.

### Admin (`/api/admin/`)
- `/admin/mail/gmail/auth` (inicia OAuth Gmail).
- `/admin/mail/gmail/callback` (OAuth callback).
- `/admin/mail/gmail/disconnect`.
- `/admin/mail/gmail/status`.
- `/admin/mail/orphan-links` (reporte de conversaciones mail linkeadas a cirugías inexistentes).

### Public (`/api/public/`)
- `/public/digital-receipts/[token]/sign` (firma token-only, sin auth).
- `/public/digital-receipts/[token]/artifact` (descarga de adjunto de recibo público).

### Root
- `/` (Hello World).

---

## Capas de dominio lib

### `/src/lib/store.ts` — Zustand store global
- Estado mock del circuito V1: cirugías, presupuestos, remitos V1/V2, consumos, devoluciones, comprobantes, cobros, imputaciones, stock, stockMovements, boxes, traceEntries (slice muerto), logisticsDetails, materialTransito, documentChecklists, notes legacy, historial, etc.
- Persistencia en `localStorage` (`window.localStorage` explícito; ver fix Node v25 en worklog 2026-06-04).
- NO es fuente final; es capa UI/caché provisional durante la migración a backend.

### `/src/types/index.ts` — tipos base de dominio (énfasis lock crítico)
Centraliza tipos UI (`Contacto`, `Surgery`, `Remito`, `Consumo`, `Comprobante`, `Cobro`, `Factura`, etc.). Sensible: cada cambio propaga a varios componentes.

### `/src/lib/services/` — servicios server-side
- `audit-event.service.ts`
- `branch.service.ts`
- `company.service.ts`
- `contact.service.ts` (mutations con `AuditEvent`)
- `internal-notifications.service.ts`
- `legacy-surgery-sync.service.ts` (allowlist `CX-0001..CX-0008`, `CX-0009` soportado pero no seedeado → mismatch)
- `mentionable-users.service.ts`
- `organization.service.ts`
- `seguimiento.service.ts` (sin `AuditEvent` — gap vs `AUDIT_EVENT_POLICY.md`)
- `surgery.service.ts` (`surgeryReadSelect` Prisma enriquecido)
- `surgery-view-preferences.service.ts` (Prisma `findUnique` + `upsert`)
- `user.service.ts`

### `/src/lib/services/ai/` — IA autorización (stateless)
- `autorizacion-extractor.ts`, `autorizacion-note.ts`.
- `config.ts`, `file-validation.ts`.
- `prompts/autorizacion-prompt.ts`.
- `providers/`: `mock-provider.ts`, `openai-provider.ts`, `openrouter-provider.ts` (`gemini`/`anthropic`/`local` declarados en `types.ts` pero NO registrados en `provider-factory.ts` → 501).
- `utils/parse-json-response.ts`, `utils/provider-factory.ts`.
- `types.ts` — tipo unión `AIProviderName` con 6 valores (factory implementa 3).

### `/src/lib/api/` — infraestructura API + adapters
- `auth-context.ts` — `getApiAuthContext(request, companyId)` (Supabase JWT + fallback DEV `x-ossum-actor-user-id`).
- `guards.ts` — `requireCompanyReadAccess`, `requireCompanyMutationAccess(roles)`; roles inline por servicio (no centralizado en `permissions/*`).
- `responses.ts`, `errors.ts` — helpers de respuesta HTTP.
- `query.ts` — centraliza pagination/query parsing.
- `client.ts` — `apiFetch` helper (Bearer + manejo de errores).
- `backend-surgeries.ts` — fetch cirugías desde backend hacia UI.
- `contact-adapter.ts` — mapping API↔frontend Contacto.
- `seguimiento-adapter.ts` — mapping Seguimiento API↔UI.
- `surgery-adapter.ts` — mapping payload raw Surgery→fila UI mínima (vista `/cirugias-api`).
- `notifications.ts`, `operational-notifications.ts`, `mentionable-users.ts` — API clients.
- `auth-context.ts` + `supabase/server.ts` — admin client con `SERVICE_ROLE_KEY`.

### `/src/lib/validators/` — validación server-side
- `autorizacion-ai.ts`
- `mail-stage1.validator.ts`
- `seguimiento.validator.ts`
- `surgery-status.ts` (en `src/lib/validators/surgery-status.ts`)
- `surgery-view-preferences.validator.ts`

### `/src/lib/digital-receipts/` — módulo Recibos Digitales (R2)
- `service.ts`, `public-service.ts`, `snapshot-service.ts`, `access-service.ts`, `audit.ts`, `events.ts`.
- `repository.ts` + `repositories/{accesses,artifacts,events,receipts,snapshots}.repository.ts` + `mappers.ts`, `shared.ts`, `index.ts`.
- `numbering.ts` (numeración serial).
- `public-preview-session.ts` (vista pública firmable).
- `storage.ts`, `storage.r2.ts`, `storage.types.ts`, `storage.keys.ts`, `storage.config.ts` (R2 storage).
- `download-artifact.ts`, `client.ts`, `contracts.ts`, `errors.ts`, `types.ts`, `ui.ts`, `validators.ts`.

### `/src/lib/mail-stage1/` — módulo Correo (Gmail OAuth, persistencia FS)
- `service.ts`, `repository.ts`, `evidence-store.ts`, `orphan-link-report.ts`, `permissions.ts`, `types.ts`.
- `_provider/provider.ts` abstraction: `provider-factory.ts`, `provider/types.ts`, `provider/gmail-mail-provider.ts`, `provider/mock-mail-provider.ts`.
- `gmail/connection-manager.ts`, `gmail/token-store.ts` (tokens AES-256-GCM en FS), `gmail/types.ts`.
- Nota: persistencia FS under `.runtime/mail-stage1/` (no portable entre nodos; deuda para producción).

### `/src/lib/surgery/` — surgery helpers
- `resolve-company-surgery.ts` (assert surgery pertenece a companyId).
- `legacy-sync.ts`.

### `/src/lib/` (root) — helpers de negocio
- `circuit-progress.ts` (display-only; no muta estado).
- `businessRules.ts` (e.g. `canAutorizarFV`).
- `automations.ts` (mapa aspiracional `getNextState`/`runAutomations`; mapa NO es el flujo real).
- `cirugias.constants.ts`, `cirugias.utils.ts` (`getFacturacionStatus`), `cirugias.types.ts`.
- `cobros.constants.ts`, `cobros.utils.ts` (`getSaldoPendiente` matches por `Comprobante.number` — leak cross-cirugía).
- `comparativa.*`, `consumos.*`, `facturacion.*`, `presupuestos.*`, `contacts.constants.ts`, `idGenerators.ts`, `formatters.ts`, `dateUtils.ts`, `shared-constants.ts`, `statusHelpers.ts`, `tenant.ts`, `audit.ts`, `contact-code.ts`, `consumoValidation.ts`.
- `presupuesto-pdf.utils.ts`, `presupuesto-pdf.types.ts`.
- `expediente-navigation.ts` (helpers de navegación de expediente).
- `db.ts` (singleton Prisma VIEJO sin adapter — riesgo doble pool vs `prisma.ts`); `prisma.ts` con `PrismaPg` adapter.

### Otras lib
- `src/lib/supabase/server.ts`, `src/lib/auth/client.ts`.
- `src/lib/mentions/types.ts`, `src/lib/mentions/utils.ts` (menciones en seguimiento/recibos).
- `src/lib/recibos-digitales.mock.ts` (legacy mock).

---

## Componentes (organizados por feature folder)

### `src/components/cirugias/` (27 archivos)
Lista canónica de Cirugías (módulo primal, mock-driven). Includes: `CirugiasTable`, `CirugiasToolbar`, `CirugiasAdvancedFilters`, `DateFiltersPopover`, `CirugiaRow`, `SmartSurgerySearch`, `CirugiasSearch`, `CirugiaActionsCell`, `CirugiaStatusCell`, `CirugiaPreparationCell`, `CircuitProgressCell`, `CirugiaOperationalBadges`, `ActiveFilterChips`, `ViewCustomizationDialog`, `ColumnVisibilityMenu`, `AiResultsPanel`, `AiUploadZone`, `MaterialAutorizadoDetails`, `MissingCountText`, `MissingFieldsBar`, `ResumenRapido`, `PostCreationPanel`, `ReferenciasAdministrativasEditor`, `ReportsAndDocumentsDialog`, `CirugiasEmptyState`, `CirugiasModuleBar`, `CirugiaContextInspector`.  
Subfolder: `dialogs/NewSurgeryDialog.tsx` (>1140 líneas con integración IA).

### `src/components/expediente/` (31 archivos)
Expediente tabs y paneles del detalle de cirugía. Key: `ExpedienteFullView`, `ExpedienteHeader`, `FichaTabContent`, `FichaCirugia`, `ComercialTabContent`, `LogisticaTabContent`, `NovedadesTabContent` (server-backed por API seguimiento), `ConsumoPanel` (lógica embebida — deuda refactor), `TrazabilidadPanel` (lógica embebida `buildTraceRows` — deuda), `RemitosPanel`, `PresupuestoPanel`, `MaterialTransitoPanel`, `InstrumentadorPanel`, `HistorialPanel`, `DocumentacionPanel`, `DocumentacionTrazabilidadTab`, `NotasPanel` (legacy), `ComprobantesAsociados`, `LogisticaPanel`, `EditFichaDrawer`, `ExpedienteMacroTimeline`, `ExpedienteReferencesStrip`, `ExpedienteStatusChips`, `ResumenExpediente`, `ServerBackedFeatureBlockedState`, `ExpedientePreview*` (5 archivos).  
Subfolder: `correo/` (`ExpedienteCorreoTab`, `CorreoConversationList`, `CorreoConversationDetail`, `CorreoAttachmentList`, `CorreoEmptyState`, `MailTextViewer`, `AttachConversationModal`, `ImportEvidenceFromMailModal`, `mail-summary.ts`).

### `src/components/coordinadores/` (5 archivos)
`CoordinatorInboxView`, `CoordinatorCaseTrackingPreview`, `CoordinatorManagementDialog`, `CoordinatorShareDialog`, `coordinator-queue.helpers.ts`.

### `src/components/notifications/` (4 archivos)
`NotificationsInbox`, `NotificationListItem`, `NotificationStateSurface`, `notificationAppearance.ts`.

### `src/components/recibos/` (6 archivos)
Recibos digitales server-backed (alta, lista, detalle, firma pública, voucher, status). `receipt-create-flow.tsx`, `receipt-list-view.tsx`, `receipt-detail-view.tsx`, `receipt-public-signing.tsx`, `receipt-status.tsx`, `receipt-voucher-card.tsx`.

### `src/components/presupuestos/` (10 archivos)
Form dialog + submodals (`ArticleSelectorModal`, `ClasificacionSelectorModal`, `ImportSubmodal`, `CondicionesSection`, `DatosComercialesSection`, `LeyendaPresupuestoSection`, `PresupuestoItemsTable`, `SurgerySelector`, `TemplateSelector`, `TotalesSection`).

### `src/components/facturacion/` (4 archivos)
`BaseFacturacionSelector`, `DiferenciasPopup`, `FacturarDialog`, `ResumenEconomico`.

### `src/components/remitos/` (2 archivos)
`RemitoFormDialog`, `PreparacionPedidoDialog`.

### `src/components/layout/` (6 archivos)
`app-shell.tsx`, `main-layout.tsx`, `sidebar.tsx`, `header.tsx`, `UserMenu.tsx`, `ShellUtilityMenus.tsx`.

### `src/components/auth/` (3 archivos)
`AuthGuard.tsx`, `AuthProvider.tsx`, `LoginForm.tsx`.

### `src/components/shared/` (2 archivos)
`mentions/MentionComposer.tsx`, `index.tsx`.

### `src/components/ui/` (50+ archivos)
Primitives shadcn/Radix (`button`, `dialog`, `dropdown-menu`, `table`, `tabs`, `form`, `popover`, `select`, etc.) + `StoreHydration.tsx` + `theme-provider.tsx`.

---

## Prisma (schema.prisma + migraciones)

### 21 modelos (prisma/schema.prisma, 578+ líneas)
Multiempresa base:
- `Organization`, `Company`, `Branch`, `User` (con `supabaseAuthId`), `UserCompanyAccess`.

Contactos:
- `Contact` (unificado: firstName/lastName opcional + `legalName`/`isCompany`), `ContactCompanyLink`, `ContactGroup`, `ContactGroupMembership`, `ContactAddress`.

Cirugía:
- `Surgery` (visibleNumber, payerContactId, cxStatus/prepStatus como String, classification, description, priority, fechas probableDate/scheduledDate/performedDate/cancelledDate, source).
- `SurgeryContactAssignment` (roles flexibles por cirugía).

Preferencias:
- `UserModuleViewPreference` (vista persistida por usuario+empresa+modulo).

Notificaciones:
- `InternalNotification` (inbox + mentions internally).

Recibos digitales (5 modelos):
- `DigitalReceipt`, `DigitalReceiptAccess`, `DigitalReceiptEvent`, `DigitalReceiptSnapshot`, `DigitalReceiptArtifact`.

Seguimiento:
- `SeguimientoEntry` (entry types: note, authorization_evidence, file_photo_evidence, mail_evidence).

Auditoría central:
- `AuditEvent` (entityType, entityId, action, old/new value Json, module).

> Sin enums rígidos: roles, tipos, estados y catálogos como `String` (regla `DATA_MODEL_RULES.md`).

### Migraciones (prisma/migrations/, 6 carpetas)
- `20260606063628_init_backend_foundation` (12 tablas).
- `20260615153000_surgery_phase1_core` (Surgery enriquecida + SurgeryContactAssignment).
- `20260629110404_add_seguimiento_entry`.
- `20260701142201_add_digital_receipts` (5 modelos Recibos).
- `20260703113000_add_user_module_view_preference_history`.
- `20260703133500_add_internal_notifications_mentions`.

> `migration_lock.toml` con provider `postgresql`.

---

## Hooks (`src/hooks/`)

- `useCirugiaActions.ts` (acciones cirugía; `handleFacturar`/`handleFacturarConDatos` doble handler).
- `useCirugiasFilters.ts`, `useCirugiasSorting.ts`, `useCirugiaSelection.ts` (locks críticos).
- `useColumnVisibility.ts` (server-first view preference con fallback local + migración one-shot).
- `useExpedientePreview.ts`, `useConsumo.ts`, `useComparativa.ts`, `usePresupuestoForm.ts`.
- `useSeguimientoFeed.ts` (loading/error/refetch/addNote).
- `useNotifications.ts`.
- `useMailLinkedConversations.ts`.
- `useBackendActiveSurgeries.ts`.
- `useAiExtraction.ts`.
- `use-toast.ts`, `use-mobile.ts`.

---

## Core intensivos (archivos sensibles con lock)

Ver `AGENTS.md` §10. Resumen:

| Riesgo | Archivos |
|---|---|
| Lock obligatorio / muy alto | `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `prisma/seed.ts`, `src/types/index.ts`, `src/app/cirugias/page.tsx`, `src/components/cirugias/*`, `src/hooks/useCirugiaActions.ts`, `src/hooks/useCirugiasFilters.ts`, `src/hooks/useCirugiaSelection.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`, `src/lib/cirugias.constants.ts`, `src/lib/cirugias.utils.ts` |
| Alto riesgo / coordinar por carpeta | `src/app/api/*`, `src/lib/services/*`, `src/lib/validators/*`, `src/lib/permissions/*` (NO existe aún), `src/components/expediente/*`, `src/components/operational-boards/*`, `src/app/coordinadores/page.tsx`, `src/app/calendario/page.tsx` |

> `src/lib/db.ts` y `src/lib/prisma.ts` coexisten (dos singletons Prisma — deuda técnica T1 del plan de continuidad).

---

## Estado de tests (`src/__tests__`)

- Cobertura real para: notificaciones immersion, mail, recibos, cirugias table, comparativa utils, mail-summary, mentions-utils.
- Smoke técnica del endpoint `/api/companies/[companyId]/me` y auth matrix 8/8 DEV.
- Frameworks: Vitest + Testing Library + jsdom + Playwright (E2E).
- Estado último reportado: 44 files, 849+ tests pasados (worklog 2026-06-29). No se garantiza verde sin `npm test` (no se corrió en DOC-027F.0C-SANEO — prohibido tocar runtime).

---

## Navegación sensible

- `/cirugias` (`src/app/cirugias/page.tsx`): mock-driven con fallback local. Refactor prohibido sin Task Brief.
- `/expediente` (`src/app/expediente/page.tsx`): tabs server-backed (Novedades, Logs Correo) vs mock (Ficha, Comercial, Logística, Consumo, Trazabilidad, Documentación, Remitos, Presupuesto).
- `/cirugias-api`: solo técnica, no enlazada en sidebar.
- `/coordinadores/mi-bandeja`: coordinador inbox (server-backed notifications).
