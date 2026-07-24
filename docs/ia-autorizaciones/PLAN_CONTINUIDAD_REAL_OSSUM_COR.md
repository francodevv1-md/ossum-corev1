# PLAN_CONTINUIDAD_REAL_OSSUM_COR.md

Estado: diagnóstico + plan de continuidad, generado el 2026-07-06
Autor: Gentle-AI Orchestrator (read-only, sin modificar código)
Fuente: contraste entre documentación (`knowledge/`, `docs/ia-autorizaciones/`) y estado real del repo (working tree vigente).
Principio: los documentos son contexto y memoria histórica, no verdad absoluta. La verdad operativa está en el código.

---

## 1. Resumen ejecutivo del estado actual

OSSUM COR hoy es un ERP quirúrgico con un **frontend Next.js avanzado** en el que TODO el circuito canónico existe como **estado local Zustand + localStorage persistido y seeded con mocks**, más un **backend progresivo en Prisma/PostgreSQL/Supabase** que ya cubre slices puntuales reales: contactos, cirugía, seguimiento, notificaciones internas, recibos digitales, mail stage1 (en FS) e IA de autorización (stateless).

**Persistido server-side (real):** Contactos, Cirugía/N.° visible/asignaciones de contacto/estados/fechas, Seguimiento, Notificaciones internas, Auditoría, Recibos digitales (+ R2), Mail stage1 (en filesystem, no Prisma), IA autorización (stateless).

**Sin backend (Zustand mock + utils/constants frontend):** Presupuesto, Pedido/Preparación, Remito, Consumo, Devolución, Comparativa, Documentación genérica, Factura, Cobro, Stock/Movimientos/Cajas, Logística, Trazabilidad, NC/ND, Proveedores/Compras.

**El circuito canónico está cubierto en backend hasta Cirugía + laterales (seguimiento, recibos, mail); el resto del flujo (Presupuesto → Presupuesto → Remito → Consumo → Devolución → Comparativa → Facturación → Cobro) NO existe server-side.**

**Auth:** Supabase JWT + mapeo `supabaseAuthId → User.id interno (cuid)`, con fallback DEV solo fuera de producción. Operativo en DEV; no está cerrado productivamente pero el patrón está consolidado.

**Riesgos núcleo:**
- Tres fuentes de verdad frontend para hechos críticos (componentes, store, helpers), lógica de dominio embebida en presentadores.
- Doble `Remito` (V1 por boxes vs V2 por presupuesto) con back-writes inconsistentes.
- Imputaciones de cobro matchean por `Comprobante.number` (string), no por id → leak cross-cirugía si dos cirugías comparten número.
- Dos sistemas de notas paralelos (legacy `notes` vs server `seguimiento`) que divergen.
- Dos singletons Prisma (`db.ts` y `prisma.ts` con adapter `PrismaPg`) coexisten → riesgo de doble pool.
- Migración de slices a backend no puede hacerse en un paso; requiere decisión de modelo de Remito unificado.
- Doc maestro legacy (2766 líneas, formato roto) sigue citado como fuente #1 pero AGENTS dice no cargarlo por defecto; ADR-027E vive duplicada y divergente en dos ubicaciones.

**No implementé código. No modifiqué archivos.** Este plan es accionable y conservador: mantener lo que ya funciona, ordenar la doc, y construir el resto del circuito backend de forma incremental sin reescribir Cirugías.

---

## 2. Qué documentación fue revisada

### knowledge/
- `core/`: `PROJECT_BRIEF.md`, `CANONICAL_DECISIONS.md`, `CURRENT_STATE.md`, `REPO_MAP.md`, `GLOSSARY.md`, `KNOWLEDGE_INDEX.md`
- `domain/`: `SURGERY_EXPEDIENTE.md`, `CENTRAL_OPERATIONAL_FLOW.md`, `PRESUPUESTOS.md`, `PREPARACION_REMITOS_CONSUMO.md`, `FACTURACION_COBROS.md`, `FISCAL_BOUNDARY_TUSFACTURAS.md`, `STOCK_CAJAS_TRAZABILIDAD.md`, `CONTACTS_MASTER.md`, `COMPRAS_PROVEEDORES.md`, `SURGERY_DB_DESIGN.md`
- `architecture/`: `ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md`, `BACKEND_FOUNDATION_PLAN.md`, `DATA_MODEL_RULES.md`, `MULTI_COMPANY_ACCESS.md`, `AUDIT_EVENT_POLICY.md`
- `workflow/`: `AGENT_WORKFLOW.md`, `QUALITY_GATES.md`, `HANDOFF_TEMPLATE.md`, `TASK_BRIEF_TEMPLATE.md`, `GUARDRAILS.md`, `AI_GENTLE_STACK.md`, `ENGRAM_POLICY.md`, `SESSION_*_CHECKLIST.md`
- `worklog/`: `WORKLOG.md`, `OPENCODE_CRASH_HANDOFF_2026-06-25.md`
- `specs/`: revisión por índice (existentes specs: GPT-027F.0, SURGERY_DB_PHASE1, EXPEDIENTE-FICHA-CX-V2, EXPEDIENTE-FICHA-CX-UNIFIED-P1, NUEVA-CIRUGIA-IA-UX-P1/P2, CIRUGIAS-DATATABLE-VISUAL-P1, MAIL-V1-ETAPA1/ETAPA3, SEGUIMIENTO-B2-REAL, COORDINADORES-ADMIN-REDESIGN-PHASE1-DESIGN, COMPARTIR-CIRUGIA-WHATSAPP-DESIGN, MI-BANDEJA-COORDINACION-PHASE1-DESIGN, CONTACTO-CODIGO-AUTO-P1)

### docs/ia-autorizaciones/
- `PROYECTO_CONTEXTO_MAESTRO (1).md` (legacy, 2766 líneas)
- `OSSUM COR - Configuracion del Proyecto y Entorno IA.md`
- `ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` (copia con addendums)
- `OSSUM_COR_Doc_Tecnica_Modulo_IA_Autorizaciones.md`
- `OSSUM_COR_Plan_Reconstruccion_Modulo_IA_Autorizaciones.md`
- `PLAN_ARQUITECTURA_IA_MULTI_PROVIDER.md`
- `PLAN_IMPLEMENTACION_IA_AUTORIZACIONES.md`
- `FASE_A_EXPLORACION_WIZARD_REAL.md`
- `Diccionario del Circuito Districorr.md` (vacío, 0 bytes)

### Paralelamente al docs: verificación en código (read-only)
- `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`
- `src/lib/store.ts`, `src/types/index.ts`, `src/lib/circuit-progress.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`, `src/lib/cirugias.utils.ts`, `src/lib/cirugias.constants.ts`
- `src/hooks/useCirugiaActions.ts`
- `src/app/*/page.tsx` (todas las rutas)
- `src/components/expediente/*`, `src/components/cirugias/*`
- `src/lib/services/*`, `src/lib/digital-receipts/*`, `src/lib/mail-stage1/*`, `src/lib/surgery/*`, `src/lib/api/*`, `src/lib/validators/*`

