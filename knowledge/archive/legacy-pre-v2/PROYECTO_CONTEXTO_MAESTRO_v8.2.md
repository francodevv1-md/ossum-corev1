# Actualizado: 2026-06-15.

# Estado vigente: Phase 1 DB de Cirugías integrada en master. Auth Supabase, usuario interno, empresa activa, Contactos API con mutaciones, Auditoría API, /cirugias-api read-only y payload de cirugías enriquecido quedan operativos. Surgery core fue expandida con visibleNumber, payerContactId, cxStatus, prepStatus, fechas base, priority/source y SurgeryContactAssignment. /cirugias principal sigue intacto y no debe migrarse sin Task Brief explícito. Próximo bloque recomendado: smoke final y Fase 2A — Spec Autorización \+ Documentos; luego lector de autorizaciones aislado. Regla operativa OpenCode: los agentes no deben levantar Next automáticamente, no usar Start-Process y no usar /api como healthcheck; el usuario levanta el server manualmente desde la carpeta correcta.

# 

# \# ACTUALIZACIÓN 2026-06-15 — PHASE 1 DB CIRUGÍAS INTEGRADA

# 

# \#\# Estado técnico consolidado

# 

# OSSUM COR ya validó el camino técnico real:

# 

# login → usuario interno → empresa activa → API protegida → PostgreSQL/Prisma → AuditEvent.

# 

# Commits relevantes integrados:

# 

# \- dc0d79c feat(auth): add frontend login and bearer api client

# \- 5dbc25f feat(auth): add current user context

# \- 7847c9d feat(contacts): load contacts from authenticated api

# \- c40adeb feat(audit): add authenticated audit events page

# \- 8b0a834 feat(contacts): add authenticated contact mutations

# \- 6462ede feat(surgeries): add read-only api validation page

# \- 62784d6 feat(surgeries): enrich api payload with related contacts

# \- d33efc6 docs(surgeries): document database design plan

# \- 52272c1 docs(surgeries): add phase 1 core schema expansion spec

# \- 7212a43 feat(surgeries): add phase 1 core schema

# \- 6a11d83 fix(seed): set real Supabase UUID for DEV user auth mapping

# \- d4e74d2 fix(contactos): prevent Zustand flicker before API resolves

# \- c290fa0 fix(surgeries): align api validation page with phase 1 schema

# 

# \#\# Cirugías / Phase 1

# 

# La entidad Surgery fue expandida como núcleo operativo real. Se reemplazó el estado único por dimensiones separadas:

# 

# \- cxStatus

# \- prepStatus

# 

# Se agregaron campos base para operación real:

# 

# \- visibleNumber

# \- payerContactId

# \- classification

# \- description

# \- priority

# \- probableDate

# \- scheduledDate

# \- performedDate

# \- cancelledDate

# \- source

# 

# Se creó el modelo SurgeryContactAssignment para roles flexibles por cirugía. No se implementaron todavía endpoints específicos para ese modelo.

# 

# \#\# Vistas y APIs vigentes

# 

# /cirugias-api existe como vista técnica paralela read-only para validar backend real. Muestra paciente, médico, institución, pagador, Estado CX y Prep.

# 

# /cirugias principal sigue intacto. No debe migrarse ni refactorizarse sin un Task Brief específico, porque todavía depende de Zustand/store, hooks y expediente.

# 

# \#\# Contactos y Auditoría

# 

# Contactos ya funciona con API real para lectura y mutaciones. El flicker por fallback a Zustand fue corregido: la UI no debe mostrar mocks viejos mientras carga la API.

# 

# Auditoría ya tiene vista /auditoria y eventos AuditEvent generados por mutaciones reales de contactos.

# 

# \#\# Reglas operativas para agentes

# 

# \- No levantar Next dev server automáticamente.

# \- No usar Start-Process.

# \- No usar /api como healthcheck.

# \- El usuario levanta manualmente el server desde la carpeta correcta.

# \- Los agentes ejecutan validaciones CLI salvo instrucción explícita.

# \- No usar git add .

# \- No tocar /cirugias principal sin scope aprobado.

# 

# \#\# Próximo paso recomendado

# 

# 1\. Cerrar smoke final post Phase 1\.

# 2\. Fase 2A — Spec Autorización \+ Documentos.

# 3\. Fase 2B — Lector de autorizaciones aislado.

# 4\. Recién después conectar lectura/documento con creación o actualización real de cirugía.

# 

# No avanzar todavía con remitos, consumo, stock fino, facturación ni migración de /cirugias principal.

# 

# \---

# 

# Actualizado: 2026-06-09.

# Estado vigente: Backend/Auth Foundation validado. Supabase DEV, Prisma, services, API routes protegidas y Auth server-side quedan operativos. Proximo bloque recomendado: GPT-027F.5A-07A Login UI / Auth frontend design.

# 

# \# ACTUALIZACIÓN 2026-06-05 — PUNTO DE REINICIO

# 

# Punto de reinicio recomendado:

# 

# GPT-027F.5A-01R — Review QA schema inicial Prisma.

# 

# Estado actual:

# 

# \- 0A cerrado.

# \- 0B cerrado y hardening Full Gentleman completado.

# \- 0C-01 completado con baseline verde.

# \- 5A-00B decisiones backend completadas.

# \- 5A-00C Prisma 7 config completada.

# \- 5A-01 schema inicial Prisma completado.

# 

# Validaciones:

# 

# \- npm test 598 passed / 0 failed / 10 skipped.

# \- npx tsc \--noEmit sin errores.

# \- npm run build OK.

# \- npx prisma format OK.

# \- npx prisma validate OK.

# \- Git limpio.

# \- GGA hook activo.

# \- Engram consolidado en ossum\_cor\_project.

# \- Context7 portable.

# 

# Schema inicial Prisma creado con:

# 

# Organization, Company, Branch, User, UserCompanyAccess, Contact, ContactCompanyLink, ContactGroup, ContactGroupMembership, ContactAddress, Surgery mínima, AuditEvent.

# 

# Regla:

# 

# No ejecutar migraciones hasta completar 5A-01R.

# 

# Handoff actualizado:

# https://docs.google.com/document/d/1sagO3yjL-HMmyetpsVnHgS2tsGraASJu5WkZP69AePE/edit?usp=drivesdk

# 

# \---

# 

# \# ACTUALIZACIÓN DE HANDOFF — 2026-06-04

# 

# Estado listo para nuevo chat.

# 

# Resumen vigente:

# 

# \- GPT-027F.0A — Knowledge V2: cerrado.

# \- GPT-027F.0B — Gentle-AI / OpenCode / Engram / SDD: cerrado funcionalmente.

# \- GPT-027F.0C-01 — baseline técnica mínima: completado.

# \- Tests: npm test 598 passed / 0 failed / 10 skipped.

# \- TypeScript: npx tsc \--noEmit sin errores.

# \- Build: npm run build OK.

# \- Backend Foundation GPT-027F.5A: habilitado, pero schema.prisma no debe tocarse sin Task Brief explícito.

# 

# Decisiones backend ya documentadas:

# 

# \- DB provider: Supabase.

# \- Auth: Supabase Auth.

# \- Storage: diferido.

# \- Stock: fuera del primer commit.

# \- Primer schema: Organization, Company, Branch, User, UserCompanyAccess, Contact, ContactCompanyLink, ContactGroup, ContactAddress, Surgery mínima y AuditEvent.

# 

# Próximo paso operativo:

# 

# 1\. Crear proyecto Supabase \`ossum-cor-dev\`.

# 2\. Obtener DATABASE\_URL y DIRECT\_URL.

# 3\. No compartir claves reales en chat.

# 4\. Luego preparar GPT-027F.5A-01 — Schema inicial Prisma.

# 

# Documento de handoff para nuevo chat:

# https://docs.google.com/document/d/1sagO3yjL-HMmyetpsVnHgS2tsGraASJu5WkZP69AePE/edit?usp=drivesdk

# 

# \---

# 

# OSSUM COR — Proyecto Contexto Maestro

Última actualización: 2026-06-03 · Versión del documento: 8.2 · Estado: saneado, reforzado y conectado con Knowledge V2 / Gentle-AI. Alcance: producto final, dominio, circuito operativo, arquitectura vigente, estrategia IA, estructura documental y referencias legacy subordinadas.

\#\# 0.0A Actualización canónica 2026-06-03 — Producto final, verdad vigente y orden documental

Esta sección gobierna todo el documento desde el 2026-06-03. Si alguna sección anterior o posterior menciona OrtoTrack, ChatZIA, Zustand/localStorage como fuente final, Django/FastAPI como camino principal, Engram Cloud como base obligatoria, Graphify como herramienta inicial, o cualquier decisión que contradiga esta actualización, debe considerarse histórica, contextual o pendiente de migración documental.

\#\#\# Producto final correcto

OSSUM COR es un ERP operativo multiempresa para distribuidoras quirúrgicas, ortopedias y comercios de salud, diseñado alrededor de la Cirugía/Expediente como entidad central.

El sistema busca reemplazar progresivamente circuitos dispersos en XAdmin, WhatsApp, planillas, papel, correos, fotos, PDFs y conocimiento informal de cada área, conectando en un solo flujo operativo contactos, presupuestos, preparación de material, remitos, consumo, devoluciones, comparativa, documentación, facturación, cobros, stock, cajas, compras y trazabilidad.

La cirugía es la entidad central. El expediente es la vista integral de esa cirugía. Desde el expediente debe poder verse qué se pidió, qué se presupuestó, qué se autorizó, qué se preparó, qué se envió, qué se consumió, qué volvió, qué diferencia hubo, qué documentación existe, qué se facturó, qué se cobró y quién realizó cada acción.

OSSUM COR no debe copiar XAdmin. Debe aprender del circuito real y resolverlo con menos fricción, datos reutilizables, componentes transversales, auditoría, permisos, trazabilidad y una experiencia operativa clara.

\#\#\# Circuito V1.0 canónico

La V1.0 será exitosa cuando permita operar un caso real desde:

Contactos → Cirugía/Expediente → Presupuesto → Preparación interna → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro.

Stock, cajas, trazabilidad y compras son transversales al circuito. No son accesorios conceptuales, pero su profundidad puede implementarse por etapas.

\#\#\# Fuente de verdad técnica

La fuente de verdad final debe ser backend \+ PostgreSQL. Zustand/localStorage queda solo como transición del prototipo actual y no debe tratarse como arquitectura final.

La decisión técnica vigente para V0 es:

Next.js \+ API Routes / Server Actions \+ Prisma \+ PostgreSQL gestionado.

Supabase o Neon quedan como candidatos de base de datos. Supabase puede aportar Auth/Storage si simplifica, pero no reemplaza las validaciones backend por empresa, rol, permisos y auditoría. VPS queda para etapa posterior.

\#\#\# Relación con TusFacturasAPP

OSSUM COR mantiene la verdad operativa. TusFacturasAPP debe actuar como motor fiscal/comercial externo para factura electrónica, CAE, QR fiscal, notas fiscales y eventuales remitos formales con CAI si corresponde. TusFacturasAPP no reemplaza stock quirúrgico, cajas, lotes, preparación, consumo, devolución, logística, trazabilidad interna ni expediente.

La integración fiscal debe ser backend-only. Nunca deben exponerse credenciales fiscales en frontend.

\#\#\# Qué no es OSSUM COR

OSSUM COR no es OrtoTrack como identidad final, no es ChatZIA como metodología vigente, no es XAdmin con otra interfaz, no es un prototipo frontend terminado, no es localStorage/Zustand como fuente final, no es un sistema fiscal dependiente de TusFacturasAPP como núcleo, no es un stock aislado, no es un CRM médico genérico y no es un POS como producto principal.

Puede incorporar POS para Casa Salud en etapa futura, pero el núcleo inicial es quirúrgico-operativo.

\#\#\# Orden documental obligatorio

Este Contexto Maestro debe dejar de crecer como acumulación de notas técnicas. Desde esta actualización, la información debe separarse así:

1\. Contexto Maestro: visión, producto, dominio, circuito y decisiones rectoras.  
2\. ADRs: decisiones técnicas específicas.  
3\. Knowledge V2: documentación modular de dominio, arquitectura, workflow y estado actual.  
4\. Specs SDD/OpenSpec: alcance de tareas puntuales.  
5\. Worklog: historial de ejecución.  
6\. Engram: memoria operativa, decisiones y resúmenes de sesión.  
7\. Archive/Deprecated: histórico que no gobierna.

\#\#\# Próxima tarea canónica

La próxima tarea antes de instalar o ejecutar backend foundation es:

GPT-027F.0A — Reconstrucción documental y Knowledge V2.

Objetivo: convertir la información acumulada en una fuente de verdad limpia, modular y accionable para agentes.

Entregables mínimos:

\- AGENTS.md.  
\- knowledge/KNOWLEDGE\_INDEX.md.  
\- knowledge/core/PROJECT\_BRIEF.md.  
\- knowledge/core/CURRENT\_STATE.md.  
\- knowledge/core/CANONICAL\_DECISIONS.md.  
\- knowledge/domain/\*.  
\- knowledge/architecture/\*.  
\- knowledge/workflow/\*.  
\- knowledge/specs/GPT-027F.0/\*.  
\- knowledge/archive/README.md.

Después de GPT-027F.0A corresponde GPT-027F.0B — Configurar Gentle-AI workspa

\#\# 0.0B Saneamiento documental 2026-06-03 — Correcciones de registros errados o ambiguos

Se realizó una pasada de saneamiento para reducir contradicciones y evitar que los agentes tomen como vigente información histórica.

Correcciones aplicadas:

\- El encabezado del documento se actualiza a versión 8.1.  
\- OrtoTrack queda marcado como registro legacy y no como identidad final.  
\- CHATZAI-027 queda marcado como nombre histórico; la tarea vigente es GPT-027F.0A.  
\- Zustand/store queda definido como fuente temporal del prototipo, no como fuente final.  
\- La arquitectura OCR/IA se corrige a backend Next.js/API/Server Actions \+ PostgreSQL, no Django como camino vigente.  
\- Las referencias a Django/PostgreSQL dentro de criterios de instalación quedan reemplazadas por Next.js/Prisma/PostgreSQL.  
\- Graphify pago queda postergado; grafo local solo puede usarse como ayuda puntual si no agrega costo ni desplaza Knowledge V2.  
\- El orden vigente pasa a ser: Knowledge V2 → Gentle-AI workspace → Engram/Engram Sync → SDD/OpenSpec → Skill Registry/Context7 → QA/Diagnose/Caveman según tarea.

Regla para agentes: cualquier bloque marcado como legacy, histórico, prototipo, mock, Zustand/localStorage, OrtoTrack, CHATZAI o Django como camino principal no debe usarse como instrucción vigente salvo que   
\#\# 0.0C Tercera pasada estructural 2026-06-03 — Conexión con lo último implementado y estructura fuerte

Esta tercera pasada no solo corrige contradicciones: define cómo debe conectarse lo último implementado con la próxima estructura de trabajo.

Estado real de partida:

\- Existe un prototipo frontend avanzado con Cirugías, Expediente, Wizard Nueva Cirugía, Presupuesto, Remitos, Consumo, Comparativa, Facturación/Cobros en maqueta y tableros/agenda/coordinadores con distintos grados de madurez.  
\- El prototipo usa Zustand/localStorage y datos mock como fuente temporal.  
\- No existe todavía backend real productivo ni PostgreSQL como fuente de verdad.  
\- La documentación acumulada contiene valor, pero mezcla producto final, estado del prototipo, decisiones viejas, worklog y herramientas IA.

Conexión correcta con lo último implementado:

\- Lo implementado en frontend se conserva como referencia funcional y UX, no como arquitectura final.  
\- Cirugías y Expediente deben tratarse como módulos sensibles: no reescribir sin scope explícito.  
\- Los patrones útiles del prototipo deben migrarse a Knowledge V2: filtros, columnas reordenables, acciones por fila, reglas visuales, bugs conocidos de Radix/Zustand, flujo de expediente y decisiones UX.  
\- Las entidades, reglas y relaciones deben migrarse a documentos de dominio y arquitectura antes de escribir Prisma/schema.prisma.  
\- Las mejoras de UI recientes deben quedar documentadas en CURRENT\_STATE.md, no seguir creciendo dentro del Contexto Maestro.

Estructura fuerte obligatoria antes de Backend Foundation:

1\. Contexto Maestro saneado: este documento solo gobierna visión, producto, circuito, arquitectura vigente y orden de trabajo.  
2\. Knowledge V2: divide el conocimiento en core, domain, architecture, workflow, specs, worklog y archive.  
3\. AGENTS.md: define cómo trabajan Codex/OpenCode/Gentle-AI, qué pueden tocar y qué no.  
4\. CURRENT\_STATE.md: captura estado real del repo/prototipo, rutas, módulos, bugs y limitaciones.  
5\. CANONICAL\_DECISIONS.md: lista corta de decisiones vigentes para agentes.  
6\. PROJECT\_BRIEF.md: explicación compacta del producto para iniciar sesiones.  
7\. QUALITY\_GATES.md: build, typecheck, lint, Prisma, tests, browser QA y criterios de aceptación.  
8\. ENGRAM\_POLICY.md: qué se guarda, qué no se guarda y cómo usar Engram Sync.  
9\. TASK\_BRIEF\_TEMPLATE.md y HANDOFF\_TEMPLATE.md: formato obligatorio de entrada/salida por tarea.  
10\. Specs GPT-027F.0: SPEC.md, DESIGN.md, TASKS.md y VALIDATION.md.

Regla de avance:

No iniciar GPT-027F.5A Backend Foundation hasta que GPT-027F.0A y GPT-027F.0B estén listos o, como mínimo, hasta que existan AGENTS.md, Knowledge Index, Project Brief, Current State, Canonical Decisions y Quality Gates.

Regla de extracción desde este documento:

Este Contexto Maestro queda como fuente rectora, pero no debe seguir acumulando detalles de código. Los bloques extensos de estado del prototipo deben extraerse gradualmente a CURRENT\_STATE.md y luego dejar aquí solo un resumen.

Regla de documentación futura:

\- Cambios de producto o arquitectura rectora: Contexto Maestro / ADR.  
\- Estado real del repo: CURRENT\_STATE.md.  
\- Decisiones vigentes cortas: CANONICAL\_DECISIONS.md.  
\- Flujo de trabajo IA: AGENTS.md y workflow/\*.md.  
\- Bugs, validaciones y entregas: WORKLOG.md / HANDOFF.md.  
\- Información vieja útil: archive/README.md.

