# TASK BRIEF — Rediseño visual Coordinación Global (Antigravity)

Fecha: 2026-08-17
Task: COORD-GLOBAL-UI-20260817
Owner herramienta: Antigravity (UX/UI)
Origen: OpenCode (extracción presentacional ya realizada)

## Objetivo

Rediseñar la capa visual de la vista global de coordinación (`/coordinadores`), respetando el lenguaje visual OSSUM Dark Operational y los patrones ya establecidos en `/coordinadores/mi-bandeja`. Solo capa visual. Sin lógica, sin wiring, sin tocar archivos sensibles.

## Contexto

OpenCode ya extrajo la capa visual a 3 componentes presentacionales puros (JSX + className + props, sin store/hooks/lógica). Antigravity rediseña ESOS componentes. El orquestador `src/app/coordinadores/page.tsx` queda fuera de alcance.

## Archivos ALLOWED (editar)

Solo estos tres:

- `src/components/coordinadores/SituationFilterBar.tsx` — barra de 4 filtros de situación (Falta información / Necesita definición / Hay un problema / Fuera de plazo). Recibe `activeFilter`, `onToggle`, `counts`.
- `src/components/coordinadores/CoordinatorCaseCard.tsx` — card de caso individual. Variantes `"autorizado"` (div con borde) y `"standard"` (Card). Recibe `view` (CoordinatorCaseViewModel) + callbacks `onOpenSeguimiento`, `onOpenGestion`, `onOpenLogistica`, `onOpenExpediente`.
- `src/components/coordinadores/CoordinatorBucketSection.tsx` — shell colapsable por bucket (autorizado/transito/finalizado) con sub-secciones anidadas para autorizado. Recibe `bucketKey`, `entries`, callbacks.

## Archivos FORBIDDEN (no leer, no tocar)

- `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts`
- `src/lib/store.ts`, `src/lib/businessRules.ts`, `src/lib/automations.ts`
- `src/lib/cirugias.constants.ts`, `src/lib/cirugias.utils.ts`
- `src/lib/services/*`, `src/lib/validators/*`, `src/lib/permissions/*`
- `src/hooks/*` (todos)
- `src/app/api/*` (todos)
- `src/app/coordinadores/page.tsx` (orquestador, fuera de alcance)
- `src/app/coordinadores/mi-bandeja/*` (vista personal, ya rediseñada, solo referencia visual)
- `src/components/cirugias/*`, `src/components/expediente/*`
- `src/components/coordinadores/coordinator-queue.helpers.ts` (tipos/config, importar pero no editar)
- `src/components/coordinadores/CoordinationStateSurface.tsx`
- `src/components/coordinadores/CoordinatorManagementDialog.tsx`
- `src/components/coordinadores/workspace/*`
- `src/components/coordinadores/preview/*`

No navegues el repo fuera de la lista allowed. Si necesitás un tipo/util que no está en allowed, pedíselo a Franco — no lo importes solo.

## Restricciones técnicas

- **Solo JSX + className.** Sin imports de store, hooks, services, validators, permissions.
- **No agregues dependencias.** Si creés que falta una, decíselo a Franco y lo decide él. No corras `npm install`.
- **Preservar la API de props** de cada componente. No cambiar los nombres/tipos de props ni agregar props nuevas sin confirmación. Antigravity puede reorganizar el JSX interno y los className, pero el contrato de props queda igual para que el orquestador siga funcionando.
- **Mobile-first.** `min-h-11` (44px) en touch targets. `focus-visible:ring` para accesibilidad.
- **Tokens OSSUM** definidos en `src/app/globals.css`: `--ossum-navy`, `--ossum-surface`, `--ossum-line-strong`, `--ossum-action`. Usar esos, no colores sueltos.
- **Respetar el lenguaje visual de `mi-bandeja`** (`src/app/coordinadores/mi-bandeja/`): mismo tema, mismos patrones de cards, mismos espaciados. Es referencia visual, no para copiar literal.
- Si una acción requiere wiring (conectar a store/API), dejá `// TODO: wire` y no la implementes.

## Reglas operativas

- No hagas commit, push, PR, ni merge. Franco revisa el diff en OpenCode.
- No corras migraciones, no toques DB, no toques auth, no toques secrets.
- No escribas en Engram ni en memoria operativa — eso se gestiona desde OpenCode.

## MCP

No instales ni conectes nada por defecto. Solo usar:
- **Chrome DevTools MCP** (del MCP Store) para validar visualmente en navegador.

Si necesitás otro MCP (Figma Dev Mode, etc.), pedíselo a Franco primero.

## Entrega

Al terminar, dejá un `HANDOFF.md` en esta misma carpeta con:

```
## Done
## Changed (por archivo)
## TODO: wire (lista de marcadores dejados)
## Decisiones visuales (paleta, spacing, jerarquía — lo que decidiste y por qué)
## Validación (Chrome DevTools: qué revisaste)
```

## Referencias visuales rápidas

- Tema: OSSUM Dark Operational (dark por defecto bajo `.dark`, azul/blanco light).
- Paleta operativa: navy (principal), sky (autorizado), violet (tránsito), emerald (finalizado), amber (incidentes), red (urgente/overdue).
- Densidad: compacta, tabular-nums en conteos, text-[11px]/text-xs en metadata, text-sm en títulos de card.
- Estructura: header con título + acciones → barra de situaciones → filtros → buckets colapsables → resumen de carga.