---

## 3. Qué partes parecen vigentes

| Documento / regla | Estado | Por qué |
|---|---|---|
| `AGENTS.md` (reglas madre, multiagent policy, locks, prohibiciones) | VIGENTE | Sigue siendo el rector operativo; coincide con el resto de knowledge. |
| `knowledge/core/PROJECT_BRIEF.md` | VIGENTE | Define el "qué" sin contradecir al repo. |
| `knowledge/core/GLOSSARY.md` | VIGENTE | Concuerda con dominio y código. |
| `knowledge/domain/SURGERY_EXPEDIENTE.md` (dos dimensiones CX/prep) | VIGENTE | Reflejado en schema (`cxStatus`, `prepStatus` como String). |
| `knowledge/domain/CONTACTS_MASTER.md` | VIGENTE | Reflejado en `Contact`, `ContactCompanyLink`, `ContactGroup`, `ContactAddress`. |
| `knowledge/domain/FISCAL_BOUNDARY_TUSFACTURAS.md` (límite fiscal) | VIGENTE | Regla clara y consistente: backend-only, nunca núcleo; sin integración productiva. |
| `knowledge/architecture/DATA_MODEL_RULES.md` | VIGENTE | Coincide con `String` no-enum, contactos separados, multiempresa. |
| `knowledge/architecture/MULTI_COMPANY_ACCESS.md` | VIGENTE | Reflejado en `Organization/Company/Branch/User/UserCompanyAccess`. |
| `knowledge/architecture/AUDIT_EVENT_POLICY.md` | VIGENTE | `AuditEvent` existe y se usa en contactos/cirugía. |
| `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` (decisión técnica V0) | VIGENTE (pre-addendum) | ADR base confirmada por addendum 2026-06-15. |
| `knowledge/workflow/AGENT_WORKFLOW.md` y `QUALITY_GATES.md` | VIGENTE | Consistente con AGENTS. |
| `knowledge/worklog/WORKLOG.md` | VIGENTE | Cubre de 0A a 2026-07-03, pero con entradas no cronológicas (verificación pendiente). |
| Reglas de dominio canónicas: presupuesto versionable, remito≠consumo, devolución validable, comparativa, base de factura, cobro imputable, IDs (interno+visible), stock transversal con movimientos, auditoría transversal | VIGENTE (como intención) | No contradichas por código; son azul a implementar. |

---

## 4. Qué partes parecen proyectadas o desactualizadas

1. **`AGENTS.md` / `CANONICAL_DECISIONS.md` — secuencia "0A→0B→5A bloqueante"**: el worklog muestra 0A/0B cerrados y 5A ejecutado. La prohibición "hasta cerrar 0A/0B no tocar schema" sigue listada como vigente pero **ya no describe la realidad**.
2. **`knowledge/core/REPO_MAP.md`**: placeholder con secciones "Pendiente". Valor real: cero, genera tokens muertos.
3. **`knowledge/architecture/BACKEND_FOUNDATION_PLAN.md`**: dice "primer schema limitado a ~12 modelos" — el schema real tiene **21 modelos** (`SurgeryContactAssignment`, `InternalNotification`, 5×`DigitalReceipt*`, `SeguimientoEntry`, `UserModuleViewPreference` no mencionados).
4. **`docs/ia-autorizaciones/PROYECTO_CONTEXTO_MAESTRO (1).md`**: 2766 líneas con markdown roto (encabezados escapados con `\#`), corpus legacy. AGENTS lo cita como fuente #1 pero prohíbe cargarlo por defecto — contradicción operativa. Es un fósil.
5. **`docs/ia-autorizaciones/OSSUM_COR_Doc_Tecnica_Modulo_IA_Autorizaciones.md`**: describe sandbox con `z-ai-web-dev-sdk`; el código real migró a factory `mock`/`openrouter`/`openai`. "Operativo en Sandbox" ya no describe el estado.
6. **`docs/ia-autorizaciones/OSSUM_COR_Plan_Reconstruccion_Modulo_IA_Autorizaciones.md` y `PLAN_ARQUITECTURA_IA_MULTI_PROVIDER.md`**: "reconstrucción desde cero" y correcciones de enum cerrado, pero el módulo YA está implementado y más evolucionado en `src/lib/services/ai/*`.
7. **`docs/ia-autorizaciones/PLAN_IMPLEMENTACION_IA_AUTORIZACIONES.md`**: "migraciones bloqueadas por 0A/0B" — obsoleto.
8. **`docs/ia-autorizaciones/FASE_A_EXPLORACION_WIZARD_REAL.md`**: fija líneas absolutas (348-633) sobre `NewSurgeryDialog` que ya creció (>1140 líneas con integración IA).
9. **`docs/ia-autorizaciones/Diccionario del Circuito Districorr.md`**: vacío (0 bytes).
10. **`knowledge/domain/PRESUPUESTOS.md`, `PREPARACION_REMITOS_CONSUMO.md`, `FACTURACION_COBROS.md`, `STOCK_CAJAS_TRAZABILIDAD.md`, `COMPRAS_PROVEEDORES.md`**: reglas canónicas vigentes, pero **PROYECTADAS** porque ningún modelo equivalente existe en `schema.prisma`.
11. **`knowledge/specs/GPT-027F.0/*`**: spec de reconstrucción documental/con entorno. 0A/0B ya cerrados (ver ADR addendum), el spec es histórico.

---

## 5. Conflictos detectados entre documentación y código