\---  
una spec nueva lo autorice expresamente.

\---

\---  
\#\# 0.0 Actualización canónica 2026-05-28 — Decisión backend V0 y consolidación del relevamiento XAdmin

Esta actualización deja asentado lo conversado durante el relevamiento funcional ampliado de XAdmin y la decisión técnica revisada para iniciar backend real. XAdmin se toma como fuente de aprendizaje operativo, no como verdad de diseño ni como interfaz a copiar. OSSUM COR debe tomar entidades, relaciones y problemas reales de XAdmin, pero resolverlos con menos fricción, vistas conectadas, acciones guiadas, auditoría y componentes reutilizables.

\#\#\# Decisión técnica V0

La recomendación canónica para el primer backend real de OSSUM COR queda actualizada a:

Next.js \+ API Routes / Server Actions \+ Prisma \+ PostgreSQL gestionado.

Motivo: el desarrollador principal es Franco, con alto conocimiento del negocio y experiencia limitada en backend/DevOps avanzado. Para esta etapa conviene evitar dividir el proyecto entre TypeScript y Python, dos repositorios, dos despliegues y dos sistemas de tipos. FastAPI no se descarta definitivamente, pero deja de ser el camino principal para V0.

Stack V0 recomendado:  
\- Frontend actual: Next.js / React / TypeScript / Tailwind.  
\- Backend inicial: Next.js API Routes y/o Server Actions.  
\- ORM: Prisma.  
\- DB: PostgreSQL gestionado.  
\- Proveedor DB a evaluar: Supabase o Neon.  
\- Auth/Storage: Supabase opcional si reduce complejidad inicial.  
\- VPS: etapa posterior, cuando existan backups, restore probado y más madurez DevOps.

Regla crítica: Next.js \+ Prisma no debe convertirse en backend improvisado dentro de componentes React. La lógica de negocio debe vivir en servicios server-side bajo /src/lib/services, con validadores centrales, permisos, transacciones Prisma, auditoría y company\_id obligatorio en entidades operativas.

\#\#\# Advertencia sobre Supabase RLS \+ Prisma

Supabase RLS puede ser una red de seguridad, pero no reemplaza filtros y permisos del backend. Si Prisma se conecta a PostgreSQL desde servidor, las políticas RLS pueden no operar como en llamadas directas del cliente Supabase o requerir configuración cuidadosa de roles, claims y conexión. OSSUM COR debe aplicar siempre desde backend:  
\- company\_id obligatorio.  
\- organization\_id / tenant controlado.  
\- permisos por usuario y rol.  
\- validaciones de dominio.  
\- auditoría de eventos críticos.

\#\#\# Arquitectura canónica de carpetas para V0

src/  
├── app/  
│   └── api/  
│       ├── companies/  
│       ├── contacts/  
│       ├── surgeries/  
│       ├── items/  
│       ├── warehouses/  
│       ├── stock/  
│       ├── remitos/  
│       ├── consumptions/  
│       ├── billing/  
│       └── audit/  
├── components/  
├── hooks/  
├── lib/  
│   ├── db.ts  
│   ├── services/  
│   │   ├── company.service.ts  
│   │   ├── contact.service.ts  
│   │   ├── surgery.service.ts  
│   │   ├── item.service.ts  
│   │   ├── stock.service.ts  
│   │   ├── remito.service.ts  
│   │   ├── consumption.service.ts  
│   │   ├── billing.service.ts  
│   │   ├── payment.service.ts  
│   │   └── audit.service.ts  
│   ├── validators/  
│   ├── permissions/  
│   ├── constants/  
│   └── errors/  
└── types/

prisma/  
├── schema.prisma  
├── migrations/  
└── seed.ts

\#\#\# Primeros módulos backend reales

Orden recomendado para GPT-027F:  
1\. Organización / Empresas / Sucursales.  
2\. Usuarios y permisos básicos.  
3\. Contactos globales \+ vínculo por empresa.  
4\. Cirugías.  
5\. Artículos.  
6\. Depósitos.  
7\. Stock movements.  
8\. Auditoría.

Luego: Presupuestos, Preparación, Remitos, Consumos, Devoluciones, Comparativa persistente, Facturación y Cobros.

\#\#\# Principio de reutilización tomado de XAdmin

XAdmin tiene un principio valioso: reutiliza apartados y entidades transversales, por ejemplo artículos llamados desde F4 en remitos, presupuesto, ajustes, inventario, órdenes de compra, remitos proveedor y factura. OSSUM COR debe conservar ese principio, pero modernizarlo.

Regla canónica:  
Si una entidad aparece en más de dos módulos, debe tener componente reutilizable contextual y servicio de dominio asociado.

Componentes transversales prioritarios:  
\- ContactSearchModal.  
\- ArticlePicker.  
\- BoxPicker.  
\- WarehousePicker.  
\- StockMovementDialog.  
\- RelatedDocumentsPanel.  
\- PaymentMethodSelector.  
\- AllocationSelector.  
\- AuditTimeline.  
\- EntityLink.  
\- StockSummaryPanel.  
\- AccountCurrentSummaryPanel.  
\- ComparativePanel.  
\- LogisticsTaskPanel.

ArticlePicker debe reemplazar el concepto F4 de XAdmin, pero adaptado por contexto: presupuesto, remito, consumo, OC, inventario, transferencia, ajuste, remito proveedor y POS.

\#\#\# Relevamiento funcional de XAdmin incorporado

Puntos procesados y asentados:  
\- Movimientos de stock: entrada por remito proveedor, salida por NR, transferencia, ajuste, inventario, material en tránsito y anulación como movimiento contrario.  
\- Necesidades de compra: XAdmin depende demasiado de stock mínimo por artículo; OSSUM COR debe consolidar necesidades por artículo/familia/caja/cirugía y dejar que el usuario elija proveedor.  
\- Ajuste e inventario: OSSUM COR debe permitir cargar stock contado final y calcular diferencia automáticamente, evitando lógica manual de positivo/negativo.  
\- Transferencia: debe mover depósito origen → destino, validando stock disponible y generando movimientos y auditoría.  
\- Cuenta corriente: no debe quedar escondida solo dentro de contactos; debe existir vista financiera propia conectada al contacto.  
\- Cobros y pagos: deben separar condición de pago, medio de pago, valores, imputaciones y cuenta corriente. Deben permitir múltiples medios, pagos parciales y cobros/pagos sin imputar.  
\- Comprobantes asociados: no deben quedar asociados de forma ambigua solo a presupuesto; la cirugía debe ser el eje y cada comprobante debe declarar función dentro del circuito.  
\- Fiscal / IVA / caja y bancos: deben quedar preparados, pero no bloquear la operatoria diaria con parametrización contable pesada.  
\- POS Casa Salud: debe tener modo operativo simple de venta rápida, stock, medios de pago, caja diaria y cierre.  
\- Asistente de compras, pendientes de facturación, reparto/logística y variables: son buenas ideas de XAdmin, pero deben transformarse en bandejas accionables, configuración clara y vistas operativas simples.

\#\#\# Decisión de proveedor DB / infraestructura

Para V0 no se recomienda iniciar en VPS por falta de experiencia DevOps y por el riesgo de backups/seguridad/restore. El VPS sigue siendo alternativa futura para control y costo fijo, pero debe llegar después.

Camino recomendado:  
\- Fase 1: PostgreSQL gestionado, evaluando Supabase vs Neon.  
\- Fase 2: backend estable en Vercel/Next o servicio compatible, con DB gestionada.  
\- Fase 3: evaluar VPS solo con Docker, backups diarios externos, SSL, firewall, monitoreo y prueba real de restauración.

\#\#\# Próximos entregables vigentes

Primero: GPT-027F.0A — Reconstrucción documental y Knowledge V2.

Luego: GPT-027F.0B — Configurar Gentle-AI workspace, Engram Sync, SDD/OpenSpec, Skill Registry, guardrails y perfiles de agentes.

Después: GPT-027F.5A — Backend Foundation con Prisma Backend V0:  
\- Prisma schema inicial.  
\- Servicios de dominio.  
\- API Routes / Server Actions iniciales.  
\- Seed limpio.  
\- Estrategia de migración desde Zustand/localStorage.  
\- Reglas de company\_id obligatorio.  
\- Auditoría mínima.  
\- Transacciones para eventos críticos.

\---

\#\# 0.1 Actualización canónica 2026-06-02 — Estrategia de trabajo con VSCode, OpenCode CLI, Codex y agentes

Franco deja de usar la versión web de ChatZ como flujo principal de implementación y pasa a una modalidad local más potente y ordenada basada en VSCode \+ OpenCode CLI. La decisión se toma para reducir fricción, ahorrar tokens, mejorar control de archivos, ordenar tareas por agentes y avanzar con mayor precisión sobre backend, schema, servicios, documentación y QA.

\#\#\# Decisión operativa

Flujo principal actualizado:  
\- VSCode como entorno operativo principal.  
\- OpenCode CLI como capa de ejecución/agentes en local.  
\- Codex 5.3 como agente principal de implementación.  
\- OpenCode Go y sus LLM disponibles como agentes secundarios/tácticos para tareas puntuales o multiagente.  
\- Gemini Assist Code disponible de forma temporal hasta el 25/06 para revisión, comparación, documentación o apoyo puntual.  
\- ChatGPT queda como copiloto estratégico/documental para arquitectura, prompts, revisión de decisiones y actualización de contexto.

Esta decisión es válida, pero debe gestionarse con disciplina. El riesgo principal no es usar más herramientas, sino generar demasiados agentes escribiendo sobre el mismo repositorio sin protocolo, provocando divergencias, duplicación de lógica, cambios cruzados y pérdida de trazabilidad.

\#\#\# Regla de coordinación

Codex será el agente principal de escritura de código. OpenCode/otros agentes no deben modificar los mismos archivos en paralelo sin un handoff claro. Gemini Assist Code debe utilizarse preferentemente para revisión, explicación, comparación de alternativas, documentación o tareas acotadas, no como agente simultáneo editando el mismo núcleo.

\#\#\# agents.md como pieza central

Debe existir o actualizarse un AGENTS.md del repositorio para invocación inteligente de agentes. Este archivo debe definir:  
\- roles de agentes;  
\- cuándo invocar cada agente;  
\- qué archivos puede tocar cada rol;  
\- reglas de no duplicación;  
\- comandos de validación obligatorios;  
\- formato de handoff;  
\- prohibición de asumir reglas de negocio sin consultar;  
\- skills disponibles;  
\- orden de trabajo por paquetes.

Roles recomendados:  
\- Product/Domain Architect: interpreta negocio, flujo quirúrgico, XAdmin y reglas funcionales.  
\- Backend/DB Agent: Prisma, PostgreSQL, migraciones, seed, servicios de dominio.  
\- Frontend/UI Agent: React, componentes, UX, integración progresiva con API.  
\- QA/Testing Agent: TypeScript, build, tests, rutas, regresiones visuales y API checks.  
\- Docs/Handoff Agent: worklog, ADRs, contexto maestro, checklist, prompts y trazabilidad.  
\- Reviewer Agent: revisión de PR/diff, riesgos y consistencia con reglas canónicas.

\#\#\# Skills necesarias por prioridad

Prioridad crítica inmediata:  
\- ossum-project-context: reglas canónicas del dominio, cirugía como eje, flujo OSSUM COR.  
\- prisma-database-setup: Prisma schema, migrations, seed, relaciones, Decimal, enums y naming.  
\- supabase-postgres-best-practices: connection strings, DATABASE\_URL/DIRECT\_URL, pooler, migraciones, backups y cuidado con RLS.  
\- nextjs-api-server-actions: API Routes/Server Actions, server-only, validaciones y errores.  
\- domain-services-pattern: servicios server-side, transacciones Prisma, company\_id obligatorio y auditoría.  
\- react-components-patterns: componentes reutilizables contextuales, no lógica crítica en UI.  
\- zustand-to-backend-migration: migración progresiva desde localStorage/mock a API.  
\- testing-quality-gates: npm run build, tsc, prisma format/generate/migrate, smoke tests.  
\- docs-worklog-handoff: actualización de AGENTS.md, worklog, checklist y contexto.

Prioridad media:  
\- supabase-auth-storage-patterns: Auth/Storage si se confirma Supabase como proveedor operativo.  
\- clerk-nextjs-patterns: solo si se decide Clerk; no mezclar Auth sin decisión explícita.  
\- postgres-data-modeling: índices, multiempresa, constraints, auditoría y saldos/movimientos.  
\- api-contracts-and-zod: contratos de API, validadores y tipos compartidos.  
\- git-branch-pr-workflow: ramas, commits chicos, diffs revisables, rollback.

Prioridad futura:  
\- engram-memory: memoria persistente entre agentes cuando exista flujo estable.  
\- codegraph/graphify: análisis de dependencias cuando el backend y documentación estén más avanzados.  
\- observability-logging: logs, errores, auditoría técnica y monitoreo.  
\- fiscal-integration: TusFacturasAPP/ARCA cuando llegue la etapa fiscal real.

\#\#\# Criterio sobre Engram y memoria

Engram y Engram Sync se incluyen desde el inicio, pero con alcance controlado. No reemplazan Knowledge V2 ni AGENTS.md. Engram debe guardar decisiones, errores, aprendizajes y resúmenes de sesión; no debe guardar secretos, claves, datos sensibles ni convertirse en depósito desordenado de todo el proyecto. La memoria persistente entra como soporte operativo, no como fuente de verdad principal.

\#\#\# Riesgos a evitar

\- Usar varios agentes editando los mismos archivos sin branch/handoff.  
\- Crear skills antes de tener tareas repetibles claras.  
\- Dejar que cada agente invente arquitectura propia.  
\- Cambiar schema, auth o DB provider sin ADR.  
\- Usar Supabase RLS como sustituto de validación backend por company\_id.  
\- Seguir agregando frontend sin backend real.  
\- Usar herramientas nuevas como forma de procrastinar decisiones difíciles.

\#\#\# Decisión documental

Se recomienda crear un ADR separado para Backend / DB / ORM / Auth / Storage, porque el Contexto Maestro ya es extenso. Este ADR debe ser la referencia corta para agentes cuando trabajen en GPT-027F.5A.

\---

izable y decisión técnica backend V0.

---

## 1\. Resumen Ejecutivo de

## 

## \#\# 0\. Base estratégica canónica — OSSUM COR

## 

## Esta sección consolida las decisiones funcionales y conceptuales tomadas para OSSUM COR. Debe leerse antes del detalle técnico heredado del documento. Las referencias antiguas a OrtoTrack se consideran legacy y deben normalizarse gradualmente a OSSUM COR, salvo claves técnicas existentes que aún dependan de nombres anteriores.

## 

## \#\#\# 0.1 Nombre canónico y visión

## 

## El nombre canónico del proyecto es OSSUM COR, con doble S. OSSUM COR nace primero como ERP interno para Districorr, pero debe diseñarse desde el inicio como producto escalable y vendible a otras ortopedias, distribuidoras quirúrgicas o comercios de salud.

## 

## Definición de producto: OSSUM COR es un ERP operativo multiempresa para distribuidoras quirúrgicas, centrado en la cirugía como entidad principal, diseñado para conectar contactos, presupuesto, preparación, remitos, consumo, devolución, comparativa, facturación, cobros, stock y trazabilidad, evitando carga duplicada y construyendo una base de datos escalable para reemplazar XAdmin.

## 

## La V1 exitosa debe permitir operar el circuito de cirugía y facturación con trazabilidad interna completa: crear cirugía, asociar contactos, generar presupuesto, preparar material, emitir remito, cargar consumo, comparar diferencias, facturar, cobrar y auditar el recorrido.

## 

## \---

## 

## \#\# 1\. PRD — Product Requirements Document

## 

## \#\#\# Producto

## OSSUM COR es un ERP operativo multiempresa para distribuidoras quirúrgicas. Se organiza alrededor de la cirugía, no alrededor de áreas administrativas aisladas. El expediente es la vista integral de una cirugía, no una entidad separada.

## 

## \#\#\# Problema que resuelve

## XAdmin obliga a navegar entre múltiples apartados y genera trabajo manual, duplicación de datos y baja trazabilidad entre cirugía, stock, remitos, consumo, facturación y cobros. OSSUM COR busca que cada dato se cargue una vez y se reutilice en todo el circuito.

## 

## \#\#\# Usuarios objetivo

## Usuarios internos: administración, gerencia, coordinadores, depósito, logística, facturación, cobranzas, compras, control de calidad/dirección técnica y consulta. Usuarios externos futuros: médicos/clientes e instrumentadores/colaboradores externos con permisos filtrados.

## 

## \#\#\# Alcance V1 funcional

## Deben existir como núcleo: Contactos, Cirugías, Presupuesto, Preparación interna, Remitos, Consumos, Comparativa, Facturación, Cobros, Stock, Cajas, Documentación, Trazabilidad, Compras, Proveedores y Reportes. La profundidad de implementación se divide por etapas: núcleo quirúrgico primero, luego facturación/cobros, stock/cajas/trazabilidad y finalmente administración ampliada.

## 

## \#\#\# Criterio de éxito

## La V1 será exitosa cuando se pueda recorrer un caso real desde Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro, con auditoría visible desde la cirugía.

## 

## \---

## 

## \#\# 2\. TRD — Technical Requirements Document

## 

## \#\#\# Arquitectura actual

## Frontend funcional/mock con Next.js, React, TypeScript, Tailwind, shadcn/ui y Zustand/localStorage. El store actual funciona como fuente de verdad temporal. No hay backend productivo ni base de datos real.

## 

## \#\#\# Arquitectura objetivo

## Backend real pendiente de implementación. Decisión técnica actualizada para V0: Next.js \+ API Routes/Server Actions \+ Prisma \+ PostgreSQL gestionado. Supabase o Neon quedan como candidatos de base de datos inicial; Supabase también puede aportar Auth/Storage. FastAPI queda como alternativa futura si el backend crece y se decide separar API. Django queda como alternativa futura solo si se prioriza un admin interno fuerte. VPS queda para etapa posterior, no para el inicio.

## 

## \#\#\# Multiempresa

## El sistema debe ser multiempresa desde el inicio. Debe soportar organización madre, empresas y sucursales/puntos de venta/configuración fiscal. Ejemplo inicial: Grupo Districorr → Districorr y Casa Salud. Empresas externas futuras deben tener separación real de datos.

## 

## \#\#\# Principios técnicos

## \- Simple para el usuario, robusto internamente.

