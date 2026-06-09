# VALIDATION.md — GPT-027F.0

Estado: vigente

---

## Validación documental

- Existe AGENTS.md.
- Existe knowledge/KNOWLEDGE_INDEX.md.
- Existe core mínimo.
- Existe domain mínimo.
- Existe architecture mínimo.
- Existe workflow mínimo.
- Existe spec GPT-027F.0.
- Existe archive/README.md.
- Existe `knowledge/archive/legacy-pre-v2/` para aislar legacy fuera del flujo activo.
- No quedan duplicados activos de workflow ni módulos legacy root-level compitiendo por autoridad.

---

## Validación de coherencia

- No hay backend directo antes de 0A/0B.
- Zustand/localStorage se marca como transición.
- TusFacturasAPP se marca como motor fiscal externo.
- XAdmin se marca como aprendizaje, no copia.
- Engram se marca como memoria, no fuente de verdad.
- Graphify/Obsidian quedan postergados.
- Circuito V1 incluye Devolución y Documentación.
- `archive/` no gobierna sobre Knowledge V2.
- Las referencias legacy relevantes quedaron confinadas al archive.

---

## Validación técnica

No aplica build si solo se copian docs.

Si se toca repo:

- verificar que no se modificó `src/`;
- verificar que no se modificó `prisma/schema.prisma`;
- verificar que no se instalaron dependencias;
- verificar que no se crearon migraciones.

---

## Cierre GPT-027F.0A

- Knowledge V2 quedó estructurado, saneado y utilizable como fuente modular activa.
- El legacy pre-V2 quedó archivado fuera del flujo activo.
- GPT-027F.0A puede considerarse cerrado a nivel documental.

---

## Avance GPT-027F.0B

- Existe una config efectiva de proyecto en `.opencode/opencode.json`.
- `default_agent` quedó definido como `gentle-orchestrator` en la config efectiva.
- Los comandos SDD de `.opencode/commands/` ya tienen una ruta razonable para resolver `gentle-orchestrator` y subagentes `sdd-*`.
- `mcp.engram` quedó definido en la config efectiva.
- Skill Registry refrescado con fecha en `.atl/skill-registry.md` y skills privadas visibles en el índice.
- Gentle-AI workspace quedó configurado con perfiles/agentes, plugins de proyecto y MCP local declarados.
- SDD/OpenSpec quedó inicializado y documentado en `knowledge/specs/GPT-027F.0/INIT.md`.
- Context7 quedó validado en runtime como MCP disponible y conectado en la config efectiva resuelta.
- Los plugins de proyecto exponen `background-agents` y `model-variants` desde `.opencode/plugins/`.
- La carga real de agentes y MCP fue validada post-restart.
- Existen skills privadas de proyecto para `caveman` y `diagnose` en `.opencode/skills/`.
- `AI_GENTLE_STACK.md`, `AGENT_WORKFLOW.md` y `QUALITY_GATES.md` documentan cuándo usar Caveman y Diagnose.
- Caveman quedó validada por uso real en smoke test documental previo.

- Pendiente: Engram Sync no tiene verificación runtime/documental explícita en los artefactos permitidos.
- Pendiente: guardrails no tienen validación clara más allá de permisos/config parcial.
- Diagnose quedó validada en smoke test read-only contra un bug real reproducible.
- Pendiente: GGA hook no quedó verificado; si sigue en alcance, permanece diferido.

---

## Validación GPT-027F.0B-06

- Se crearon `.opencode/skills/productivity/caveman/SKILL.md` y `.opencode/skills/engineering/diagnose/SKILL.md`.
- Caveman exige el formato `Done / Changed / Files / Validations / Risks / Next`.
- Diagnose exige el ciclo `Reproduce / Scope / Evidence / Hypothesis / Minimal Fix / Validate / Regression Check / Handoff`.
- No se modificaron `src/`, `prisma/`, `public/`, `package.json`, `.env` ni comandos SDD.

---

## Validación GPT-027F.0B-07C