| # | Conflicto | Detalle |
|---|---|---|
| C1 | Secuencia 0A/0B bloqueante en AGENTS vs worklog real | AGENTS lista "no tocar schema hasta 0A/0B" como prohibición vigente; el worklog muestra migraciones,(schema), auth, API ya ejecutados. La prohibición ya describe una etapa clausurada. |
| C2 | ADR-027E duplicada y divergente | Existe en `knowledge/architecture/` y en `docs/ia-autorizaciones/` con contenido distinto (la copia de docs tiene addendums de 5A-00B y Surgery Phase 1; la de knowledge no). No está marcada cuál es autoritativa. |
| C3 | Contexto Maestro como "fuente #1" vs AGENTS "no cargar por defecto" | KNOWLEDGE_INDEX lo marca 1° en jerarquía; AGENTS.lista "no cargar por defecto". Doueble bind operativo para agentes. |
| C4 | `Remito` V1 (box-driven) vs Remito V2 (presupuesto-driven) en store | `generateDeliveryNoteFromOrder` (V1) escribe `surgery.remitoId` y estado `En tránsito`. `createRemito` (V2) NO escribe nada a surgery. Dos caminos de creación, back-writes inconsistentes → etapa `nr` del circuito frágil. |
| C5 | `traceEntries` slice declarado pero muerto | Siempre `[]`, nunca escrito. Trazabilidad UI deriva rows from box/remito/consumo in-componente. Dos modelos paralelos. |
| C6 | `consumo ↔ remito` linkage lossy | `createConsumptionFromDeliveryNote` copia items pero NO setea `consumo.remitoId` (el tipo lo soporta). Imposible reconstruir origen confiablemente. |
| C7 | Dos sistemas de notas paralelos | `NotasPanel` (legacy `notes` slice) vs `NovedadesTabContent` (API + `seguimiento.service`). Ambos presentes en expediente; divergen según punto de entrada. |
| C8 | Tres fuentes de verdad para "cirugía facturable" | `canAutorizarFV` (businessRules), `getFacturacionStatus` (utils) y `ExpedienteHeader.pendiente`. Renombrar un string rompe los otros. |
| C9 | `automations.ts` linear map aspiracional | Mapa `Pendiente → Autorizada → En preparación → En tránsito → Realizada → Finalizada` NO es el flujo real. "En preparación" solo se alcanza por `changeSurgeryStatus`; "Sin consumo" declarado pero nunca producido. Mapa y realidad divergen. |
| C10 | `getSaldoPendiente` matchea Factura por `Comprobante.number` (string) | Si dos cirugías comparten número, imputaciones se cruzan. Riesgo de data leak cross-cirugía. |
| C11 | `handleFacturar` vs `handleFacturarConDatos` | Dos handlers de facturación en `useCirugiaActions`. El simple escribe monto 0 y loguea warning → riesgo de factura en cero si wiring mal enlaza handler equivocado. |
| C12 | `db.ts` vs `prisma.ts` (Prisma`pPg` adapter) | Dos singletons Prisma coexistiendo (uno con adapter `PrismaPg`, otro sin). Rutas usan `prisma.ts`; `db.ts` queda. Riesgo de doble pool/agotamiento de conexiones. |
| C13 | Permisos centralizados inexistentes | AGENTS dice "permisos multiempresa centralizados". NO existe `src/lib/permissions/*`. Roles允许(`SURGERY_MUTATION_ROLES`, etc.) están inline por servicio. Cumple espíritu, no forma. |
| C14 | `cxStatus`/`prepStatus` como String por regla `DATA_MODEL_RULES` (no enum rígido) | Decisión deliberada pero con"strings mágicos" distribuidos → si cambia un catálogo, se rompe en runtime no en compile. |
| C15 | Auditoría漏 en Seguimiento y Recibos | Seguimiento muta sin `AuditEvent`; Recibos usa `DigitalReceiptEvent` (timeline propio) no volcado al `AuditEvent` central. `AUDIT_EVENT_POLICY.md` lista "seguimiento" y "remito" como criticables. |
| C16 | `Diccionario del Circuito Districorr.md` vacío en `docs/` | 0 bytes. Generra tokens/indexación muertos. |
| C17 | Mismatch `legacy-sync` allowlist vs seed | `allowlist` soporta `CX-0009` pero `seed.ts` crea `CX-0001..CX-0008` (sólo 8). `CX-0009` soportado pero no seedeado. |
| C18 | `ContactAddress` sin `companyId` directo | Scoping depende de aserción previa `assertContactBelongsToCompany`. Índice/constraint previene leak cross-tenant por `contactId` — ausente. |
| C19 |MAIL stage1 persistido en FS | `repository.ts` + `token-store.ts` viven en `.runtime/mail-stage1/`. No portable entre nodos; válido para stage1, deuda para producción. |
| C20 | AI providers `gemini`/`anthropic`/`local` en tipo pero NO en factory | `AIProviderName` enum/unión incluye 6 valores; `provider-factory.ts` registra 3 (`mock`,`openai`,`openrouter`). Llamadas restantes → `ai_provider_not_implemented` (501). |

---

## 6. Mapa real del circuito actual

Circuito canónico documentado:
```
Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro
        ↳ Stock/Cajas/Trazabilidad (transversal)        ↳ Compras (transversal)
```

Mapa real (lo que efectivamente existe y dónde vive):