## \- La UI puede mostrar módulos unificados, pero la base debe separar entidades, relaciones, movimientos y auditoría.

## \- No duplicar lógica de negocio en componentes visuales.

## \- No usar credenciales fiscales desde frontend.

## \- No diseñar la base copiando el menú de XAdmin.

## \- Mantener Zustand como capa de UI durante transición, pero mover la fuente de verdad al backend.

## 

## \---

## 

## \#\# 3\. UI/UX Brief de Diseño

## 

## \#\#\# Principio general

## OSSUM COR debe sentirse como una herramienta operativa profesional, clara y rápida. La cirugía es el centro de navegación y decisión. La tabla de cirugías debe permitir lectura rápida, filtros claros, acciones contextuales y acceso directo al expediente.

## 

## \#\#\# Vista Cirugías

## Debe mantener buscador inteligente, chips de filtros, filtros rápidos, columnas reordenables, acciones por fila y doble click para abrir expediente. No debe volver a preview lateral fijo ni KPIs que roben espacio operativo.

## 

## \#\#\# Estados visuales

## Estado CX es la dimensión principal y debe existir visualmente en la tabla. Preparación/material es subestado operativo separado.

## 

## Estados CX principales:

## \- Sin autorizar

## \- Autorizada

## \- Pendiente

## \- En tránsito

## \- Realizada

## \- Sin consumo

## \- Finalizada

## \- Suspendida

## \- Cancelada

## 

## Subestados de preparación/material:

## \- Sin preparar

## \- Congelado

## \- Congelado con faltantes

## \- Enviado

## \- Entregado

## \- Retirado

## 

## \#\#\# Contactos

## Un solo modal reutilizable debe servir para Cliente/Pagador, Paciente, Médico, Institución, Coordinador, Vendedor e Instrumentador. El contacto tiene roles generales y grupos; su función se define por el campo donde se utiliza.

## 

## \#\#\# Presupuesto

## Debe sentirse como planilla profesional: código, artículo flexible Z, descripción editable, cantidad, precio, descuento, IVA por ítem, totales discriminados, leyenda compacta y clasificación por modal. El presupuesto no genera remito ni factura automáticamente.

## 

## \---

## 

## \#\# 4\. Flujo Operativo Principal

## 

## Flujo canónico:

## Contactos → Cirugía → Presupuesto → Preparación interna → Remito → Consumo → Devolución → Comparativa → Facturación → Cobro.

## 

## \#\#\# Cirugía y expediente

## Cirugía es la entidad central. Expediente es la vista integral de esa cirugía. Una cirugía pertenece a una empresa, tiene cliente/pagador principal, paciente principal, médico principal, institución principal, coordinador opcional, vendedor opcional, uno o más instrumentadores, estado CX, subestado de preparación/material, fechas operativas, clasificación e historial.

## 

## Datos mínimos para crear cirugía: Cliente/Pagador y Paciente. Médico e Institución son importantes y pueden ser obligatorios por configuración. Fecha de cirugía, fecha probable, fecha de envío, fecha de disponibilidad, fecha de retiro y fecha de devolución son operativas y pueden completarse luego.

## 

## \#\#\# Presupuesto

## Puede existir independiente o vincularse a cirugía. Una cirugía tiene un presupuesto principal activo y versiones anteriores. Las versiones deben guardar sus propios ítems, precios, descuentos, IVA, condición de pago, lista de precios y leyenda. La versión activa alimenta el flujo salvo selección manual.

## 

## \#\#\# Preparación

## Pertenece normalmente a una cirugía, puede haber más de una, y una debe marcarse como activa/principal. Puede contener artículos simples y cajas/artículos compuestos. Puede reservar stock de artículos y cajas. Guarda quién la creó y quién la confirmó.

## 

## \#\#\# Remito

## Remito quirúrgico requiere cirugía. Remito general/movimiento operativo puede existir sin cirugía. El remito puede crearse desde presupuesto, preparación, manualmente o desde movimiento de stock. Debe guardar destinatario como contacto; si es otro contacto, debe existir en maestro. Puede contener cajas completas y artículos sueltos. Genera movimientos de stock por ítem.

## 

## \#\#\# Consumo y devolución

## Cada consumo pertenece a un remito específico y tiene número visible propio. Si hay dos remitos, hay dos consumos separados, pero la cirugía muestra vista consolidada. La devolución puede generarse desde consumo o directamente desde remito. La devolución pertenece al remito, tiene número propio y genera movimiento de stock de entrada.

## 

## \#\#\# Facturación y cobros

## La factura creada desde cirugía se vincula automáticamente a esa cirugía. Desde facturación general puede existir sin cirugía o vincularse a una o varias cirugías. La factura guarda la base usada: presupuesto, consumo, manual o mixto. Cobros pueden imputarse a varias facturas y pueden quedar sin imputar temporalmente. Cuenta corriente futura se calcula desde facturas, cobros, notas de crédito y notas de débito.

## 

## \---

## 

## \#\# 5\. Esquema de Backend / Modelo Conceptual

## 

## \#\#\# Estructura multiempresa

## \- Organización madre / tenant

## \- Empresa

## \- Sucursal / punto de venta / configuración fiscal

## \- Usuario con acceso a una o varias empresas

## 

## La operación se separa por empresa: cirugías, presupuestos, preparaciones, remitos, consumos, devoluciones, facturas, cobros, stock, cajas físicas, movimientos, documentos y auditoría. Contactos y artículos pueden reutilizarse con vínculo por empresa.

## 

## \#\#\# Contactos

## Modelo aprobado: contacto global \+ vínculo por empresa. El contacto tiene datos generales, datos fiscales, direcciones, teléfonos y coordenadas si aplica. Los datos fiscales viven dentro de la ficha de contacto, organizados por secciones. Instituciones son contactos con datos logísticos estructurados.

## 

## Separación conceptual:

## \- Rol general: Cliente, Proveedor, Interno, Agenda.

## \- Grupo: Médico, Paciente, Institución, Obra social, ART, Instrumentador, Vendedor, Coordinador, Proveedor de implantes, etc.

## \- Función: paciente de esta cirugía, médico de esta cirugía, destinatario de este remito, cliente fiscal de esta factura, etc.

## 

## \#\#\# Identificadores

## Toda entidad operativa importante debe tener id técnico interno y número visible configurable por empresa, sucursal, tipo de documento, año y prefijo. Aplica a cirugía, presupuesto, preparación, remito, consumo, devolución, factura, cobro, notas, movimiento de stock y caja física.

## 

## \#\#\# Artículos, stock y cajas

## En UI puede verse como Artículos/Stock. En backend debe separarse: Artículo \= qué es; Stock \= cuánto hay y dónde; Movimiento \= por qué cambió.

## 

## Caja quirúrgica se modela en 3 niveles:

## 1\. Caja modelo/base: composición ideal o fórmula.

## 2\. Caja física: caja real con código propio.

## 3\. Caja enviada: composición real asociada a cirugía/remito.

## 

## \#\#\# Auditoría

## V1 audita modificaciones. V2 audita consultas sensibles puntuales. Cada evento relevante debe guardar company\_id, user\_id, entity\_type, entity\_id, fecha, hora, acción, detalle, valor anterior, valor nuevo y módulo origen. El historial de cirugía muestra eventos de todos los módulos vinculados. Usuarios externos ven historial filtrado.

## 

## \---

## 

## \#\# 6\. Plan de Implementación

## 

## \#\#\# Etapa 0 — Reconstrucción documental y Knowledge V2

## Antes de seguir con backend, ordenar la fuente de verdad: Contexto Maestro, AGENTS.md, Knowledge Index, Project Brief, Current State, Canonical Decisions, dominio, arquitectura, workflow, specs, worklog y archive.

## 

## \#\#\# Etapa 1 — Consolidación documental y modelo

## Actualizar mapa funcional, matriz de alcance, matriz de relaciones, matriz de eventos e impactos. Salida: documentación lista para diseñar base de datos sin mezclar histórico, prototipo y producto final.

## 

## \#\#\# Etapa 2 — Modelo conceptual y backend inicial

## Definir entidades, relaciones, cardinalidades, permisos, auditoría y modelo multiempresa. Decisión V0: monolito modular Next.js \+ Prisma \+ PostgreSQL gestionado, con servicios de dominio server-side y migración progresiva desde Zustand/localStorage. PostgreSQL es la base recomendada.

## 

## \#\#\# Etapa 3 — Núcleo persistente

## Implementar backend para Contactos, Empresas, Usuarios, Cirugías, Presupuestos, Preparaciones, Remitos, Consumos, Devoluciones y Auditoría. Iniciar con seeds limpios; no hace falta migrar mocks.

## 

## \#\#\# Etapa 4 — Stock, artículos y cajas

## Implementar Artículos, Stock, Movimientos, Cajas modelo, Cajas físicas, Cajas enviadas, lotes/series configurables y vencimientos.

## 

## \#\#\# Etapa 5 — Facturación, cobros e integración fiscal

## Implementar Facturación/Cobros reales y luego integración fiscal backend-only con TusFacturasAPP/ARCA. Factura electrónica usa CAE \+ QR. Remito formal/preimpreso usa CAI. El PDF final debe generarlo OSSUM COR.

## 

## \#\#\# Etapa 6 — Reportes, permisos y optimización

## Completar reportes, exportaciones, usuarios externos, permisos por rol, auditoría exportable, E2E y mejoras mobile.

## 

## Secuencia vigente: primero GPT-027F.0A — Reconstrucción documental y Knowledge V2; luego GPT-027F.0B — Configurar Gentle-AI workspace; después GPT-027F.5A — Backend Foundation con Prisma schema, servicios de dominio, API Routes / Server Actions, seed limpio, auditoría mínima y estrategia de migración desde Zustand/localStorage.

## 

## \---

## 

## l S

## Actualización canónica — Estado reconciliado al 21/05/2026

## 

## Circuito central vigente:

## Contactos → Cirugía/Expediente → Presupuesto → Preparación interna → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro.

## 

## Estado actual consolidado:

## • Contactos: V1 cerrada y evolucionada a roles generales Cliente / Proveedor / Interno \+ grupos operativos. Coordinadores, Vendedores e Instrumentadores son grupos, no roles principales.

## • Cirugías: UX principal desplegada con toolbar reorganizado, buscador inteligente, chips, filtros rápidos y avanzados, columnas reordenables, acciones por fila, colores y separación Estado CX / Preparación.

## • Wizard Nueva Cirugía: Cliente/Pagador como primer dato, contactos contextuales, Institución con Provincia/Localidad, Clasificación por modal y confirmación al cancelar.

## • Presupuesto: workspace tipo planilla, artículo por código, artículo flexible Z, IVA por ítem, clasificación en modal independiente, scroll vertical de grilla, leyenda compacta y totales discriminados equilibrados.

## • Remitos: V1 cerrada con múltiples remitos por cirugía, destinatario operativo seleccionado entre los 4 actores de la cirugía y preparación de pedido como nota operativa.

## • Comparativa: V1 desplegada; lectura Presupuestado → Remitido → Consumido → Devuelto, matching por stockItemId, Z/flexibles en revisión manual y delta económico estimado.

## • Facturación y Cobros: funcionales en maqueta, pendientes de backend y conexión fiscal real.

## • TusFacturasAPP: integración viable y documentada como capa fiscal; el ERP propio mantiene la verdad operativa.

## 

## URL pública canónica validada: https://ossum-cor-work.vercel.app

## Nota: si aparece la variante https://osum-cor-work.vercel.app en reportes, verificar antes de documentarla como final.

## 

## Pendientes principales: backend real, base de datos, autenticación, permisos, migración de mocks/localStorage, Prisma/schema, PDFs reales, reportes reales, TusFacturasAPP desde backend, stock/lotes/trazabilidad real y E2E Playwright.

## 

## Registro histórico: CHATZAI-027 fue el nombre anterior del frente de preparación del modelo de datos. Desde 2026-06-03 queda reemplazado por GPT-027F.0A — Reconstrucción documental y Knowledge V2, antes de Backend Foundation.

## 

## istema

### Registro legacy — OrtoTrack ERP (NO VIGENTE como identidad final)

Este bloque queda marcado como legado histórico. La identidad final vigente es OSSUM COR. La definición corregida del producto está en la sección 0.0A: ERP operativo multiempresa centrado en Cirugía/Expediente, con circuito Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro.

### Qué problema resuelve

El problema operativo descrito sigue siendo válido, pero debe leerse bajo OSSUM COR, no OrtoTrack. OSSUM COR centraliza la operación quirúrgica, documental, logística, comercial, financiera y de stock para reducir carga duplicada, errores de facturación, material faltante, documentación incompleta y cobros atrasados.

### Circuito principal

El circuito central del sistema es:

Necesidad quirúrgica → Alta de cirugía (CX) → Presupuesto (PR) → Preparación interna / pedido operativo

→ Remito operativo (NR) → Cirugía realizada → Consumo → Comparativa de materiales

→ Documentación completa → Facturación (FV) → Cobros imputados → Trazabilidad

Cada paso genera comprobantes, eventos de auditoría y cambios de estado que se reflejan en el expediente del caso.

### Por qué Cirugías es el módulo central

Cirugías no es una tabla más: es la columna vertebral del sistema. Cada cirugía conecta contactos, documentos y decisiones operativas: paciente, médico, institución, cliente/pagador, coordinador, instrumentador y vendedor. De cada cirugía se derivan presupuestos, preparación interna, remitos, consumo, documentación, comprobantes, facturación, cobros, necesidades de compra y trazabilidad. Todos los demás módulos existen porque existen cirugías. El módulo de Cirugías está avanzado, desplegado en preview pública y debe tratarse con cuidado para no romper lo que ya funciona.

### Cómo se conectan los módulos

- **Cirugía → Presupuesto**: Una cirugía sin PR puede tener un presupuesto creado desde el wizard o desde el expediente. El PR contiene los artículos a proveer, sus precios y el total.  
- **Presupuesto → Preparación / Remito: El presupuesto puede orientar la preparación interna y servir de base para el remito, pero el remito refleja lo que efectivamente sale. En V1, el “pedido” se optimiza como nota operativa estructurada de Preparación de pedido, no como documento formal independiente.**  
- **Remito → Consumo: Del remito se interpreta lo efectivamente enviado. El consumo registra lo utilizado y devuelto, y la comparativa consolida Presupuestado vs Remitido vs Consumido para detectar diferencias operativas y económicas.**  
- **Consumo \+ Documentación → Facturación: Solo cuando el consumo está validado y la documentación está apta se habilita el flujo de facturación. La comparativa**   
- **Actualización acumulada — Estado consolidado al 20/05/2026**  
-   
- **Desde la versión inicial de este documento, OSSUM COR consolidó varios frentes centrales del circuito quirúrgico y financiero:**  
-   
- **• Presupuestos V1: workspace amplio tipo planilla, artículos catalogados y flexibles Z, plantillas, IVA editable, descuentos por línea y generales, totales claros y contexto fiscal del cliente/pagador.**  
- **• Contactos V1: módulo /contactos, código único, roles múltiples, búsqueda por código/nombre/CUIT/DNI, CRUD funcional y reutilización dentro del wizard de Nueva Cirugía.**  
- **• Facturación: vista rectora unificada, diferenciación entre autorizado/listo para facturar, selector de base de facturación, diferencias visibles y saldo pendiente dinámico.**  
- **• Cobros V2: cobro como entidad independiente, imputaciones a facturas, pagos parciales y saldo calculado dinámicamente.**  
- **• Remitos V1: múltiples remitos por cirugía, destinatario limitado a Cliente/Pagador, Institución, Médico o Paciente vinculados al caso, importación desde presupuesto y estados operativos.**  
- **• Preparación de pedido: se resolvió como nota operativa estructurada para Depósito, no como documento PE formal en V1.**  
- **• Comparativa de materiales V1: lectura Presupuestado → Remitido → Consumido → Devuelto, visible en Consumos y resumida en Expediente, con delta económico estimado e integración preparada con Facturación.**  
- **• Preview pública estable en Vercel: https://ossum-cor-work.vercel.app, con correcciones de SSR, Zustand persist, tabs, navegación, runtime loops y apertura de Expediente.**  
-   
- **Registro histórico: este bloque corresponde al estado anterior al saneamiento documental. La prioridad inmediata vigente desde 2026-06-03 es GPT-027F.0A — Reconstrucción documental y Knowledge V2. Luego corresponde GPT-027F.0B — Configurar Gentle-AI workspace, y recién después GPT-027F.5A — Backend Foundation.**  
-   
- **de materiales alimenta el análisis de diferencias antes de facturar.**  
- **Facturación → Cobros: La FV queda vinculada a un modelo de cobro independiente. Los cobros se registran como ingresos reales y se imputan a una o varias facturas, permitiendo saldos dinámicos y pagos parciales.**  
- **Consumo → Necesidades de compra**: Las diferencias y faltantes generan necesidades de compra que se convierten en órdenes de compra a proveedores.  
- **Stock → Preparación**: El stock disponible alimenta las cajas que se preparan para cada cirugía.  
- **Trazabilidad**: Cada implante o material con lote/serie se rastrea desde la compra hasta el uso en quirófano.

---

## Actualización CHATZAI-025 — Entrega UX consolidada al 20/05/2026

## 

## Se recibió y se toma como referencia de estado la entrega final CHATZAI-025. La implementación declara 28 mejoras UX distribuidas en Wizard Nueva Cirugía, Presupuesto, Acciones Post-Creación y pantalla principal de Cirugías. El alcance reportado modifica aproximadamente 30 archivos, crea 6 nuevos y actualiza documentación de proyecto.

## 

## Estado consolidado de la entrega:

## • Wizard Nueva Cirugía: Cliente/Pagador pasa a ser el primer campo; Institución auto-completa Provincia/Localidad; Vendedor, Instrumentador y Coordinador usan ContactLookupField; se habilita alta desde modales; se agregó confirmación al cancelar; Clasificación pasa a Combobox con búsqueda.

## • Presupuesto: modales internos corregidos, el código resuelve producto, se preserva artículo Z/flexible, se incorpora IVA por ítem con 5 alícuotas AFIP, se transfiere ivaKey desde catálogo y se agrega desglose de IVA en totales.

## • Cirugías: ID CX se consolida como identificador maestro, se mantiene la jerarquía visual de Estado CX, Preparación y badges neutros; toolbar reorganizado en 3 filas; botón “+ Nueva cirugía ▾” con opciones.

