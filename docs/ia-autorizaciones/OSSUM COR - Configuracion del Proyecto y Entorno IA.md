Actualizado: 2026-06-15.  
Addendum operativo: Phase 1 DB Cirugías ya fue integrada en master. Queda vigente la regla Engram/OpenCode: los agentes NO deben levantar Next dev server automáticamente, NO usar Start-Process y NO usar /api como healthcheck. El usuario levanta el server manualmente desde la carpeta correcta. Los agentes deben priorizar validaciones CLI salvo instrucción explícita. Para cambios con schema/migraciones se debe usar branch/worktree separado; para smoke/read-only no hace falta. Próximo foco recomendado: Fase 2A — Spec Autorización \+ Documentos, antes de lector de autorizaciones conectado al flujo real.

\# ACTUALIZACIÓN 2026-06-15 — REGLAS OPERATIVAS POST PHASE 1

\#\# Estado actual del proyecto

OSSUM COR ya tiene integrado en master el camino técnico real:

login → usuario interno → empresa activa → API protegida → PostgreSQL/Prisma → AuditEvent.

Bloques cerrados:

\- Auth frontend \+ Bearer API client.  
\- Current user context.  
\- Contactos API read \+ mutaciones con auditoría.  
\- Auditoría API y vista /auditoria.  
\- /cirugias-api read-only como vista técnica paralela.  
\- Surgeries API enriquecida con patient, doctor, institution.  
\- ADR y spec DB Cirugías.  
\- Phase 1 DB Cirugías integrada en master.  
\- Auth mapping DEV corregido en seed.  
\- Contactos flicker corregido.  
\- /cirugias-api alineado a cxStatus \+ prepStatus.

\#\# Regla permanente para agentes / OpenCode

Para evitar loops, consumo innecesario de tokens y procesos colgados:

\- Los agentes NO deben levantar Next dev server automáticamente.  
\- Los agentes NO deben usar Start-Process para abrir servidores.  
\- Los agentes NO deben esperar /api como healthcheck.  
\- El usuario levanta manualmente el server desde la carpeta correcta.  
\- Para healthcheck se usan rutas reales como /login, /cirugias-api o endpoint específico.  
\- Si el server no responde, el agente debe frenar y pedir acción humana.  
\- Por defecto, el agente debe ejecutar validaciones CLI y dejar smoke HTTP/browser como pendiente, salvo instrucción explícita.

\#\# Regla de branch / worktree

\- Smoke/read-only/spec/docs: puede correr en el mismo working tree.  
\- Schema/migraciones/refactor backend sensible: usar branch o worktree separado.  
\- Un archivo crítico, un agente escritor por vez.  
\- No usar git add .

\#\# Regla actual sobre Cirugías

/cirugias principal sigue intacto y no debe migrarse todavía.

El nuevo modelo real vive en backend/API y se valida mediante /cirugias-api. La migración de /cirugias principal requiere Task Brief específico porque aún depende de Zustand, hooks y expediente.

\#\# Próximo paso recomendado

1\. Smoke final post Phase 1\.  
2\. Fase 2A — Spec Autorización \+ Documentos.  
3\. Fase 2B — Lector de autorizaciones aislado.  
4\. Integración controlada lector/documento → cirugía real, solo después de aprobación.

\---

Actualizado: 2026-06-09.

\# Actualización 2026-06-05 — Full Gentleman \+ 5A-01

Estado del entorno:

\- Git inicializado y limpio.  
\- GGA hook instalado y config local activa.  
\- Engram consolidado en proyecto único ossum\_cor\_project.  
\- Engram Sync OK.  
\- Context7 portable en .opencode/opencode.json.  
\- default\_agent: gentle-orchestrator.  
\- Caveman y Diagnose presentes.  
\- .engram/ versionable para portabilidad entre PCs.

Estado backend:

\- Supabase project: ossum-cor-dev.  
\- .env.local con DATABASE\_URL PostgreSQL/Supabase.  
\- Prisma 7 config adaptada y validada.  
\- Schema inicial Prisma creado y validado.

Próximo paso:

GPT-027F.5A-01R — Review QA schema inicial Prisma.

No ejecutar migraciones todavía.

Handoff actualizado:  
https://docs.google.com/document/d/1sagO3yjL-HMmyetpsVnHgS2tsGraASJu5WkZP69AePE/edit?usp=drivesdk

\---

\# Actualización de estado 2026-06-04

OSSUM COR queda listo para continuar en otro chat.

Estado:

\- Knowledge V2 cerrado.  
\- Gentle-AI y OpenCode operativos.  
\- Agente principal: gentle-orchestrator.  
\- SDD inicializado.  
\- Engram activo.  
\- Context7 conectado en runtime.  
\- Caveman y Diagnose creados como skills privadas.  
\- Tests, TypeScript y build en verde.

Próximo frente:

GPT-027F.5A — Backend Foundation.

Decisiones de backend:

\- Supabase.  
\- Supabase Auth.  
\- Storage diferido.  
\- Stock fuera del primer commit.  
\- Primer schema limitado a multiempresa, contactos, cirugía mínima y auditoría.

Handoff:  
https://docs.google.com/document/d/1sagO3yjL-HMmyetpsVnHgS2tsGraASJu5WkZP69AePE/edit?usp=drivesdk

\---

\# OSSUM COR — Configuración del Proyecto y Entorno IA

Última actualización: 2026-06-03  
Proyecto: OSSUM COR  
Documento: Configuración operativa del entorno de desarrollo, agentes IA, memoria, SDD, permisos y flujo de trabajo.  
Estado: Vigente para preparación GPT-027F.0 y posterior GPT-027F.5A Backend Foundation.

\---

\#\# 1\. Objetivo del documento

Este documento define cómo debe configurarse y utilizarse el entorno de trabajo de OSSUM COR para avanzar de forma ordenada con VSCode, OpenCode CLI, Codex, Gentle-AI, Engram, SDD/OpenSpec, skills, validaciones y documentación.

El objetivo principal no es sumar herramientas por entusiasmo técnico, sino reducir fricción, ahorrar tokens, evitar pérdida de contexto, proteger archivos sensibles y permitir que los agentes trabajen con foco por tareas.

Este documento debe ser leído junto con:

\- PROYECTO\_CONTEXTO\_MAESTRO.  
\- ADR-027E — Backend / DB / ORM / Auth / Storage.  
\- Checklist OSSUM COR — Plan Mensual Gerencia y Técnico.  
\- AGENTS.md del repositorio.  
\- Worklog del proyecto.  
\- Knowledge o docs internos del repo.

\---

\#\# 2\. Principio rector

OSSUM COR debe trabajar con IA de forma asistida, no automática.

Franco mantiene el control de producto, negocio y aprobación final. Los agentes pueden explorar, proponer, implementar y validar, pero no deben tomar decisiones de negocio críticas ni cambiar arquitectura, base de datos, autenticación, seguridad o reglas operativas sin confirmación explícita.

Regla corta:

Knowledge gobierna. Engram recuerda. SDD ordena. Task Brief enfoca. Skills guían. Caveman comprime. Diagnose depura. Browser valida. Franco aprueba.

\---

\#\# 3\. Stack técnico canónico del proyecto

Para V0, OSSUM COR adopta el siguiente stack técnico:

\- Frontend: Next.js / React / TypeScript / Tailwind.  
\- Backend inicial: Next.js API Routes y/o Server Actions.  
\- ORM: Prisma.  
\- Base de datos: PostgreSQL gestionado.  
\- Proveedor DB a evaluar: Supabase o Neon.  
\- Auth/Storage: Supabase opcional si reduce complejidad inicial.  
\- VPS: etapa posterior, no para el inicio.  
\- Persistencia actual: Zustand/localStorage como transición temporal.  
\- Fuente de verdad objetivo: backend \+ PostgreSQL.