| Etapa | Frontend/store | Backend (Prisma+API) | Wiring real entre módulos | Estado cierre punta a punta |
|---|---|---|---|---|
| Contactos | `contactos` slice (mock legacy) + page | **REAL** Contact+links+groups+addresses, auth, audit | `surgery.service` resuelve y aserta contactos; `contact.service` | Backend real; store como fallback |
| Cirugía/Expediente | `surgeries` slice (mock), Expediente tabs, circuit-progress | **REAL** Surgery+assignments+visibleNumber+estados+fechas, auth, audit | `useCirugiaActions.handleNewSurgery` hace POST API + seed local (híbrido) | Backend real, store como capa de UI sobre mocks |
| Presupuesto | `presupuestos` slice + versionado logic en store actions | **MISSING** | `createBudgetForSurgery`, `createBudgetVersion`, `generateOrderFromBudget` wirean a comprobante PE en store | ONLY local; sin backend |
| Preparación/Pedido | `notes` (preparacion_pedido) + `logisticsDetails` slice + `addPreparacionPedido`/`confirmPreparacionPedido` | **MISSING** | `changePreparationState` espeja surgeryPrepState↔logistics | ONLY local |
| Remito | `remitos` slice **duplicado** (V1 box-driven que back-writea surgery.remitoId+state; V2 presupuesto-driven que NO back-writea) | **MISSING** | Caminos separados, inconsistentes | ONLY local, fragmentado |
| Consumo | `consumos` slice + `createConsumptionFromDeliveryNote` (mirrors items, NO set remitoId) + `validateConsumption` | **MISSING** | Linkage lossy con remito; `markConsumoAsFacturado` lo conecta a factura (en store) | ONLY local, eyelink roto |
| Devolución | `devolverRemito` muta items y estado de remito | **MISSING** | Solo muta remito en store | ONLY local, sin entidad propia |
| Comparativa | Utils/constants solo frontend; sin entidad store | **MISSING** | Calculo ad-hoc en componentes | NO IMPLEMENTADO como entidad |
| Documentación | `documentChecklists` slice + auto-status recompute; adjuntar/ver archivos son toast placeholders; Adjuntos reales solo en recibos | **MISSING** (excepto Recibo digital firmable via R2) | `updateDocumentationChecklist` muta checklist | Mixto: ficha local, firma solo recibo |
| Facturación | `comprobantes` slice FV + `authorizeInvoice` que set `surgery.facturado`, crea FV, marca consumo Facturado | **MISSING** (sin integración TusFacturasAPP productiva) | `handleFacturar`/`handleFacturarConDatos` (riesgo de monto 0) | ONLY local, sin backend, sin fiscal |
| Cobro | `cobrosV2` + `imputaciones` slice; `createCobroConImputaciones`, `addImputacionCobro`; `getSaldoPendiente` | **MISSING** | Match por `Comprobante.number` (string) — leak cross-cirugía | ONLY local, fiscalment e sin motor |
| Stock | `stock`, `stockMovements`, `boxes` slice | **MISSING** (BACKEND_FOUNDATION_PLAN lo dejó fuera) | Movimientos solo en store | ONLY local |
| Logística | `logisticsDetails`, `materialTransito` slice (con fallback derivado de remitos) | **MISSING** | `changePreparationState`/`changeLogisticsStatus` | ONLY local |
| Trazabilidad | `traceEntries` slice **muerto (siempre `[]`)**; UI deriva rows de box/remito/consumo | **MISSING** | `buildTraceRows` en componente | NO IMPLEMENTADO (modelo store dead) |
| Compras | `proveedores`, `necesidadesCompra`, `ordenesCompra`, `movimientosCompra`, `ordenesPago`, `facturasCompra`, `forecast` slice | **MISSING** | `convertNecesidadToOC` wired en store | ONLY local |
| Novedades/Seguimiento | `notes` legacy slice EN PARALELO a API | **REAL** `SeguimientoEntry` + service + API + menciones + notificaciones | Doble sistema que diverge | Backend real, store legado debe depreparse |
| Notificaciones | (sin slice store) | **REAL** `InternalNotification` + service + API + inbox/dropdown UI | "Operacionales" emitidos desde EditFichaDrawer | Backend real |
| Recibos digitales | `recibos-digitales.mock.ts` (legacy) | **REAL** 5 modelos + service + R2 storage + firma pública | End-to-end operativo server-side | Backend real |
| Mail (Correo) | (sin slice store) | **REAL en FS** + Gmail OAuth (tokens AES-256-GCM en FS) | Linkea conversaciones a cirugías | Backend FS, deuda portable |
| IA Autorización | (sin store) | **REAL** service stateless + providers mock/openai/openrouter + integrado en `NewSurgeryDialog` | Output → `SeguimientoEntry`/Wizard | Backend real pero stateless; gemini/anthropic/local sin registrar |
| Auth | `useAuth` + `activeCompany` driver | **REAL** Supabase JWT + `getApiAuthContext` + roles inline | Activa Cirugías como híbrido | DEV operativo |
| Auditoría | `historyEntries` slice (local) | **REAL** `AuditEvent` en cirugía y contactos; gap en seguimiento/recibos | Doble via | Backend real parcial |

**Conclusión del mapa:** el backend está real para Cirugía + laterales (auth, contactos, seguimiento, notificaciones, recibos, mail, IA, auditoría). Para el **circuito troncal** Post-Cirugía (Presupuesto→Cobro) **no hay backend**. Tampoco para los transversales (Stock/Logística/Trazabilidad/Compras).

---

## 7. Mapa objetivo recomendado desde este punto

Mantener la regla canónica pero con un corolario de implementación incremental:

1. **Backend real fuente de verdad progresiva.** Cada etapa del circuito migra a Prisma + service + API + validators + permisos + auditoría; el slice Zustand correspondiente se convierte en caché de UI / DTO provisional mientras la migración avanza, y eventualmente se depreca.
2. **No reescribir Cirugías.** Mantener `/cirugias` y Expediente como están; conectarlos al backend por endpoints nuevos sin refactor abierto.
3. **Unificar Remito V1/V2** a un solo modelo antes de persistir remito (decisión blocking).
4. **Trazabilidad deriva de eventos persistidos**, no del slice `traceEntries` (killlo al migrar remito/consumo/devolución a backend).
5. **TusFacturasAPP permanece backend-only como motor fiscal futuro**, nunca en frontend, nunca como núcleo del ERP; persistencia operativa de factura/cobro vive en OSSUM COR primero.
6. **Permissions/validators centralizados** en `src/lib/permissions/*` y `src/lib/validators/*` respetando el patrón existente; eliminar roles inline por servicio al final de cada fase.
7. **Auth consolidado como arquitectura final** después del work DEV (Supabase productivo con fallback DEV apagado).
8. **Storage decidido**: artefactos grandes en R2 (ya usado por recibos) se mantiene; documentación genérica yAdjuntos sigue en R2; tokens mail y repos mail migran a Prisma cuando stage1 cierre.
9. **Auditoría uniforme** para cirugía, seguimiento, remito, consumo, factura, cobro (con `oldValue/newValue`).
10. **Doc saneada** en paralelo: consolidar ADR, achicar AGENTS sobre las prohibiciones caducadas, archivar el Contexto Maestro legacy, completar `REPO_MAP.md`, borrar `Diccionario del Circuito Districorr.md` vacío.
11. **Sin Prisma desde componentes React**, sin lógica crítica en componentes; refactor menor de `ConsumoPanel`/`TrazabilidadPanel`/`ExpedienteFullView` para sacarles lógica de dominio a hooks/services en el mismo paso que les da backend.

---

## 8. Tabla de módulos