## • Buscador y filtros: SmartSurgerySearch con sugerencias agrupadas, chips activos, limpiar filtros global, contador contextual, 7 filtros rápidos, DateFiltersPopover con 4 tipos y atajos, y 14 filtros avanzados. La lógica de chips opera con OR dentro del mismo campo y AND entre campos, con normalización accent-insensitive.

## • Informes y documentos: se creó ReportsAndDocumentsDialog con tres secciones — reportes de vista filtrada, documentos de cirugía seleccionada y documento logístico. Todos los ítems quedan scaffolded como “Próximamente”, con secciones B/C dependientes de cirugía seleccionada.

## • Columnas: useColumnVisibility incorpora columnOrder persistido, reorderColumns y resetToDefault. ColumnVisibilityMenu fue reescrito con drag & drop, grip handles y restauración predeterminada. CirugiasTable respeta el orden configurado por usuario.

## • Acciones por fila: CirugiaActionsCell fue reescrito con determinePrimaryAction basado en reglas de negocio, prioridad contextual y menú de 11 acciones reales. Las acciones no disponibles quedan deshabilitadas con explicación.

## • Verificación técnica reportada: npx tsc \--noEmit sin errores en src/, npm run build compilado con éxito y npx vitest run con 496/496 tests pasando en 23 archivos.

## • Riesgos pendientes: backend aún mock/localStorage; PDFs y reportes reales no implementados; “Crear PR para cirugía existente” sigue próximamente; no se añadieron E2E Playwright; búsqueda accent-insensitive requerirá soporte equivalente al migrar a backend.

## • Deploy: la entrega confirma expresamente que NO se hizo deploy; queda pendiente de validación adicional antes de publicar en Vercel.

## 

## 2\. Stack Técnico Actual

| Componente | Tecnología | Versión | Observaciones |
| :---- | :---- | :---- | :---- |
| Framework | Next.js (App Router, Turbopack) | 16.1.x | Usa "use client" para componentes interactivos |
| Lenguaje | TypeScript | 5.x | Strict mode habilitado |
| UI | React | 19.x | Hooks, composición funcional |
| Estilos | Tailwind CSS | 4.x | PostCSS plugin, no tailwind.config legacy |
| Componentes | shadcn/ui (Radix UI) | Último | 49 componentes UI instalados |
| Estado global | Zustand con persist middleware | 5.x | localStorage bajo clave ortotrack-v2-storage |
| Datos | Mock data en src/data/ | — | 26 archivos de datos mock |
| Backend | Pendiente | — | Prisma configurado (db.ts) pero NO conectado |
| Persistencia actual | localStorage (Zustand persist) | — | Se pierde si se limpia el browser |
| Validación | Zod | 4.x | Disponible, uso parcial |
| Tablas | TanStack Table | 8.x | Instalado pero Cirugías usa \<table\> nativo |
| Gráficos | Recharts | 2.x | Disponible para reportes |
| Drag & Drop | dnd-kit | 6.x | Instalado, uso pendiente |
| Formularios | React Hook Form | 7.x | Disponible |
| Notificaciones | Sonner (toast) | 2.x | Usado en acciones de cirugías |
| Rutas | App Router (Next.js) | — | 35 rutas definidas |
| Iconos | Lucide React | 0.525.x | Iconos consistentes en todo el sistema |

### Limitaciones actuales

1. **Sin backend real**: Toda la data vive en localStorage via Zustand persist. No hay API routes funcionales.  
2. **Prisma no activo**: src/lib/db.ts existe pero no se usa. Los esquemas pueden estar desactualizados.  
3. **Sin autenticación real**: next-auth está instalado pero no implementado. El usuario actual es mock (USR-0001).  
4. **Sin adjuntos**: La documentación es un checklist de toggle, no hay subida de archivos.  
5. **Selects Radix**: \<SelectItem value=""\> crashea Radix. Se debe usar valor sentinela como "none".  
6. **Radix Tooltip**: El patrón \<Tooltip\>\<TooltipTrigger asChild\> causa re-render infinito. Se reemplazó por title nativo en Cirugías.  
7. **Radix DropdownMenu Portal**: Puede causar re-render infinito (bug conocido, similar a Tooltip).  
8. **Zustand selectors**: Inline .filter() en selectores causa loops infinitos. Usar useMemo para datos derivados.  
9. **ID generation**: El contador arranca en 100 para evitar colisiones con datos mock (CX-0001 a CX-0016). createSurgery usa Math.max de IDs existentes.

---

## 3\. Arquitectura Actual del Proyecto

### Estructura de carpetas

src/

├── app/                          \# Rutas (App Router)

│   ├── layout.tsx                \# Root layout: sidebar, header, providers

│   ├── page.tsx                  \# Dashboard principal

│   ├── globals.css               \# Estilos globales

│   ├── api/route.ts              \# API route placeholder

│   ├── cirugias/                 \# Módulo Cirugías

│   ├── expediente/               \# Vista expediente (placeholder)

│   ├── coordinadores/            \# Seguimiento por coordinador

│   ├── calendario/               \# Calendario quirúrgico

│   ├── tableros-operativos/      \# Tableros operativos

│   ├── stock/                    \# Stock (placeholder)

│   ├── cajas/                    \# Cajas (placeholder)

│   ├── remitos/                  \# Remitos (placeholder)

│   ├── consumo/                  \# Consumo (placeholder)

│   ├── logistica/                \# Logística (placeholder)

│   ├── material-transito/        \# Material en tránsito (placeholder)

│   ├── instrumentadores/         \# Instrumentadores (placeholder)

│   ├── vencimientos/             \# Vencimientos (placeholder)

│   ├── documentacion/            \# Documentación (placeholder)

│   ├── trazabilidad/             \# Trazabilidad (placeholder)

│   ├── clasificaciones/          \# Clasificaciones (placeholder)

│   ├── configuracion/            \# Configuración (placeholder)

│   ├── estadisticas/             \# Estadísticas (placeholder)

│   ├── reportes/                 \# Reportes (placeholder)

│   ├── roles/                    \# Roles (placeholder)

│   ├── tablero/                  \# Tablero viejo (legacy)

│   ├── compras/                  \# Sub-rutas de compras

│   │   ├── necesidades-compra/   \# Necesidades de compra (placeholder)

│   │   ├── ordenes-compra/       \# Órdenes de compra (placeholder)

│   │   ├── proveedores/          \# Proveedores (placeholder)

│   │   ├── forecast/             \# Forecast (placeholder)

│   │   ├── ordenes-pago/         \# Órdenes de pago (placeholder)

│   │   ├── movimientos/          \# Movimientos de compra (placeholder)

│   │   └── facturas-compra/      \# Facturas de compra (placeholder)

│   └── ventas/                   \# Sub-rutas de ventas

│       ├── presupuestos/         \# Presupuestos (placeholder)

│       ├── facturacion/          \# Facturación (placeholder)

│       ├── cobros/               \# Cobros (placeholder)

│       ├── comprobantes/         \# Comprobantes (placeholder)

│       ├── notas-credito/        \# Notas de crédito (placeholder)

│       ├── notas-debito/         \# Notas de débito (placeholder)

│       └── pendientes-facturar/  \# Pendientes facturar (placeholder)

│

├── components/

│   ├── cirugias/                 \# 12 componentes del módulo Cirugías

│   │   └── dialogs/              \# 8 diálogos de acciones

│   ├── expediente/               \# 21 componentes del expediente

│   ├── operational-boards/       \# 8 componentes de tableros

│   ├── layout/                   \# 4 componentes de layout

│   ├── shared/                   \# 1 archivo con componentes compartidos

│   └── ui/                       \# 49 componentes shadcn/ui

│

├── hooks/                        \# 8 hooks personalizados

│   ├── useCirugiaActions.ts      \# Acciones \+ diálogos de cirugías

│   ├── useCirugiasFilters.ts     \# Filtros \+ chips \+ clear

│   ├── useCirugiaSelection.ts    \# Selección \+ panel state

│   ├── useCirugiasSorting.ts     \# Ordenamiento

│   ├── useColumnVisibility.ts    \# Columnas visibles \+ sticky

│   ├── useExpedientePreview.ts   \# LEGACY — no usar en vista principal

│   ├── use-mobile.ts             \# Detección mobile

│   └── use-toast.ts              \# Toast wrapper

│

├── lib/                          \# 11 archivos de lógica

│   ├── store.ts                  \# Zustand store (836 líneas) — FUENTE TEMPORAL DEL PROTOTIPO, no arquitectura final

│   ├── types/                    \# (vacío, los tipos están en src/types/)

│   ├── businessRules.ts          \# 5 validadores de negocio

│   ├── automations.ts            \# Máquina de estados

│   ├── cirugias.constants.ts     \# Constantes del módulo (207 líneas)

│   ├── cirugias.types.ts         \# Tipos específicos del módulo

│   ├── cirugias.utils.ts         \# Funciones puras (KPIs, facturación, pendientes)

│   ├── formatters.ts             \# formatCurrency, formatDate, formatDateTime

│   ├── idGenerators.ts           \# generateId, nowDate, nowTime

│   ├── statusHelpers.ts          \# getBadgeVariant, opciones de dropdown

│   ├── db.ts                     \# Prisma singleton (NO CONECTADO)

│   └── utils.ts                  \# cn() helper

│

├── data/                         \# 26 archivos de datos mock

│

├── types/

│   └── index.ts                  \# 596 líneas — Tipos centrales del sistema

│

└── graphify-out/                 \# Generado por Graphify (AST analysis)

### Cómo fluye la información

1. **Store (Zustand) es la fuente temporal de verdad del prototipo actual. La fuente de verdad final debe migrar a backend \+ PostgreSQL. Todos los datos mock actuales viven en store.ts.**  
2. **Páginas** leen del store via useOrtoTrackStore().  
3. **Hooks** encapsulan lógica: filtros, selección, acciones, ordenamiento.  
4. **Componentes** reciben datos y callbacks via props desde las páginas.  
5. **Acciones** en el store modifican los arrays y disparan addAuditEvent para auditoría.  
6. **Getters** en el store derivan datos (ej: getDocStatus, getCobrosBySurgeryId).  
7. **Persist** guarda automáticamente en localStorage bajo ortotrack-v2-storage.

### Módulos que son páginas reales vs placeholders

| Módulo | Ruta | Página real | Contenido funcional |
| :---- | :---- | :---- | :---- |
| Dashboard | / | Sí | KPIs, alertas, próximas cirugías |
| Cirugías | /cirugias | Sí | Tabla completa, filtros, acciones, expediente |
| Expediente | /expediente | Placeholder | Redirige o muestra drawer genérico |
| Coordinadores | /coordinadores | Sí | Pipeline kanban \+ lista por coordinador |
| Calendario | /calendario | Sí | Vista mensual/semanal/diaria |
| Tableros Operativos | /tableros-operativos | Sí | 7 tabs con estadísticas |
| Stock | /stock | Placeholder | — |
| Cajas | /cajas | Placeholder | — |
| Remitos | /remitos | Placeholder | — |
| Consumo | /consumo | Placeholder | — |
| Logística | /logistica | Placeholder | — |
| Material en tránsito | /material-transito | Placeholder | — |
| Instrumentadores | /instrumentadores | Placeholder | — |
| Vencimientos | /vencimientos | Placeholder | — |
| Documentación | /documentacion | Placeholder | — |
| Trazabilidad | /trazabilidad | Placeholder | — |
| Clasificaciones | /clasificaciones | Placeholder | — |
| Configuración | /configuracion | Placeholder | — |
| Estadísticas | /estadisticas | Placeholder | — |
| Reportes | /reportes | Placeholder | — |
| Roles | /roles | Placeholder | — |
| Compras (7 sub-rutas) | /compras/\* | Placeholder | — |
| Ventas (7 sub-rutas) | /ventas/\* | Placeholder | — |

---

## 4\. Estado Real de Cada Módulo

| Módulo | Ruta | Estado actual | Madurez | Archivos principales | Observaciones | Prioridad futura |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Dashboard | / | Funcional con KPIs y alertas | Medio | app/page.tsx | Datos mock, estadísticas básicas | Media |
| Cirugías | /cirugias | Avanzado, funcional | Alto | CirugiasTable.tsx, CirugiaRow.tsx, CirugiaActionsCell.tsx, CirugiaStatusCell.tsx, CirugiasToolbar.tsx | Módulo central, NO tocar sin necesidad | Alta (QA) |
| Expediente | (dentro de Cirugías) | Avanzado, funcional | Alto | ExpedienteFullView.tsx, FichaCirugia.tsx, ComprobantesAsociados.tsx | Se abre dentro de Cirugías, no como página independiente | Media |
| Nueva Cirugía | (dialog en Cirugías) | Funcional con wizard | Medio | NewSurgeryDialog.tsx | 4 pasos, crear PR opcional | Alta (QA) |
| Presupuestos | /ventas/presupuestos | Placeholder \+ panel en expediente | Bajo | PresupuestoPanel.tsx | Panel funcional dentro del expediente | Media |
| Facturación | /ventas/facturacion | Placeholder | Bajo | — | Store tiene authorizeInvoice | Alta |
| Cobros | /ventas/cobros | Placeholder | Bajo | — | Store tiene createCobro | Media |
| Comprobantes Asoc. | (tab en expediente) | Funcional en expediente | Medio | ComprobantesAsociados.tsx | Grilla unificada PR/PE/NR/FV/CO/NC/ND | Media |
| Stock | /stock | Placeholder | Bajo | — | Store tiene stock\[\] y stockMovements\[\] | Alta |
| Cajas | /cajas | Placeholder | Bajo | — | Store tiene boxes\[\] | Media |
| Remitos | /remitos | Placeholder | Bajo | RemitosPanel.tsx | Panel en expediente | Media |
| Consumo | /consumo | Placeholder | Bajo | ConsumoPanel.tsx | Panel en expediente | Alta |
| Logística | /logistica | Placeholder | Bajo | LogisticaPanel.tsx | Panel en expediente | Media |
| Material en tránsito | /material-transito | Placeholder | Bajo | MaterialTransitoPanel.tsx | Panel en expediente | Baja |
| Documentación | /documentacion | Placeholder | Bajo | DocumentacionPanel.tsx | Panel en expediente con checklist | Media |
| Trazabilidad | /trazabilidad | Placeholder | Bajo | TrazabilidadPanel.tsx | Panel en expediente | Media |
| Instrumentadores | /instrumentadores | Placeholder | Bajo | InstrumentadorPanel.tsx | Panel en expediente | Media |
| Compras | /compras/\* | Placeholder | Bajo | — | Store tiene entidades completas | Media |
| Proveedores | /compras/proveedores | Placeholder | Bajo | — | Store tiene proveedores\[\] | Media |
| Necesidades | /compras/necesidades-compra | Placeholder | Bajo | — | Store tiene necesidadesCompra\[\] | Media |
| Tableros Operativos | /tableros-operativos | Funcional con 7 tabs | Medio | OperationalBoardPage.tsx, 7 BoardViews | Lee del store, no duplica lógica de Cirugías | Media |
| Calendario Quirúrgico | /calendario | Funcional | Medio | app/calendario/page.tsx | Vista mensual/semanal/diaria | Alta (mejorar) |
| Coordinadores | /coordinadores | Funcional | Medio | app/coordinadores/page.tsx | Pipeline kanban \+ lista | Alta (mobile first) |
| Reportes | /reportes | Placeholder | Bajo | — | Requiere backend real | Baja |
| Sistema / Roles | /roles | Placeholder | Bajo | — | Requiere autenticación | Baja |

---

## 5\. Módulo Cirugías en Profundidad

**⚠️ NO TOCAR SIN CUIDADO** — Este módulo está avanzado y funcional. Solo debe modificarse si la tarea lo requiere explícitamente.

### Ruta principal

/cirugias — src/app/cirugias/page.tsx

### Componentes usados

| Componente | Archivo | Responsabilidad |
| :---- | :---- | :---- |
| CirugiasPage | app/cirugias/page.tsx | Orquestador: hooks, datos, dialogs |
| CirugiasToolbar | CirugiasToolbar.tsx | Toolbar reorganizado en 3 filas: buscador inteligente → filtros rápidos → acciones, columnas, informes y contador contextual |
| CirugiasSearch | CirugiasSearch.tsx | Input de búsqueda |
| CirugiasAdvancedFilters | CirugiasAdvancedFilters.tsx | "Más filtros" (secundarios) |
| ActiveFilterChips | ActiveFilterChips.tsx | Chips de filtros activos con "Limpiar todo" |
| ResumenRapido | ResumenRapido.tsx | Panel KPI (NO renderizado, conservado para futuro) |
| CirugiasTable | CirugiasTable.tsx | Grilla principal con scroll, sticky columns, sombras |
| CirugiaRow | CirugiaRow.tsx | Fila individual con sticky cells |
| CirugiaStatusCell | CirugiaStatusCell.tsx | Celda de Estado CX con colores intensos |
| CirugiaPreparationCell | CirugiaPreparationCell.tsx | Celda de Preparación con badges suaves |
| CirugiaOperationalBadges | CirugiaOperationalBadges.tsx | Badges neutros de Doc/Consumo/Fact |
| CirugiaActionsCell | CirugiaActionsCell.tsx | Acción primaria contextual \+ menú de tres puntos con 11 acciones reales, deshabilitados explicativos y reglas de negocio respetadas |
| ColumnVisibilityMenu | ColumnVisibilityMenu.tsx | Selector de columnas con visibilidad, fijado, reordenamiento drag & drop, restauración predeterminada y persistencia del orden |

### Hooks usados

| Hook | Archivo | Responsabilidad |
| :---- | :---- | :---- |
| useCirugiasFilters | useCirugiasFilters.ts | Estado de filtros, filterData(), chips, clear |
| useCirugiaSelection | useCirugiaSelection.ts | Selección de fila, panelState, datos derivados |
| useColumnVisibility | useColumnVisibility.ts | Columnas visibles, sticky columns, columnOrder reordenable, resetToDefault y persistencia en localStorage |
| useCirugiaActions | useCirugiaActions.ts | Diálogos, formularios, handlers de acciones |
| useCirugiasSorting | useCirugiasSorting.ts | Sort key, sort dir, handleSort |

### Flujo de datos