- Se alineó el tracking documental de 0B con evidencia real ya registrada en config, workflow, skill registry, worklog y validaciones previas.
- `Activar Engram` y `Refrescar Skill Registry` pasan a completo por evidencia visible en `.opencode/opencode.json` y `.atl/skill-registry.md`.
- `Context7`, `default_agent`, perfiles/agentes OpenCode, SDD/OpenSpec y Caveman quedan mantenidos como completos por validación previa ya asentada.
- `Engram Sync`, `guardrails`, `Diagnose smoke test` y `GGA hook` quedan pendientes explícitos por falta de verificación clara en los artefactos permitidos.

---

## Validación GPT-027F.0B-08 — Cleanup final y cierre documental

- Se sincronizó `TASKS.md` con la realidad operativa: `session_summary` y `validación de flujo documental` pasan a completo.
- Se completó `WORKLOG.md` con entradas para 0B-03, 0B-05, 0B-07A y 0B-08.
- Se agregó regla explícita en `AGENTS.md`: todo cierre, handoff y reporte operativo debe usar Caveman. Diagnose obligatorio antes de fixes para bugs/fallas.
- Se creó `knowledge/workflow/GUARDRAILS.md` consolidando reglas de protección de archivos sensibles, concurrencia de agentes y bloqueo de backend.
- Se actualizó `QUALITY_GATES.md` exigiendo Caveman para handoffs/documentación y Diagnose para debugging.
- GPT-027F.0B queda funcionalmente completo.

### Cierre formal 0B

- Gentle-AI workspace operativo: `default_agent`, agentes `sdd-*`, Engram MCP, plugins, skills privadas.
- SDD/OpenSpec inicializado con artifacts en `knowledge/specs/GPT-027F.0/`.
- Skill Registry refrescado y vigente en `.atl/skill-registry.md`.
- Caveman validado por uso real en smoke test documental.
- Diagnose validado en smoke test read-only contra el bug `storage.setItem is not a function`.
- El bug `storage.setItem is not a function` fue reproducido y acotado a Zustand Persist + entorno de tests; el fix no fue aplicado en 0B.
- Guardrails consolidados en `GUARDRAILS.md`.
- Worklog actualizado con todas las tareas 0B ejecutadas.
- No se modificó `src/`, `prisma/`, `public/`, `package.json`, `.env` ni comandos SDD.

### Pendientes no bloqueantes (para 5A o cuando aplique)

- Engram Sync: ~~sin verificación runtime/documental explícita.~~ ~~Verificado funcional en GPT-027F.0B-FULL-01C.~~ **Consolidado y cerrado en GPT-027F.0B-FULL-01D.** Proyecto único `ossum_cor_project` (51 obs / 22 sessions). Sync local + cloud operativo. Fragmentación resuelta. MCP fijado y env var seteada. Git tracking de `.engram/` pendiente opcional.
- Guardrails: definidos pero sin validación de comportamiento de punta a punta.
- Fix de `storage.setItem is not a function`: pendiente para baseline técnica mínima / trabajo controlado posterior.
- GGA hook: sin verificación; diferido.
- Context7 portable: funciona vía config padre, no tiene entrada MCP en proyecto.

### Decisión de cierre

GPT-027F.0B queda cerrado funcionalmente. Habilita preparar GPT-027F.0C (baseline técnica mínima / fix controlado de tests) o GPT-027F.5A (Backend Foundation) si Franco decide avanzar sin baseline verde. No habilita iniciar backend sin task brief explícito.

---

## Validación GPT-027F.0B-09 — Diagnose smoke test y cierre final

- Se marcó como completo el smoke test de Diagnose sobre un bug real reproducible.
- El error `storage.setItem is not a function` fue reproducido con `npm test` y acotado a Zustand Persist + entorno de tests.
- Se dejó explícito que el fix no fue aplicado todavía.
- GPT-027F.0B queda cerrado funcionalmente a nivel documental, con próximos frentes posibles en `GPT-027F.0C` o `GPT-027F.5A`.

---

## Validación GPT-027F.5A-00B — Decisiones Backend Foundation

Decisiones cerradas por Franco para iniciar 5A:

- **DB provider**: Supabase.
- **Auth**: Supabase Auth.
- **Storage**: diferido (no requerido para el primer schema).
- **Stock**: fuera del primer commit (Item, Warehouse, StockMovement diferidos a subtarea posterior).
- **Primer schema**: Organization, Company, Branch, User, UserCompanyAccess, Contact, ContactCompanyLink, ContactGroup, ContactAddress, Surgery (mínima), AuditEvent.

