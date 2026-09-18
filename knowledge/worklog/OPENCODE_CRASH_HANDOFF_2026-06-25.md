# OPENCODE CRASH HANDOFF — 2026-06-25

> Status note (2026-06-25 later update): `CIRUGIAS-DATATABLE-VISUAL-P1` did move forward after this fallback snapshot. The Cirugías table now reflects the implemented 4-date-column layout, canonical logistics/shipping date sources, reordered operational columns, and the header/date hierarchy refinements captured in `knowledge/worklog/WORKLOG.md`.

Done:
- Reconstruido el último estado útil del workspace sin depender de Engram.
- Identificado el frente con cierre formal más reciente: Cirugías Redesign P2 lateral refinado.
- Identificado el frente activo sin cierre formal: Mail Stage 1 / Gmail real / tab Correo en Expediente.
- Identificada evidencia local del problema de OpenCode/Engram en logs externos.
- Saneado el esquema SQLite de OpenCode con fix mínimo y reversible sobre la tabla `permission`.
- Saneado el plugin `engram.ts` para que no dependa de Bun al cargar bajo Node/Electron.

Changed:
- Se deja este handoff local en el repo como fallback de memoria ante crashes de OpenCode.

Files:
- `knowledge/worklog/OPENCODE_CRASH_HANDOFF_2026-06-25.md`
- `knowledge/worklog/WORKLOG.md`

Validations:
- `git status --short` revisado.
- `git log --oneline -10` revisado.
- `knowledge/worklog/WORKLOG.md` revisado para reconstruir el último cierre formal.
- `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/TASKS.md` revisado: at that moment it was ready and showed no evidence of apply started.
- `knowledge/specs/MAIL-V1-ETAPA1-IMPLEMENTACION/TASKS.md` revisado: listo para apply, pero el working tree muestra implementación ya avanzada y sin cierre formal.
- `src/components/expediente/ExpedienteFullView.tsx` revisado: tab `correo` ya montada.
- `src/components/expediente/correo/ExpedienteCorreoTab.tsx` revisado: flujo attach/refresh/persist/unlink ya integrado con API.
- Backup creado de `opencode.db`, `opencode.db-wal` y `opencode.db-shm` antes del fix.
- `PRAGMA integrity_check` sobre `opencode.db` => `ok`.
- Revalidado `SELECT id, data FROM permission LIMIT 1` => OK.
- `engram.ts` transpila OK con TypeScript (`DIAGNOSTICS 0`).
- Ya no quedan usos directos de `Bun.`; quedó encapsulado detrás de `BunApi?.*` con fallback Node.

Risks:
- OpenCode/Engram no es confiable como único lugar de memoria en este momento.
- Hay mucho trabajo sin commit en árbol de Mail Stage 1, IA autorizaciones y rediseño de Cirugías.
- At snapshot time, `CIRUGIAS-DATATABLE-VISUAL-P1` looked ready in docs but absent from the diff; this note is now historical only.
- El problema SQLite de `permission.data` quedó mitigado, pero el plugin `engram.ts` sigue fallando con `Bun is not defined`.
- Falta reiniciar OpenCode para confirmar el saneamiento completo en runtime real.

Next:
- Tomar este archivo como punto de reanudación si OpenCode vuelve a caer.
- Si se sigue con Mail Stage 1, cerrar primero con validaciones + handoff antes de tocar otro frente.
- Historical note only: the advice to start from `knowledge/specs/CIRUGIAS-DATATABLE-VISUAL-P1/TASKS.md` applied to the snapshot moment before the later implementation progress.
- Reiniciar OpenCode para que vuelva a abrir con la SQLite saneada.
- Reiniciar OpenCode para confirmar que ya no aparezcan `Bun is not defined` ni `no such column: "data"`.

---

## Estado reconstruido con cuidado

### 1) Último cierre formal encontrado

El último cierre formal en `knowledge/worklog/WORKLOG.md` corresponde a:

- **2026-06-25 — CIRUGIAS REDESIGN Paso 2 — Refinar P2 Lateral (proposiciones IA)**
- Archivo principal tocado: `src/components/cirugias/dialogs/NewSurgeryDialog.tsx`
- Validaciones registradas en ese cierre: `npx tsc --noEmit` OK, `npm test` OK.

### 2) Punto más probable donde quedó el trabajo real

El working tree muestra trabajo posterior o paralelo sin cierre formal, especialmente en:

- **Mail Stage 1 / Correo en Expediente**
  - `src/components/expediente/ExpedienteFullView.tsx`
  - `src/components/expediente/correo/*`
  - `src/lib/mail-stage1/*`
  - `src/app/api/admin/mail/gmail/*`
  - validadores/tests relacionados
- **IA autorizaciones / extracción**
  - `src/components/cirugias/AiResultsPanel.tsx`
  - `src/components/cirugias/AiUploadZone.tsx`
  - `src/hooks/useAiExtraction.ts`
  - `src/lib/services/ai/*`
  - `src/lib/validators/autorizacion-ai.ts`
- **Cirugías redesign ya aplicado pero aún sin commit**
  - `src/components/cirugias/dialogs/NewSurgeryDialog.tsx`
  - tests asociados

### 3) Qué NO parece iniciado todavía

`CIRUGIAS-DATATABLE-VISUAL-P1` tiene artefactos SDD completos (`EXPLORATION/PROPOSAL/SPEC/DESIGN/TASKS`), pero en `git status` no aparecen cambios en:

- `src/components/cirugias/CirugiasTable.tsx`
- `src/components/cirugias/CirugiaRow.tsx`
- `src/app/cirugias/page.tsx`
- `src/lib/formatters.ts`

Historical conclusion for that snapshot only: **the Cirugías visual datatable looked ready to start, not advanced yet**.

### 4) Evidencia del crash/problema de OpenCode / Engram

Logs externos detectados:

- `C:\Users\franc\.local\share\opencode\log\2026-06-25T110258.log`
- `C:\Users\franc\.local\share\opencode\log\opencode.log`

Errores relevantes observados:

- `failed to load plugin` en `C:/Users/franc/.config/opencode/plugins/engram.ts`
- `error=Bun is not defined`
- errores del server OpenCode con SQLite:
  - `no such column: "data" - should this be a string literal in single-quotes?`

Esto explica por qué Engram/OpenCode pueden perder continuidad o fallar al persistir contexto.

### 4.1) Fix mínimo aplicado sobre SQLite

Se aplicó el cambio mínimo sobre la base local de OpenCode:

- tabla: `permission`
- problema: el runtime intentaba leer columna `data` que no existía
- estado previo: tabla vacía (`COUNT(*) = 0`)
- fix: `ALTER TABLE permission ADD COLUMN data TEXT`

Backups creados antes del cambio:

- `C:\Users\franc\.local\share\opencode\opencode.db.20260625-113822.bak`
- `C:\Users\franc\.local\share\opencode\opencode.db-wal.20260625-113822.bak`
- `C:\Users\franc\.local\share\opencode\opencode.db-shm.20260625-113822.bak`

Verificación posterior:

- `PRAGMA integrity_check` => `ok`
- la tabla `permission` ahora tiene columnas:
  - `id`
  - `project_id`
  - `action`
  - `resource`
  - `time_created`
  - `time_updated`
  - `data`

Conclusión: el problema de esquema SQLite quedó saneado con el menor cambio posible.

### 4.2) Fix mínimo aplicado sobre plugin `engram.ts`

Se reemplazaron los puntos Node-incompatibles por wrappers con fallback:

- `Bun.which(...)` → `BunApi?.which?.(...)` con fallback a ruta fija
- `Bun.spawnSync(...)` → wrapper `runSyncText(...)` con fallback a `node:child_process.spawnSync`
- `Bun.spawn(...)` → wrapper `spawnDetached(...)` con fallback a `node:child_process.spawn`
- `Bun.file(...).exists()` → `existsSync(...)` desde `node:fs`

Objetivo del cambio:

- que el plugin siga funcionando si corre bajo Bun,
- pero que no crashee si OpenCode lo carga bajo Node/Electron.

Validación aplicada:

- transpile TypeScript OK (`DIAGNOSTICS 0`)
- no quedan accesos directos `Bun.` en el archivo

Conclusión: el error `Bun is not defined` quedó mitigado a nivel código; falta confirmar con reinicio de OpenCode.

### 5) Recomendación operativa inmediata

Hasta estabilizar Engram/OpenCode:

- guardar el estado también en archivos del repo (`knowledge/worklog/*`),
- no asumir que `mem_save`/session summary quedó persistido,
- cerrar cada bloque importante con handoff Caveman local antes de cambiar de frente.
