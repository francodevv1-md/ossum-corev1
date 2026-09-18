# QUALITY_GATES.md — OSSUM COR

Estado: vigente

---

## Gates generales

Antes de cerrar una tarea técnica:

- TypeScript sin errores si aplica.
- Build correcto si aplica.
- Tests relevantes ejecutados si existen.
- Smoke test de rutas si toca UI/API.
- Browser QA si toca flujo visual.
- Worklog actualizado.
- Handoff generado.
- Riesgos abiertos declarados.
- Engram session_summary guardado si corresponde.

Si la tarea corrige un bug o una falla técnica activa, debe pasar por el ciclo Diagnose antes de cerrar.

---

## Gate de debugging disciplinado

Para bugs, tests fallidos, build roto o errores técnicos activos:

- Reproduce obligatorio.
- Scope obligatorio.
- Evidence obligatoria.
- Hypothesis explícita.
- Minimal Fix justificado.
- Validate con comando o chequeo real.
- Regression Check en flujos adyacentes.
- Handoff final claro.

Casos donde Diagnose es obligatorio:

- tests fallidos;
- build roto;
- `storage.setItem is not a function`;
- errores Prisma;
- errores TypeScript;
- loops UI.

No cerrar un bug con fix intuitivo ni con cambios de arquitectura sin evidencia.

---

## Backend

- No lógica de negocio en componentes.
- `company_id` obligatorio donde corresponda.
- Validadores centralizados.
- Servicios server-side.
- Auditoría en eventos críticos.
- Transacciones donde corresponda.
- `npx prisma format` si se tocó Prisma.
- `npx prisma generate` si se tocó Prisma.
- Migraciones revisadas si aplica.

---

## UI

- No duplicar constantes.
- No romper Cirugías.
- No usar Radix Tooltip con `asChild` si genera loops.
- No hacer inline `.filter()` en Zustand selectors.
- No esconder filtros operativos importantes.
- Acciones por fila deben funcionar.
- Browser QA si afecta navegación o flujo.

---

## Documentación

- Contexto Maestro solo si cambia decisión rectora.
- CURRENT_STATE para estado del repo/prototipo.
- Worklog para ejecución.
- Handoff para cierre usando formato Caveman (Done / Changed / Files / Validations / Risks / Next).
- Engram para memoria operativa.
- ADRs y documentación canónica no deben comprimirse con Caveman.

---

## Gate de revisión automatizada (GGA — opcional)

GGA (Gentleman Guardian Angel) está configurado como pre-commit hook opcional para revisión de código con IA.

### Alcance

- **FILE_PATTERNS**: `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.css`, `*.json`, `*.prisma`, `*.md` — solo archivos de código y config activa.
- **EXCLUDE_PATTERNS**: `*.test.*`, `*.spec.*`, `*.d.ts`, `dist/*`, `build/*`, `node_modules/*`, `.next/*`, `.engram/*`, `knowledge/archive/*` — tests, builds, chunks de memoria y docs archivadas no se revisan.
- **Rules file**: `AGENTS.md` — las reglas de gobernanza del proyecto son la base de la revisión.

### Cuándo usarlo

- Recomendado en tareas que modifican archivos `src/`, `prisma/`, `.opencode/` o configs de proyecto.
- No aplica a documentación canónica (`knowledge/core/`, `knowledge/domain/`, `knowledge/architecture/`), worklog, archive ni memorias Engram.

### Instalación (pendiente)

El hook no está instalado todavía. Para activarlo:

```bash
git init                          # si no existe repo
gga install                      # instala pre-commit hook
```

Verificar con `gga config` que el proyecto cargue su config local.