### Pendientes explícitos para 5A

- Supabase project setup (URL, anon key, service_role key).
- Supabase Auth configuración inicial (redirect URLs, email templates, RLS base si aplica).
- Schema real (`prisma/schema.prisma`) con relaciones multiempresa, timestamps y campos de auditoría.
- Seed multiempresa con datos de ejemplo (Districorr / Casa Salud).
- Estrategia de migración desde Zustand/localStorage (documentada, no ejecutada en primer commit).

### Gate check

- 0A cerrado ✅
- 0B funcionalmente completo ✅
- Decisiones de Franco documentadas ✅
- 5A puede iniciar con task brief explícito y agente backend designado.

---

## Validación GPT-027F.0C-01 — Fix storage.setItem y baseline verde

### Diagnose ejecutado

- **Reproduce**: `npm test` → 24 failures en 5 archivos, todos `TypeError: storage.setItem is not a function` desde Zustand persist middleware.
- **Scope**: Afecta todos los tests que ejecutan operaciones `set()` del store (create, update, toggle). Tests de solo lectura no afectados.
- **Evidence**: Node v25 expone `globalThis.localStorage` con todos los métodos (`setItem`, `getItem`, `removeItem`) igual a `undefined`. jsdom provee `window.localStorage` funcional pero la referencia sin calificar (`localStorage`) en ESM resuelve al global roto.
- **Hypothesis**: Zustand v5 `createJSONStorage(() => localStorage)` captura el `localStorage` global de Node en vez del de jsdom.
- **Minimal Fix**: Polyfill en `setup.ts` que reemplaza `globalThis.localStorage` con un `Map<string,string>` in-memory si los métodos están rotos. Cambio complementario en `store.ts`: `localStorage` → `window.localStorage` para seguridad en producción.
- **Validate**: `npm test` → 28/28 files pass, 598/598 tests pass, 0 failures.
- **Regression Check**: `npx tsc --noEmit` → sin errores. Ningún test previamente verde se rompió.

### Baseline

- Tests: 598 passed, 10 skipped, 0 failed ✅
- TypeScript: sin errores ✅
- Build: no ejecutado (cambio mínimo en setup + 1 token en store, sin riesgo de build break).
- GPT-027F.0C-01 cerrado. Baseline de tests verde.

---

## Validación GPT-027F.0B-FULL-01C — Fijar proyecto canónico Engram

### Modificaciones aplicadas

- `.opencode/opencode.json`: MCP command de engram actualizado de `["engram", "mcp", "--tools=agent"]` a `["engram", "mcp", "--tools=agent", "--project", "ossum_cor_project"]`.
- `knowledge/workflow/ENGRAM_POLICY.md`: documentado que `ossum_cor_project` es el proyecto canónico y cómo está fijado. Sección Engram Sync actualizada con estado verificado.

### Validaciones

| Check | Resultado |
|---|---|
| `engram doctor --json` | 4 checks OK, 0 warnings, 0 errores |
| `engram sync --status --project ossum_cor_project` | Local: 1, Remote: 1, Pending: 0 ✅ |
| `engram projects list` | 3 proyectos (canónico + 2 fragmentados pendientes de consolidación) |
| No se tocó `src/` | ✅ |
| No se tocó `prisma/` | ✅ |
| No se tocó `public/` | ✅ |
| No se tocó `package.json` | ✅ |
| No se modificó `.env` | ✅ |

### Estado

- Engram Sync: **verificado funcional** (local + cloud sincronizados, chunks persistidos con 50+ observaciones totales entre proyectos).
- Proyecto canónico: **fijado como `ossum_cor_project`** en MCP command.
- Fragmentación detectada: `ossum_cor` (7 obs) y `e:\ossum_cor_project` (0 obs) pendientes de consolidación en tarea separada.
- Git repo: aún no inicializado. Chunk persistido respaldado por cloud sync de Engram pero sin versionado git.

---

## Validación GPT-027F.0B-FULL-01D — Cierre Engram consolidado

### Estado consolidado

