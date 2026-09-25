import {
  CIRUGIAS_COLUMN_GROUPS,
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_FIXED_LEFT_COLUMNS,
  PINNABLE_LEFT_COLUMN_KEYS,
  PRESET_COLUMNS_15_OPS,
  PRESET_COLUMNS_22_EXTREMO,
} from "@/lib/cirugias.constants"
import type { GroupedHeaderPreference } from "@/hooks/useColumnVisibility"
import type { ColumnDefinition, ViewDraft, ViewPreset } from "./types"

export const USER_VIEW_TEMPLATES_KEY = "ortotrack-cirugias-view-templates"
export const CURRENT_VIEW_TEMPLATE_ID = "current-view"
export const MAX_FIXED_COLUMNS = 6

export const PINNABLE_LEFT_COLUMN_KEY_SET = new Set<string>(PINNABLE_LEFT_COLUMN_KEYS)

export const GROUP_COLOR_OPTIONS = [
  { name: "Slate", className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200" },
  { name: "Blue", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" },
  { name: "Emerald", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" },
  { name: "Amber", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300" },
  { name: "Rose", className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300" },
] as const

export function buildDefaultGroups(): GroupedHeaderPreference[] {
  return CIRUGIAS_COLUMN_GROUPS.map((group, index) => ({
    id: group.key,
    label: group.label,
    colorName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].name,
    colorClassName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].className,
    columns: [...group.columns],
  }))
}

export function normalizeGroups(
  groups: GroupedHeaderPreference[] | undefined,
  columns: ReadonlyArray<ColumnDefinition>
): GroupedHeaderPreference[] {
  const knownKeys = new Set(columns.map((column) => column.key))
  const defaults = buildDefaultGroups()
  const defaultsById = new Map(defaults.map((group) => [group.id, group]))

  if (!groups?.length) return defaults

  const normalized = groups.flatMap((group) => {
    const fallback = defaultsById.get(group.id)
    if (!fallback) return []

    const columnsForGroup = Array.isArray(group.columns)
      ? group.columns
          .filter((key) => knownKeys.has(key))
          .filter((key, index, self) => self.indexOf(key) === index)
      : [...fallback.columns]

    return [
      {
        id: fallback.id,
        label: typeof group.label === "string" && group.label.trim().length > 0 ? group.label : fallback.label,
        colorName: typeof group.colorName === "string" && group.colorName.trim().length > 0 ? group.colorName : fallback.colorName,
        colorClassName: typeof group.colorClassName === "string" && group.colorClassName.trim().length > 0 ? group.colorClassName : fallback.colorClassName,
        columns: columnsForGroup.length > 0 ? columnsForGroup : [...fallback.columns],
      },
    ]
  })

  const normalizedIds = new Set(normalized.map((group) => group.id))
  return [...normalized, ...defaults.filter((group) => !normalizedIds.has(group.id))].map((group) => ({
    ...group,
    columns: [...group.columns],
  }))
}

export function cloneDraft(draft: ViewDraft): ViewDraft {
  return {
    visibleColumnKeys: [...draft.visibleColumnKeys],
    orderedColumnKeys: [...draft.orderedColumnKeys],
    stickyColumnsEnabled: draft.stickyColumnsEnabled,
    showGroupedHeaders: draft.showGroupedHeaders,
    widths: { ...draft.widths },
    compactMode: draft.compactMode,
    fixedColumns: [...draft.fixedColumns],
    groups: draft.groups.map((group) => ({ ...group, columns: [...group.columns] })),
    cxVariant: draft.cxVariant ?? "b",
  }
}

export function getWidthOptionsForColumn(columnKey: string) {
  const defaultWidth = DEFAULT_COLUMN_WIDTHS[columnKey] ?? 120
  const ajustado = Math.max(50, Math.round(defaultWidth * 0.8))
  const normal = defaultWidth
  const amplio = Math.round(defaultWidth * 1.35)

  return {
    ajustado,
    normal,
    amplio,
  }
}

export function detectWidthPreset(columnKey: string, currentWidthStr: string | number): "ajustado" | "normal" | "amplio" | "custom" {
  const num = Number(currentWidthStr)
  if (!Number.isFinite(num) || num <= 0) return "normal"

  const { ajustado, normal, amplio } = getWidthOptionsForColumn(columnKey)
  if (Math.abs(num - normal) <= 2) return "normal"
  if (Math.abs(num - ajustado) <= 2) return "ajustado"
  if (Math.abs(num - amplio) <= 2) return "amplio"

  return "custom"
}

export function buildSystemPresets(columns: ReadonlyArray<ColumnDefinition>): ViewPreset[] {
  const allKeys = columns.map((column) => column.key)
  const baseWidths = Object.fromEntries(
    columns.map((column) => [column.key, String(DEFAULT_COLUMN_WIDTHS[column.key] ?? 148)])
  ) as Record<string, string>

  const createConfig = (partial: Partial<ViewDraft>): ViewDraft => ({
    visibleColumnKeys: partial.visibleColumnKeys ?? allKeys,
    orderedColumnKeys: partial.orderedColumnKeys ?? allKeys,
    stickyColumnsEnabled: partial.stickyColumnsEnabled ?? true,
    showGroupedHeaders: partial.showGroupedHeaders ?? false,
    groups: normalizeGroups(partial.groups, columns),
    widths: partial.widths ? { ...baseWidths, ...partial.widths } : { ...baseWidths },
    compactMode: partial.compactMode ?? false,
    fixedColumns: partial.fixedColumns ?? [...DEFAULT_FIXED_LEFT_COLUMNS],
    cxVariant: partial.cxVariant ?? "b",
  })

  return [
    {
      id: "operativa",
      name: "Operativa",
      badge: "Recomendada",
      description: "15 columnas esenciales optimizadas para el flujo quirúrgico diario sin desborde horizontal.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: PRESET_COLUMNS_15_OPS.filter((key) => allKeys.includes(key)),
        orderedColumnKeys: PRESET_COLUMNS_15_OPS.filter((key) => allKeys.includes(key)),
        compactMode: true,
        cxVariant: "b",
        showGroupedHeaders: false,
      }),
    },
    {
      id: "control-general",
      name: "Control general",
      description: "Vista balanceada y multiárea para coordinar el circuito completo con contexto de equipo.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: [
          "id", "state", "patient", "clientOs", "institution", "surgeon",
          "classification", "preparationState", "date", "time", "prNumber",
          "expedienteNumber", "doc", "consumo", "facturado", "circuitProgress", "actions"
        ].filter((key) => allKeys.includes(key)),
        compactMode: false,
        cxVariant: "b",
      }),
    },
    {
      id: "autorizados",
      name: "Autorizados",
      description: "Prioriza autorización médica, remitos PR, agenda y coordinación comercial.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: [
          "state", "date", "patient", "surgeon", "institution", "prNumber",
          "expedienteNumber", "clientOs", "coordinadorCx", "classification", "actions"
        ].filter((key) => allKeys.includes(key)),
        orderedColumnKeys: [
          "state", "date", "patient", "institution", "surgeon", "prNumber",
          "expedienteNumber", "clientOs", "coordinadorCx", "classification", "actions"
        ].filter((key) => allKeys.includes(key)),
        compactMode: true,
        cxVariant: "b",
      }),
    },
    {
      id: "documentacion",
      name: "Documentación",
      description: "Agrupa trazabilidad documental, partes quirúrgicos y estados de cierre previos a facturación.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: [
          "state", "patient", "institution", "id", "expedienteNumber",
          "doc", "consumo", "facturado", "circuitProgress", "actions"
        ].filter((key) => allKeys.includes(key)),
        orderedColumnKeys: [
          "state", "patient", "institution", "id", "expedienteNumber",
          "doc", "consumo", "facturado", "circuitProgress", "actions"
        ].filter((key) => allKeys.includes(key)),
        fixedColumns: ["state", "patient"].filter((key) => allKeys.includes(key)),
        compactMode: false,
        cxVariant: "b",
      }),
    },
    {
      id: "auditoria-completa",
      name: "Auditoría completa",
      description: "Trazabilidad total que despliega la totalidad de columnas, fechas secundarias y actores de terreno.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: PRESET_COLUMNS_22_EXTREMO.filter((key) => allKeys.includes(key)),
        orderedColumnKeys: PRESET_COLUMNS_22_EXTREMO.filter((key) => allKeys.includes(key)),
        compactMode: false,
        cxVariant: "b",
        showGroupedHeaders: true,
      }),
    },
  ]
}