| Módulo | Estado real | Madurez | Dependencia | Riesgo | Próximo paso |
|---|---|---|---|---|---|
| Auth (Supabase) | REAL backend | MEDIA (DEV) | `User`, `UserCompanyAccess`, `getApiAuthContext` | MEDIO — fallback DEV, sin confirmación productiva | Cerrar plan productivo (Supabase en prod, apagar fallback, ADR Auth final) — requiere Franco |
| Contactos | REAL backend + UI API | ALTA | `Contact`, `ContactCompanyLink`, grupos, addresses | BAJO — scoping `ContactAddress` sin companyId directo | Endurecer `ContactAddress` con índice/constraint; mover roles a `permissions/*` |
| Cirugía / Expediente | REAL backend + UI híbrida (mock-store fallback) | MEDIA-ALTA | `Surgery`, `SurgeryContactAssignment`, visibleNumber serial | MEDIO — `/cirugias` lista sigue mock-driven; dos dimensiones de estado correctas | NO refactor; alimentar tabla desde API incremental (read server-first por bands) luego migrate create/edit |
| Presupuesto | MOCK local (Zustand versionable) | BAJA | `presupuestos` slice | MEDIO — versionado real, sin backend | Diseñar modelo Prisma (`Presupuesto`, `PresupuestoVersion`, items) y API; migrar store actions |
| Preparación / Pedido | MOCK local (`notes` + `logisticsDetails`) | BAJA | `notes` slice | MEDIO — solapamiento legacy notes vs seguimiento | Modelar pedido/preparación (PreparacionPedido + items + estado); separar de notas |
| Remito | MOCK LOCAL FRAGMENTADO (V1+V2) | BAJA | `remitos` slice duplicado | ALTO — wiring back-write inconsistente | **Unificar Remito** (decisión de diseño) antes de cualquier backend; luego modelo + service |
| Consumo | MOCK local + linkage remito lossy | BAJA | `consumos` slice | ALTO — `consumo.remitoId` nulo | Modelar Consumo + items + linkage obligatorio a Remito; regla "cada consumo a un remito" |
| Devolución | MOCK local (muta remito) | BAJA | `remitos` | ALTO — estado ítem persistido en remito | Decidir si es entidad propia (`DevolucionItem` por consumo) o parte de remito; modelar |
| Comparativa | NO IMPLEMENTADO (utils solo) | NULA | — | BAJO | Surge sola cuando remito/consumo/devolución estén persistentes (vista derivada) |
| Documentación | MOCK local + adjuntos toast placeholders | BAJA | `documentChecklists` | MEDIO — no hay almacenamiento real de adjuntos | Definir `SurgeryDocument` + storage R2; checklist con auditoría. Recibo digital ya cubierto como subset |
| Facturación | MOCK local + sin motor fiscal | BAJA | `comprobantes` slice | ALTO — dos handlers; sin backend; sin CAE | Diseñar `Invoice`/`InvoiceItem` con campo `base` (presupuesto/consumo/manual); mantener TFAPP solo como futuro |
| Cobro | MOCK local (imputaciones con string match) | BAJA | `cobrosV2`, `imputaciones` | ALTO — leak cross-cirugía | Modelar `Payment` + `Imputation` con FK a Factura por id, no por número |
| Stock / Movimientos / Cajas | MOCK local | NULA | `stock`, `stockMovements`, `boxes` | MEDIO — scope post-facturación | Modelar `Item`, `StockMovement`, `Box` (cajas postergadas a fase posterior) — después del circuito troncal |
| Logística | MOCK local | BAJA | `logisticsDetails` | BAJO | Modelar tras remito (logística deriva de envíos/remitos) |
| Trazabilidad | MUERTA (`traceEntries=[]`) | NULA | derivada in-componente | MEDIO — modelo dead | Eliminar slice; derivar de eventos persistentes tras remito/consumo/devolución |
| Novedades / Seguimiento | REAL backend + STORE LEGADO paralelo | ALTA backend / MEDIA UI | `SeguimientoEntry` | MEDIO — dual con `notes` legacy | Deprecar `NotasPanel` (legacy) en favor de Novedades; agregar `AuditEvent` a mutación |
| Notificaciones internas | REAL backend | ALTA | `InternalNotification` | BAJO | Desactivar emisión local; consolidar emitters desde nuevos módulos |
| Recibos digitales | REAL backend + R2 | ALTA | 5 modelos `DigitalReceipt*` | BAJO | Volcar `DigitalReceiptEvent` a `AuditEvent` central; rate-limit en endpoints públicos |
| Mail (Correo) | REAL backend en FS | MEDIA | FS `.runtime/mail-stage1`, Gmail OAuth | MEDIO — tokens no portables entre nodos | Migrar repositorio y tokens a Prisma/Supabase Storage en etapa posterior; indexar conversaciones por companyId |
| IA Autorización | REAL stateless + UI integrada | MEDIA | providers mock/openai/openrouter | MEDIO — `gemini`/`anthropic`/`local` sin registrar | Decidir provider productivo; persistir resultados en `SurgeryAuthorization/SurgeryDocument` futuro (requiere ADR) |
| Auth context / Tenant / Audit | REAL backend | ALTA | `getApiAuthContext`, `tenant.ts`, `audit.ts` | BAJO-MEDIO — permisos inline | Centralizar permisos en `permissions/*`; nunca dejar rutas sin companyId scoping |
| Coordinadores / Calendario / Tableros / Documentación dashboard | MOCK local UI real | BAJA | `surgeries` slice derivado | BAJO | Cerrar tras Cirugía read server-first (UI consume API en vez de store) |
| Compras / Proveedores | MOCK local | NULA | store slices | BAJO | Posterior a circuito troncal |
| Tests | Cobertura real para notifs immersion, mail, recibos, cirugias table | MEDIA | `__tests__` extensos | BAJO | Asegurar tests por cada nuevo módulo backend |

---

## 9. Brechas funcionales principales

- F1. **No existe entidad Presupuesto persistida.** Versionado lógica solo en store; sin API, sin service, sin modelo.
- F2. **No existe entidad Remito persistida.** Dos formas incompatibles en store; wiring back-write fragmentado.
- F3. **No existe entidad Consumo persistida.** Linkage a remito no guardado; validación/edición son placeholders en UI.
- F4. **No existe Devolución propia.** Estado muta sobre items del remito (acción en store), sin auditar.
- F5. **Comparativa no es entidad ni vista materializada.** Solo cálculo ad-hoc en helpers/componentes.
- F6. **No existe Factura persistida.** Sin motor fiscal; handlers dobles con riesgo de monto 0.
- F7. **No existe Cobro/Imputación persistida.** Match por número de Factura → leak cross-cirugía.
- F8. **Sin almacenamiento de adjuntos de documentación de cirugía** (recibo digital ya es subconjunto resuelto).
- F9. **Doble sistema de notas** (legacy `notes` vs `seguimiento` API) — divergencia operativa.
- F10. **Trazabilidad store dead**; sin trazabilidad de eventos persistidos.
- F11. **`/cirugias` lista sigue mock-driven** — cirugías reales del backend solo visibles en `/cirugias-api`.
- F12. **Coordinadores/Calendario/Tableros** derivan de mocks; cualquier métrica es ilusoria hasta migrar fuente.
- F13. **Compras sin backend** (necesidades→OC→movimientos dónde la OC covers circuito troncal).
- F14. **Menciones/roles en seguimiento** requieren `UserCompanyAccess` correcto y coherente con Auth productivo.

---

## 10. Brechas técnicas principales