| Métrica | Valor |
|---|---|
| Proyectos | **1** (`ossum_cor_project`) |
| Observaciones | **51** |
| Sesiones | **22** |
| Prompts | **37** |
| Sync local chunks | 2 |
| Sync remote chunks | 2 |
| Pending import | 0 |
| MCP fijado | `--project ossum_cor_project` en `.opencode/opencode.json` ✅ |
| Env var usuario | `ENGRAM_PROJECT=ossum_cor_project` ✅ |
| Fragmentación | Resuelta (consolidado) ✅ |
| Búsqueda funcional | `engram search "GPT-027F"` devuelve memorias correctamente ✅ |

### Historial de cierre

1. **0B-FULL-01**: Validación read-only de Engram Sync. Detectada fragmentación en 3 proyectos.
2. **0B-FULL-01B**: Recomendación de fijar `ossum_cor_project` como canónico vía MCP command.
3. **0B-FULL-01C**: Aplicación del fix: MCP command actualizado, política documentada, sync verificado.
4. **0B-FULL-01D**: Consolidación ejecutada. Proyecto único. Env var seteada. Tracking documental actualizado.

### Pendientes opcionales post-cierre

- Git tracking de `.engram/`: ~~decidir si incluir en `.gitignore` o versionar el chunk.~~ **Decidido en GPT-027F.0B-FULL-04B.** `.engram/` se versiona para portabilidad, excluido de GGA. `.gitignore` actualizado con ignores completos.
- GGA hook: ~~sin verificación; diferido.~~ **Config local creada en GPT-027F.0B-FULL-04B.** Hook no instalado todavía (pendiente de decisión). Ver `.gga/config` y `QUALITY_GATES.md`.
- ~~Context7 portable local: sin entrada MCP en proyecto; funciona vía config padre.~~ **Resuelto en GPT-027F.0B-FULL-03B.** Context7 definido como MCP remoto en `.opencode/opencode.json`. Config global queda como fallback.
- Guardrails: definidos en `GUARDRAILS.md` pero sin validación de comportamiento de punta a punta.

---

## Validación GPT-027F.0B-FULL-03B — Context7 portable en proyecto

### Modificaciones aplicadas

- `.opencode/opencode.json`: agregado bloque `context7` dentro de `mcp` como `{ type: remote, url: https://mcp.context7.com/mcp }`. Bloque `engram` intacto.

### Decisión

- Context7 ahora es portable: cualquier clon del repo que cargue `.opencode/opencode.json` tendrá el MCP disponible sin depender de la config global de Windows.
- La config global `C:\Users\franc\.config\opencode\opencode.json` queda como fallback. OpenCode mergea ambas definiciones; la del proyecto tiene prioridad si hay conflicto.

### Validaciones

| Check | Resultado |
|---|---|
| `opencode mcp list` | `context7` ✅ connected — `https://mcp.context7.com/mcp` |
| `opencode mcp debug context7` | MCP remoto conectado sin errores |
| Bloque `engram` intacto | `--project ossum_cor_project` presente ✅ |
| No se agregaron tokens, API keys ni `enabled: true` | ✅ |
| No se tocó `src/`, `prisma/`, `public/`, `package.json`, `.env` | ✅ |

---

## Validación GPT-027F.0B-FULL-04B — Git + GGA config local

### Modificaciones aplicadas

- `.gitignore`: reemplazada la línea única (`.atl/`) por un bloque completo con secretos, builds, dependencias, AI runtime, legacy config, backups y OS files. `.engram/` no está ignorado.
- `.gga/config`: creado con FILE_PATTERNS scoped a OSSUM COR (sin `.py`, `.go`), EXCLUDE_PATTERNS que excluye `.engram/` y `knowledge/archive/`, rules `AGENTS.md`, strict mode ON.
- `QUALITY_GATES.md`: nuevo gate de revisión automatizada (GGA) documentando alcance, exclusión, cuándo usarlo y estado de instalación pendiente.

### Decisiones

| Decisión | Resolución |
|---|---|
| `.engram/` se versiona o ignora? | **Se versiona** para portabilidad entre máquinas. Excluido de GGA. |
| `.opencode/` se ignora? | **No** — es la config activa del proyecto. |
| `.config/` se ignora? | **Sí** — es legacy. La config activa está en `.opencode/`. |
| GGA hook instalado? | **No todavía.** Config local lista, hook pendiente de instalación. |