Regla crítica:

Next.js \+ Prisma no debe convertirse en backend improvisado dentro de componentes React. La lógica de negocio debe vivir en servicios server-side, validadores, permisos, transacciones y auditoría.

\---

\#\# 4\. Entorno operativo principal

El entorno principal de trabajo será:

\- VSCode como editor y centro operativo.  
\- OpenCode CLI como capa de ejecución de agentes en local.  
\- Codex como agente principal de implementación.  
\- ChatGPT como copiloto estratégico, documental y de arquitectura.  
\- Gemini Assist Code solo como apoyo puntual mientras esté disponible.  
\- Gentle-AI como capa de organización del flujo.

No se debe trabajar con varios agentes escribiendo el mismo archivo al mismo tiempo.

\---

\#\# 5\. Componentes AI Gentle Stack a activar desde el inicio

\#\#\# 5.1 Engram

Uso esperado:

\- Memoria persistente local del proyecto.  
\- Guardar resúmenes de sesión.  
\- Registrar decisiones tomadas.  
\- Recordar handoffs y contexto técnico.  
\- Reducir necesidad de releer documentos gigantes.

No debe reemplazar al Contexto Maestro ni al worklog. Engram recuerda; la documentación gobierna.

\#\#\# 5.2 Engram Sync

Uso esperado:

\- Sincronizar memoria de Engram mediante Git.  
\- Versionar memoria desde el inicio.  
\- Poder recuperar contexto si cambia el entorno.  
\- Evitar memoria local aislada sin backup.

Debe activarse desde el arranque de GPT-027F.0.

\#\#\# 5.3 SDD / OpenSpec

Uso esperado:

\- Ordenar tareas grandes antes de implementar.  
\- Separar exploración, propuesta, especificación, diseño, tareas, implementación y validación.  
\- Evitar que Codex implemente directo sin entender alcance.

Flujo esperado:

1\. Explorar repo y contexto.  
2\. Proponer solución.  
3\. Escribir spec.  
4\. Diseñar approach técnico.  
5\. Dividir tareas.  
6\. Implementar.  
7\. Validar.  
8\. Documentar.  
9\. Guardar resumen.

\#\#\# 5.4 Skill Registry

Uso esperado:

\- Indexar skills disponibles.  
\- Cargar solo skills necesarias por tarea.  
\- Evitar meter todo el contexto en cada prompt.  
\- Mejorar precisión sin inflar tokens.

Regla:

Cada tarea debe usar entre 1 y 3 skills como máximo salvo necesidad explícita.

\#\#\# 5.5 Context7

Uso esperado:

\- Consultar documentación actualizada de librerías, frameworks y patrones técnicos.  
\- Evitar decisiones basadas en memoria vieja.  
\- Validar cambios de Next.js, Prisma, Supabase, Neon, Auth, testing y herramientas.

Debe usarse especialmente para:

\- Prisma.  
\- Next.js API Routes / Server Actions.  
\- Supabase.  
\- Neon.  
\- Auth.  
\- Testing.  
\- Librerías nuevas.

\#\#\# 5.6 Persona

Uso esperado:

\- Mentor técnico.  
\- Mentor de producto.  
\- Arquitecto de dominio.  
\- Revisor de decisiones.

Debe ayudar a pensar, no a escribir código sin control.

\#\#\# 5.7 Caveman

Uso esperado:

\- Reducir tokens en reportes internos.  
\- Generar handoffs compactos.  
\- Resumir estado de subagentes.  
\- Evitar respuestas largas cuando no suman.

Formato recomendado:

\- Done.  
\- Changed.  
\- Files.  
\- Risks.  
\- Next.

\#\#\# 5.8 Diagnose

Uso esperado:

\- Debugging disciplinado.  
\- Evitar fixes a ciegas.  
\- Reproducir error.  
\- Encontrar causa raíz.  
\- Aplicar fix mínimo.  
\- Validar regresión.

Debe usarse para bugs como:

\- Maximum update depth exceeded.  
\- Loops de Radix Tooltip / Portal.  
\- Errores de build TypeScript.  
\- Errores Prisma.  
\- Migraciones fallidas.  
\- Problemas de SSR/hidratación.

\#\#\# 5.9 Permissions / Guardrails

Uso esperado:

\- Proteger archivos sensibles.  
\- Bloquear lectura o escritura de secretos.  
\- Evitar cambios peligrosos.  
\- Requerir confirmación humana en acciones críticas.

Reglas mínimas:

\- No mostrar ni copiar claves de .env.  
\- No escribir en producción sin aprobación.  
\- No borrar archivos masivamente.  
\- No modificar schema.prisma sin tarea específica.  
\- No cambiar auth/security sin ADR o aprobación explícita.  
\- No tocar Cirugías si la tarea no lo requiere.

\#\#\# 5.10 Browser automation

Uso esperado:

\- Validación visual.  
\- Smoke tests.  
\- E2E básico.  
\- Revisión de rutas.  
\- Confirmar que la app funciona en navegador real.

Debe usarse antes de cerrar tareas que afecten UI o flujo operativo.

\#\#\# 5.11 Plugins visuales

Uso esperado:

\- Ver actividad de agentes.  
\- Ver uso de tokens/contexto.  
\- Ver estado de subtareas.  
\- Entender qué agente está editando qué.

Son útiles si reducen confusión. No deben convertirse en distracción.

\---

\#\# 6\. Componentes a dejar para etapa posterior

No activar al inicio salvo necesidad real:

\- Notion MCP.  
\- Jira MCP.  
\- GitHub MCP formal.  
\- Postgres/Supabase MCP con escritura.  
\- Obsidian Skills.  
\- Graphify avanzado.

Criterio:

Primero entorno, memoria, SDD, AGENTS.md, backend foundation y documentación base. Después integraciones externas.

\---

\#\# 7\. Roles de agentes recomendados

\#\#\# 7.1 Orchestrator

Responsabilidad:

\- Leer Task Brief.  
\- Elegir agentes.  
\- Definir secuencia.  
\- Dividir tareas.  
\- Evitar conflictos de archivos.  
\- Pedir confirmación si hay riesgo.

No debe implementar directamente salvo tareas menores.

\#\#\# 7.2 Repo Explorer

Responsabilidad:

\- Leer estructura.  
\- Ubicar archivos.  
\- Identificar dependencias.  
\- No modificar archivos.

Debe usarse antes de tocar código desconocido.

\#\#\# 7.3 Product / Domain Architect

Responsabilidad:

\- Interpretar reglas de negocio.  
\- Verificar coherencia con el circuito quirúrgico.  
\- Evitar que se copie XAdmin sin criterio.  
\- Cuidar que cirugía siga siendo entidad central.

No debe inventar reglas si no están documentadas.

\#\#\# 7.4 Backend / DB Agent

Responsabilidad:

\- Prisma.  
\- PostgreSQL.  
\- Migraciones.  
\- Seeds.  
\- Servicios server-side.  
\- API Routes / Server Actions.  
\- Validaciones backend.  
\- Auditoría.

Archivos sensibles:

\- prisma/schema.prisma.  
\- prisma/seed.ts.  
\- src/lib/db.ts.  
\- src/lib/services/\*.  
\- src/app/api/\*.  
\- src/lib/validators/\*.  
\- src/lib/permissions/\*.

\#\#\# 7.5 Frontend / UI Agent

Responsabilidad:

\- React.  
\- Componentes.  
\- UX.  
\- Integración con API.  
\- Estados de carga/error.  
\- Formularios.

No debe meter lógica crítica de negocio dentro de componentes.