page.tsx

  → useOrtoTrackStore() (nombre técnico legacy) → store.surgeries (datos crudos del prototipo)

  → useCirugiasFilters() → filtered \= filters.filterData(surgeries)

  → useCirugiasSorting() → sorted \= sorting.sortData(filtered)

  → CirugiasToolbar (filtros \+ búsqueda)

  → ActiveFilterChips (chips de filtros activos)

  → CirugiasTable (tabla con datos filtrados y ordenados)

    → CirugiaRow × N (filas)

      → CirugiaStatusCell (estado con color)

      → CirugiaPreparationCell (preparación)

      → CirugiaOperationalBadges (doc/consumo/fact)

      → CirugiaActionsCell (acciones contextuales)

  → ExpedienteFullView (cuando panelState \=== "expanded")

  → 8 Diálogos (NewSurgery, ChangeState, ChangeDate, Suspend, Cancel, AddNote, Facturar, Presupuesto)

### Filtros

**Filtros rápidos visibles en la barra (7):**

- Estado CX (checkboxes con badges de color)  
- Preparación (checkboxes con badges de color)  
- Documentación (checkboxes con badges de color)  
- Facturación (checkboxes)  
- Coordinador CX (checkboxes: Sin asignar, Nelson, Ezequiel)  
- Fecha (date inputs Desde/Hasta)

**Más filtros (popover secundario):**

- Médico (input)  
- Institución con búsqueda y auto-fill de Provincia/Localidad  
- Cliente / Pagador como primer campo de carga, con búsqueda y alta desde modal  
- Clasificación con búsqueda/modal (Combobox)  
- PR Nº, Expediente Nº, NR Nº, FV Nº (inputs)  
- Buscar también en (checkboxes: médico, institución, cliente, PR, expediente, NR, FV)

### Tabla

- **Columnas visibles por defecto**: ID CX, PR Nº, Expediente, Estado CX, Fecha, Paciente, Médico, Institución, Cliente/OS, Clasificación, Preparación, Doc/Consumo/Fact, Acciones  
- **Columna oculta por defecto**: Coordinador CX (visible desde selector)  
- **Columnas fijas (opcional, no default)**: Paciente, Cliente / OS, CX ID, Estado CX (izquierda) \+ Acciones (derecha). Se activan desde selector de columnas. Default: desactivado. Las columnas PR Nº y Expediente NO son fijas configurables.  
- **Scroll horizontal**: Contenedor overflow-auto, botones ← → flotantes, sombras en bordes  
- **Altura**: h-\[calc(100vh-5rem)\] para maximizar espacio útil  
- **Padding compacto**: px-2.5 py-1.5 en celdas, text-\[11px\]

### Acciones por fila

- **Click**: Selecciona fila (borde izquierdo \+ fondo suave)  
- **Doble click**: Abre expediente completo  
- **Botón principal contextual**:  
  - Sin PR → "Crear PR"  
  - Puede remitir → "Remitir NR"  
  - Puede cargar consumo → "Cargar consumo"  
  - Puede facturar → "Facturar"  
  - Fallback → "Ver expediente"  
- **Dropdown "Más acciones"**: Ver expediente, Ver/Generar PR, Remitir NR, Cargar consumo, Autorizar FV, Agregar nota, Cambiar estado, Cambiar fecha, Suspender, Cancelar, Recuperar

### Navegación a expediente

- Doble click en fila → openExpediente(id) → panelState "expanded"  
- Botón "Ver expediente" en dropdown → openExpediente(id)  
- Acciones como "Ver PR", "Cargar consumo" → openExpediente(id) \+ setExpTab("presupuesto"/"consumo")  
- "Volver a Cirugías" → closeExpediente() → panelState "list"

### Qué se eliminó

- **Preview lateral fijo**: Eliminado en Paso 7\. Generaba más fricción que valor (robaba ancho, scroll, duplicaba info).  
- **Resumen rápido (KPIs)**: Eliminado de la vista por pedido explícito del usuario. Componente conservado pero no renderizado.  
- **PanelState "tab" y "compact"**: Eliminados. Solo quedan "list" y "expanded".  
- **Vista dividida**: Eliminada junto con el preview lateral.  
- **Radix Tooltip en CirugiaRow**: Reemplazado por title nativo (causaba re-render infinito).  
- **Header local redundante**: Eliminado \<h1\>Cirugías\</h1\> que duplicaba el header global.

### Reglas visuales obligatorias

1. **Estado CX es el color visual principal** — Única columna con color de fondo intenso (CX\_STATE\_CELL\_COLORS)  
2. **Preparación usa badges suaves** con fondo claro \+ borde, no color lleno  
3. **Doc/Consumo/Fact usan NeutralBadge** con punto indicador, no color lleno  
4. **Coordinador no compite visualmente** — Texto simple text-muted-foreground, sin badges de color  
5. **No agregar KPIs arriba de la tabla** — Explícitamente prohibido por el usuario  
6. **No volver a agregar preview lateral fijo** — El acceso al expediente es por doble click o botón  
7. **Filtros operativos deben estar visibles — Los 7 filtros rápidos en la barra, no escondidos**  
8. **Tabla prioriza espacio y operación** — Padding compacto, font small, columnas truncadas

### Archivos sensibles

| Archivo | Sensibilidad | Motivo |
| :---- | :---- | :---- |
| CirugiasTable.tsx | Alta | Scroll state, sticky columns, sombras — bug de loop infinito en setScrollState |
| CirugiaRow.tsx | Alta | Sticky cells, columnas condicionales, doble click |
| CirugiaActionsCell.tsx | Media | Lógica de acciones contextuales, reglas de negocio |
| CirugiaStatusCell.tsx | Media | Mapeo de colores por estado |
| CirugiasToolbar.tsx | Alta | Filtros rápidos con 7 popovers, buscador inteligente por chips, columnas reordenables e informes/documentos |
| useCirugiaActions.ts | Alta | Handlers de acciones, wizard, diálogos |
| useCirugiasFilters.ts | Alta | Lógica de filtros, chips, SmartSurgerySearch, búsqueda accent-insensitive y composición OR/AND entre chips |

---

## 6\. Wizard Nueva Cirugía / Nuevo PR

### Pasos actuales del wizard

El wizard se implementa en NewSurgeryDialog.tsx con 4 pasos controlados por wizardStep.

### Paso 1 — Datos de la Cirugía

Campos principales:

- Paciente (input con búsqueda)  
- Médico (input con búsqueda)  
- Institución con búsqueda y auto-fill de Provincia/Localidad  
- Cliente / Pagador como primer campo de carga, con búsqueda y alta desde modal  
- Financiador (input)  
- Clasificación con búsqueda/modal (Combobox)  
- Fecha de cirugía (date picker)  
- Hora (time input)  
- Vendedor con ContactLookupField y creación desde modal  
- Provincia (select)  
- Coordinador de CX con ContactLookupField y creación desde modal  
- Instrumentador con ContactLookupField y creación desde modal  
- Observaciones (textarea)

**Edición contextual**: Botón de edición rápida para crear cliente, médico o institución si no existen.

**Botón "Crear desde cirugía similar"**: Permite copiar datos de una cirugía existente como base.

### Paso 2 — Presupuesto (opcional)

- Checkbox "Crear presupuesto ahora" — si se marca, muestra la grilla de items  
- **Grilla tipo Excel**: Items con código, nombre, cantidad, precio unitario, subtotal  
- **Artículos Z**: Checkbox para marcar items como artículos fuera de catálogo (descripción libre)  
- **Plantillas**: Selección de plantillas de presupuesto predefinidas  
- **IVA por ítem en la grilla, con 5 alícuotas AFIP, transferencia desde catálogo y desglose integrado en totales**  
- **Versionado**: El presupuesto se crea en estado "Borrador"  
- **Asistente inteligente**: Sugerencia de items basada en la clasificación de cirugía (PENDIENTE)

### Paso 3 — Revisión

- Checklist crítico: Verificación de datos obligatorios  
- Semáforo de cliente: Indica si el cliente tiene observaciones o deudas  
- Resumen de todos los datos ingresados  
- Validación de campos requeridos

### Paso 4 — Resultado

- Confirmación de creación exitosa  
- Opciones de envío: PDF, Email, WhatsApp (PENDIENTE de implementación real)  
- Registro de envío (PENDIENTE)  
- **Disparador futuro**: Al autorizar PR/CX se disparará el flujo operativo (generar pedido, preparar caja, etc.)

### Pendientes de UX

- **Agrandar modal** si hace falta para el paso de presupuesto  
- **Evitar scroll innecesario** dentro del wizard  
- **Mejorar búsqueda de cliente** con 120+ clientes (actualmente es un select simple)  
- **Paciente como alta rápida / creatable** — permitir crear paciente sin salir del wizard  
- **Mejorar experiencia de presupuesto** si se detectan fricciones (grilla poco usable, items difíciles de buscar)  
- **Envío real de PDF/Email/WhatsApp** — actual solo muestra botones, no envía nada

---

## 7\. Expediente Completo

### Cómo se abre actualmente

1. **Doble click** en una fila de la tabla de Cirugías  
2. **Botón "Ver expediente"** en el dropdown de acciones de cada fila  
3. **Acciones como "Ver PR", "Cargar consumo"** abren el expediente en la tab correspondiente  
4. **Coordinadores/Calendario**: Click en una cirugía → openExpediente(id) → drawer global (SurgeryDrawer)

**NOTA**: Existen DOS mecanismos de expediente: (1) ExpedienteFullView dentro de Cirugías (completo, 13 tabs), y (2) SurgeryDrawer global (placeholder con tabs vacíos). El SurgeryDrawer se usa desde Coordinadores y Calendario.

### Tabs existentes (ExpedienteFullView)

| Tab | Componente | Contenido | Funcional |
| :---- | :---- | :---- | :---- |
| Resumen | ResumenExpediente | Datos principales, estado operativo, pendiente, comprobantes, novedades | Sí |
| Cirugía | FichaCirugia | Formulario editable con modo lectura/edición | Sí |
| Presupuesto | PresupuestoPanel | PR asociado, items, totales, estado, acciones | Sí |
| Remitos | RemitosPanel | NR de salida, devolución, items, estado logístico | Sí |
| Consumo | ConsumoPanel | Material consumido, devuelto, diferencias, validación | Sí |
| Comprobantes | ComprobantesAsociados | Grilla PR/PE/NR/FV/CO/NC/ND con filtros | Sí |
| Documentación | DocumentacionPanel | Checklist con progreso, toggle de items | Sí |
| Logística | LogisticaPanel | Ida/vuelta, caja, preparación, timestamps | Sí |
| Mat. Tránsito | MaterialTransitoPanel | Artículos en tránsito, días fuera, alertas | Sí |
| Instrumentador | InstrumentadorPanel | Asignado, liquidación, documentación, pago | Sí |
| Notas | NotasPanel | Notas con tipo/prioridad, filtros | Sí |
| Historial | HistorialPanel | Timeline de cambios | Sí |
| Trazabilidad | TrazabilidadPanel | Entradas/salidas, lotes, series, implantes | Sí |

### Relaciones del expediente

- **Con cirugía**: El expediente pertenece a una cirugía. Todos los datos se derivan del surgeryId.  
- **Con comprobantes**: El tab "Comprobantes" unifica presupuestos, comprobantes del store y cobros.  
- **Con consumo/remitos/documentación**: Cada panel lee del store via getters (getConsumoBySurgeryId, etc.).  
- **Con logística/instrumentador/trazabilidad**: Paneles específicos con datos del store.  
- **Con historial**: getHistoryBySurgeryId devuelve todos los eventos de auditoría.

### Archivos principales

| Archivo | Líneas aprox. | Sensibilidad |
| :---- | :---- | :---- |
| ExpedienteFullView.tsx | \~200 | Alta — Contenedor principal, tabs, header |
| ExpedienteHeader.tsx | \~100 | Media — Barra superior con acciones |
| FichaCirugia.tsx | \~300 | Alta — Formulario editable |
| ComprobantesAsociados.tsx | \~250 | Media — Grilla unificada |
| PresupuestoPanel.tsx | \~200 | Media — Detalle de presupuesto |
| ConsumoPanel.tsx | \~200 | Media — Consumo con edición |
| DocumentacionPanel.tsx | \~150 | Media — Checklist interactivo |
| NotasPanel.tsx | \~100 | Baja — Listado de notas |
| HistorialPanel.tsx | \~100 | Baja — Timeline |
| TrazabilidadPanel.tsx | \~100 | Baja — Tabla |

### Componentes legacy del preview (NO USADOS)

Los siguientes componentes fueron parte del preview lateral fijo y ya no se renderizan en la vista principal. Se conservan para evitar romper imports:

- ExpedientePreview.tsx  
- ExpedientePreviewHeader.tsx  
- ExpedientePreviewActions.tsx  
- ExpedientePreviewPending.tsx  
- ExpedientePreviewStatusChips.tsx  
- ExpedientePreviewSummary.tsx  
- useExpedientePreview.ts

### Qué no duplicar en otros módulos

- **No duplicar la lógica de estados** en Coordinadores o Calendario — usar store.getDocStatus y las mismas constantes.  
- **No duplicar la lógica de acciones** — los handlers están en useCirugiaActions.ts.  
- **No duplicar los colores de estado** — usar CX\_STATE\_CELL\_COLORS y STATE\_COLORS de cirugias.constants.ts.  
- **No duplicar los getters** — usar los getters del store.

---

## 8\. Store y Modelo de Datos

### Dónde está el store

src/lib/store.ts — 836 líneas. Zustand store con persist middleware.

### Entidades principales del store

| Array en el store | Tipo | Cantidad mock | Descripción |
| :---- | :---- | :---- | :---- |
| surgeries | Surgery | \~16 | Cirugías — entidad central |
| stock | StockItem | \~20 | Inventario de artículos |
| stockMovements | StockMovement | \~10 | Movimientos de stock |
| boxes | Box | \~8 | Cajas preparadas para cirugías |
| remitos | Remito | \~8 | Notas de remisión |
| presupuestos | Presupuesto | \~8 | Presupuestos de cirugías |
| consumos | Consumo | \~8 | Consumos de material |
| users | User | \~5 | Usuarios del sistema |
| comprobantes | Comprobante | \~15 | Comprobantes (PE, FV, NR, etc.) |
| logisticsDetails | LogisticsDetail | \~8 | Detalles logísticos |
| historyEntries | HistoryEntry | \~30 | Historial de auditoría |
| notes | SurgeryNote | \~10 | Notas de cirugías |
| documentChecklists | SurgeryDocumentChecklist | \~8 | Checklists documentales |
| instrumentadores | Instrumentador | \~5 | Instrumentadores quirúrgicos |
| instrumentadorSurgeries | InstrumentadorSurgery | \~8 | Relación instrumentador-cirugía |
| materialTransito | MaterialTransito | \~5 | Material en tránsito |
| expirations | ExpiryItem | \~8 | Vencimientos de stock |
| classifications | ClassificationConfig | \~9 | Clasificaciones de cirugía |
| traceEntries | TraceEntry | 0 | Trazabilidad (vacío) |
| notasCredito | NotaCredito | \~3 | Notas de crédito |
| notasDebito | NotaDebito | \~3 | Notas de débito |
| cobros | Cobro | \~5 | Cobros registrados |
| proveedores | Proveedor | \~5 | Proveedores |
| necesidadesCompra | NecesidadCompra | \~5 | Necesidades de compra |
| ordenesCompra | OrdenCompra | \~3 | Órdenes de compra |
| movimientosCompra | MovimientoCompra | \~3 | Movimientos de compra |
| ordenesPago | OrdenPago | \~3 | Órdenes de pago |
| facturasCompra | FacturaCompra | \~3 | Facturas de compra |
| forecast | ForecastItem | \~5 | Forecast de compras |
| evaluacionesProveedor | EvaluacionProveedor | \~3 | Evaluaciones de proveedor |

### Acciones importantes del store

| Acción | Entidad afectada | Descripción |
| :---- | :---- | :---- |
| createSurgery | surgeries | Crea cirugía con ID incremental basado en Math.max |
| updateSurgery | surgeries | Actualiza campos, trackea cambio de coordinador |
| authorizeSurgery | surgeries | Marca autorizado, cambia estado a "Autorizada" |
| changeSurgeryStatus | surgeries | Cambia estado, registra auditoría |
| suspendSurgery / cancelSurgery | surgeries | Cambia a Suspendida/Cancelada con motivo |
| recoverSurgery | surgeries | Recupera a Pendiente |
| createBudgetForSurgery | presupuestos, surgeries | Crea presupuesto y lo vincula |
| authorizeBudget | presupuestos | Aprueba presupuesto |
| generateOrderFromBudget | comprobantes | Genera PE desde presupuesto |
| generateDeliveryNoteFromOrder | remitos, surgeries | Genera NR, cambia estado a "En tránsito" |
| createConsumptionFromDeliveryNote | consumos | Carga consumo desde remito |
| validateConsumption | consumos | Valida consumo |
| authorizeInvoice | surgeries, comprobantes | Factura, cambia a "Finalizada" |
| updateDocumentationChecklist | documentChecklists | Toggle de items, recalcula status |
| addSurgeryNote | notes | Agrega nota con tipo/prioridad |
| addAuditEvent | historyEntries | Registra evento de auditoría |

### Getters principales

| Getter | Retorna | Descripción |
| :---- | :---- | :---- |
| getSurgeryById(id) | Surgery | undefined | Búsqueda directa |
| getPresupuestosBySurgeryId(id) | Presupuesto\[\] | Todos los presupuestos de una cirugía |
| getComprobantesBySurgeryId(id) | Comprobante\[\] | Todos los comprobantes de una cirugía |
| getRemitosBySurgeryId(id) | Remito\[\] | Todos los remitos de una cirugía |
| getConsumoBySurgeryId(id) | Consumo | undefined | Consumo de una cirugía (uno solo) |
| getDocStatus(id) | DocumentStatus | "Incompleta" / "Completa" / "Apta para facturar" |
| getCobrosBySurgeryId(id) | Cobro\[\] | Cobros de una cirugía |
| getNotesBySurgeryId(id) | SurgeryNote\[\] | Notas de una cirugía |
| getHistoryBySurgeryId(id) | HistoryEntry\[\] | Historial de una cirugía |
| getLogisticsBySurgeryId(id) | LogisticsDetail | undefined | Detalles logísticos |
| getInstrumentadorSurgeryBySurgeryId(id) | InstrumentadorSurgery | undefined | Relación instrumentador-cirugía |

### Datos derivados (no en store)

- **Facturación status**: getFacturacionStatus() en cirugias.utils.ts — combina surgery.facturado, docStatus, cobros  
- **Pendiente principal**: getPendientePrincipal() en cirugias.utils.ts — indica el próximo paso requerido  
- **KPIs**: computeKpis() en cirugias.utils.ts — totales por estado  
- **Progreso documental**: computeDocProgress() en cirugias.utils.ts — porcentaje de completitud