### Validaciones

| Check | Resultado |
|---|---|
| `.gitignore` updated | Secretos, builds, deps, AI runtime, legacy config, backups ✅ |
| `.engram/` **no** está en `.gitignore` | ✅ |
| `.gga/config` exists | `PROVIDER=opencode`, `FILE_PATTERNS` scoped, `EXCLUDE_PATTERNS` completos ✅ |
| `QUALITY_GATES.md` updated | Nuevo gate GGA documentado ✅ |
| No se tocó `src/`, `prisma/`, `public/`, `package.json`, `.env` | ✅ |

---

## Validación GPT-027F.5A-00C — Prisma 7 config para Supabase/PostgreSQL

### Modificaciones aplicadas

- `prisma/schema.prisma`: datasource actualizado de `sqlite` a `postgresql`. Línea `url` eliminada (Prisma 7 la declara en `prisma.config.ts`). Modelos demo (`User`, `Post`) preservados.
- `prisma.config.ts`: ya existía con formato Prisma 7 correcto. Sin cambios.

### Resultado

```text
$ npx prisma validate
Loaded Prisma config from prisma.config.ts.
The schema at prisma\schema.prisma is valid 🚀
```

### Decisión

- Prisma 7 con `prisma.config.ts` para la configuración del datasource (URL vía `env("DATABASE_URL")`).
- Schema sin `url` ni `directUrl` — todo delegado a `prisma.config.ts`.
- Provider `postgresql` listo para Supabase.
- `DATABASE_URL` debe ser la connection string de Supabase PostgreSQL.

### Estados previos vs actual

| Aspecto | Antes | Ahora |
|---|---|---|
| Provider | `sqlite` | `postgresql` |
| `url` en schema | `env("DATABASE_URL")` | Eliminado (está en `prisma.config.ts`) |
| `prisma.config.ts` | No existía | Creado por Prisma 7 init (formato correcto) |
| Valida | ❌ (sqlite con postgres pendiente) | ✅ `valid 🚀` |
| Modelos de dominio | ❌ No creados | ✅ Creados (5A-01) |

---

## Validación GPT-027F.5A-01 — Schema inicial Prisma OSSUM COR

### Modelos creados (12)

| Modelo | Descripción | Multiempresa |
|---|---|---|
| `Organization` | Tenant / grupo empresarial | N/A (raíz) |
| `Company` | Empresa operativa | FK → Organization |
| `Branch` | Sucursal | FK → Company |
| `User` | Usuario del sistema | Global (acceso vía UserCompanyAccess) |
| `UserCompanyAccess` | Vínculo usuario → empresa con rol | FK → Company |
| `Contact` | Persona/institución (paciente, médico, etc.) | Global (vínculo vía ContactCompanyLink) |
| `ContactCompanyLink` | Vínculo contacto → empresa | FK → Company |
| `ContactGroup` | Grupo de contactos por empresa | FK → Company |
| `ContactGroupMembership` | Miembro de grupo | FK → ContactGroup |
| `ContactAddress` | Dirección de contacto | FK → Contact |
| `Surgery` | Cirugía mínima V1 | FK → Company |
| `AuditEvent` | Trazabilidad de acciones críticas | FK → Company |

### Decisión de diseño

- **IDs**: `@default(cuid())` — portables, no secuenciales.
- **Timestamps**: `createdAt` + `updatedAt` en todas las entidades operativas.
- **Multiempresa**: `companyId` en toda entidad operativa. `Organization` → `Company` → `Branch`.
- **Roles**: `String` en vez de enum — flexibilidad sin migraciones por cada nuevo rol.
- **Auditoría**: `AuditEvent` con `entityType`, `entityId`, `action`, `oldValue`, `newValue`, `module`, `metadata`.
- **Cirugía**: mínima V1 — `patientId`, `doctorId?`, `institutionId?`, `surgeryDate`, `status`. Sin presupuestos, preparación, remitos, consumos, devoluciones ni stock.
- **Sin enums rígidos**: `contactType`, `role`, `status`, `addressType` como `String`.
- **Sin RLS**: la validación multiempresa se implementa en backend services. RLS es capa adicional posterior.
- **Sin modelos demo**: `User` y `Post` reemplazados.

