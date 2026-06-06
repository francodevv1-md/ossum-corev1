# ENGRAM_TAGS.md — Tags Oficiales de Engram para OSSUM COR

> **Version**: 1.0 · **Creado**: 2026-05-12
> **Proyecto**: OSSUM COR
> **Regla**: Todo `engram save` o `mem_save` DEBE usar uno de estos tags como `type`. No inventar tipos arbitrarios.

---

## Tags Oficiales

| Tag | Uso | Ejemplo |
|-----|-----|---------|
| `architecture` | Decisiones de arquitectura, patrones, estructura | "Chose Zustand over Redux for state management" |
| `domain` | Conocimiento del dominio ortopedico/traumatologico | "CX = Cirugia, PR = Presupuesto, NR = Nota de Remito" |
| `bug` | Bugs encontrados, workarounds aplicados | "CirugiasTable infinite loop at setScrollState line 98" |
| `risk` | Riesgos detectados en codigo o arquitectura | "ID counter starts at 100, can collide with existing IDs" |
| `decision` | Decisiones tecnicas o de negocio tomadas | "Use title attribute instead of Radix Tooltip with asChild" |
| `traceability` | Relaciones entre modulos, specs, archivos | "CirugiasTable depends on useColumnVisibility which depends on localStorage" |
| `surgery` | Contexto del modulo Cirugias | "Fixed columns are OPTIONAL, activated from config" |
| `logistics` | Contexto del modulo Logistica | "LogisticaPanel is 567 lines, candidate for modularization" |
| `stock` | Contexto del modulo Stock | "Stock alerts use quantity <= minStock threshold" |
| `billing` | Contexto de facturacion y cobros | "Can't authorize FV without validated consumption" |
| `permissions` | Contexto de roles y permisos | "UserRole has 6 roles but no backend enforcement" |
| `zustand` | Problemas o patrones de Zustand | "Inline .filter() in selectors causes infinite loop — use useMemo" |
| `localstorage` | Problemas o patrones de localStorage | "Store key is ortotrack-v2-storage, backward compat required" |
| `calendar` | Contexto del modulo Calendario | "Weekly view loses surgeries without time" |
| `coordinadores` | Contexto del modulo Coordinadores | "STATE_COLORS duplicated across 3 modules" |
| `dashboard` | Contexto del Dashboard principal | "KPIs are hardcoded mock values" |
| `refactor` | Deudas tecnicas y candidatos a refactor | "TrazabilidadPanel 975 lines needs extraction" |
| `technical-debt` | Deudas tecnicas explicitas | "Delay authorization hardcoded at 3.2 days" |
| `spec` | Estado o cambios en specs | "Coordinadores mobile-first spec moved to APPROVED" |
| `audit` | Resultados de auditoria o QA | "Build OK, TypeScript 3 errors, ESLint 5 errors" |
| `pending` | Tareas pendientes identificadas | "Missing /usuarios page.tsx — sidebar link goes nowhere" |
| `config` | Cambios de configuracion o setup | "Engram Cloud v1.15.10 configured on port 18080" |
| `setup` | Instalacion o configuracion inicial | "PostgreSQL 17.5 compiled from source as non-root" |
| `pattern` | Patrones establecidos (naming, estructura, convencion) | "Use 'none' sentinel value for Radix SelectItem instead of empty string" |
| `preference` | Preferencias del usuario descubiertas | "User prefers table view over cards for coordinadores" |
| `discovery` | Hallazgos no obvios sobre el codebase | "framer-motion installed but only used in 2 components" |
| `bugfix` | Bugs corregidos | "Fixed duplicate CX-0001 by using timestamp-based ID generation" |

---

## Ejemplos de Uso

### Via MCP (Codex)

```javascript
// Guardar un bug encontrado
mem_save({
  title: "Found infinite loop in DropdownMenu Portal",
  type: "bug",
  project: "ossum-cor",
  scope: "project",
  topic_key: "bug/dropdown-portal-loop",
  content: "What: DropdownMenuPrimitive.Portal causes infinite re-render\nWhy: Known Radix issue with Portal in certain contexts\nWhere: src/components/ui/dropdown-menu.tsx line 40\nLearned: Avoid Portal or use workaround; same issue as Tooltip with asChild"
})

// Guardar una decision arquitectonica
mem_save({
  title: "Chose PostgreSQL over SQLite for Engram Cloud",
  type: "architecture",
  project: "ossum-cor",
  scope: "project",
  topic_key: "architecture/engram-cloud-db",
  content: "What: Compiled PostgreSQL 17.5 from source for Engram Cloud\nWhy: Engram Cloud server requires PostgreSQL; SQLite not supported for cloud mode\nWhere: /home/z/.local/pgsql/\nLearned: Can compile PostgreSQL as non-root user; needs bison and flex"
})
```

### Via CLI (Z.ai u otro agente)

```bash
# Guardar un hallazgo
engram save \
  "STATE_COLORS duplicated in 3 modules" \
  "What: STATE_COLORS map defined locally in coordinadores, calendario, and tableros\nWhy: No shared constants file was created initially\nWhere: coordinadores/page.tsx, calendario/page.tsx, tableros-operativos/page.tsx\nLearned: If one color changes, must update 3 files manually" \
  --type risk \
  --project ossum-cor

# Guardar contexto de debugging
engram save \
  "CirugiasTable setScrollState loop root cause" \
  "What: useEffect with setScrollState dependency causes Maximum update depth\nWhy: setScrollState triggers re-render which triggers useEffect again\nWhere: src/components/cirugias/CirugiasTable.tsx line 98\nLearned: Need to stabilize the dependency or use useRef instead of state" \
  --type bug \
  --project ossum-cor

# Guardar un pendiente operativo
engram save \
  "Missing /usuarios page.tsx" \
  "What: Sidebar has link to /usuarios but no page.tsx exists\nWhy: Route was added to NAV_GROUPS but page never created\nWhere: src/components/layout/sidebar.tsx, src/app/usuarios/ (missing)\nLearned: Next.js will show 404 for this route" \
  --type pending \
  --project ossum-cor
```

---

## Regla de Topic Keys

Para temas evolutivos (decisiones que cambian con el tiempo), usar `topic_key` con formato jerarquico:

```
architecture/auth-model
architecture/state-management
architecture/engram-cloud-db
bug/cirugias-table-loop
bug/dropdown-portal-loop
bug/duplicate-cx-0001
risk/id-collision
risk/localstorage-backward-compat
decision/radix-tooltip-workaround
decision/fixed-columns-optional
domain/surgery-flow
domain/billing-flow
```

Si un tema evoluciona, usar `mem_update` con el mismo `topic_key` en vez de crear una nueva observacion.