### Qué falta para backend real

1. Migrar mock data a tablas Prisma  
2. Crear API routes para cada entidad (CRUD)  
3. Reemplazar Zustand actions por llamadas API  
4. Implementar autenticación real (next-auth)  
5. Implementar autorización por roles  
6. Implementar adjuntos de archivos (S3/local)  
7. Migrar localStorage a base de datos PostgreSQL

---

## 9\. Reglas de Negocio

### Reglas principales

| Regla | Condición | Efecto |
| :---- | :---- | :---- |
| Autorizar cirugía | Estado actual permite avanzar | Marca autorizado=true, cambia estado a "Autorizada" |
| Autorizar presupuesto | Presupuesto en estado "Enviado" | Cambia a "Aprobado" |
| Se puede remitir NR | Cirugía autorizada, no cancelada/suspendida | Genera remito y cambia estado a "En tránsito" |
| Se puede cargar consumo | Cirugía autorizada, no cancelada | Carga consumo desde remito |
| Se puede autorizar FV | Cirugía no facturada, no cancelada/suspendida, docs no incompletas, cirugía autorizada | Emite factura y cambia estado a "Finalizada" |
| Se puede validar consumo | Consumo existe, no validado ni facturado | Marca consumo como "Validado" |
| Se puede liquidar instrumentador | Cirugía no cancelada, instrumentador asignado | Genera liquidación |
| Documentación completa | Todos los items del checklist completados | Status "Apta para facturar" |
| Cirugía apta para facturar | Documentación "Apta para facturar" \+ consumo validado | Se habilita "Facturar" en acciones |

### Archivos de reglas

| Archivo | Responsabilidad |
| :---- | :---- |
| businessRules.ts | 5 validadores: canAutorizarFV, canRemitirNR, canCargarConsumo, canValidateConsumption, canLiquidarInstrumentador |
| automations.ts | Máquina de estados: getNextState(currentState) — avance lineal de estados |
| cirugias.utils.ts | getFacturacionStatus, getPendientePrincipal, computeKpis, computeDocProgress |
| cirugias.constants.ts | Mapas de colores, listas de estados, definición de columnas, tabs del expediente |

### Máquina de estados (automations.ts)

Sin autorizar → Pendiente → Autorizada → En preparación → En tránsito → Realizada → Finalizada

                                                                              ↑

Sin consumo ──────────────────────────────────────────────────────────────────────┘

Estados laterales: Suspendida, Cancelada (recuperables via recoverSurgery → Pendiente)

**PENDIENTE**: Las reglas de negocio están implementadas como validadores que retornan { allowed, reason }, pero NO todas las acciones las usan consistentemente. Algunas acciones en el store avanzan el estado automáticamente sin verificar precondiciones.

---

## 10\. Reglas Visuales y de UX

### Obligatorio

1. **Estado CX es el color visual principal** — Única columna con fondo de color intenso. Todo lo demás debe ser neutro o suave en comparación.  
2. **No llenar todo de badges fuertes** — Preparación usa badges con fondo suave \+ borde. Doc/Consumo/Fact usan punto indicador con texto neutro.  
3. **Coordinador no compite visualmente** con médico/instrumentador/vendedor — Se muestra como texto simple text-muted-foreground.  
4. **No volver a agregar preview lateral fijo** — Eliminado por fricción. Acceso al expediente por doble click o botón.  
5. **No agregar KPIs arriba de la tabla de Cirugías** — Prohibido por el usuario.  
6. **Filtros operativos visibles — Los 7 filtros rápidos siempre en la barra.**  
7. **Tabla prioriza espacio y operación** — Padding compacto, texto pequeño, máxima área útil.

### Mobile first solo en módulos que lo necesitan

| Módulo | Mobile first | Razón |
| :---- | :---- | :---- |
| Coordinadores | Sí | Los coordinadores usan el sistema desde el celular en el hospital |
| Calendario | Sí | Consulta rápida de agenda quirúrgica |
| Tableros Operativos | Sí | Monitoreo operativo en movimiento |
| Cirugías | No | Uso principal en desktop, operación intensiva |
| Expediente | No | Requiere ancho para tabs y formularios |
| Dashboard | Parcial | KPIs visibles, pero detalles en desktop |

---

## 11\. Módulos Nuevos o en Desarrollo

### A. Coordinadores en Detalle

**Objetivo**: Herramienta de seguimiento y control de cirugías por coordinador operativo.

**Por qué debe ser mobile first**: Los coordinadores trabajan dentro y fuera del hospital, necesitan ver el estado de sus cirugías desde el celular en tiempo real. No son usuarios de escritorio.

#### Estructura actual

- **Archivo único**: src/app/coordinadores/page.tsx (\~488 líneas, **monolítico**)  
- **Sin componentes separados**: Toda la lógica (filtros, KPIs, kanban, lista, cards) está en un solo archivo  
- **Sin hooks específicos**: No existe useCoordinadoresFilters ni useCoordinadoresData  
- **Sin utils específicos**: Las constantes STATE\_COLORS, PREP\_COLORS, PIPELINE\_STAGES, COORDINATORS están definidas inline en el archivo

#### Filtros disponibles

| Filtro | Tipo | Valores | Implementación |
| :---- | :---- | :---- | :---- |
| Coordinador | Select | Todos, Sin asignar, Nelson, Ezequiel | Funcional |
| Estado | Select | Todos los estados \+ Suspendida | Funcional |
| Búsqueda libre | Input text | Paciente, médico, institución, ID, PR Nº | Funcional |
| Vista | Botones toggle | Kanban / Lista | Funcional |

#### Cards que muestra (kanban)

Cada TrackingCard muestra: ID CX, Estado CX (badge color), Paciente, Fecha \+ Hora, Médico \+ Institución, indicadores de Preparación, Documentación, Consumo, Facturado, Logística, y Coordinador (solo si vista global). Las cards se ordenan por fecha dentro de cada columna.

#### Cómo abre expediente

Click en cualquier card o fila de lista → openExpediente(surgery.id) → drawer global (SurgeryDrawer). No navega a /cirugias sino que abre el drawer directamente desde el contexto de useExpedienteDrawer().

#### Cada coordinador ve solo sus cirugías

Parcialmente implementado. El filtro por coordinador funciona correctamente como selector visual, pero no hay permisos reales porque no hay autenticación. Cualquier usuario puede ver las cirugías de cualquier coordinador.

#### Qué falta para mobile first

- **Layout responsive**: El kanban de 7 columnas (lg:grid-cols-7) no es usable en mobile. Se necesita un layout alternativo (scroll horizontal, stack vertical, o swipe entre columnas)  
- **Cards adaptativas**: Las cards actuales son muy densas para mobile. Se necesita una versión simplificada con menos indicadores  
- **Touch targets**: Los badges de estado y los filtros select tienen targets muy pequeños (\< 32px) para interacción táctil  
- **Vista default mobile**: En mobile, la vista lista debería ser default en lugar de kanban  
- **FAB o barra de acciones rápida**: Acciones frecuentes (cambiar estado, agregar nota) necesitan acceso directo desde la card sin abrir expediente completo

#### Qué habría que modularizar

- **Extraer TrackingCard**: Actualmente es un useCallback inline. Debe ser un componente .tsx propio en src/components/coordinadores/  
- **Extraer STATE\_COLORS / PREP\_COLORS**: Están duplicados respecto a cirugias.constants.ts y los board views. Deben importarse desde constantes compartidas  
- **Extraer COORDINATORS**: Hardcodeado como const. Debería venir del store o de una constante centralizada  
- **Crear useCoordinadoresFilters**: La lógica de filtros (coordinador, estado, búsqueda) está inline. Debe ser un hook propio  
- **Crear useCoordinadoresData**: Los useMemo de filtrado, agrupación por coordinador, kanban por estado y estadísticas deberían estar en un hook  
- **Separar vista kanban**: KanbanView como componente propio  
- **Separar vista lista**: ListView como componente propio

#### Notificaciones

PENDIENTE — No hay sistema de notificaciones real. Los coordinadores no reciben alertas cuando una cirugía cambia de estado, se asigna a su nombre, o requiere atención.

#### Autorizadas sin fecha

Se muestran en el pipeline (columna "Autorizada") pero no hay alerta visual específica que indique que la cirugía está autorizada pero sin fecha de cirugía asignada.

#### Pendientes principales

- Mobile first responsive  
- Notificaciones push o in-app  
- Vista de cirugías autorizadas sin fecha asignada  
- Seguimiento por responsable con timeline  
- Acciones rápidas desde la card (cambiar estado, agregar nota)  
- Filtros por pendiente principal  
- Modularizar el archivo monolítico

### B. Calendario Quirúrgico en Detalle

**Objetivo**: Vista calendario de la programación quirúrgica, para planificación y consulta rápida.

#### Estructura actual

- **Archivo único**: src/app/calendario/page.tsx (\~692 líneas, **monolítico**)  
- **Sin componentes separados**: Toda la lógica (3 vistas, filtros, navegación, sidebar, dialogs) está en un solo archivo  
- **Sin hooks específicos**: No existe useCalendarioFilters ni useCalendarioData  
- **Sin utils específicos**: Las constantes STATE\_COLORS, DAY\_NAMES, MONTH\_NAMES, TIME\_SLOTS, las funciones helper getMonthDays, getWeekDays, dateKey, isToday, isSameMonth están definidas inline  
- **Sub-componentes inline**: SurgeryPill está definido como función dentro del componente principal

#### Vistas existentes

| Vista | Key | Descripción | Grid | Navegación |
| :---- | :---- | :---- | :---- | :---- |
| Mensual | mensual | Grilla de 7 columnas (Lun-Dom), cada celda muestra hasta 3 pills \+ "+N más" | grid-cols-7 | Mes a mes |
| Semanal | semanal | Grilla de 7 columnas \+ eje horario (07:00-21:00), pills posicionadas por hora | grid-cols-\[60px\_repeat(7,1fr)\] | Semana a semana |
| Diario | diario | Lista vertical de cards con hora, paciente, médico, institución, clasificación | Lista simple | Día a día |

Las 3 vistas comparten: navegación (Anterior/Hoy/Siguiente), header con label de periodo, y filtros.

#### Filtros existentes

| Filtro | Tipo | Componente | Implementación |
| :---- | :---- | :---- | :---- |
| Búsqueda libre | Input text | SearchInput | Busca en paciente, médico, institución, ID |
| Estado | Select | FilterSelect con SURGERY\_STATE\_OPTIONS | Funcional |
| Clasificación | Select | FilterSelect con CLASSIFICATION\_OPTIONS | Funcional |
| Médico | Select | FilterSelect con opciones dinámicas del store | Funcional |
| Coordinador | — | **No implementado** | Falta |

Botón "Limpiar filtros" aparece cuando hay algún filtro activo.

#### Cómo maneja cirugías sin hora

En la vista **semanal**, las cirugías se filtran por s.time \>= timeSlot && s.time \< nextHour. Las cirugías sin hora (s.time vacío o undefined) no aparecen en ningún slot horario. En la vista **diaria**, las cirugías sin hora se ordenan al final (sort con a.time || "99:99"), mostrando "—" como hora. En la vista **mensual**, no se distingue entre cirugías con y sin hora (solo se muestra s.patient.split(",")\[0\] en compact mode).

#### Cómo maneja cirugías autorizadas sin fecha

Las cirugías con estado "Autorizada" pero sin fecha asignada (s.date vacío o s.state \=== "Sin fecha") se agrupan en surgeriesByDate solo si tienen s.date truthy. Esto significa que **las cirugías sin fecha NO aparecen en ninguna vista del calendario**. Solo son visibles desde otros módulos (Cirugías, Coordinadores).

#### Cómo abre expediente

Click en cualquier pill (mensual/semanal) o card (diaria) → openExpediente(surgery.id) → drawer global (SurgeryDrawer). También en el dialog de detalle de día: click en una card → openExpediente(s.id) \+ cierre del dialog.

#### Sidebar

La sidebar derecha (w-72) contiene 3 cards:

1. **Resumen del mes**: Cirugías este mes, Pendientes autorizar, Completadas  
2. **Distribución por estado**: Barras horizontales con colores por estado (top 6\)  
3. **Próximas cirugías**: Lista de cirugías en los próximos 7 días (máx. 8\)

#### Dialog de detalle de día

Cuando un día del mes tiene más de 3 cirugías, se muestra "+N más". Click → Dialog con listado completo de cirugías de ese día. Cada card muestra estado, paciente, médico, institución, hora y clasificación. Click en card → openExpediente(s.id) \+ cierre del dialog.

#### Qué falta para autorizadas sin fecha

- **Sección dedicada**: Agregar una sección "Sin fecha" o "Autorizadas sin fecha" debajo del calendario o en la sidebar, listando las cirugías con estado Autorizada/Sin fecha que no aparecen en el grid  
- **Indicador visual**: Mostrar un contador en la sidebar con la cantidad de cirugías autorizadas pendientes de fecha  
- **Acción rápida**: Botón para asignar fecha directamente desde el calendario sin ir al expediente completo

#### Qué falta para filtro por coordinador

- **Select de coordinador**: Agregar un FilterSelect adicional con opciones dinámicas (Nelson, Ezequiel, Sin asignar)  
- **Filtrar surgeries por s.coordinadorCx**: Similar al filtro de médico existente  
- **Reutilizar patrón**: Copiar la estructura del filtro de médico (surgeonFilter) adaptada a coordinador

#### Qué habría que modularizar

- **Extraer SurgeryPill**: Componente propio en src/components/calendario/  
- **Extraer STATE\_COLORS**: Duplicado en múltiples archivos. Importar desde constantes compartidas  
- **Extraer funciones helper**: getMonthDays, getWeekDays, dateKey, isToday, isSameMonth a un utils propio  
- **Crear useCalendarioData**: Los useMemo de filtrado, agrupación por fecha, estadísticas mensuales, distribución por estado, próximas cirugías deberían estar en un hook  
- **Separar vista mensual**: MonthlyView como componente propio  
- **Separar vista semanal**: WeeklyView como componente propio  
- **Separar vista diaria**: DailyView como componente propio  
- **Separar sidebar**: CalendarSidebar como componente propio  
- **Separar dialog de día**: DayDetailDialog como componente propio

#### Bug conocido

**NOTA**: El calendario usa Radix Tooltip con asChild (línea 237), que es el patrón que causa re-render infinito. Debe reemplazarse por title nativo, igual que se hizo en CirugiaRow.tsx.

#### Pendientes principales

- Filtro por coordinador  
- Vista de cirugías autorizadas sin fecha  
- Drag & drop para reprogramar  
- Indicadores de conflicto (médico en dos cirugías simultáneas)  
- Mobile first  
- Reemplazar Radix Tooltip por title nativo  
- Modularizar el archivo monolítico

### C. Tableros Operativos en Detalle

**Objetivo**: Vista operativa del flujo de cirugías con métricas y seguimiento por área.

#### Ruta actual

/tableros-operativos → src/app/tableros-operativos/page.tsx → renderiza OperationalBoardPage

#### Componentes actuales

| Archivo | Componente | Líneas aprox. | Responsabilidad |
| :---- | :---- | :---- | :---- |
| OperationalBoardPage.tsx | OperationalBoardPage | \~110 | Contenedor: tabs, shared data, routing |
| GeneralBoardView.tsx | GeneralBoardView | \~375 | Tab General: KPIs, distribución, urgentes, completadas |
| CoordinadoresBoardView.tsx | CoordinadoresBoardView | \~170 | Tab Coordinadores: stats \+ kanban por coordinador |
| WeeklySurgeryBoardView.tsx | WeeklySurgeryBoardView | \~182 | Tab Semana: vista semanal con navegación |
| BillingBoardView.tsx | BillingBoardView | \~143 | Tab Facturación: pipeline financiero |
| DocumentationBoardView.tsx | DocumentationBoardView | \~158 | Tab Documentación: pipeline con progreso |
| MedicoBoardView.tsx | MedicoBoardView | \~329 | Tab Médico: tabla expandible por cirujano |
| PatientsBoardView.tsx | PatientsBoardView | \~276 | Tab Pacientes: tabla expandible por paciente |

Total: 8 archivos, \~1743 líneas.

#### Tabs existentes

| Tab | Key | Icono | Componente | Descripción resumida |
| :---- | :---- | :---- | :---- | :---- |
| General | general | BarChart3 | GeneralBoardView | Dashboard general con KPIs |
| Coordinadores | coordinadores | Users | CoordinadoresBoardView | Vista por coordinador |
| Semana | semana | CalendarDays | WeeklySurgeryBoardView | Vista semanal de cirugías |
| Facturación | facturacion | DollarSign | BillingBoardView | Pipeline de facturación |
| Documentación | documentacion | FileCheck | DocumentationBoardView | Pipeline de documentación |
| Médico | medico | Stethoscope | MedicoBoardView | Análisis por cirujano |
| Pacientes | pacientes | UserCircle | PatientsBoardView | Análisis por paciente |

#### Qué muestra cada tab

**General**: 7 KPIs (Total, Hoy, Esta semana, Pendientes, En proceso, Completadas, Facturación mes), indicadores de avance (Autorización %, Facturación %, Completadas %), distribución por estado con barras horizontales, distribución por clasificación, items que requieren atención (Sin autorizar / Sin fecha / Pendiente), últimas completadas.

**Coordinadores**: KPIs por coordinador (Total, Pendientes, Completadas, Facturadas), kanban de 3 columnas (Nelson, Ezequiel, Sin asignar) con cards mostrando ID, Estado, Paciente, Médico, Fecha, Clasificación, Doc status, Facturado.

**Semana**: Navegación entre semanas (Anterior/Hoy/Siguiente), stats de la semana (Total, Pendientes, Completadas), grid de 7 columnas con cards de cirugías por día, ordenadas por hora.

**Facturación**: 5 KPIs (Sin Presupuesto, Con Presupuesto, Pend. Facturar, Facturadas, Cobros Pendientes), pipeline de 5 columnas (Sin Presupuesto → Con Presupuesto → Realizada → Pend. Facturar → Facturada) con cards por cirugía.

**Documentación**: 6 KPIs (Incompletas, Pendientes, Completas, Aptas Facturar, Facturadas, % Avance doc.), pipeline de 5 columnas (Incompleta → Pendiente → Completa → Apta Facturar → Facturada) con cards mostrando progreso del checklist.