### Reglas aplicadas desde reference docs

| Documento | Reglas aplicadas |
|---|---|
| `DATA_MODEL_RULES.md` | Multiempresa, IDs técnicos, timestamps, evitar enums rígidos, separar entidad base de vínculo |
| `MULTI_COMPANY_ACCESS.md` | Org → Company → Branch, UserCompanyAccess con role, company_id en entidades operativas |
| `AUDIT_EVENT_POLICY.md` | AuditEvent con company_id, user_id, entity_type, entity_id, action, old/new value, module |
| `BACKEND_FOUNDATION_PLAN.md` | 11 modelos núcleo + ContactGroupMembership, sin stock, sin facturación, sin remitos |

### Validaciones

| Check | Resultado |
|---|---|
| `npx prisma format` | ✅ Formatted in 26ms |
| `npx prisma validate` | ✅ `valid 🚀` |
| Modelos demo eliminados (`User`, `Post`) | ✅ Reemplazados |
| Total modelos | 12 |
| `companyId` en entidades operativas | ✅ |
| No stock, remitos, consumos, facturación | ✅ |
| No enums rígidos (strings flexibles) | ✅ |
| No RLS en schema | ✅ |
| No `src/`, `public/`, `package.json`, `.env` | ✅ |

---

## Validación GPT-027F.5A-03 — Primera migración DEV contra Supabase

### Diagnóstico P1000

El error P1000 persistente tenía como causa raíz un **project ref mismatch** en `.env`:

- `SUPABASE_URL` apuntaba a project ref `izzrlwsqrnrcgyyqnfge`.
- `DATABASE_URL` y `DIRECT_URL` usaban username `postgres.yywqcdromnmmelikvspi` (otro proyecto).
- Las credenciales no correspondían al mismo proyecto Supabase.
- Conectividad TCP a ambos pooler ports era correcta.
- PgBouncer resolvía el tenant pero PostgreSQL rechazaba la autenticación.

Solución: Franco actualizó `.env` con credenciales del proyecto correcto.

### Resultado migración

```text
$ npx prisma migrate dev --name init_backend_foundation
Applying migration `20260606063628_init_backend_foundation`
Your database is now in sync with your schema.
```

### Tablas creadas (12)

| Tabla | Descripción | FK |
|---|---|---|
| `Organization` | Tenant raíz | — |
| `Company` | Empresa operativa | → Organization |
| `Branch` | Sucursal | → Company |
| `User` | Usuario del sistema | — |
| `UserCompanyAccess` | Acceso usuario → empresa con rol | → User, Company |
| `Contact` | Persona/institución unificada | — |
| `ContactCompanyLink` | Vínculo contacto → empresa | → Contact, Company |
| `ContactGroup` | Grupo de contactos | → Company |
| `ContactGroupMembership` | Miembro de grupo | → ContactGroup, Contact |
| `ContactAddress` | Dirección de contacto | → Contact |
| `Surgery` | Cirugía mínima V1 | → Company, Branch?, Contact (×3) |
| `AuditEvent` | Trazabilidad de acciones | → Company, User |

### Índices creados

**Unique indexes (8):**

| Índice | Columna(s) |
|---|---|
| `Organization_slug_key` | slug |
| `User_supabaseAuthId_key` | supabaseAuthId |
| `User_email_key` | email |
| `UserCompanyAccess_userId_companyId_key` | userId, companyId |
| `ContactCompanyLink_contactId_companyId_key` | contactId, companyId |
| `ContactGroupMembership_groupId_contactId_key` | groupId, contactId |

**Composite indexes (3):**

| Índice | Columna(s) |
|---|---|
| `AuditEvent_entityType_entityId_idx` | entityType, entityId |
| `AuditEvent_companyId_createdAt_idx` | companyId, createdAt |
| `AuditEvent_userId_createdAt_idx` | userId, createdAt |

### Config Prisma 7