- T1. **Dos singletons Prisma** (`db.ts` sin adapter vs `prisma.ts` con `PrismaPg`) → riesgo doble pool.
- T2. **Permisos no centralizados** (`permissions/*` inexistente; roles inline por servicio) → deuda guardrail AGENTS.
- T3. **Lógica de dominio embebida en componentes**: `ConsumoPanel.computeFaltantes`, `TrazabilidadPanel.buildTraceRows`, `RemitosPanel.openRemitoPrint`/`escapeHtml`, `ExpedienteFullView` orquesta legacy-sync API + bloqueo.
- T4. **Doble handler de facturación** con warning de monto 0.
- T5. **Imputaciones match por string** (`Comprobante.number`).
- T6. **Circuit progress sin estado real** (es display-only; no muta estado); `automations.ts` aspiracional.
- T7. **`traceEntries` slice muerto** (interface declarada, nunca poblado).
- T8. **`consumo.remitoId` no guardado** en `createConsumptionFromDeliveryNote`.
- T9. **`ContactAddress` sin îndice companyId** → riesgo leak cross-tenant.
- T10. **Seguimiento muta sin `AuditEvent`** (CONFLICTO con `AUDIT_EVENT_POLICY.md`).
- T11. **Recibos digitales** usan `DigitalReceiptEvent` propio en vez del `AuditEvent` central.
- T12. **Mail stage1 en FS** → no portable entre nodos; requiere migración a Prisma/Storage para producción.
- T13. **AI providers `gemini`/`anthropic`/`local` declarados pero no implementados** → 501.
- T14. **`legacy-sync` allowlist mismatch**: `CX-0009` soportado pero no seedeado (mock solo 1-8).
- T15. **`shared-constants.ts`** referencia colores/etiquetas pero no fue validado como contrado único.
- T16. **`runAutomations`/`getNextState`** — caller map no confirmado; mapa no enforced.
- T17. **`contactGroups` population implícita** (`[]` inicial + comentario prometiendo runtime population; no `set` en store).
- T18. **Auth fallback DEV** `x-ossum-actor-user-id` solo fuera de prod → requiere apagarse en prod (env check).
- T19. **Endpoints públicos de recibo digital** sin rate-limit/mitigación abuso.
- T20. **Worklog no cronológico** → perdés entradas intermedias por scan headings.

---

## 11. Riesgos críticos

- R1. **Seguir creciendo sobre Zustand ciego al backend en remito/consumo/factura/cobro** amplifica las brechas de linkage (C4, C5, C6, C10). Cada nueva feature sobre mock endurece la migración.
- R2. **`getSaldoPendiente` por número de comprobante** puede mezclar saldos entre cirugías si se comparten números — ya,latente.
- R3. **Doble handler facturación** + wiring flexible → riesgo de factura en cero persistida como válida.
- R4. **`db.ts` vs `prisma.ts`** → doble pool de conexiones real en runtime bajo carga.
- R5. **`ExpedienteFullView` con orquestación de API de legacy-sync** → si se rompe el servicio, se bloquean tabs server-backed en cualquier cirugía.
- R6. **Permisos inline** → riesgo de auth-bypass al agregar nueva ruta sin respetar el patrón (sin verificacion regresiva).
- R7. **Mail FS en prod** → pérdida de tokens OAuth / conversaciones linkeadas al reiniciar/replegar.
- R8. **`legacy-sync` allowlist sin fences claros** → tocar los entries expande sincronización mock a base real sin control; sync incorrecto puede ensuciar Surgery/Contact productivos.
- R9. **Documentación desactualizada** guía a agentes hacia proyecciones viejas (Sequence 0A/0B, Contexto Maestro, BACKEND_FOUNDATION_PLAN limitado).
- R10. **Refactor prematuro de Cirugías** podría romper UX ya validada sin reemplazo backend previsto.
- R11. **Storage tipo grande sin ADR** (R2 ya elegido para recibo) → si documentación/adjuntos requieren polarización,Con omisión puede llevar a mixes incompatibles.

---

## 12. Orden recomendado de trabajo

Principio: cerrar atrás primero (saneamiento doc + desdup de Remito), luego construir el **circuito troncal post-Cirugía** en backend progresivamente, manteniendo Cirugías inmutable salvo lectura.

1. **Doc cleanup (0-1 sprint, paralelo, sin tocar código):** consolidar ADR-027E (single source en `knowledge/architecture/`), archivar Contexto Maestro legacy a `archive/`, completar `REPO_MAP.md`, borrar `Diccionario del Circuito Districorr.md` vacío, corregir `AGENTS.md` para marcar 0A/0B como cerrados y prohibiciones caducas, marcar `BACKEND_FOUNDATION_PLAN.md` como histórico y crear `BACKEND_PHASE2_PLAN.md`.
2. **Decisiones bloqueantes que Franco debe confirmar (ver §15):** Remito unificado V1/V2, Auth productivo, Storage, Facturación tal cual sin TFAPP, persistencia de IA autorización, migración `/cirugias` lista desde API.
3. **Backend Remito unificado** (modelo, service, API, validators, perms, audit, migration) — SOLO después de aprobación de diseño unificado.
4. **Backend Consumo + Devolución** + linkage `remitoId` obligatorio + `markConsumoAsFacturado` migrado.
5. **Backend Presupuesto** + versionado + convert to PE (Pedido) wireando a comprobante server-side.
6. **Backend Facturación** + Cobro/Imputación con FK por id (no string), campo `base`, sin TFAPP aún.
7. **Comparativa** como vista derivada de entidades persistentes (sin entidad propia).
8. **Cirugías `/cirugias` lista read server-first** por bands (sin refactor UI, solo fuente de datoscita).
9. **Refactor mínimo de lógica de dominio a hooks/services**: `ConsumoPanel`, `TrazabilidadPanel`, `ExpedienteFullView` (orquestación legacy-sync).
10. **Stock/Movimientos transversal** (cajas postergadas).
11. **Compras/Proveedores** transversal.
12. **Mail stage1 → Prisma/Storage** + tokens portable; Seguimiento + AuditEvent; Recibos + AuditEvent; eliminar `notes` legacy.
13. **AI autorización persistente** + providers restantes (gemini/anthropic/local decididos).
14. **Auth productivo + apagar fallback DEV + ADR Auth final.**

---

## 13. Roadmap por fases

### Fase 0 — Saneamiento doc + decisions (1 sprint, paralelo al resto)
- Consolidar ADR-027E a single source en `knowledge/architecture/`.
- Archivar `PROYECTO_CONTEXTO_MAESTRO (1).md` a `knowledge/archive/legacy-pre-v2/`.
- Completar/reescribir `REPO_MAP.md` con estado real.
- Borrar `Diccionario del Circuito Districorr.md` vacío.
- Editar `AGENTS.md` §11 para marcar "no tocar schema/auth/etc" como protectiva post-cierre 0A/0B (decision-based gate, no sequence gate).
- Marcar `BACKEND_FOUNDATION_PLAN.md` como histórico; crear `BACKEND_PHASE2_PLAN.md` con circuito troncal.
- Reordenar `WORKLOG.md` cronológicamente.

### Fase 1 — Backend circuito troncal (4-6 semanas, después de decisions de §15)
- **1A Remito unificado** — modelo + service + API companies-scoped + audit + perms + validator + migration. Reemplazar V1 y V2 en store por DTO provisional en paralelo a API.
- **1B Consumo + Devolución** — idem. Fix linkage `consumo.remitoId`. Eliminar mutación estado del remito; crear `DevolucionItem`.
- **1C Presupuesto** — `Presupuesto`+ `PresupuestoVersion` + items. Convert to PE (Pedido) wireado a `Comprobante` server-side.
- **1D Facturación + Cobro/Imputación** — `Invoice`+items con `base`; `Payment`+`Imputation` FK por id; sin TFAPP aún.
- **1E Comparativa** — vista derivada (api endpoint) sin modelo propio.