**Médico**: 5 KPIs (Médicos, Top Médico, Facturación Total, % Completado Prom., Pendientes), tabla expandible por cirujano con 11 columnas (Médico, Total, Completadas, Pendientes, Facturadas, % Compl., % Fact., Facturación, Instituciones, Clasif. Top, expandir), detalle expandible con instituciones y últimas cirugías, gráfico de clasificación por médico con barras apiladas.

**Pacientes**: 6 KPIs (Pacientes, Recurrentes, Activos, Completados, Top Paciente, Top Institución), búsqueda de pacientes, tabla expandible por paciente con 10 columnas (Paciente, Cirugías, Completadas, Pendientes, Facturadas, Instituciones, Médicos, Clasificaciones, Última fecha, expandir), detalle expandible con instituciones, médicos y cirugías.

#### Qué datos toma del store

| Dato del store | Tabs que lo usan | Cómo lo accede |
| :---- | :---- | :---- |
| store.surgeries | Todos | Props desde OperationalBoardPage |
| store.getDocStatus(surgeryId) | Coordinadores, Documentación, Médico (indirecto) | Llamada directa al store pasado como prop |
| store.getConsumoBySurgeryId(surgeryId) | — | No usado actualmente |
| store.getCobrosBySurgeryId(surgeryId) | — | No usado actualmente |
| store.comprobantes | General, Facturación, Médico | Props: store.comprobantes |
| store.cobros | Facturación | Props: store.cobros |
| store.getDocumentChecklistBySurgeryId(surgeryId) | Documentación | Llamada directa al store |

Los board views reciben store como prop tipo any, lo que permite acceso directo a getters y arrays. El tipo any es un code smell que debería corregirse tipando correctamente el store.

#### Qué métricas calcula

- **Tasa de autorización**: autorizadas / activas \* 100 (General)  
- **Tasa de facturación**: facturadas / activas \* 100 (General)  
- **Tasa de completado**: completadas / activas \* 100 (General, Médico)  
- **Facturación del mes**: Suma de FV del mes actual (General, Facturación)  
- **Cobros pendientes**: Suma de saldo de cobros Pendiente/Parcial (Facturación)  
- **Progreso documental**: items completados / items totales \* 100 por cirugía (Documentación)  
- **% Avance doc. global**: (completas \+ aptas \+ facturadas) / total \* 100 (Documentación)  
- **Revenue por médico**: Suma de FV de cirugías de ese médico (Médico)  
- **Top médico**: Médico con más cirugías (Médico)  
- **Pacientes recurrentes**: Pacientes con 2+ cirugías (Pacientes)

#### Qué acciones son funcionales

- **Navegación entre tabs**: Cambio de tab activo, scroll interno ✓  
- **Navegación semanal**: Anterior/Siguiente/Hoy en el tab Semana ✓  
- **Búsqueda de pacientes**: Filtrado en tiempo real en el tab Pacientes ✓  
- **Expandir/colapsar filas**: En tabs Médico y Pacientes ✓  
- **Hover sobre cards**: Sombra de elevación en todas las cards ✓

#### Qué acciones son solo visuales/mock

- **Click en cards**: Las cards tienen cursor-pointer y hover:shadow-sm pero **no abren expediente**. No hay openExpediente() en ningún board view.  
- **Click en KPIs**: No navegan a ningún lado. Son solo informativos.  
- **Click en items urgentes**: No abren expediente ni tabla filtrada.  
- **Click en distribución por estado**: No filtra Cirugías por ese estado.

#### Qué falta para que sea operativo real

- **Acción de apertura de expediente**: Todas las cards deberían abrir openExpediente(surgeryId) al hacer click  
- **Filtros compartidos**: Los tabs no tienen filtros propios (salvo Pacientes con búsqueda). Se necesitarían filtros por fecha, coordinador, estado dentro del tablero  
- **Acciones rápidas**: Botones directos en las cards (cambiar estado, agregar nota, facturar) sin salir del tablero  
- **Tipo del store**: Reemplazar store: any por el tipo real del store  
- **Exportación**: No hay opción de exportar datos (CSV, PDF) desde los tableros  
- **Período configurable**: Los KPIs son siempre "mes actual" o "semana actual". No se puede seleccionar un rango de fechas custom  
- **Comparación**: No hay comparación entre períodos (mes actual vs mes anterior)

#### Riesgos de duplicar lógica de Cirugías

- **STATE\_COLORS**: Duplicado en GeneralBoardView, CoordinadoresBoardView, WeeklySurgeryBoardView, BillingBoardView, DocumentationBoardView, MedicoBoardView, PatientsBoardView, y coordinadores/page.tsx, y calendario/page.tsx. Son **10 archivos** con la misma constante. Cualquier cambio de color debe replicarse en 10 lugares. **Riesgo ALTO** de inconsistencia.  
- **Cálculo de KPIs**: Los board views recalculan totales por estado con .filter() inline en vez de usar computeKpis() de cirugias.utils.ts. Esto diverge del método centralizado y puede dar resultados distintos si cambia la definición de estados.  
- **Lógica de "activas"**: OperationalBoardPage filtra activeSurgeries (no Cancelada, no Suspendida), pero cada tab puede recibir surgeries o activeSurgeries indistintamente. No hay un criterio unificado documentado.  
- **Color de estados**: Los board views usan clases Tailwind inline ("bg-amber-500 text-white") en vez de las constantes de cirugias.constants.ts (CX\_STATE\_CELL\_COLORS). Los tonos pueden no coincidir.  
- **Tipo de store any**: Permite acceder a cualquier getter sin tipado, lo que facilita errores silenciosos si cambia la API del store.

**Archivos**: src/components/operational-boards/ — 8 componentes (\~1743 líneas totales)

---

## 12\. Antes de Agregar Features Nuevas

**REGLA OBLIGATORIA**: Antes de agregar funcionalidad nueva a Coordinadores, Calendario o Tableros Operativos, se debe verificar que el código existente está suficientemente modular. Si no lo está, modularizar primero.

### Principio: No agrandar monolitos

Tres de los módulos más activos del sistema son actualmente archivos page.tsx monolíticos:

| Módulo | Líneas | Monolítico | Componentes propios | Hooks propios |
| :---- | :---- | :---- | :---- | :---- |
| Coordinadores | \~488 | Sí | 0 | 0 |
| Calendario | \~692 | Sí | 0 | 0 |
| Tableros Operativos | \~110 (page) \+ 1633 (boards) | Parcial | 7 BoardViews | 0 |

### Reglas antes de agregar features

1. **Si Coordinadores o Calendario superan 300 líneas en page.tsx, dividir primero en componentes**. No agregar lógica nueva a un archivo que ya es monolítico. La feature nueva va al componente o hook que corresponda, no al page.tsx.  
     
2. **No seguir agregando lógica en page.tsx monolíticos**. Cada nuevo filtro, cada nuevo cálculo, cada nuevo estado debe ir en un hook o componente propio. El page.tsx debe ser solo orquestador: importa hooks, importa componentes, renderiza.  
     
3. **Crear hooks y utils específicos**. Antes de agregar un filtro nuevo en Coordinadores, crear useCoordinadoresFilters. Antes de agregar lógica de datos en Calendario, crear useCalendarioData. Antes de agregar helpers de fecha, crear calendario.utils.ts.  
     
4. **Reutilizar helpers existentes de Cirugías**. No reescribir computeKpis(), getFacturacionStatus(), getPendientePrincipal() que ya existen en cirugias.utils.ts. No redefinir STATE\_COLORS o CX\_STATE\_CELL\_COLORS que ya existen en cirugias.constants.ts. Importar y reutilizar.  
     
5. **Documentar cambios en el lugar correcto. Las features, componentes, hooks y bugs deben ir a CURRENT\_STATE.md, WORKLOG.md o HANDOFF.md. El Contexto Maestro solo se actualiza cuando cambia una decisión rectora de producto, dominio, arquitectura o estrategia IA.**

### Checklist pre-feature

Antes de implementar cualquier feature nueva en Coordinadores, Calendario o Tableros:

- [ ] ¿El page.tsx supera las 300 líneas? Si sí, modularizar primero.  
- [ ] ¿La lógica que voy a agregar pertenece a un componente existente o necesita uno nuevo?  
- [ ] ¿Hay un helper en cirugias.utils.ts o cirugias.constants.ts que pueda reutilizar?  
- [ ] ¿El store ya tiene la acción o getter que necesito, o debo crear uno nuevo?  
- [ ] ¿Estoy duplicando constante STATE\_COLORS? Si sí, importar desde constantes compartidas.  
- [ ] ¿Creé el hook específico del módulo antes de agregar la lógica inline?  
- [ ] ¿Actualicé CURRENT\_STATE.md, WORKLOG.md o HANDOFF.md según corresponda? ¿El Contexto Maestro solo se tocó si cambió una decisión rectora?

---

## 13\. Componentes Críticos y Riesgos

| Archivo | Responsabilidad | Riesgo | Qué puede romper | Cuándo tocarlo | Cuándo NO tocarlo |
| :---- | :---- | :---- | :---- | :---- | :---- |
| store.ts | Fuente de verdad, todas las entidades y acciones | **Muy alto** | Todo el sistema, datos, persistencia | Cambio de modelo, nueva acción, fix de bug | Refactor cosmético, mover código sin necesidad |
| CirugiasTable.tsx | Grilla principal con scroll y sticky | Alto | Loop infinito en setScrollState, layout de tabla | Fix de scroll, nueva columna, sticky | Cambio visual menor que no afecta funcionalidad |
| CirugiaRow.tsx | Fila con sticky cells y doble click | Alto | Selección, navegación, sticky | Nueva columna, cambio de interacción | Cambio de padding/color sin pedirlo |
| CirugiaStatusCell.tsx | Celda de estado con color | Medio | Colores visuales incorrectos | Cambio de paleta de colores (autorizado) | — |
| CirugiaActionsCell.tsx | Acciones contextuales por fila | Alto | Acciones incorrectas, reglas de negocio mal aplicadas | Nueva acción, cambio de regla de negocio | — |
| useCirugiasFilters.ts | Lógica de filtros, chips, clear | Alto | Filtros no funcionan, chips no se limpian | Nuevo filtro, fix de bug | — |
| useCirugiaActions.ts | Handlers de acciones y diálogos | Alto | Acciones no se ejecutan, diálogos no abren | Nueva acción, fix de bug | — |
| useCirugiaSelection.ts | Selección y panel state | Alto | Expediente no se abre/cierra | Cambio de flujo de navegación | — |
| NewSurgeryDialog.tsx | Wizard de nueva cirugía | Alto | Creación de cirugía, presupuesto | Nuevo campo, nuevo paso | — |
| ExpedienteFullView.tsx | Vista completa del expediente | Alto | Tabs, header, navegación | Nueva tab, cambio de layout | — |
| FichaCirugia.tsx | Formulario editable de cirugía | Alto | Edición de datos, guardado | Nuevo campo, modo edición | — |
| PresupuestoPanel.tsx | Detalle de presupuesto | Medio | Acciones de presupuesto | Nueva acción, cambio de layout | — |
| ConsumoPanel.tsx | Panel de consumo | Medio | Edición de consumo | Nueva funcionalidad | — |
| DocumentacionPanel.tsx | Checklist documental | Medio | Toggle de items, progreso | Nuevo tipo de documento | — |
| TrazabilidadPanel.tsx | Trazabilidad | Bajo | Actualmente solo visualización | Nueva funcionalidad | — |
| businessRules.ts | Validadores de negocio | Alto | Reglas de negocio incorrectas | Nueva regla, fix de bug | Nunca sin entender el dominio |
| cirugias.constants.ts | Constantes del módulo | Alto | Colores, columnas, estados incorrectos | Nuevo estado, nueva columna | Nunca sin entender el impacto visual |
| app-shell.tsx | Provider de sidebar y expediente drawer | Medio | Sidebar no funciona, drawer no abre | Nueva ruta, cambio de sidebar | — |
| sidebar.tsx | Navegación lateral | Medio | Links incorrectos, rutas rotas | Nueva ruta, reorganización | — |

---

## 14\. Convenciones para Futuros Agentes

### Cómo trabajar en este proyecto sin romperlo

1. **Antes de modificar, ubicar archivo exacto** — Usar Glob/Grep para encontrar el archivo correcto. No asumir dónde está algo.  
2. **No tocar Cirugías si la tarea es de otro módulo** — El módulo de Cirugías está avanzado y funcional. Solo debe modificarse si la tarea lo requiere explícitamente.  
3. **No duplicar helpers** — Si existe una función en cirugias.utils.ts, formatters.ts o statusHelpers.ts, usarla. No crear una nueva.  
4. **No cambiar mapas de color sin autorización** — Los colores de estado están definidos en cirugias.constants.ts y CX\_STATE\_CELL\_COLORS. Cambiarlos afecta toda la UI.  
5. **No poner lógica de negocio en componentes visuales** — La lógica va en hooks (src/hooks/) o en lib (src/lib/). Los componentes son para UI.  
6. **Hooks para lógica, componentes para UI** — Separación estricta. Si un componente tiene más lógica que renderizado, extraer a hook.  
7. **Store como fuente temporal del prototipo — No duplicar estado en componentes mientras dure la maqueta. En backend real, la fuente de verdad pasa a PostgreSQL y servicios server-side.**  
8. **Documentar cambios** — Agregar entrada al worklog (/home/z/my-project/worklog.md) con Task ID, archivos, motivo.  
9. **Crear componentes chicos** — Si un componente supera 300 líneas, considerar dividirlo.  
10. **No mezclar flujo de PR con remito/factura** — El flujo operativo sigue un orden: PR → PE → NR → Consumo → FV → Cobro. No saltar pasos.  
11. **No crear remito ni factura desde wizard de PR** — El wizard de nueva cirugía solo crea la cirugía y opcionalmente el presupuesto. El flujo operativo se dispara después.  
12. **El flujo operativo se dispara al autorizar PR/CX, no al crearlo** — Crear una cirugía o presupuesto no debe generar automáticamente pedidos, remitos ni facturas.  
13. **Radix SelectItem value="" crashea** — Usar valor sentinela "none" si se necesita un valor vacío.  
14. **Radix Tooltip con asChild causa loop infinito** — Usar title nativo en lugar de Radix Tooltip.  
15. **Radix DropdownMenu Portal puede causar loop infinito** — Considerar quitar Portal si causa problemas.  
16. **Zustand inline .filter() en selectores causa loop** — Usar useMemo para datos derivados.  
17. **Si un componente supera 300 líneas, dividir** — Mantener componentes enfocados y legibles.

---

## 15\. Worklog / Historial de Decisiones

### Sesión 1 — Fix infinite loop en CirugiaRow (Tooltip \+ asChild)

| Campo | Valor |
| :---- | :---- |
| Fecha | 2026-05 (sesión anterior) |
| Cambio | Removido TooltipProvider redundante de tooltip.tsx y 5 archivos |
| Archivos | tooltip.tsx, cirugias/page.tsx, calendario/page.tsx, tablero/page.tsx, PresupuestoPanel.tsx, MaterialTransitoPanel.tsx |
| Motivo | TooltipProvider anidado causaba re-render infinito |
| Impacto | Infinite loop resuelto |
| Pendiente | Verificar que no hay otros TooltipProvider anidados |

### Sesión 2 — Tableros Operativos

| Campo | Valor |
| :---- | :---- |
| Fecha | 2026-05 (sesión anterior) |
| Cambio | Creado módulo de Tableros Operativos con 7 tabs |
| Archivos | 8 componentes nuevos \+ 1 ruta \+ sidebar \+ app-shell \+ dashboard |
| Motivo | Necesidad de vista operativa del flujo de cirugías |
| Impacto | Nuevo módulo funcional |
| Pendiente | Mobile first, más métricas |

### Sesión 3 — QA de búsquedas, filtros y persistencia local y Tooltip infinite loop

| Campo | Valor |
| :---- | :---- |
| Fecha | 2026-05 (sesión anterior) |
| Cambio | generateId arranca en 100, createSurgery usa Math.max de IDs existentes. Radix Tooltip reemplazado por title nativo en CirugiaRow |
| Archivos | idGenerators.ts, store.ts, CirugiaRow.tsx |
| Motivo | Duplicate key error y Tooltip infinite re-render |
| Impacto | Errores de console resueltos |
| Pendiente | El duplicate key puede volver si localStorage tiene datos previos corruptos |

### Sesión 4 — Coordinadores y Calendario como sidebar entries

| Campo | Valor |
| :---- | :---- |
| Fecha | 2026-05 (sesión anterior) |
| Cambio | Agregados Coordinadores y Calendario como sub-items en sidebar |
| Archivos | sidebar.tsx, OperationalBoardPage.tsx, tableros-operativos/page.tsx |
| Motivo | Acceso rápido a estas vistas |
| Impacto | Navegación mejorada |
| Pendiente | — |

### Sesión 5 — Coordinadores y Calendario como páginas dedicadas

| Campo | Valor |
| :---- | :---- |
| Fecha | 2026-05 (sesión anterior) |
| Cambio | Creada página /coordinadores con pipeline kanban \+ lista. Calendario ya existía como página. Sidebar actualizado como entradas top-level. "Semana" restaurado en Tableros. Eliminado patrón sub-item. |
| Archivos | app/coordinadores/page.tsx (nuevo), sidebar.tsx, app-shell.tsx, OperationalBoardPage.tsx |
| Motivo | Coordinadores y Calendario son herramientas dedicadas, no tabs de tableros |
| Impacto | Rutas dedicadas, mejor UX |
| Pendiente | Mobile first en Coordinadores |

### Componentes eliminados o legacy

| Componente | Estado | Nota |
| :---- | :---- | :---- |
| ExpedientePreview.tsx | Legacy | No se renderiza. Se puede eliminar en limpieza |
| ExpedientePreviewHeader.tsx | Legacy | Sub-componente del preview |
| ExpedientePreviewActions.tsx | Legacy | Sub-componente del preview |
| ExpedientePreviewPending.tsx | Legacy | Sub-componente del preview |
| ExpedientePreviewStatusChips.tsx | Legacy | Sub-componente del preview |
| ExpedientePreviewSummary.tsx | Legacy | Sub-componente del preview |
| useExpedientePreview.ts | Legacy | Simplificado, no se usa en page.tsx |
| app/tablero/ | Legacy | Ruta vieja, reemplazada por /tableros-operativos |

---

## 16\. Roadmap Recomendado — lectura vigente y bloques históricos