- `prisma.config.ts` usa `env("DIRECT_URL")` para CLI/migrations.
- `schema.prisma` declara solo `provider = "postgresql"` sin `url`.
- `DIRECT_URL` apunta a session pooler `aws-1-sa-east-1.pooler.supabase.com:5432`.
- `DATABASE_URL` apunta a transaction pooler `aws-1-sa-east-1.pooler.supabase.com:6543`.
- Host directo `db.[ref].supabase.co` devuelve NXDOMAIN — no disponible.

### Validaciones post-migración

| Check | Resultado |
|---|---|
| Conexión pg driver (DIRECT_URL) | ✅ PostgreSQL 17.6 |
| `npx prisma migrate dev` | ✅ Migration applied |
| Tablas en BD | ✅ 12 tablas + `_prisma_migrations` |
| Migración registrada | ✅ 1 migration finished |
| `npx prisma validate` | ✅ valid |
| `npx prisma generate` | ✅ Prisma Client v7.8.0 |
| `npm run typecheck` | ✅ next typegen + tsc --noEmit |
| `npm run build` | ✅ Next.js 16.2.6, 38 routes |

### Config Supabase

| Variable | Propósito | Formato |
|---|---|---|
| `DATABASE_URL` | App runtime (transaction pooler) | `postgresql://postgres.[ref]:[pass]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | CLI/migrations (session pooler) | `postgresql://postgres.[ref]:[pass]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres` |
| `SUPABASE_URL` | Supabase client API | `https://[ref].supabase.co` |
| `SUPABASE_ANON_KEY` | Public API key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | `eyJ...` |

### Lecciones aprendidas

- **Project ref mismatch**: P1000 con Supabase pooler puede deberse a credenciales de otro proyecto. Siempre verificar que el project ref en el username coincida con `SUPABASE_URL`.
- **DIRECT_URL para migraciones**: `prisma.config.ts` debe usar `DIRECT_URL` (session pooler puerto 5432), no `DATABASE_URL` (transaction pooler puerto 6543 con PgBouncer).
- **Host directo no disponible**: `db.[ref].supabase.co` puede devolver NXDOMAIN según el plan Supabase. Usar session pooler como alternativa.
- **Prisma 7**: `datasource.url` se declara en `prisma.config.ts`, no en `schema.prisma`.

---

## Validación GPT-027F.5A-06B — API base validada

### Rutas creadas (5)

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/companies/[companyId]/surgeries | Lista de cirugías de la empresa |
| GET | /api/companies/[companyId]/surgeries/[surgeryId] | Detalle de una cirugía |
| PATCH | /api/companies/[companyId]/surgeries/[surgeryId]/status | Cambio de estado de cirugía |
| GET | /api/companies/[companyId]/contacts | Lista de contactos de la empresa |
| GET | /api/companies/[companyId]/audit-events | Eventos de auditoría de la empresa |

### Commits relevantes

| Commit | Descripción |
|---|---|
| 6e2e401 | feat(api): add company read routes |
| 80ae672 | feat(api): add surgery status mutation route |
| a55025e | feat(api): add read guards to company routes |

### Mecanismo de protección

- **Header temporal DEV/internal**: `x-ossum-actor-user-id`.
- **Read guard**: `requireCompanyReadAccess` valida acceso de lectura por empresa.
- **Mutation guard**: `requireCompanyMutationAccess` valida acceso de escritura.
- **Query parsing**: Centralizado en `src/lib/api/query.ts` (paginación, filtros).
- **Validator**: `surgery-status.ts` valida body del PATCH status (rechaza `actorUserId` en body).

### Resultados smoke tests

| Test | Esperado | Resultado |
|---|---|---|
| GET /api | 200 | ✅ 200 |
| GET surgeries sin header | 401 | ✅ 401 (missing_actor_user_id) |
| PATCH status sin header | 401 | ✅ 401 (missing_actor_user_id) |
| GET surgeries con header válido | 200 | ✅ 200 |
| GET contacts con header válido | 200 | ✅ 200 |
| GET audit-events con header válido | 200 | ✅ 200 |
| GET surgery detail con header válido | 200 | ✅ 200 |
| PATCH status con body inválido | 400 | ✅ 400 (forbidden_body_field) |
| PATCH real de transición | omitido | 🔲 Por seguridad de datos |

### Validaciones de build

