# WORKLOG.md — OSSUM COR

Estado: inicial

---

## 2026-06-03 — GPT-027F.0A inicial

Done:

- Se saneó Contexto Maestro a v8.2.
- Se saneó Checklist.
- Se saneó ADR-027E.
- Se definió secuencia 0A → 0B → 5A.
- Se generó estructura Knowledge V2 lista para copiar al repo.

Changed:

- AGENTS.md.
- knowledge/KNOWLEDGE_INDEX.md.
- knowledge/core/*.
- knowledge/domain/*.
- knowledge/architecture/*.
- knowledge/workflow/*.
- knowledge/specs/GPT-027F.0/*.

Risks:

- Completar CURRENT_STATE.md contra repo real.
- Completar REPO_MAP.md contra repo real.
- No iniciar backend antes de 0A/0B.

Next:

- Copiar carpeta al proyecto.
- Pedir a Codex revisión documental de rutas reales.
- Completar mapa de repo.
- Preparar Gentle-AI workspace.

---

## 2026-06-04 — GPT-027F.0A-02 saneamiento Knowledge V2

Done:

- Se archivaron duplicados y documentos legacy pre-V2 fuera del flujo activo.
- Se consolidó la autoridad documental en `knowledge/workflow/*` y `knowledge/domain/*`.
- Se reforzó en el índice y en archive que `archive/` no gobierna.
- Se rescataron reglas de negocio mínimas desde legacy hacia documentos canónicos.

Changed:

- `knowledge/KNOWLEDGE_INDEX.md`.
- `knowledge/workflow/SESSION_START_CHECKLIST.md`.
- `knowledge/workflow/SESSION_END_CHECKLIST.md`.
- `knowledge/workflow/ENGRAM_TAGS.md`.
- `knowledge/workflow/ENGRAM_POLICY.md`.
- `knowledge/archive/README.md`.
- `knowledge/domain/PRESUPUESTOS.md`.
- `knowledge/domain/PREPARACION_REMITOS_CONSUMO.md`.
- `knowledge/domain/FACTURACION_COBROS.md`.
- `knowledge/worklog/WORKLOG.md`.
- `knowledge/archive/legacy-pre-v2/*`.

Risks:

- Puede quedar contexto útil en legacy aún no absorbido si una tarea futura necesita más detalle histórico.
- Algunos documentos de arquitectura o workflow todavía mencionan planes posteriores, pero ya no compiten con autoridad activa.

Next:

- Revisar si `ENGRAM_POLICY.md` y `AI_GENTLE_STACK.md` necesitan ajuste fino al iniciar 0B.
- Auditar referencias internas que apunten a rutas legacy archivadas.

---

## 2026-06-04 — GPT-027F.0A-04 cierre formal Knowledge V2

Done:

- Se confirmó en `VALIDATION.md` que 0A quedó saneado y cerrado a nivel documental.
- Se marcaron como completadas las tareas principales de 0A en `TASKS.md`.
- Se documentó que el legacy pre-V2 no gobierna y permanece aislado.
- Se verificó que `knowledge/flows/` estaba vacío y se preparó su retiro.

Changed:

- `knowledge/specs/GPT-027F.0/VALIDATION.md`.
- `knowledge/specs/GPT-027F.0/TASKS.md`.
- `knowledge/worklog/WORKLOG.md`.
- `knowledge/archive/README.md`.
- `knowledge/archive/legacy-pre-v2/README.md`.

Risks:

- El archive conserva contexto implementation-heavy que no debe volver a entrar al flujo activo sin curación puntual.
- El cierre de 0A no habilita backend, Auth, Prisma ni refactors sensibles; 0B sigue siendo el siguiente gate.

Next:

- Iniciar GPT-027F.0B con foco en Gentle-AI workspace, Engram, SDD, guardrails y perfiles.

---

## 2026-06-04 — GPT-027F.0B-02 alineación configuración efectiva OpenCode

Done:

- Se creó `.opencode/opencode.json` como config efectiva de proyecto para OpenCode.
- Se copiaron/adaptaron las definiciones de `gentle-orchestrator` y subagentes `sdd-*` para que los comandos en `.opencode/commands/` resuelvan el agente correcto.
- Se dejó `mcp.engram` definido en la config efectiva.
- Se agregaron wrappers en `.opencode/plugins/` para exponer `background-agents.ts` y `model-variants.ts` desde la ruta de proyecto sin borrar la config legacy en `.config/opencode/`.

Changed:

- `.opencode/opencode.json`.
- `.opencode/plugins/background-agents.ts`.
- `.opencode/plugins/model-variants.ts`.
- `knowledge/worklog/WORKLOG.md`.
- `knowledge/specs/GPT-027F.0/TASKS.md`.
- `knowledge/specs/GPT-027F.0/VALIDATION.md`.

Risks:

- La configuración legacy en `.config/opencode/` sigue existiendo y puede confundir hasta unificarla en una tarea posterior.
- Los agentes `sdd-*` siguen dependiendo de skills en `~/.config/opencode/skills/` que no se validaron en esta tarea.
- Hace falta reiniciar OpenCode para que cargue la config nueva.

Next:

- Reiniciar OpenCode y verificar que `/sdd-init` ya resuelve `gentle-orchestrator`.
- Auditar la disponibilidad real de skills SDD y del MCP Engram antes de ejecutar comandos SDD.

---

## 2026-06-04 — GPT-027F.0B-03 validación runtime controlada OpenCode/Gentle-AI

Done:

- Se validó en modo read-only la carga efectiva de config desde `.opencode/opencode.json`.
- Se confirmó que `gentle-orchestrator` está disponible como agente primario.
- Se verificó que los subagentes `sdd-*` están definidos como hidden.
- Se detectó que Engram MCP está declarado pero Context7 no tiene entrada en la config de proyecto.
- Se identificó que los comandos SDD en `.opencode/commands/` ya apuntan a `gentle-orchestrator`.

Changed:

- `knowledge/worklog/WORKLOG.md`.

Risks:

- Context7 sin entrada MCP en proyecto; depende de config padre.
- Los agentes `sdd-*` referencian skills en `~/.config/opencode/skills/` no validadas en esta tarea.
- Hace falta reiniciar OpenCode para validar la carga real.

Next:

- Corregir `default_agent` si hace falta.
- Revisar definición MCP de Context7.

---

## 2026-06-04 — GPT-027F.0B-04 corrección mínima OpenCode config

Done:

- Se agregó `default_agent: "gentle-orchestrator"` en `.opencode/opencode.json` para que la config efectiva de proyecto fije el agente primario esperado.
- Se revisó `.config/opencode/opencode.json` para buscar una definición existente de Context7 y no se encontró ninguna entrada MCP reutilizable.
- Se dejó Context7 como pendiente documental, sin inventar config nueva ni tocar plugins o skills.

Changed:

- `.opencode/opencode.json`.
- `knowledge/worklog/WORKLOG.md`.
- `knowledge/specs/GPT-027F.0/TASKS.md`.
- `knowledge/specs/GPT-027F.0/VALIDATION.md`.

Risks:

- Context7 sigue pendiente porque no existe una definición MCP previa en las configs permitidas.
- La configuración legacy en `.config/opencode/` sigue existiendo y puede volver a generar drift si no se consolida más adelante.
- Hace falta reiniciar OpenCode para validar en runtime que `default_agent` se cargó efectivamente.

Next:

- Reiniciar OpenCode y confirmar que el agente por defecto efectivo sea `gentle-orchestrator`.
- Resolver la definición MCP real de Context7 desde su fuente autorizada antes de marcarlo como configurado.

---

## 2026-06-04 — GPT-027F.0B-05 validación runtime final post-restart

Done:

- Se validó en modo read-only la configuración efectiva post-restart de OpenCode.
- Se confirmó que `default_agent` es `gentle-orchestrator`.
- Se verificó que los subagentes `sdd-*` están cargados correctamente.
- Se confirmó que Engram MCP y Context7 MCP están conectados en runtime.
- Se validó que los plugins de proyecto (`background-agents`, `model-variants`) cargan sin errores.
- Se verificó la presencia de skills privadas `caveman` y `diagnose` en el sistema.

Changed:

- `knowledge/worklog/WORKLOG.md`.
- `knowledge/specs/GPT-027F.0/VALIDATION.md`.

Risks:

- La config legacy en `.config/opencode/` sigue existiendo y puede generar drift.
- Context7 funciona vía config padre, no tiene entrada MCP portable en proyecto.

Next:

- Crear skills privadas Caveman y Diagnose.
- Validar flujo documental simple para probar el stack completo.

---

## 2026-06-04 — GPT-027F.0B-06 skills privadas Caveman y Diagnose

Done:

- Se crearon las skills privadas `caveman` y `diagnose` dentro de `.opencode/skills/`.
- Se documentó en workflow cuándo usar cada skill y cómo deben invocarlas los agentes.
- Se actualizó `QUALITY_GATES.md` para exigir el ciclo Diagnose en bugs y fallas técnicas activas.
- Se dejó trazado el avance de 0B en `TASKS.md` y `VALIDATION.md`.

Changed:

- `.opencode/skills/productivity/caveman/SKILL.md`.
- `.opencode/skills/engineering/diagnose/SKILL.md`.
- `knowledge/workflow/AI_GENTLE_STACK.md`.
- `knowledge/workflow/AGENT_WORKFLOW.md`.
- `knowledge/workflow/QUALITY_GATES.md`.
- `knowledge/specs/GPT-027F.0/TASKS.md`.
- `knowledge/specs/GPT-027F.0/VALIDATION.md`.
- `knowledge/worklog/WORKLOG.md`.

Risks:

- Las skills nuevas requieren restart de OpenCode para carga efectiva en runtime.
- `TASKS.md` ahora refleja Context7 como configurado por la validación runtime previa; si cambia la config efectiva global, habrá que revalidarlo.

Next:

- Reiniciar OpenCode si hace falta probar carga efectiva de las nuevas skills.
- Ejecutar una tarea documental o de debugging controlado para validar uso real de Caveman y Diagnose.

---

## 2026-06-04 — GPT-027F.0B-07A smoke test Caveman

Done:

- Se ejecutó smoke test read-only de la skill Caveman para resumir estado actual de 0B.
- Se usó el formato obligatorio Done/Changed/Files/Validations/Risks/Next.
- Se detectó desalineación entre `TASKS.md` y la evidencia real (Engram activo, Skill Registry refrescado, session_summary creado).
- Se identificaron lagunas en `WORKLOG.md` (faltaban 0B-03 y 0B-05).

Changed:

- `knowledge/worklog/WORKLOG.md`.

Risks:

- `TASKS.md` mostraba ítems como pendientes que ya tenían evidencia de completitud.
- `WORKLOG.md` requería entradas retroactivas para tareas ya ejecutadas.

Next:

- Alinear tracking documental con evidencia real (0B-07C).
- Ejecutar cierre formal con revisión cruzada y cleanup final (0B-08).

---

## 2026-06-04 — GPT-027F.0B-07C alineación tracking vs evidencia real

Done:

- Se auditó el tracking de 0B en `TASKS.md` y `VALIDATION.md` contra la evidencia ya registrada en config, workflow, skill registry y worklog.
- Se marcaron como completos `Activar Engram` y `Refrescar Skill Registry` por evidencia visible en `.opencode/opencode.json` y `.atl/skill-registry.md`.
- Se mantuvieron como completos `Gentle-AI workspace`, `SDD/OpenSpec`, `Context7`, `default_agent`, perfiles/agentes OpenCode y Caveman smoke test según validaciones previas ya asentadas.
- Se dejaron pendientes explícitos `Engram Sync`, `guardrails`, `Diagnose smoke test` y `GGA hook` si esa automatización sigue en alcance.

Changed:

- `knowledge/specs/GPT-027F.0/TASKS.md`.
- `knowledge/specs/GPT-027F.0/VALIDATION.md`.
- `knowledge/worklog/WORKLOG.md`.

Risks:

- `Context7` ya figura como validado por evidencia previa, pero el worklog histórico de 0B-04 conserva el estado anterior de "pendiente" y puede confundir si se lee fuera de secuencia.
- `guardrails` siguen con evidencia parcial de config/permisos, sin validación de comportamiento de punta a punta.
- `Diagnose` existe como skill y documentación, pero su uso real todavía no quedó probado en una tarea de debugging.

Next:

- Ejecutar un smoke test controlado de `diagnose`.
- Decidir si `GGA hook` sigue dentro del alcance de 0B y, si sí, validarlo o dejarlo diferido formalmente.
- Cerrar los pendientes documentales restantes antes de declarar 0B completamente cerrado.

---

## 2026-06-04 — GPT-027F.0B-08 cleanup final y cierre documental 0B

Done:

- Se sincronizó `TASKS.md` con la realidad operativa: `session_summary` y `validación de flujo documental` marcados como completos.
- Se completó `WORKLOG.md` con entradas para 0B-03, 0B-05, 0B-07A y 0B-08.
- Se agregó regla explícita en `AGENTS.md`: todo cierre de tarea, handoff, resumen de subagente o reporte operativo debe usar Caveman. Diagnose obligatorio antes de fixes para bugs/fallas.
- Se creó `knowledge/workflow/GUARDRAILS.md` consolidando reglas de protección de archivos sensibles, concurrencia de agentes y bloqueo de backend.
- Se actualizó `QUALITY_GATES.md` exigiendo Caveman en el gate de documentación y Diagnose en el gate de debugging.
- Se actualizó `VALIDATION.md` registrando el cierre formal de 0B con pendientes no bloqueantes declarados.

Changed:

- `AGENTS.md`.
- `knowledge/specs/GPT-027F.0/TASKS.md`.
- `knowledge/specs/GPT-027F.0/VALIDATION.md`.
- `knowledge/worklog/WORKLOG.md`.
- `knowledge/workflow/QUALITY_GATES.md`.
- `knowledge/workflow/GUARDRAILS.md`.

Risks:

- Engram Sync sigue sin verificación explícita; diferido a 5A.
- Guardrails existen en documento pero sin validación de punta a punta.
- Diagnose no fue probado contra un bug real; su smoke test queda diferido a 5A.
- Context7 funciona vía config padre, sin entrada MCP portable en el proyecto.

Next:

- Iniciar GPT-027F.5A — Backend Foundation con task brief explícito.
- Los pendientes no bloqueantes de 0B pueden resolverse en paralelo durante 5A si se requiere.

---

## 2026-06-04 — GPT-027F.0B-09 smoke test Diagnose y cierre final 0B

Done:

- Se registró el smoke test read-only de `diagnose` contra el bug real `storage.setItem is not a function`.
- Se dejó asentado que el bug fue reproducido con `npm test` y acotado a Zustand Persist + entorno de tests.
- Se explicitó que el fix no fue aplicado todavía.
- Se actualizó el tracking de 0B para marcar Diagnose smoke test como completo y declarar 0B cerrado funcionalmente.

Changed:

- `knowledge/specs/GPT-027F.0/TASKS.md`.
- `knowledge/specs/GPT-027F.0/VALIDATION.md`.
- `knowledge/worklog/WORKLOG.md`.

Risks:

- El bug de tests sigue vivo; solo quedó reproducido y acotado, no resuelto.
- Engram Sync y guardrails siguen como pendientes no bloqueantes.
- `Context7` continúa dependiendo de config padre y no de una definición MCP portable de proyecto.

Next:

- Iniciar `GPT-027F.0C` para baseline técnica mínima / fix controlado de tests.
- O avanzar a `GPT-027F.5A` si Franco decide seguir sin baseline verde.

---

## 2026-06-04 — GPT-027F.5A-00B decisiones Backend Foundation (Franco)

Done:

- Se documentaron las decisiones de Franco para iniciar Backend Foundation.
- DB provider: Supabase.
- Auth: Supabase Auth.
- Storage: diferido (no requerido para el primer schema).
- Stock: fuera del primer commit (Item, Warehouse, StockMovement diferidos a subtarea posterior).
- Primer schema confirmado: Organization, Company, Branch, User, UserCompanyAccess, Contact, ContactCompanyLink, ContactGroup, ContactAddress, Surgery (mínima), AuditEvent.
- Se actualizó `VALIDATION.md` con el gate check de 5A.

Changed:

- `knowledge/specs/GPT-027F.0/VALIDATION.md`.
- `knowledge/worklog/WORKLOG.md`.

Risks:

- Supabase project setup (URL, keys) pendiente de ejecución.
- Supabase Auth configuración inicial pendiente.
- Estrategia de migración desde Zustand/localStorage sigue sin definir en detalle.

Next:

- Iniciar GPT-027F.5A — Schema inicial (`prisma/schema.prisma`) con las 11 entidades confirmadas.
- Configurar Supabase project y obtener credenciales para Prisma datasource.

---

## 2026-06-04 — GPT-027F.0C-01 fix mínimo baseline tests: storage.setItem

Done:

- Se aplicó el ciclo Diagnose completo: reproducido, acotado, evidenciado, hipótesis confirmada, fix mínimo aplicado, validado y regression check ejecutado.
- Se identificó la causa raíz: Node v25 expone un `globalThis.localStorage` con métodos `undefined` que sombrea el `window.localStorage` funcional de jsdom.
- Se aplicaron dos fixes complementarios:
  1. Polyfill de `localStorage` en `src/__tests__/setup.ts`: si el global `localStorage` no tiene `setItem` funcional, se reemplaza con un Map in-memory.
  2. Uso explícito de `window.localStorage` en `src/lib/store.ts` (línea 1305) para evitar referencias al global ambiguo en producción.
- Resultado: 28/28 test files pass, 598/598 tests pass, 0 failures. TypeScript compila sin errores.

Changed:

- `src/__tests__/setup.ts` — localStorage polyfill agregado (19 líneas).
- `src/lib/store.ts` — `localStorage` → `window.localStorage` (1 token en línea 1305).
- `knowledge/worklog/WORKLOG.md`.

Risks:

- La advertencia `--localstorage-file was provided without a valid path` de Node v25 persiste (cosmética, no bloqueante).
- El polyfill usa `Map<string, string>` in-memory; los tests ahora comparten estado vía store persist pero no persisten a disco (comportamiento esperado para tests unitarios).

Next:

- Baseline de tests verde → GPT-027F.5A (Backend Foundation) puede iniciar sin deuda de tests.
- O continuar con GPT-027F.0C-02 si hay más fixes de baseline pendientes.

---

## 2026-06-05 — GPT-027F.0B-FULL-01C fijar proyecto canónico Engram

Done:

- Se fijó `ossum_cor_project` como proyecto canónico de Engram.
- Se actualizó `mcp.engram` en `.opencode/opencode.json` agregando `--project ossum_cor_project` al command para que todas las tool calls vía OpenCode usen el proyecto correcto.
- Se documentó en `ENGRAM_POLICY.md` que el proyecto canónico es `ossum_cor_project` y cómo está fijado.
- Se actualizó la sección Engram Sync en `ENGRAM_POLICY.md` reflejando que el sync fue verificado funcional (local + cloud sincronizados, chunks persistidos).
- Se registró en `VALIDATION.md` que Engram Sync quedó funcional con proyecto canónico pendiente de consolidación.

Changed:

- `.opencode/opencode.json` — MCP command de engram: agregado `--project ossum_cor_project`.
- `knowledge/workflow/ENGRAM_POLICY.md` — documentado proyecto canónico y estado de sync.
- `knowledge/worklog/WORKLOG.md` — entrada 0B-FULL-01C agregada.
- `knowledge/specs/GPT-027F.0/VALIDATION.md` — sección Engram Sync actualizada.

Risks:

- Proyectos fragmentados `ossum_cor` (7 obs) y `e:\ossum_cor_project` (0 obs) aún no consolidados. Pendiente para tarea separada.
- No hay repositorio git: el chunk persistido en `.engram/` no tiene versionado fuera del cloud sync de Engram.
- Si un agente usa `engram` vía CLI directa (sin OpenCode MCP), puede seguir creando proyectos nuevos si no respeta `--project ossum_cor_project` o la env var `ENGRAM_PROJECT`.

Next:

- Consolidar proyectos fragmentados: ejecutar `engram projects consolidate --all` previo backup con `engram export`.
- Inicializar repositorio git para versionar `.engram/`.
- Actualizar `TASKS.md` reflejando que Engram Sync está verificado y proyecto canónico fijado.

---

## 2026-06-05 — GPT-027F.0B-FULL-01D cierre Engram consolidado

Done:

- Se consolidó la fragmentación de proyectos Engram. Hoy existe **1 único proyecto** `ossum_cor_project` con 51 observaciones, 22 sesiones y 37 prompts.
- Se seteó `ENGRAM_PROJECT=ossum_cor_project` como variable de entorno de usuario en Windows (safety net para CLI directa).
- Se actualizó `ENGRAM_POLICY.md`:
  - Reglas operativas: ahora mencionan fragmentación resuelta, env var seteada y obligación de usar `--project ossum_cor_project` en CLI directa.
  - Sección Engram Sync: actualizada con estado consolidado (2 chunks, 51 obs, fragmentación resuelta).
- Se actualizó `TASKS.md`: `Activar Engram Sync` marcado como `[x]`. Pendiente explícito de 0B actualizado con tachado y estado ✅.
- Se actualizó `VALIDATION.md`: pendiente no bloqueante de Engram Sync marcado como consolidado y cerrado. Nueva sección FULL-01D con estado consolidado, histórico de cierre y pendientes opcionales.

Changed:

- `knowledge/workflow/ENGRAM_POLICY.md` — reglas operativas + sync actualizados con consolidación.
- `knowledge/specs/GPT-027F.0/TASKS.md` — Engram Sync marcado completo.
- `knowledge/specs/GPT-027F.0/VALIDATION.md` — pendiente actualizado, nueva sección FULL-01D.
- `knowledge/worklog/WORKLOG.md` — entrada FULL-01D agregada.

Validations:

| Check | Resultado |
|---|---|
| `engram projects list` | 1 proyecto: `ossum_cor_project` (51 obs / 22 sessions / 37 prompts) ✅ |
| `engram sync --status --project ossum_cor_project` | Local: 2, Remote: 2, Pending: 0 ✅ |
| `ENGRAM_PROJECT` (User env var) | `ossum_cor_project` ✅ |
| `search "GPT-027F"` | Memorias encontradas correctamente ✅ |
| No se tocó `src/`, `prisma/`, `public/`, `package.json`, `.env` | ✅ |

Risks:

- Git tracking de `.engram/` no resuelto: queda como pendiente opcional.
- GGA hook y Context7 portable local siguen sin resolver.
- Guardrails definidos pero sin validación de comportamiento.
- La env var `ENGRAM_PROJECT` solo funciona en procesos nuevos (no afecta la sesión actual de PowerShell). Quien abra una terminal nueva ya la tendrá disponible.

Next:

- Decidir Git tracking de `.engram/` (incluir o ignorar).
- Decidir si GGA hook sigue en alcance y resolverlo o archivarlo formalmente.
- Validar guardrails con una prueba controlada de permisos y concurrencia.

---

## 2026-06-05 — GPT-027F.0B-FULL-03B Context7 portable en proyecto

Done:

- Se agregó Context7 como MCP remoto portable en `.opencode/opencode.json` dentro del bloque `mcp`.
- Bloque `engram` intacto con `--project ossum_cor_project`.
- No se agregaron tokens, API keys ni `enabled: true`.
- Se actualizó `VALIDATION.md`: pendiente de Context7 portable marcado como resuelto. Nueva sección FULL-03B agregada al final.
- Se documentó que la config global (`C:\Users\franc\.config\opencode\opencode.json`) queda como fallback.

Validación post-cambio:

| Check | Resultado |
|---|---|
| `opencode mcp list` | `context7` ✅ connected |
| `opencode mcp debug context7` | MCP remoto conectado sin errores |
| Bloque `engram` intacto | ✅ `--project ossum_cor_project` presente |
| No se tocaron archivos prohibidos | ✅ |

Risks:

- No hay riesgo de seguridad: Context7 es un MCP remoto público sin auth ni API key.
- Si en el futuro Context7 requiere autenticación, habrá que migrar la definición. Hoy no aplica.
- La definición duplicada (global + proyecto) puede generar advertencia menor en OpenCode. El proyecto gana en caso de conflicto.

---

## 2026-06-05 — GPT-027F.0B-FULL-04B Git + GGA config local

Done:

- **`.gitignore` actualizado** — de 1 línea (`.atl/`) a un bloque completo: secretos (`.env`, `.env.*`), dependencias (`node_modules/`), builds (`.next/`, `dist/`, `build/`, `*.tsbuildinfo`), AI runtime (`.atl/`, `.codex/`, `.gemini/`), legacy config (`.config/`), backups (`.backup_*/`, `engram-export*.json`) y OS files. `.engram/` **no está ignorado** — se versiona para portabilidad.
- **`.gga/config` creado** — proyecto-level override con:
  - `PROVIDER=opencode`
  - `FILE_PATTERNS=*.ts,*.tsx,*.js,*.jsx,*.css,*.json,*.prisma,*.md` (sin `.py`, `.go`)
  - `EXCLUDE_PATTERNS` con `.engram/`, `knowledge/archive/`, tests, builds
  - `RULES_FILE=AGENTS.md`, `STRICT_MODE=true`, `TIMEOUT=300`
- **`QUALITY_GATES.md` actualizado** — nuevo gate de revisión automatizada (GGA) documentando alcance, exclusión y estado de instalación pendiente.
- **`VALIDATION.md` actualizado** — pendientes de git tracking y GGA marcados como resueltos/configurados. Nueva sección FULL-04B con decisiones y validaciones.
- **Hook no instalado** — queda pendiente de decisión.

Changed:

- `.gitignore` — reemplazado (1 línea → bloque completo).
- `.gga/config` — creado (nuevo).
- `knowledge/workflow/QUALITY_GATES.md` — nuevo gate GGA agregado al final.
- `knowledge/specs/GPT-027F.0/VALIDATION.md` — pendientes actualizados, nueva sección FULL-04B.
- `knowledge/worklog/WORKLOG.md` — entrada FULL-04B agregada.

Validations:

| Check | Resultado |
|---|---|
| `.engram/` en `.gitignore` | ❌ No está (correcto — se versiona) ✅ |
| `.env` en `.gitignore` | ✅ |
| `.next/` en `.gitignore` | ✅ |
| `node_modules/` en `.gitignore` | ✅ |
| `.gga/config` existe | ✅ |
| No se tocaron archivos prohibidos | ✅ |

Risks:

- `.engram/` se versiona. Los chunks pueden crecer con el tiempo. Si se vuelven muy pesados, repensar si ignorarlos y depender solo del cloud sync de Engram.
- `.gga/config` existe pero hook no instalado. Un agente o usuario podría editar código sin pasar por GGA.
- `.config/` legacy ignorado — si alguien necesita referenciarlo, recordar que no está en el repo (está en el FS local).

Next:

- Decidir si instalar GGA hook (`gga install`) o mantenerlo como gate manual opcional.
- Validar guardrails con una prueba controlada de permisos y concurrencia.