\#\#\# 7.6 QA / Testing Agent

Responsabilidad:

\- TypeScript.  
\- Build.  
\- Tests.  
\- Smoke tests.  
\- E2E.  
\- Browser QA.  
\- Regresiones.

Debe validar antes del cierre de tarea.

\#\#\# 7.7 Docs / Handoff Agent

Responsabilidad:

\- Worklog.  
\- Contexto Maestro.  
\- ADRs.  
\- Knowledge.  
\- Task summaries.  
\- Handoff entre sesiones.

Debe dejar trazabilidad clara.

\#\#\# 7.8 Reviewer Agent

Responsabilidad:

\- Revisar diff.  
\- Detectar riesgos.  
\- Ver duplicación.  
\- Ver coherencia con arquitectura.  
\- Confirmar que no se rompieron reglas canónicas.

No debe implementar nuevas features durante la revisión.

\---

\#\# 8\. Reglas para trabajo paralelo

Permitido en paralelo:

\- repo-explorer leyendo archivos.  
\- backend-builder trabajando en un módulo backend específico.  
\- docs-handoff documentando lo ya hecho.  
\- browser-qa validando una URL.  
\- reviewer-qa revisando diff.  
\- otro agente trabajando en rama separada.

Prohibido en paralelo:

\- Dos agentes editando schema.prisma.  
\- Dos agentes editando store.ts.  
\- Dos agentes tocando Cirugías.  
\- Dos agentes modificando la misma API route.  
\- Dos agentes modificando el mismo service.  
\- Un agente refactorizando mientras otro implementa sobre esos archivos.  
\- Merge automático sin revisión.

Regla práctica:

Un archivo crítico, un agente escritor por vez.

\---

\#\# 9\. Archivos críticos del proyecto

\#\#\# 9.1 Muy alto riesgo

\- src/lib/store.ts  
\- prisma/schema.prisma  
\- src/types/index.ts  
\- src/app/cirugias/page.tsx  
\- src/components/cirugias/\*  
\- src/hooks/useCirugiaActions.ts  
\- src/hooks/useCirugiasFilters.ts  
\- src/hooks/useCirugiaSelection.ts  
\- src/lib/businessRules.ts  
\- src/lib/automations.ts  
\- src/lib/cirugias.constants.ts  
\- src/lib/cirugias.utils.ts

\#\#\# 9.2 Alto riesgo

\- src/app/api/\*  
\- src/lib/services/\*  
\- src/lib/validators/\*  
\- src/lib/permissions/\*  
\- src/components/expediente/\*  
\- src/components/operational-boards/\*  
\- src/app/coordinadores/page.tsx  
\- src/app/calendario/page.tsx

\#\#\# 9.3 Regla para archivos críticos

Antes de modificar un archivo crítico:

1\. Identificar por qué hace falta tocarlo.  
2\. Revisar impacto.  
3\. Confirmar que no hay otro agente editándolo.  
4\. Hacer cambio mínimo.  
5\. Validar build/test.  
6\. Documentar.

\---

\#\# 10\. Carga de contexto por tarea

Cada tarea debe cargar solo lo necesario.

Contexto mínimo recomendado:

\- AGENTS.md.  
\- Task Brief actual.  
\- Spec/OpenSpec correspondiente si existe.  
\- ADR relevante.  
\- 1 a 3 skills.  
\- Archivos puntuales del repo.

No cargar por defecto:

\- Todo el Contexto Maestro.  
\- Todo el repo.  
\- Todo el grafo.  
\- Todas las skills.  
\- Todos los ADRs.

Regla:

Más contexto no siempre mejora la respuesta; muchas veces aumenta ruido y contradicciones.

\---

\#\# 11\. Task Brief estándar

Cada tarea enviada a Codex/OpenCode debe tener este formato mínimo:

\`\`\`md  
\# TASK BRIEF — OSSUM COR

\#\# ID  
GPT-027F.0 / GPT-027F.5A / etc.

\#\# Objetivo  
Qué se debe lograr.

\#\# Alcance permitido  
Archivos, módulos o carpetas que se pueden tocar.

\#\# Fuera de alcance  
Qué no se debe tocar.

\#\# Contexto obligatorio  
Documentos, ADRs, specs, skills o reglas que deben leerse.

\#\# Reglas de negocio relevantes  
Reglas funcionales que no se pueden romper.

\#\# Pasos esperados  
1\. Explorar.  
2\. Proponer.  
3\. Implementar.  
4\. Validar.  
5\. Documentar.

\#\# Validaciones obligatorias  
\- npm run build  
\- npx tsc \--noEmit  
\- npx prisma format  
\- npx prisma generate  
\- tests si corresponden  
\- browser QA si toca UI

\#\# Entregable  
Qué archivos/documentos deben quedar actualizados.

\#\# Handoff esperado  
Resumen corto con cambios, archivos, validaciones, riesgos y próximos pasos.  
\`\`\`

\---

\#\# 12\. Quality Gates mínimos

Antes de cerrar una tarea técnica:

\- TypeScript sin errores.  
\- Build correcto.  
\- Tests relevantes ejecutados.  
\- Prisma format/generate si se tocó schema.  
\- Migración revisada si aplica.  
\- Smoke test de rutas si toca UI/API.  
\- Browser QA si toca flujo visual.  
\- Worklog actualizado.  
\- Handoff generado.  
\- Engram session\_summary guardado.

Para backend:

\- No hay lógica de negocio en componentes.  
\- company\_id obligatorio en entidades operativas.  
\- Validadores centralizados.  
\- Servicios server-side.  
\- Auditoría en eventos críticos.  
\- Transacciones donde corresponda.

Para UI:

\- No duplicar constantes.  
\- No romper Cirugías.  
\- No usar Radix Tooltip con asChild si genera loops.  
\- No hacer inline .filter() en Zustand selectors.  
\- No esconder filtros operativos importantes.

\---

\#\# 13\. Configuración de memoria Engram

\#\#\# 13.1 Qué guardar

Guardar en Engram:

\- Resumen de sesión.  
\- Decisiones tomadas.  
\- Archivos modificados.  
\- Validaciones realizadas.  
\- Bugs encontrados.  
\- Riesgos abiertos.  
\- Próximos pasos.

\#\#\# 13.2 Qué no guardar

No guardar:

\- Secretos.  
\- Tokens.  
\- Passwords.  
\- API keys.  
\- Datos fiscales sensibles.  
\- Información privada innecesaria.  
\- Dumps completos de base de datos.

\#\#\# 13.3 Formato de session\_summary

\`\`\`md  
\# SESSION SUMMARY

Fecha:  
Tarea:  
Agente principal:

\#\# Done

\#\# Changed files

\#\# Decisions

\#\# Validations

\#\# Risks

\#\# Next steps  
\`\`\`

\---

\#\# 14\. Permisos y seguridad

\#\#\# 14.1 Requiere confirmación humana

\- Cambiar proveedor de DB.  
\- Cambiar Auth.  
\- Tocar producción.  
\- Ejecutar migraciones destructivas.  
\- Borrar datos.  
\- Borrar carpetas completas.  
\- Cambiar reglas de permisos.  
\- Cambiar modelo multiempresa.  
\- Modificar schema.prisma estructuralmente.  
\- Cambiar flujo de Cirugías.  
\- Cambiar reglas de facturación/cobro.

\#\#\# 14.2 Prohibido

\- Exponer claves de entorno.  
\- Subir secretos a documentación.  
\- Hardcodear tokens.  
\- Saltar validaciones.  
\- Crear endpoints sin permisos.  
\- Usar frontend como fuente de verdad final.  
\- Inventar reglas de negocio.

\---

\#\# 15\. Flujo de trabajo recomendado para GPT-027F.0

GPT-027F.0 prepara el entorno. No debe iniciar el backend foundation todavía.

Entregables esperados:

\- Gentle-AI configurado en workspace.  
\- Engram funcionando.  
\- Engram Sync activo con Git.  
\- SDD/OpenSpec inicializado.  
\- Skill Registry refrescado.  
\- AGENTS.md actualizado.  
\- Carpeta knowledge/workflow ordenada.  
\- ENGRAM\_POLICY.md creado.  
\- TASK\_BRIEF\_TEMPLATE.md creado.  
\- HANDOFF\_TEMPLATE.md creado.  
\- QUALITY\_GATES.md creado.  
\- Permisos/guardrails definidos.  
\- Perfiles de agentes/modelos definidos.  
\- Primera session\_summary registrada.  
\- Checklist actualizado.  
\- Worklog actualizado.

No hacer todavía:

\- Migraciones reales.  
\- Cambio de DB provider.  
\- Implementación grande de backend.  
\- Refactor de Cirugías.  
\- Cambios de Auth.

\---

\#\# 16\. Flujo posterior para GPT-027F.5A Backend Foundation

GPT-027F.5A puede iniciar cuando GPT-027F.0 esté cerrado.

Objetivo:

Implementar backend foundation con Prisma, PostgreSQL, servicios server-side, API Routes, seed limpio, auditoría mínima y estrategia de migración progresiva desde Zustand/localStorage.

Alcance inicial recomendado:

\- Organización.  
\- Empresas.  
\- Sucursales.  
\- Usuarios básicos.  
\- Roles/permisos iniciales.  
\- Contactos.  
\- Cirugías mínimas.  
\- Artículos mínimos.  
\- Depósitos.  
\- Auditoría mínima.

No intentar en la primera pasada:

\- Todo Facturación.  
\- Todo Cobros.  
\- Todo Stock quirúrgico.  
\- Toda trazabilidad.  
\- Toda integración fiscal.  
\- PDFs finales.

\---

\#\# 17\. Orden recomendado de ejecución

1\. Preparar entorno AI Gentle Stack.  
2\. Validar memoria y sync.  
3\. Crear AGENTS.md robusto.  
4\. Crear plantillas de task/handoff/quality.  
5\. Crear OpenSpec inicial.  
6\. Preparar GPT-027F.5A.  
7\. Implementar backend foundation por paquetes pequeños.  
8\. Validar con build/tests.  
9\. Documentar cada cierre.  
10\. Recién después ampliar módulos.

\---

\#\# 18\. Checklist rápido antes de cada sesión

Antes de arrancar:

\- ¿Cuál es el Task ID?  
\- ¿Cuál es el objetivo exacto?  
\- ¿Qué archivos se pueden tocar?  
\- ¿Qué archivos no se pueden tocar?  
\- ¿Qué skill aplica?  
\- ¿Qué decisión/ADR gobierna?  
\- ¿Hay otro agente trabajando?  
\- ¿Cuál es la validación mínima?  
\- ¿Dónde se documenta el resultado?

Después de cerrar:

\- ¿Pasó build?  
\- ¿Pasó TypeScript?  
\- ¿Se actualizaron docs?  
\- ¿Se guardó session\_summary?  
\- ¿Se actualizó checklist/worklog?  
\- ¿Quedaron riesgos abiertos?  
\- ¿Cuál es el siguiente paso?

\---

\#\# 19\. Decisión final vigente

OSSUM COR trabajará con un entorno IA ordenado y progresivo.

Primero se configura el flujo. Luego se implementa backend foundation. Después se amplían módulos.

La prioridad no es correr más rápido, sino avanzar sin romper lo que ya funciona, sin perder contexto y sin duplicar decisiones.

Este documento queda como referencia operativa para GPT-027F.0 y para todos los agentes que trabajen en el proyecto.  