### Fase 2 — Cirugías read server-first + refactor mínimos (1-2 semanas)
- `/cirugias` lista consume API por bands (filtros + tabla). Sin tocar Expediente UI.
- Refactor de mínima: sacar lógica de `ConsumoPanel`, `TrazabilidadPanel`, `ExpedienteFullView` a hooks/services.

### Fase 3 — Transversales (post-circuito troncal, paralelizable con cuidado)
- **3A Stock/Movimientos** (cajas postergadas).
- **3B Logística** derivada de remitos.
- **3C Trazabilidad** derivada de eventos persistidos; eliminar `traceEntries` slice.
- **3D Compras/Proveedores**.

### Fase 4 — Consolidación + Auth productivo + IA persistente
- **4A Mail stage1 → Prisma/Storage** portable; `notes` legacy deprecated por `seguimiento`.
- **4B Auth productivo** (Supabase prod, apagar fallback DEV, ADR Auth final).
- **4C IA autorización persistente** (`SurgeryAuthorization`/`SurgeryDocument` con storage), providers completos.
- **4D Centralizar permisos** en `src/lib/permissions/*` y deprecar roles inline.
- **4E Eliminar `db.ts` singleton** migrando a `prisma.ts` único.
- **4F Auditoría uniforme** (Seguimiento, Recibos → `AuditEvent` central).

### Fase 5 — TusFacturasAPP (futuro) — solo tras facturación operativa
- Integración backend-only especificada en ADR nueva. Nunca como núcleo.

---

## 14. Qué NO hacer todavía

1. **No tocar `prisma/schema.prisma` sin Task Brief + aprobación Franco** (sigue siendo archivo sensible).
2. **No refactorizar `/cirugias/page.tsx` Expediente UI sin nuevo Task Brief específico.** (Mantener UX validada; migrar source-of-data incremental.)
3. **No cambiar Auth a productivo sin ADR Auth final + aprovação.**
4. **No implementar Remito backend sin decidir unificación V1+V2.**
5. **No implementar Facturación/Cobro backend sin decidir modelo de Factura/`base`/Imputation por id.**
6. **No activar TusFacturasAPP productivo** ni exponer tokens en frontend.
7. **No persistir IA autorización sin ADR** (`SurgeryAuthorization`/`SurgeryDocument` requieren storage + retention policy).
8. **No ampliar `legacy-sync` allowlist** sin Task Brief; ya detectado mismatch CX-0009.
9. **No borrar slices Zustand sin haber migrado el módulo correspondiente a backend.** (Se rompe exp y store.)
10. **No deprecar `db.ts` sin migrar todos los callers** a `prisma.ts`.
11. **No crear rutas sin seguir `getApiAuthContext` + scopes companyId + audit** (refactor a `permissions/*` primero).
12. **No mover grandes carpetas de código** sin task plan.
13. **No instalar dependencias nuevas** sin task explícita.
14. **No asumir docs como verdad absoluta.** Verificá contra código.
15. **No meter lógica de negocio nueva en componentes React.**

---

## 15. Decisiones que Franco debe confirmar

1. **Remito unificado V1/V2**: ¿una sola entidad `Remito` con campos opcionales de box/presupuesto/destinatario + items? ¿qué campos obligatorios? ¿qué estados?
2. **Auth productivo**: ¿Supabase Auth en producción + supabaseAuthId como vínculo definitivo? ¿Apagar fallback DEV `x-ossum-actor-user-id`? ¿Crear ADR Auth final?
3. **Storage definitivo**: R2 para artefactos binarios (recibos, adjuntos documentación, IA), Prisma para metadata. ¿Supabase Storage alguna vez? ¿Queda R2 como único?
4. **Facturación inicial sin TFAPP**: ¿ modelo `Invoice` con `base` (presupuesto/consumo/manual/mixto) operacional sin CAE, dejando TFAPP para integración futura? ¿O se posterga facturación hasta tener TFAPP?
5. **Cobro/Imputación** por FK id (no número). Confirmar destruir path de match por string.
6. **Migración `/cirugias` lista a read server-first**: ¿aprobada por bands (filtros/paginación/tabla)? ¿O esperar a que todo el circuito backend cierre?
7. **Persistencia IA autorización**: ¿ crear `SurgeryAuthorization` + `SurgeryDocument` con storage y política de retención? ¿O se mantiene stateless indefinidamente?
8. **Providers IA productivos**: ¿permitir `gemini`/`anthropic`/`local`? ¿qué credenciales? ¿o cerrar el tipo unión a los 3 registrados?
9. **AMail stage1 en FS**: aceptar como stage1 productivo, o esperar migración a Prisma/Storage para activar cualquier entorno no-DEV.
10. **Auditoría Seguimiento/Recibos**: ¿ agregar escritura a `AuditEvent` central para mutaciones de seguimiento y timeline de recibos? ¿Dupe con timeline propio o reemplazo?
11. **Permisos centralizados**: ¿aprobar crear `src/lib/permissions/*` y migrar roles inline por servicio?
12. **`legacy-sync` allowlist**: ¿cerrar mismatch CX-0009 (no seedeado) o completar seed con CX-0009?
13. **`ContactAddress` companyId**: ¿agregar índice/constraint para evitar leak, o confiar en aserción previa?
14. **`db.ts` singleton**: ¿aprobar deprecación y migración a `prisma.ts` único?
15. **Doc cleanup**: ¿aprobar consolidar ADR-027E, archivar Contexto Maestro legacy, completar `REPO_MAP.md`, borrar Diccionario vacío?
16. **`AGENTS.md` caducidades**: ¿aprobar edición para marcar 0A/0B como cerrados y prohibiciones como protectivas (no secuencia bloqueante)?
17. **Servidor/VPS postergado**: ¿se confirma postergación o se replantea decisión para producción?

---

## 16. Próximo Task Brief recomendado para Codex

> Tarea de saneamiento documental + consolidación ADR. Sin tocar código, sin tocar schema, sin tocar auth.

### Task Brief — DOC-027F.0C-SANEO

- **Task ID/Name:** DOC-027F.0C-SANEO
- **Agent Role:** Docs / Handoff Agent
- **Selected LLM:** Qwen / GLM (docs, no implementación crítica)
- **Mode:** docs (no implementation, read-only sobre código)
- **Objetivo:** Saneamiento documental y cierre formal de 0A/0B. Producir base confiable para que agentes futuros no naveguen a ciegas.