| Check | Resultado |
|---|---|
| prisma validate | ✅ valid |
| prisma generate | ✅ Prisma Client v7.8.0 |
| typecheck | ✅ types + tsc --noEmit |
| tsc --noEmit | ✅ no errors |
| build | ✅ Next.js compiled |

### Limitaciones actuales

- Auth: solo header temporal DEV/internal. Sin Supabase Auth integrado.
- Seguridad: requiere integración Auth real antes de exponer a producción.
- Dev script: `npm run dev` roto en Windows por dependencia de `tee`. Workaround: `npx next dev -p 3000`.
- `_smoke_query.js` untracked pendiente de limpieza.
- PATCH real de transición de status no testeado para preservar datos del seed.

### Decisión de cierre

GPT-027F.5A-06B queda validada como API base funcional. Las rutas GET/PATCH responden correctamente con código 401/200/400 según corresponda. Habilita avanzar a Autenticación real o al próximo bloque funcional con base API comprobada.

---

## Validación GPT-027F.5A-06C — Supabase Auth server-side

### Commits

| Commit | Descripción |
|---|---|
| 8a2b1d7 | feat(auth): add Supabase server auth context |
| 12a8c3b | fix(auth): normalize Supabase server URL |
| 0ed528b | fix(api): map all surgery validation errors to 400 |

### Arquitectura de Auth

| Componente | Descripción |
|---|---|
| `supabaseServerClient` | Cliente Supabase con `SERVICE_ROLE_KEY`, solo server-side |
| `getApiAuthContext()` | Resuelve identidad desde Bearer token (primary) o header DEV (fallback) |
| `ApiAuthContext` | `{ actorUserId, supabaseAuthId, companyId, role, source }` |
| `requireCompanyReadAccess(ctx)` | Guard de lectura (no-op defensivo) |
| `requireCompanyMutationAccess(ctx, roles)` | Guard de escritura con roles permitidos |

### Flujo de autenticación

1. Request con `Authorization: Bearer <token>`.
2. `supabase.auth.getUser(token)` → `user.id` (UUID Supabase).
3. `getUserBySupabaseAuthId(user.id)` → `User.id` interno.
4. Validación de `isActive` y `UserCompanyAccess` (empresa + rol).
5. Devuelve `ApiAuthContext` con `source: "supabase-auth"`.

Fallback DEV: solo si `NODE_ENV !== "production"`, usa `x-ossum-actor-user-id`.

### Smoke test matrix (token real)

| # | Test | Esperado | Resultado |
|---|---|---|---|
| 1 | GET surgeries sin token | 401 | ✅ |
| 2 | GET surgeries + token inválido | 401 | ✅ |
| 3 | GET surgeries + token válido | 200 | ✅ |
| 4 | GET contacts + token válido | 200 | ✅ |
| 5 | GET audit-events + token válido | 200 | ✅ |
| 6 | GET surgery detail + token válido | 200 | ✅ |
| 7 | PATCH status sin token | 401 | ✅ |
| 8 | PATCH status + body inválido + token | 400 | ✅ |
| 9 | PATCH real de transición | — | 🔲 omitido |

### Mapeo de usuario

| Campo | Valor |
|---|---|
| User ID interno | `usdevadmin100000000000000` |
| Email | `admin.dev@ossum.local` |
| Supabase Auth UUID | seteado en DB DEV |
| UserCompanyAccess | admin, activo |

### Limitaciones actuales

- Header DEV todavía existe como fallback en desarrollo.
- No hay login UI, middleware ni RLS.
- Token de Supabase expira (~1h).
- `src/lib/api/context.ts` (`ApiContext` original) queda huérfano.
- Sin `.env.example`.
- PATCH real de transición de status no ejecutado en smoke.

### Validaciones de build

| Check | Resultado |
|---|---|
| prisma validate | ✅ valid |
| typecheck | ✅ OK |
| tsc --noEmit | ✅ OK |
| build | ✅ OK |
| GGA (commit 0ed528b) | ✅ CODE REVIEW PASSED |

### Decisión de cierre

GPT-027F.5A-06C queda validada como Auth server-side funcional con Supabase. Las rutas GET/PATCH responden correctamente con token real Bearer. Habilita avanzar a Auth UI, limpieza técnica o siguiente bloque funcional con base Auth comprobada.