### Prioridad inmediata

| Tarea | Módulo | Descripción |
| :---- | :---- | :---- |
| Validación funcional post-entrega CHATZAI-025 | Cirugías | Revisar en producto la entrega de 28 mejoras UX: wizard, presupuesto, filtros, acciones, informes scaffold y columnas reordenables |
| Revisión de estabilidad UI tras CHATZAI-025 | UI | Confirmar que dropdowns, popovers, chips y menús operan sin loops ni regressions en preview |
| QA de búsquedas, filtros y persistencia local | Store | Validar búsquedas accent-insensitive, chips OR/AND, reset de columnas, persistencia de columnOrder y estados tras recarga |
| Coordinadores mobile first | Coordinadores | Responsive, touch-friendly, cards compactas |
| Calendario quirúrgico | Calendario | Agregar filtro por coordinador, cirugías sin fecha, mobile first |
| Tableros operativos | Tableros | Métricas más profundas, filtros por coordinador, semana real |

### Prioridad media

| Tarea | Módulo | Descripción |
| :---- | :---- | :---- |
| Facturación/cobranza real | Ventas | Página de facturación funcional, cobros con medios de pago |
| Comprobantes asociados más profundo | Expediente | Acciones funcionales en la grilla (imprimir, descargar, modificar) |
| Stock/depósito independiente | Stock | Página de stock funcional con movimientos, alertas, reposición |
| Logística independiente | Logística | Página de logística con mapa, seguimiento de envíos |
| Remitos funcionales | Remitos | Crear remito desde presupuesto, devolver, cerrar |
| Consumo funcional | Consumo | Cargar consumo real, validar, calcular diferencias |
| Instrumentadores | Instrumentadores | Página de gestión de instrumentadores con liquidaciones |

### Futuro

| Tarea | Módulo | Descripción |
| :---- | :---- | :---- |
| Backend real | Sistema | API routes, Prisma activo, PostgreSQL |
| Autenticación | Sistema | next-auth, login, sesiones |
| Permisos reales | Roles | RBAC por rol (admin, coordinador, vendedor, etc.) |
| Adjuntos reales | Documentación | Subida de archivos (S3 o local) |
| Reportes avanzados | Reportes | Exportación PDF/Excel, gráficos interactivos |
| Migración desde XAdmin | Sistema | Import de datos históricos |
| Notificaciones | Sistema | Push notifications, email, in-app |
| Auditoría avanzada | Sistema | Log de cambios por entidad, exportable |

---

## 17\. Pendientes Técnicos

| Pendiente | Área | Descripción | Prioridad |
| :---- | :---- | :---- | :---- |
| Backend pendiente | Infra | No hay API routes funcionales, todo es cliente-side | Alta |
| Prisma no activo | Infra | db.ts existe pero no se conecta a nada | Alta |
| Autenticación mock | Seguridad | currentUserId: "USR-0001" hardcodeado | Alta |
| Datos mock | Data | 26 archivos de mock data, sin datos reales | Alta |
| Adjuntos no implementados | Documentación | Checklist es solo toggle, no hay subida de archivos | Media |
| Abrir expediente en nueva pestaña | UX | Botón existe pero no funciona (pendiente) | Media |
| Limpieza de componentes legacy | Mantenimiento | 6 componentes de preview lateral sin uso | Baja |
| Integración real de notificaciones | Sistema | No hay sistema de notificaciones | Media |
| Persistencia real | Infra | localStorage se pierde si se limpia el browser | Alta |
| Duplicate key CX-0001 recurrente | Bug | Puede reaparecer si localStorage tiene datos corruptos | Alta |
| DropdownMenu Portal infinite loop | Bug | Radix Portal puede causar re-render infinito | Alta |
| CirugiasTable scroll loop | Bug | setScrollState en useEffect puede causar Maximum update depth | Media |
| Calendario Tooltip con asChild | Bug | Usa Radix Tooltip con asChild (patrón problemático) | Media |
| Zustand migration dedup | Store | La migración deduplica surgeries pero no otras entidades | Baja |

---

## 18\. Formato y Convenciones del Documento

### Marcadores especiales usados

| Marcador | Significado |
| :---- | :---- |
| ⚠️ NO TOCAR SIN CUIDADO | Archivo o módulo que solo debe modificarse con necesidad explícita |
| PENDIENTE | Funcionalidad planeada pero no implementada |
| LEGACY | Componente o archivo que ya no se usa pero se conserva |
| REUTILIZAR | Componente o función que debe reutilizarse, no duplicarse |
| BUG CONOCIDO | Error conocido que puede reaparecer |

### Convenciones de código

- **Archivos**: kebab-case para nombres de archivo (mock-surgeries.ts, cirugias.utils.ts)  
- **Componentes**: PascalCase para exports (CirugiasTable, ExpedienteFullView)  
- **Hooks**: camelCase con prefijo use (useCirugiasFilters, useCirugiaActions)  
- **Store actions**: camelCase (createSurgery, authorizeBudget)  
- **Store getters**: camelCase con prefijo get (getSurgeryById, getDocStatus)  
- **Constantes**: UPPER\_SNAKE\_CASE (CX\_STATE\_CELL\_COLORS, CIRUGIAS\_COLUMNS)  
- **Tipos**: PascalCase (Surgery, Presupuesto, SurgeryState)  
- **Comentarios**: Español para documentación de negocio, inglés para código técnico

---

## 19\. Validación Final

### Rutas actuales verificadas

- ✅ / — Dashboard funcional  
- ✅ /cirugias — Módulo Cirugías completo  
- ✅ /expediente — Placeholder  
- ✅ /coordinadores — Página funcional  
- ✅ /calendario — Página funcional  
- ✅ /tableros-operativos — Página funcional  
- ✅ /stock, /cajas, /remitos, /consumo, /logistica, /material-transito — Placeholders  
- ✅ /instrumentadores, /vencimientos, /documentacion, /trazabilidad — Placeholders  
- ✅ /clasificaciones, /configuracion, /estadisticas, /reportes, /roles — Placeholders  
- ✅ /compras/\* (7 sub-rutas) — Placeholders  
- ✅ /ventas/\* (7 sub-rutas) — Placeholders

### Componentes existentes verificados

- ✅ 12 componentes en components/cirugias/  
- ✅ 8 diálogos en components/cirugias/dialogs/  
- ✅ 21 componentes en components/expediente/  
- ✅ 8 componentes en components/operational-boards/  
- ✅ 4 componentes en components/layout/  
- ✅ 1 archivo en components/shared/  
- ✅ 49 componentes en components/ui/ (shadcn)

### Hooks existentes verificados

- ✅ useCirugiaActions.ts  
- ✅ useCirugiasFilters.ts  
- ✅ useCirugiaSelection.ts  
- ✅ useCirugiasSorting.ts  
- ✅ useColumnVisibility.ts  
- ✅ useExpedientePreview.ts (LEGACY)  
- ✅ use-mobile.ts  
- ✅ use-toast.ts

### Store verificado

- ✅ 30+ arrays de entidades  
- ✅ 30+ acciones  
- ✅ 17+ getters  
- ✅ Persist middleware con migración de deduplicación  
- ✅ ID generation con counter seguro

### Tipos verificados

- ✅ src/types/index.ts — 596 líneas, 22 interfaces, 15+ union types  
- ✅ src/lib/cirugias.types.ts — Tipos específicos del módulo Cirugías

### README\_CIRUGIAS.md verificado

- ✅ Documenta Pasos 2-8 de la evolución del módulo  
- ✅ Reglas visuales, componentes eliminados, criterios de diseño  
- ✅ Este documento maestro complementa y amplía README\_CIRUGIAS.md

### Nada inventado

- ✅ Todos los componentes listados existen en el filesystem  
- ✅ Todos los hooks listados existen  
- ✅ Todas las rutas listadas existen  
- ✅ Las funcionalidades marcadas como "PENDIENTE" no existen como código  
- ✅ Las funcionalidades marcadas como "propuesto" son sugerencias, no código existente  
- ✅ El estado actual y el roadmap están separados y claramente diferenciados

\# MÓDULO INTELIGENTE DE COMPRAS Y STOCK (OCR \+ IA) — FUTURO, NO BLOQUEANTE PARA V1

\#\# Objetivo  
Implementar automatización asistida para compras y stock mediante OCR \+ IA contextual.

Flujo objetivo:  
PDF factura/remito/OC → OCR → detección proveedor → matching catálogo → sugerencia ingreso stock → validación humana → impacto real en stock.

\#\# Principios  
\- La IA sugiere.  
\- El usuario confirma.  
\- El ERP audita.  
\- No actualizar stock automáticamente en MVP.

\#\# Alcance MVP  
\- Upload drag & drop PDF.  
\- OCR documentos proveedor.  
\- Detección automática proveedor.  
\- Matching artículos catálogo.  
\- Alertas de costo y diferencias.  
\- Sugerencia ingreso stock.  
\- Auditoría automática.

\#\# Integraciones  
Conectar con:  
\- necesidadesCompra\[\]  
\- ordenesCompra\[\]  
\- facturasCompra\[\]  
\- stock\[\]  
\- stockMovements\[\]  
\- proveedores\[\]  
\- forecast\[\]  
\- trazabilidad\[\]  
\- vencimientos\[\]

\#\# Arquitectura recomendada  
Frontend Next.js → Backend Next.js API Routes/Server Actions → Pipeline OCR/IA backend-only → PostgreSQL gestionado.

\#\# Estrategia técnica recomendada  
FASE 1:  
\- OCR/API externa.  
\- Validación humana.  
\- Matching catálogo.

FASE 2:  
\- Alertas inteligentes.  
\- Histórico de costos.  
\- Sugerencias de compra.  
\- Forecast.

\#\# Costos estimados MVP  
Volumen estimado:  
\- 10 OC/día.  
\- 5 remitos proveedor/día.  
\- 10 facturas proveedor/día.  
\- \~550 documentos/mes.

Costo mensual estimado:  
USD 80–165/mes.

\#\# Tiempo estimado MVP  
1 a 2 meses.

\# CRITERIO DE INSTALACIÓN — OBSIDIAN SKILLS Y GRAPHIFY

\#\# Decisión actual  
No instalar Obsidian Skills ni Graphify pago en la fase inicial de OSSUM. Cualquier grafo local gratuito debe ser auxiliar, no fuente de verdad.

La fase inicial debe priorizar:  
\- Gentle-AI como orquestador.  
\- Engram como memoria persistente.  
\- Knowledge V2 \+ AGENTS.md como fuente de verdad operativa para agentes; grafo local solo como ayuda puntual si no agrega costo ni complejidad.  
\- Codex como agente principal.  
\- OpenCode como agente secundario táctico.

\#\# Cuándo instalar Obsidian Skills  
Instalar Obsidian Skills cuando OSSUM ya tenga una base documental activa y sostenida en Markdown, especialmente si existe una bóveda o carpeta de conocimiento con:  
\- decisiones técnicas estables;  
\- ADRs;  
\- flujos operativos;  
\- documentación funcional por módulo;  
\- bitácoras de trabajo;  
\- handoffs entre agentes;  
\- notas vivas de producto.

Condición recomendada de instalación:  
\- backend Next.js/Prisma/PostgreSQL ya iniciado;  
\- estructura /docs o /knowledge estabilizada;  
\- uso real de documentación semanal;  
\- necesidad de convertir notas en contexto accionable para agentes.

No instalar si todavía el problema principal es construir código base, corregir bugs o cerrar arquitectura inicial.

\#\# Cuándo instalar Graphify  
Instalar Graphify cuando OSSUM necesite un mapa de conocimiento más amplio que el análisis local de código.

Casos donde sí conviene:  
\- el backend Next.js/Prisma/PostgreSQL ya está creado;  
\- existen múltiples módulos conectados: cirugías, stock, compras, facturación, cobros, documentos;  
\- hay SQL, documentación, frontend y backend que necesitan analizarse en conjunto;  
\- se necesita visualizar dependencias entre entidades, endpoints, modelos y flujos;  
\- CodeGraph ya no alcanza para entender el impacto global.

Condición recomendada de instalación:  
\- después de tener modelos principales, APIs iniciales y documentación técnica suficiente;  
\- antes de refactors grandes o auditorías de arquitectura;  
\- cuando OSSUM pase de MVP a producto modular robusto.

\#\# Regla de decisión  
Instalar herramientas nuevas solo si reducen complejidad real.

No instalar herramientas por entusiasmo técnico.

Orden recomendado:  
1\. Reconstrucción documental y Knowledge V2.  
2\. Gentle-AI workspace.  
3\. Engram \+ Engram Sync.  
4\. SDD/OpenSpec \+ Skill Registry \+ Context7.  
5\. Browser automation / Diagnose / Caveman según tarea.  
6\. Graphify o grafo avanzado solo cuando haya backend y documentación suficiente.  
7\. Obsidian Skills solo cuando la documentación viva sea parte estable del flujo semanal.

\#\# Riesgo a evitar  
Demasiadas herramientas al inicio pueden generar:  
\- más configuración que avance real;  
\- duplicación de contexto;  
\- agentes con información inconsistente;  
\- pérdida de foco sobre backend, datos y reglas de negocio.

Para OSSUM, primero arquitectura y producto; después grafo y documentación avanzada.

\---

\#\# 0.2 Actualización canónica 2026-06-03 — Entorno AI Gentle Stack para OSSUM COR

Se decide iniciar GPT-027F.0 como preparación formal del entorno de trabajo IA antes de avanzar con GPT-027F.5A Backend Foundation. El objetivo es ordenar VSCode/OpenCode/Codex con AI Gentle Stack, reducir consumo de tokens, sostener memoria persistente y trabajar por specs/tareas sin perder control humano.

\#\#\# Decisión operativa

OSSUM COR adoptará AI Gentle Stack como ecosistema base de trabajo, no como piloto automático. Franco mantiene el control de producto y aprobación; los agentes ejecutan bajo límites de alcance, permisos y handoff.

Componentes a activar desde el inicio:

\- Engram como memoria persistente local.  
\- Engram Sync como sincronización versionada vía Git desde el inicio.  
\- SDD / OpenSpec como metodología para paquetes importantes.  
\- Skill Registry para indexar skills disponibles sin cargarlas todas en cada tarea.  
\- Context7 para documentación viva de librerías y frameworks.  
\- Persona como mentor técnico/producto/arquitectura.  
\- Caveman para reducir tokens en reportes, handoffs y respuestas de subagentes.  
\- Diagnose para debugging disciplinado de bugs y regresiones.  
\- Permissions / Guardrails para proteger secretos, archivos sensibles y cambios peligrosos.  
\- Browser automation para QA visual, smoke tests y validación E2E.  
\- Plugins visuales si ayudan a ver estado de subagentes, tokens, contexto y actividad.  
\- Perfiles OpenCode / super sub-agentes para separar exploración, propuesta, diseño, tareas, implementación y validación.

Componentes a dejar para etapa posterior:

\- Notion MCP, solo si Notion pasa a ser fuente real de documentación.  
\- Jira MCP, solo si se usa Jira como gestión formal de tareas.  
\- GitHub MCP, cuando se trabaje con PRs/issues/branches de forma más formal.  
\- Postgres/Supabase MCP con escritura, solo en entorno DEV y nunca en producción directa sin confirmación humana.

\#\#\# Flujo SDD esperado

1\. Engram recuerda contexto previo.  
2\. Orchestrator inicia la fase SDD.  
3\. sdd-explore investiga repo, contexto y archivos.  
4\. sdd-propose propone solución.  
5\. sdd-spec escribe la especificación OpenSpec.  
6\. sdd-design baja el diseño técnico.  
7\. sdd-tasks divide en tareas accionables.  
8\. sdd-apply implementa.  
9\. reviewer-qa y browser-qa validan.  
10\. docs-handoff actualiza worklog, knowledge y handoff.  
11\. Engram guarda session\_summary.  
12\. Engram Sync versiona la memoria vía Git.

\#\#\# Regla de agentes paralelos

Se permite paralelizar para ganar velocidad, pero no editar los mismos archivos al mismo tiempo.

Permitido:

\- backend-builder trabajando en backend.  
\- docs-handoff actualizando knowledge/worklog.  
\- browser-qa validando UI.  
\- repo-explorer leyendo estructura.  
\- reviewer-qa revisando diff.  
\- otro agente trabajando en rama separada o paquete distinto.

Prohibido:

\- dos agentes editando prisma/schema.prisma.  
\- dos agentes editando src/lib/store.ts.  
\- dos agentes tocando Cirugías al mismo tiempo.  
\- dos agentes modificando el mismo service/API.  
\- merge sin revisión humana.

\#\#\# Principio de contexto y tokens

Knowledge gobierna. Engram recuerda. SDD ordena. Task Brief enfoca. Skills guían tareas puntuales. Caveman comprime comunicación. Diagnose evita fixes a ojo. Browser valida. Franco aprueba.

Cada tarea debe cargar solo el contexto necesario:

\- AGENTS.md.  
\- Task Brief actual.  
\- Spec/OpenSpec correspondiente.  
\- 1 a 3 skills como máximo.  
\- Archivos puntuales del repo.

No debe cargarse todo el Contexto Maestro, todo el grafo ni todas las skills salvo necesidad real. En tareas normales, el agente debe leer primero AGENTS.md, PROJECT\_BRIEF.md, CANONICAL\_DECISIONS.md, CURRENT\_STATE.md y la spec correspondiente.

\#\#\# Primer entregable GPT-027F.0

Preparar entorno y documentación base:

\- Configurar Gentle-AI en scope workspace.  
\- Activar Engram y Engram Sync.  
\- Inicializar SDD/OpenSpec.  
\- Refrescar Skill Registry.  
\- Crear/actualizar AGENTS.md.  
\- Crear/ordenar knowledge/workflow.  
\- Definir ENGRAM\_POLICY.md.  
\- Definir TASK\_BRIEF\_TEMPLATE.md.  
\- Definir HANDOFF\_TEMPLATE.md.  
\- Definir QUALITY\_GATES.md.  
\- Configurar permisos/guardrails.  
\- Configurar perfiles de modelos/agentes.  
\- Registrar primera session\_summary en Engram.  
\- Documentar resultado en checklist y worklog.

Esta tarea debe completarse antes de iniciar GPT-027F.5A Backend Foundation. La condición mínima de avance es tener AGENTS.md, Knowledge Index, Project Brief, Current State, Canonical Decisions, Quality Gates y specs GPT-027F.0 creados o actualizados.