**Scope:**
1. Consolidar ADR-027E en single source en `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` agregando addendums faltantes desde `docs/ia-autorizaciones/`. Eliminar la copia en docs o reemplazarla por referencia.
2. Archivar `docs/ia-autorizaciones/PROYECTO_CONTEXTO_MAESTRO (1).md` a `knowledge/archive/legacy-pre-v2/`. Dejar en docs un README apuntando al archivo.
3. Completar `knowledge/core/REPO_MAP.md` con mapa real del repo (rutas `src/app`, `src/components`, `src/lib/services`, `src/lib/api`, `src/lib/digital-receipts`, `src/lib/mail-stage1`, `src/lib/services/ai`, prisma migrations, scripts npm). Secciones concretas NO "Pendiente".
4. Borrar `docs/ia-autorizaciones/Diccionario del Circuito Districorr.md` (vacío).
5. Editar `knowledge/core/CANONICAL_DECISIONS.md` para marcar 0A/0B como cerrados y 5A ejecutado.
6. Editar `AGENTS.md` §5/§11: marcar prohibiciones como protectivas post-cierre (basadas en contenido), no secuencia bloqueante. Mantener el blindaje sobre schema/auth/Cirugías como protectivo.
7. Marcar `knowledge/architecture/BACKEND_FOUNDATION_PLAN.md` como histórico y crear `knowledge/architecture/BACKEND_PHASE2_PLAN.md` con resumen del circuito troncal post-Cirugía a implementar (referencia a este PLAN).
8. Reordenar `knowledge/worklog/WORKLOG.md` cronológicamente (más reciente al final).
9. Crear `knowledge/architecture/ADR-AUTH-FINAL.md` como DRAFT (pendiente de aprobación) — no finalizar sin Franco.

**Allowed files:** `knowledge/**`, `docs/ia-autorizaciones/*.md`, `AGENTS.md`.
**Forbidden files:** `prisma/**`, `src/**` (salvo lectura para construir REPO_MAP), rutas públicas.
**Allowed commands:** solo lectura (git/grep/cat-equivalent vía herramientas dedicadas).
**Forbidden commands:** migraciones, generate, lint, build.
**Validation required:** diff legible; no se rompen enlaces internos referencedos en otros docs; grep de links verificando targets.
**Output format:** Caveman en español para handoff.
**Expected handoff:** `## Handoff / Done / Changed / Files / Validations / Risks / Next` + lista de links internos rotos corregidos.
**Stop and escalate if:** se encuentra decisión no listada en §15; aparecer referencia circular; se necesita tocar `schema.prisma`.

**Adelanta la fase de discusión antes de implementar fase 1.** El próximo TTechnical Brief después de DOC-027F.0C-SANEO debe ser **DESIGN-REMITO-UNIFICADO** (diseño previo, no implementación), que requiere aprobación de Franco sobre los puntos 1, 2, 4, 5, 6, 11 de §15.

---

## 17. Handoff corto (formato Caveman)

### Done
- Relevo read-only de doc (knowledge + docs/ia-autorizaciones) y código (schema, store, services, API, expediente, cirugias, hook actions, pages).
- Diagnóstico completo contra estado real del working tree.
- Mapa de circuito real + mapa objetivo + tabla de módulos.
- 20 conflictos doc-vs-código identificados.
- Plan de continuidad por fases propuesto + Task Brief de saneamiento para Codex.

### Findings
- Backend real cubre Cirugía + laterales (auth, contactos, seguimiento, notificaciones, recibos digitales en R2, mail en FS, IA autorización stateless, audit).
- Circuito troncal post-Cirugía <strong>NO tiene backend</strong>: Presupuesto, Preparación, Remito, Consumo, Devolución, Comparativa, Documentación, Factura, Cobro, Stock, Logística, Trazabilidad.
- Frontend store mockea todo con Zustand+localStorage; wiring real entre módulos store-only.
- Duplicaciones/fragilidad: Remito V1/V2, notas legacy vs seguimiento, traceEntries dead, consumo↔remito linkage roto, imputaciones por número, dos handlers de facturación, dos singletons Prisma, roles inline.
- Auth Supabase DEV operativo; productivo pendiente ADR final.
- IA autorización ya implementada y más evolucionada que sus docs spec.
- Doc saneada atrasada: AGENTS secuencia 0A/0B caduca, ADR duplicada, Contexto Maestro fósil, REPO_MAP placeholder, Diccionario vacío, BACKEND_FOUNDATION_PLAN superado.

### Conflicts
- Doc dice "schema bloqueado hasta 0A/0B"; worklog muestra schema+migrations+auth+API ya ejecutados.
- ADR-027E divergente entre knowledge/architecture y docs/ia-autorizaciones.
- Contexto Maestro "fuente #1" vs AGENTS "no cargar por defecto".
- Remito V1 vs V2 back-writes inconsistentes en store.
- `AuditEvent` gap en seguimiento/recibos vs `AUDIT_EVENT_POLICY.md`.

### Risks
- Seguir creciendo sobre mock amplifica breaches de linkage.
- `getSaldoPendiente` por número puede mezclar saldos entre cirugías.
- `db.ts` vs `prisma.ts` doble Pool bajo carga.
- Mail FS no portable para prod.
- `legacy-sync` allowlist mismatch CX-0009.
- Refactor prematuro Cirugías rompería UX validada.

### Next
- Franco confirma decisions de §15 (especialmente Remito unificado, Auth productivo, Facturación sin TFAPP, Storage, IA persistente).
- Lanzar DOC-027F.0C-SANEO (Docs/Handoff Agent) para saneamiento doc.
- Posteriormente DESIGN-REMITO-UNIFICADO (diseño, no implementación).
- Posteriormente Fase 1 backend del circuito troncal, por etapas (Remito → Consumo/Devolución → Presupuesto → Factura/Cobro → Comparativa).

### Files reviewed
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/*` (read)
- `src/lib/store.ts`, `src/types/index.ts`, `src/lib/circuit-progress.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`, `src/lib/cirugias.utils.ts`, `src/lib/cirugias.constants.ts`
- `src/hooks/useCirugiaActions.ts`
- `src/app/**/page.tsx` (todas las rutas)
- `src/components/expediente/*`, `src/components/cirugias/*`
- `src/lib/services/*`, `src/lib/digital-receipts/*`, `src/lib/mail-stage1/*`, `src/lib/surgery/*`, `src/lib/api/*`, `src/lib/validators/*`
- `knowledge/**` (core, domain, architecture, workflow, worklog, specs por índice)
- `docs/ia-autorizaciones/*` (9 archivos)
- `AGENTS.md`

---

*Fuentes de los hallazgos: tres exploradores read-only lanzados en paralelo (Repo/store/circuit, Docs/domain, Backend/schema). No se modificaron archivos en esta sesión. Útil para pasar directamente al Task Brief DOC-027F.0C-SANEO o al bloque §15 de decisiones.*