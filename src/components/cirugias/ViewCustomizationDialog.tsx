"use client"

import React from "react"
import { ArrowDown, ArrowUp, BookmarkPlus, Eye, LayoutTemplate, MonitorCog, Pin, Rows3, Sparkles, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { CIRUGIAS_COLUMN_GROUPS, DEFAULT_COLUMN_WIDTHS, DEFAULT_FIXED_LEFT_COLUMNS, DEFAULT_VISIBLE_COLS, PINNABLE_LEFT_COLUMN_KEYS } from "@/lib/cirugias.constants"
import type { GroupedHeaderPreference } from "@/hooks/useColumnVisibility"
import { cn } from "@/lib/utils"

type ColumnDefinition = { key: string; label: string }

const PINNABLE_LEFT_COLUMN_KEY_SET = new Set<string>(PINNABLE_LEFT_COLUMN_KEYS)

type MockGroup = GroupedHeaderPreference

type ViewDraft = {
  visibleColumnKeys: string[]
  orderedColumnKeys: string[]
  stickyColumnsEnabled: boolean
  showGroupedHeaders: boolean
  groups: MockGroup[]
  widths: Record<string, string>
  compactMode: boolean
  fixedColumns: string[]
}

type MockTemplate = {
  id: string
  name: string
  description: string
  accentClassName: string
  summary: string
  source: "system" | "user" | "current"
  config: ViewDraft
}

type StoredUserTemplate = {
  id: string
  name: string
  description: string
  summary: string
  config: ViewDraft
}

const GROUP_COLOR_OPTIONS = [
  { name: "Slate", className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200" },
  { name: "Blue", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" },
  { name: "Emerald", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" },
  { name: "Amber", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300" },
  { name: "Rose", className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300" },
] as const

const USER_VIEW_TEMPLATES_KEY = "ortotrack-cirugias-view-templates"
const USER_TEMPLATE_ACCENT = "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30"
const CURRENT_VIEW_TEMPLATE_ID = "current-view"

function buildDefaultGroups(): MockGroup[] {
  return CIRUGIAS_COLUMN_GROUPS.map((group, index) => ({
    id: group.key,
    label: group.label,
    colorName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].name,
    colorClassName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].className,
    columns: [...group.columns],
  }))
}

function buildUserTemplatePayload({
  id,
  name,
  draft,
  columns,
}: {
  id: string
  name: string
  draft: ViewDraft
  columns: ReadonlyArray<ColumnDefinition>
}): MockTemplate {
  const sanitizedDraft = sanitizeDraftForColumns(draft, columns)

  return {
    id,
    name,
    description: "Vista guardada en este navegador.",
    summary: `${sanitizedDraft.visibleColumnKeys.length} visibles · ${sanitizedDraft.stickyColumnsEnabled ? "encabezados fijos" : "encabezados libres"}`,
    accentClassName: USER_TEMPLATE_ACCENT,
    source: "user",
    config: sanitizedDraft,
  }
}

function cloneDraft(draft: ViewDraft): ViewDraft {
  return {
    visibleColumnKeys: [...draft.visibleColumnKeys],
    orderedColumnKeys: [...draft.orderedColumnKeys],
    stickyColumnsEnabled: draft.stickyColumnsEnabled,
    showGroupedHeaders: draft.showGroupedHeaders,
    widths: { ...draft.widths },
    compactMode: draft.compactMode,
    fixedColumns: [...draft.fixedColumns],
    groups: draft.groups.map((group) => ({ ...group, columns: [...group.columns] })),
  }
}

function normalizeGroups(groups: MockGroup[] | undefined, columns: ReadonlyArray<ColumnDefinition>): MockGroup[] {
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

    return [{
      id: fallback.id,
      label: typeof group.label === "string" && group.label.trim().length > 0 ? group.label : fallback.label,
      colorName: typeof group.colorName === "string" && group.colorName.trim().length > 0 ? group.colorName : fallback.colorName,
      colorClassName: typeof group.colorClassName === "string" && group.colorClassName.trim().length > 0 ? group.colorClassName : fallback.colorClassName,
      columns: columnsForGroup.length > 0 ? columnsForGroup : [...fallback.columns],
    }]
  })

  const normalizedIds = new Set(normalized.map((group) => group.id))
  return [...normalized, ...defaults.filter((group) => !normalizedIds.has(group.id))].map((group) => ({
    ...group,
    columns: [...group.columns],
  }))
}

function buildTemplates(columns: ReadonlyArray<ColumnDefinition>): MockTemplate[] {
  const allKeys = columns.map((column) => column.key)

  const baseWidths = Object.fromEntries(
    columns.map((column) => [column.key, String(DEFAULT_COLUMN_WIDTHS[column.key] ?? 148)])
  ) as Record<string, string>

  const createConfig = (config: Partial<ViewDraft>): ViewDraft => ({
      visibleColumnKeys: config.visibleColumnKeys ?? allKeys,
      orderedColumnKeys: config.orderedColumnKeys ?? allKeys,
      stickyColumnsEnabled: config.stickyColumnsEnabled ?? true,
      showGroupedHeaders: config.showGroupedHeaders ?? true,
      groups: normalizeGroups(config.groups, columns),
      widths: config.widths ? { ...baseWidths, ...config.widths } : { ...baseWidths },
      compactMode: config.compactMode ?? false,
      fixedColumns: config.fixedColumns ?? [...DEFAULT_FIXED_LEFT_COLUMNS],
  })

  return [
    {
      id: "control-general",
      name: "Control general",
      description: "Vista amplia para coordinar el circuito completo sin perder contexto.",
      accentClassName: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80",
      summary: "Balanceada, multiárea, pensada para seguimiento diario.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: ["state", "date", "patient", "surgeon", "institution", "id", "prNumber", "expedienteNumber", "preparationState", "doc", "consumo", "facturado", "circuitProgress", "clientOs", "coordinadorCx", "actions"],
      }),
    },
    {
      id: "autorizados",
      name: "Autorizados",
      description: "Prioriza autorización, PR, agenda y seguimiento comercial.",
      accentClassName: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30",
      summary: "Ideal para coordinar lo que ya está encaminado pero requiere control fino.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: ["state", "date", "patient", "surgeon", "institution", "prNumber", "expedienteNumber", "clientOs", "coordinadorCx", "classification", "numeroAutorizacion", "actions"].filter((key) => allKeys.includes(key)),
        orderedColumnKeys: ["state", "date", "patient", "institution", "surgeon", "prNumber", "expedienteNumber", "clientOs", "coordinadorCx", "classification", "actions"].filter((key) => allKeys.includes(key)),
        compactMode: true,
      }),
    },
    {
      id: "documentacion",
      name: "Documentación",
      description: "Agrupa datos de expediente, documentación y estados de cierre.",
      accentClassName: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
      summary: "Útil para control documental y trazabilidad previa a facturación.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: ["state", "patient", "institution", "id", "expedienteNumber", "doc", "consumo", "facturado", "circuitProgress", "actions"],
        orderedColumnKeys: ["state", "patient", "institution", "id", "expedienteNumber", "doc", "consumo", "facturado", "circuitProgress", "actions"],
        fixedColumns: ["state", "expedienteNumber"],
      }),
    },
    {
      id: "logistica-preparacion",
      name: "Logística / Preparación",
      description: "Pone adelante preparación, fechas operativas y actores de terreno.",
      accentClassName: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
      summary: "Pensada para preparar entregas, envíos y coordinación prequirúrgica.",
      source: "system",
      config: createConfig({
        visibleColumnKeys: ["state", "date", "probableDate", "fechaLogistica", "fechaEnvio", "patient", "institution", "preparationState", "coordinadorCx", "instrumentador", "vendedor", "actions"],
        orderedColumnKeys: ["state", "date", "probableDate", "fechaLogistica", "fechaEnvio", "patient", "institution", "preparationState", "coordinadorCx", "instrumentador", "vendedor", "actions"],
        widths: { fechaLogistica: "124", fechaEnvio: "124", preparationState: "134" },
      }),
    },
  ]
}

function sanitizeDraftForColumns(draft: ViewDraft, columns: ReadonlyArray<ColumnDefinition>): ViewDraft {
  const fallbackDraft = cloneDraft(buildTemplates(columns)[0].config)
  const knownKeys = columns.map((column) => column.key)
  const pinnableKeys = new Set<string>(PINNABLE_LEFT_COLUMN_KEYS)
  const orderedColumnKeys = draft.orderedColumnKeys.filter((key) => knownKeys.includes(key))
  const visibleColumnKeys = draft.visibleColumnKeys.filter((key) => knownKeys.includes(key))
  const missingKeys = knownKeys.filter((key) => !orderedColumnKeys.includes(key))

  return {
    ...fallbackDraft,
    ...cloneDraft(draft),
    showGroupedHeaders: draft.showGroupedHeaders !== false,
    visibleColumnKeys,
    orderedColumnKeys: [...orderedColumnKeys, ...missingKeys],
    fixedColumns: draft.fixedColumns.filter((key) => knownKeys.includes(key) && pinnableKeys.has(key)),
    widths: Object.fromEntries(knownKeys.map((key) => {
      const rawValue = draft.widths[key]
      const numericValue = Number(rawValue)
      return [key, Number.isFinite(numericValue) && numericValue > 0 ? String(numericValue) : String(DEFAULT_COLUMN_WIDTHS[key] ?? 148)]
    })),
    groups: normalizeGroups(draft.groups, columns),
  }
}

function loadUserTemplates(columns: ReadonlyArray<ColumnDefinition>): MockTemplate[] {
  if (typeof window === "undefined") return []

  try {
    const rawValue = localStorage.getItem(USER_VIEW_TEMPLATES_KEY)
    if (!rawValue) return []

    const parsed = JSON.parse(rawValue) as StoredUserTemplate[]
    if (!Array.isArray(parsed)) return []

    return parsed.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      summary: template.summary,
      accentClassName: USER_TEMPLATE_ACCENT,
      source: "user",
      config: sanitizeDraftForColumns(template.config, columns),
    }))
  } catch {
    return []
  }
}

function persistUserTemplates(templates: MockTemplate[]) {
  if (typeof window === "undefined") return

  try {
    const payload: StoredUserTemplate[] = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      summary: template.summary,
      config: cloneDraft(template.config),
    }))

    localStorage.setItem(USER_VIEW_TEMPLATES_KEY, JSON.stringify(payload))
  } catch {
    // Silently fail if localStorage is not available
  }
}

interface ViewCustomizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ReadonlyArray<ColumnDefinition>
  visibleCols: Record<string, boolean>
  columnOrder: string[]
  stickyColumns: boolean
  columnWidths: Record<string, number>
  compactMode: boolean
  fixedColumns: string[]
  groups: MockGroup[]
  showGroupedHeaders: boolean
  showOperationPresets: boolean
  onShowOperationPresetsChange: (show: boolean) => void
  onApply: (next: { visibleCols: Record<string, boolean>; columnOrder: string[]; stickyColumns: boolean; columnWidths: Record<string, number>; compactMode: boolean; fixedColumns: string[]; groups: MockGroup[]; showGroupedHeaders: boolean }) => void
  onResetToDefault: () => void
}

function buildDraftFromCurrentView({
  columns,
  visibleCols,
  columnOrder,
  stickyColumns,
  columnWidths,
  groups,
  showGroupedHeaders,
  fixedColumns,
  compactMode,
}: {
  columns: ReadonlyArray<ColumnDefinition>
  visibleCols: Record<string, boolean>
  columnOrder: string[]
  stickyColumns: boolean
  columnWidths: Record<string, number>
  groups: MockGroup[]
  showGroupedHeaders: boolean
  fixedColumns: string[]
  compactMode: boolean
}): ViewDraft {
  const templates = buildTemplates(columns)
  const fallbackDraft = cloneDraft(templates[0]?.config ?? buildTemplates(columns)[0].config)
  const knownKeys = columns.map((column) => column.key)
  const orderedColumnKeys = columnOrder.filter((key) => knownKeys.includes(key))
  const missingKeys = knownKeys.filter((key) => !orderedColumnKeys.includes(key))

  return {
    ...fallbackDraft,
    visibleColumnKeys: knownKeys.filter((key) => visibleCols[key] !== false),
    orderedColumnKeys: [...orderedColumnKeys, ...missingKeys],
    stickyColumnsEnabled: stickyColumns,
    showGroupedHeaders,
    compactMode,
    widths: Object.fromEntries(knownKeys.map((key) => [key, String(columnWidths[key] ?? DEFAULT_COLUMN_WIDTHS[key] ?? 148)])),
    fixedColumns: fixedColumns.filter((key) => knownKeys.includes(key)),
    groups: normalizeGroups(groups, columns),
  }
}

export function ViewCustomizationDialog({
  open,
  onOpenChange,
  columns,
  visibleCols,
  columnOrder,
  stickyColumns,
  columnWidths,
  compactMode,
  fixedColumns,
  groups,
  showGroupedHeaders,
  showOperationPresets,
  onShowOperationPresetsChange,
  onApply,
  onResetToDefault,
}: ViewCustomizationDialogProps) {
  const columnMap = React.useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns])
  const systemTemplates = React.useMemo(() => buildTemplates(columns), [columns])
  const [userTemplates, setUserTemplates] = React.useState<MockTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(CURRENT_VIEW_TEMPLATE_ID)
  const [draft, setDraft] = React.useState<ViewDraft>(() => cloneDraft(systemTemplates[0]?.config ?? buildTemplates(columns)[0].config))
  const [newTemplateName, setNewTemplateName] = React.useState("")
  const [columnsEditorMode, setColumnsEditorMode] = React.useState<"columns" | "groups">("columns")

  const currentViewDraft = React.useMemo(
    () => buildDraftFromCurrentView({ columns, visibleCols, columnOrder, stickyColumns, columnWidths, groups, showGroupedHeaders, fixedColumns, compactMode }),
    [columns, visibleCols, columnOrder, stickyColumns, columnWidths, groups, showGroupedHeaders, fixedColumns, compactMode]
  )

  const currentViewTemplate = React.useMemo<MockTemplate>(() => ({
    id: CURRENT_VIEW_TEMPLATE_ID,
    name: "Vista actual",
    description: "Configuración con la que abriste el modal.",
    accentClassName: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
    summary: "Sirve como base para guardar una plantilla propia sin tocar backend.",
    source: "current",
    config: currentViewDraft,
  }), [currentViewDraft])

  const templates = React.useMemo(
    () => [currentViewTemplate, ...userTemplates, ...systemTemplates],
    [currentViewTemplate, systemTemplates, userTemplates]
  )

  const selectedTemplate = React.useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? currentViewTemplate,
    [selectedTemplateId, templates]
  )
  const selectedUserTemplate = selectedTemplate?.source === "user" ? selectedTemplate : null

  React.useEffect(() => {
    setUserTemplates(loadUserTemplates(columns))
  }, [columns])

  React.useEffect(() => {
    if (!selectedTemplate) return
    setDraft(cloneDraft(selectedTemplate.config))
  }, [selectedTemplate])

  React.useEffect(() => {
    if (!templates.length) return
    if (!templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(CURRENT_VIEW_TEMPLATE_ID)
    }
  }, [selectedTemplateId, templates])

  React.useEffect(() => {
    if (!open) return
    setDraft(cloneDraft(currentViewDraft))
    setSelectedTemplateId(CURRENT_VIEW_TEMPLATE_ID)
    setNewTemplateName("")
    setColumnsEditorMode("columns")
  }, [currentViewDraft, open])

  React.useEffect(() => {
    setNewTemplateName(selectedUserTemplate?.name ?? "")
  }, [selectedUserTemplate?.id, selectedUserTemplate?.name])

  const orderedColumns = React.useMemo(
    () => draft.orderedColumnKeys.map((key) => columnMap.get(key)).filter(Boolean) as ColumnDefinition[],
    [columnMap, draft.orderedColumnKeys]
  )
  const activePinnedColumns = React.useMemo(
    () => orderedColumns.filter((column) => draft.fixedColumns.includes(column.key) && draft.visibleColumnKeys.includes(column.key)),
    [draft.fixedColumns, draft.visibleColumnKeys, orderedColumns]
  )

  const visibleCount = draft.visibleColumnKeys.length
  const canSaveTemplate = newTemplateName.trim().length > 0
  const handleSaveTemplate = () => {
    if (selectedUserTemplate) {
      handleUpdateUserTemplate()
      return
    }

    handleSaveUserTemplate()
  }

  const realConfigDirty = React.useMemo(() => {
    const currentVisible = currentViewDraft.visibleColumnKeys.join("|")
    const draftVisible = draft.visibleColumnKeys.join("|")
    const currentOrder = currentViewDraft.orderedColumnKeys.join("|")
    const draftOrder = draft.orderedColumnKeys.join("|")
    const currentWidths = currentViewDraft.orderedColumnKeys.map((key) => `${key}:${currentViewDraft.widths[key] ?? ""}`).join("|")
    const draftWidths = draft.orderedColumnKeys.map((key) => `${key}:${draft.widths[key] ?? ""}`).join("|")

    const currentFixed = currentViewDraft.fixedColumns.join("|")
    const draftFixed = draft.fixedColumns.join("|")
    const currentGroups = currentViewDraft.groups.map((group) => `${group.id}:${group.label}:${group.colorName}:${group.colorClassName}:${group.columns.join(",")}`).join("|")
    const draftGroups = draft.groups.map((group) => `${group.id}:${group.label}:${group.colorName}:${group.colorClassName}:${group.columns.join(",")}`).join("|")

    return currentVisible !== draftVisible
      || currentOrder !== draftOrder
      || currentWidths !== draftWidths
      || currentFixed !== draftFixed
      || currentGroups !== draftGroups
      || currentViewDraft.stickyColumnsEnabled !== draft.stickyColumnsEnabled
      || currentViewDraft.showGroupedHeaders !== draft.showGroupedHeaders
      || currentViewDraft.compactMode !== draft.compactMode
  }, [currentViewDraft, draft])

  const updateVisible = (key: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      visibleColumnKeys: checked
        ? Array.from(new Set([...current.visibleColumnKeys, key]))
        : current.visibleColumnKeys.filter((columnKey) => columnKey !== key),
    }))
  }

  const moveColumn = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.orderedColumnKeys.length) return current

      const orderedColumnKeys = [...current.orderedColumnKeys]
      const [column] = orderedColumnKeys.splice(index, 1)
      orderedColumnKeys.splice(nextIndex, 0, column)
      return { ...current, orderedColumnKeys }
    })
  }

  const updateWidth = (key: string, value: string) => {
    setDraft((current) => ({ ...current, widths: { ...current.widths, [key]: value } }))
  }

  const toggleFixedColumn = (key: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      fixedColumns: checked
        ? Array.from(new Set([...current.fixedColumns, key]))
        : current.fixedColumns.filter((columnKey) => columnKey !== key),
    }))
  }

  const updateGroupColor = (groupId: string, colorName: string, colorClassName: string) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group) => group.id === groupId ? { ...group, colorName, colorClassName } : group),
    }))
  }

  const updateGroupLabel = (groupId: string, label: string) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group) => group.id === groupId ? { ...group, label } : group),
    }))
  }

  const moveGroup = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.groups.length) return current

      const groups = [...current.groups]
      const [group] = groups.splice(index, 1)
      groups.splice(nextIndex, 0, group)

      return { ...current, groups }
    })
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
  }

  const handleSaveUserTemplate = () => {
    const trimmedName = newTemplateName.trim()
    if (!trimmedName) return

    const nextTemplate = buildUserTemplatePayload({
      id: `user-${Date.now()}`,
      name: trimmedName,
      draft,
      columns,
    })

    setUserTemplates((current) => {
      const next = [nextTemplate, ...current]
      persistUserTemplates(next)
      return next
    })
    setSelectedTemplateId(nextTemplate.id)
    setNewTemplateName("")
  }

  const handleUpdateUserTemplate = () => {
    if (!selectedUserTemplate) return

    const trimmedName = newTemplateName.trim()
    if (!trimmedName) return

    setUserTemplates((current) => {
      const next = current.map((template) => template.id === selectedUserTemplate.id
        ? buildUserTemplatePayload({
          id: template.id,
          name: trimmedName,
          draft,
          columns,
        })
        : template)

      persistUserTemplates(next)
      return next
    })
  }

  const handleDeleteUserTemplate = (templateId: string) => {
    setUserTemplates((current) => {
      const next = current.filter((template) => template.id !== templateId)
      persistUserTemplates(next)
      return next
    })

    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(CURRENT_VIEW_TEMPLATE_ID)
    }
  }

  const handleResetMock = () => {
    if (!selectedTemplate) return
    setDraft(cloneDraft(selectedTemplate.config))
  }

  const handleResetReal = () => {
    void onResetToDefault
    setDraft(buildDraftFromCurrentView({
      columns,
      visibleCols: DEFAULT_VISIBLE_COLS,
      columnOrder: columns.map((column) => column.key),
      stickyColumns: true,
      columnWidths: DEFAULT_COLUMN_WIDTHS,
      groups: buildDefaultGroups(),
      showGroupedHeaders: true,
      fixedColumns: [...DEFAULT_FIXED_LEFT_COLUMNS],
      compactMode: false,
    }))
    setSelectedTemplateId(CURRENT_VIEW_TEMPLATE_ID)
  }

  const handleApply = () => {
    const nextVisibleCols = Object.fromEntries(
      columns.map((column) => [column.key, draft.visibleColumnKeys.includes(column.key)])
    )

    const nextColumnWidths = Object.fromEntries(
      columns.map((column) => {
        const rawValue = draft.widths[column.key]
        const numericValue = Number(rawValue)
        return [column.key, Number.isFinite(numericValue) && numericValue > 0 ? numericValue : DEFAULT_COLUMN_WIDTHS[column.key] ?? 148]
      })
    )

    onApply({
      visibleCols: nextVisibleCols,
      columnOrder: draft.orderedColumnKeys,
      stickyColumns: draft.stickyColumnsEnabled,
      columnWidths: nextColumnWidths,
      compactMode: draft.compactMode,
      fixedColumns: draft.fixedColumns,
      groups: normalizeGroups(draft.groups, columns),
      showGroupedHeaders: draft.showGroupedHeaders,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(96vh,920px)] w-[calc(100vw-1rem)] max-w-[min(1480px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden border-slate-300 bg-slate-50 p-0 dark:border-slate-700 dark:bg-slate-950 sm:w-[calc(100vw-2rem)] sm:max-w-[min(1480px,calc(100vw-2rem))]" showCloseButton>
        <DialogHeader className="gap-4 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pr-10 sm:pr-8">
            <div className="space-y-2">
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Vista de tabla
              </Badge>
              <DialogTitle className="text-xl text-slate-950 dark:text-slate-50">Personalización de vista</DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Organizá qué columnas querés ver, en qué orden trabajar y cómo se presenta la tabla antes de aplicar los cambios.
              </DialogDescription>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left dark:border-slate-700 dark:bg-slate-800/80">
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">{visibleCount}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">columnas visibles</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left dark:border-slate-700 dark:bg-slate-800/80">
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">{userTemplates.length}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">vistas guardadas</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left dark:border-slate-700 dark:bg-slate-800/80">
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">{activePinnedColumns.length}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">fijas a la izquierda</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left dark:border-slate-700 dark:bg-slate-800/80">
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">{draft.compactMode ? "Sí" : "No"}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">modo compacto</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="plantillas" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <TabsList className="flex h-auto min-w-max flex-nowrap rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800/90">
              <TabsTrigger value="plantillas" className="gap-2 rounded-lg px-4 py-2 text-xs font-medium">
                <LayoutTemplate className="size-3.5" />
                Plantillas
              </TabsTrigger>
              <TabsTrigger value="columnas" className="gap-2 rounded-lg px-4 py-2 text-xs font-medium">
                <Rows3 className="size-3.5" />
                Columnas
              </TabsTrigger>
              <TabsTrigger value="comportamiento" className="gap-2 rounded-lg px-4 py-2 text-xs font-medium">
                <MonitorCog className="size-3.5" />
                Apariencia
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1 bg-slate-50 dark:bg-slate-950">
            <div className="space-y-5 p-4 pb-8 sm:p-5 lg:p-6 lg:pb-10">
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">{selectedTemplate?.name}</div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{selectedTemplate?.description}</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      Cambios listos para aplicar
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {draft.groups.map((group) => (
                      <Badge key={group.id} variant="outline" className={cn("gap-1.5 border", group.colorClassName)}>
                        <span className="size-2 rounded-full bg-current opacity-70" />
                        {group.label}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Columnas visibles</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{visibleCount}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">de {columns.length}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Fijas a la izquierda</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{activePinnedColumns.length}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">activas</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Presentación</div>
                      <div className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">{draft.compactMode ? "Compacta" : "Estándar"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">con encabezados {draft.stickyColumnsEnabled ? "fijos" : "libres"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Resumen de alcance
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                      Los cambios se preparan en esta vista y recién impactan en la tabla al usar <span className="font-medium text-slate-900">Aplicar a tabla</span>.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                      Las vistas guardadas quedan en este navegador para reutilizarlas más adelante.
                    </div>
                     <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                       Podés definir columnas visibles, orden, ancho, encabezados fijos, modo compacto y columnas fijas a la izquierda.
                    </div>
                  </div>
                </div>
              </section>

              <TabsContent value="plantillas" className="mt-0 space-y-4">
                <section className="grid gap-4 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Guardar vista</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Poné un nombre para guardar esta configuración y volver a usarla cuando quieras.</p>
                        </div>
                        {selectedUserTemplate && (
                           <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
                            Editando guardada
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        <Input
                          value={newTemplateName}
                          onChange={(event) => setNewTemplateName(event.target.value)}
                          placeholder={selectedUserTemplate ? "Renombrar vista guardada" : "Ej. Seguimiento diario"}
                          className="h-10 bg-white text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                          {selectedUserTemplate
                            ? "Si guardás, se actualiza esta vista con la configuración actual."
                            : "Si guardás, se crea una nueva vista en este navegador sin aplicar cambios todavía."}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Vista en uso</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tomá la configuración actual como punto de partida.</p>
                        </div>
                        <Badge variant="success" className="px-2 py-0.5 text-[10px]">Actual</Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTemplateSelect(currentViewTemplate.id)}
                        className={cn(
                          "mt-4 w-full rounded-2xl border p-4 text-left transition-colors",
                          selectedTemplateId === currentViewTemplate.id
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : `${currentViewTemplate.accentClassName} text-slate-800 hover:border-slate-400`
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{currentViewTemplate.name}</div>
                            <div className={cn("mt-1 text-xs leading-relaxed", selectedTemplateId === currentViewTemplate.id ? "text-slate-200" : "text-slate-600")}>
                              {currentViewTemplate.description}
                            </div>
                          </div>
                          {selectedTemplateId === currentViewTemplate.id && <Sparkles className="mt-0.5 size-4 shrink-0" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Vistas guardadas</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tus configuraciones locales listas para reutilizar o actualizar.</p>
                        </div>
                        <Badge variant="outline">{userTemplates.length}</Badge>
                      </div>

                      {userTemplates.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                          Todavía no guardaste vistas en este navegador.
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {userTemplates.map((template) => {
                            const isActive = template.id === selectedTemplateId
                            return (
                              <div key={template.id} className="relative min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleTemplateSelect(template.id)}
                                  className={cn(
                                    "h-full w-full rounded-2xl border p-4 pr-14 text-left transition-colors",
                                    isActive ? "border-slate-900 bg-slate-900 text-white shadow-sm" : `${template.accentClassName} text-slate-800 hover:border-slate-400`
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="truncate text-sm font-semibold">{template.name}</div>
                                        <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", isActive ? "border-white/30 text-white" : "border-violet-200 bg-white/70 text-violet-700")}>
                                          Guardada
                                        </Badge>
                                      </div>
                                      <div className={cn("mt-1 text-xs leading-relaxed", isActive ? "text-slate-200" : "text-slate-600")}>{template.description}</div>
                                    </div>
                                    {isActive && <Sparkles className="mt-0.5 size-4 shrink-0" />}
                                  </div>
                                  <div className={cn("mt-3 text-[11px] leading-relaxed", isActive ? "text-slate-300" : "text-slate-500")}>{template.summary}</div>
                                </button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={cn("absolute right-2 top-2 size-8", isActive ? "text-white hover:bg-white/10 hover:text-white" : "text-slate-500")}
                                  onClick={() => handleDeleteUserTemplate(template.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Vistas sugeridas</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Puntos de partida para distintos momentos del trabajo diario.</p>
                        </div>
                        <Badge variant="outline">{systemTemplates.length}</Badge>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {systemTemplates.map((template) => {
                          const isActive = template.id === selectedTemplateId
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleTemplateSelect(template.id)}
                              className={cn(
                                "h-full rounded-2xl border p-4 text-left transition-colors",
                                isActive ? "border-slate-900 bg-slate-900 text-white shadow-sm" : `${template.accentClassName} text-slate-800 hover:border-slate-400`
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="truncate text-sm font-semibold">{template.name}</div>
                                    <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", isActive ? "border-white/30 text-white" : "border-slate-300 bg-white/70 text-slate-700")}>
                                      Base
                                    </Badge>
                                  </div>
                                  <div className={cn("mt-1 text-xs leading-relaxed", isActive ? "text-slate-200" : "text-slate-600")}>{template.description}</div>
                                </div>
                                {isActive && <Sparkles className="mt-0.5 size-4 shrink-0" />}
                              </div>
                              <div className={cn("mt-3 text-[11px] leading-relaxed", isActive ? "text-slate-300" : "text-slate-500")}>{template.summary}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="columnas" className="mt-0 space-y-4">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Columnas y bloques</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Separá la edición del detalle de cada columna y la organización visual de los encabezados agrupados.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setColumnsEditorMode("columns")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                            columnsEditorMode === "columns" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                          )}
                        >
                          Editar columnas
                        </button>
                        <button
                          type="button"
                          onClick={() => setColumnsEditorMode("groups")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                            columnsEditorMode === "groups" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                          )}
                        >
                          Editar bloques
                        </button>
                      </div>
                      <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleResetMock}>
                        Restaurar plantilla
                      </Button>
                    </div>
                  </div>

                  {columnsEditorMode === "columns" ? (
                    <div className="mt-4 space-y-2">
                      {orderedColumns.map((column, index) => {
                        const visible = draft.visibleColumnKeys.includes(column.key)
                        const pinnable = PINNABLE_LEFT_COLUMN_KEY_SET.has(column.key)
                        const fixed = draft.fixedColumns.includes(column.key)

                        return (
                          <div key={column.key} className="rounded-2xl border border-slate-200 px-3 py-3">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <Checkbox checked={visible} onCheckedChange={(checked) => updateVisible(column.key, !!checked)} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-medium text-slate-900">{column.label}</span>
                                    <Badge variant="outline" className="text-[10px]">Posición {index + 1}</Badge>
                                    <Badge variant={visible ? "success" : "outline"} className="text-[10px]">
                                      <Eye className="mr-1 size-3" />
                                      {visible ? "Visible" : "Oculta"}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-500">
                                    {pinnable ? "Podés dejarla fija a la izquierda desde acá." : "Solo orden y ancho en esta columna."}
                                  </div>
                                </div>
                              </div>

                              <div className="flex shrink-0 gap-1 self-start xl:self-center">
                                <Button variant="outline" size="icon" className="size-8" onClick={() => moveColumn(index, -1)} disabled={index === 0}>
                                  <ArrowUp className="size-3.5" />
                                </Button>
                                <Button variant="outline" size="icon" className="size-8" onClick={() => moveColumn(index, 1)} disabled={index === orderedColumns.length - 1}>
                                  <ArrowDown className="size-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[120px_minmax(0,1fr)]">
                              <div>
                                 <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Ancho</div>
                                 <Input value={draft.widths[column.key] ?? "148"} onChange={(event) => updateWidth(column.key, event.target.value)} className="h-9 bg-white text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                              </div>

                              <label className={cn(
                                "flex min-h-9 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs",
                                pinnable ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-100 bg-slate-50/60 text-slate-400"
                              )}>
                                <div className="flex min-w-0 items-center gap-2">
                                  <Pin className="size-3.5" />
                                  <span>{pinnable ? "Fija a la izquierda" : "No se puede fijar"}</span>
                                </div>
                                <Checkbox
                                  checked={fixed}
                                  disabled={!pinnable}
                                  onCheckedChange={(checked) => toggleFixedColumn(column.key, !!checked)}
                                />
                              </label>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
                      <div className="space-y-3">
                        {draft.groups.map((group, index) => {
                          const groupColumns = orderedColumns.filter((column) => group.columns.includes(column.key))

                          return (
                            <div key={group.id} className={cn("rounded-2xl border p-4", group.colorClassName)}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">Nombre del bloque</div>
                                  <Input
                                    value={group.label}
                                    onChange={(event) => updateGroupLabel(group.id, event.target.value)}
                           className="h-9 border-white/70 bg-white/80 text-sm text-slate-900 dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-100"
                                    placeholder="Nombre del bloque"
                                  />
                                </div>

                                <div className="flex shrink-0 gap-1">
                                   <Button variant="outline" size="icon" className="size-8 border-white/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-900" onClick={() => moveGroup(index, -1)} disabled={index === 0}>
                                    <ArrowUp className="size-3.5" />
                                  </Button>
                                   <Button variant="outline" size="icon" className="size-8 border-white/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-900" onClick={() => moveGroup(index, 1)} disabled={index === draft.groups.length - 1}>
                                    <ArrowDown className="size-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,260px)]">
                                <div>
                                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">Columnas incluidas</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {groupColumns.map((column) => {
                                      const visible = draft.visibleColumnKeys.includes(column.key)
                                      return (
                                         <Badge key={column.key} variant="outline" className="border-white/70 bg-white/60 text-[10px] text-slate-700 dark:border-slate-700/70 dark:bg-slate-950/60 dark:text-slate-200">
                                          {column.label} {visible ? "· visible" : "· oculta"}
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">Color suave</div>
                                  <div className="flex flex-wrap gap-2">
                                    {GROUP_COLOR_OPTIONS.map((color) => (
                                      <button
                                        key={color.name}
                                        type="button"
                                        onClick={() => updateGroupColor(group.id, color.name, color.className)}
                                        className={cn(
                                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                                          color.className,
                                          group.colorName === color.name ? "ring-2 ring-slate-300" : "opacity-80 hover:opacity-100"
                                        )}
                                      >
                                        {color.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="space-y-4">
                         <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">Encabezados agrupados</div>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Organizan la lectura visual de la tabla. No cambian datos ni cálculos.</p>
                            </div>
                            <Switch
                              checked={draft.showGroupedHeaders}
                              onCheckedChange={(checked) => setDraft((current) => ({ ...current, showGroupedHeaders: checked }))}
                              aria-label="Mostrar encabezados agrupados en la tabla"
                            />
                          </div>
                          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                            Mostrar encabezados agrupados en la tabla
                          </div>
                        </div>

                         <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                          <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">Orden de bloques</div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Se guarda dentro de la vista que estás armando para mantener una lectura consistente del encabezado.</p>
                          <div className="mt-3 space-y-2">
                            {draft.groups.map((group, index) => (
                               <div key={`${group.id}-summary`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                                <div className="min-w-0">
                                   <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{index + 1}. {group.label || "Sin nombre"}</div>
                                   <div className="text-[11px] text-slate-500 dark:text-slate-400">{group.columns.length} columnas</div>
                                 </div>
                                 <Badge variant="outline" className="bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{group.colorName}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </TabsContent>

              <TabsContent value="comportamiento" className="mt-0 space-y-4">
                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                           <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Lectura de la tabla</h3>
                           <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Definí cómo querés recorrer la información mientras trabajás.</p>
                        </div>
                      </div>

                        <div className="mt-4 space-y-3">
                         <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                           <div>
                             <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Encabezados fijos</div>
                             <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Mantiene visibles los encabezados mientras navegás la tabla.</p>
                           </div>
                          <Switch checked={draft.stickyColumnsEnabled} onCheckedChange={(checked) => setDraft((current) => ({ ...current, stickyColumnsEnabled: checked }))} />
                        </div>

                         <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                           <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Modo compacto</div>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Reduce la altura visual de encabezados y filas para ver más información en pantalla.</p>
                           </div>
                          <Switch checked={draft.compactMode} onCheckedChange={(checked) => setDraft((current) => ({ ...current, compactMode: checked }))} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                          <label htmlFor="show-operation-presets" className="cursor-pointer">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Accesos rápidos de Operación</div>
                            <p id="show-operation-presets-description" className="mt-1 text-xs text-slate-600 dark:text-slate-400">Muestra la fila de presets como Necesitan atención y Urgentes. Solo se oculta visualmente en esta sesión.</p>
                          </label>
                          <Switch
                            id="show-operation-presets"
                            checked={showOperationPresets}
                            onCheckedChange={onShowOperationPresetsChange}
                            aria-describedby="show-operation-presets-description"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                           <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Columnas fijas a la izquierda</h3>
                           <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Quedan siempre a la vista cuando esa columna está visible.</p>
                        </div>
                         <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                          {activePinnedColumns.length} activas
                        </Badge>
                      </div>

                       <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/80 dark:bg-blue-950/20">
                         <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Vista previa</div>
                         <div className="mt-2 flex flex-wrap gap-2">
                           {activePinnedColumns.length > 0 ? activePinnedColumns.map((column, index) => (
                             <Badge key={column.key} className="gap-1 rounded-full border border-blue-200 bg-white text-blue-700 hover:bg-white dark:border-blue-800 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-900">
                               <Pin className="size-3" />
                               {index + 1}. {column.label}
                             </Badge>
                           )) : (
                             <span className="text-xs text-blue-800 dark:text-blue-200">No hay columnas fijas seleccionadas.</span>
                           )}
                         </div>
                       </div>

                      <div className="mt-4 space-y-2">
                        {PINNABLE_LEFT_COLUMN_KEYS.filter((key) => columnMap.has(key)).map((key) => {
                          const checked = draft.fixedColumns.includes(key)
                          const visible = draft.visibleColumnKeys.includes(key)
                          return (
                            <label key={key} className={cn(
                              "flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors",
                               checked ? "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
                             )}>
                              <div className="min-w-0 flex items-center gap-3">
                                <div className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-full border",
                                   checked ? "border-blue-200 bg-white text-blue-700 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-300" : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400",
                                 )}>
                                  <Pin className="size-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate font-medium">{columnMap.get(key)?.label}</span>
                                  <span className={cn("block text-[11px]", visible ? "text-emerald-700" : "text-amber-700")}>
                                    {visible ? "Visible y lista para fijarse" : "Está oculta; se guardará la preferencia"}
                                  </span>
                                </div>
                              </div>
                              <Checkbox checked={checked} onCheckedChange={(value) => toggleFixedColumn(key, !!value)} />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                       <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Bloques visuales</h3>
                       <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Podés ajustar nombre, color y orden para cambiar los encabezados agrupados reales de la tabla.</p>

                      <div className="mt-4 grid gap-3">
                        {draft.groups.map((group) => (
                          <div key={group.id} className={cn("rounded-2xl border p-4", group.colorClassName)}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold">{group.label}</div>
                                <div className="mt-1 text-[11px] opacity-80">{group.columns.length} columnas asociadas</div>
                              </div>
                               <Badge variant="outline" className="bg-white/70 dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-200">{group.colorName}</Badge>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {group.columns.map((columnKey) => (
                                 <Badge key={columnKey} variant="outline" className="border-white/70 bg-white/60 text-[10px] text-slate-700 dark:border-slate-700/70 dark:bg-slate-950/60 dark:text-slate-200">
                                  {columnMap.get(columnKey)?.label ?? columnKey}
                                </Badge>
                              ))}
                            </div>

                            <div className="mt-4">
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">Color</div>
                              <div className="flex flex-wrap gap-2">
                                {GROUP_COLOR_OPTIONS.map((color) => (
                                  <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => updateGroupColor(group.id, color.name, color.className)}
                                    className={cn(
                                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                                      color.className,
                                      group.colorName === color.name ? "ring-2 ring-slate-300" : "opacity-80 hover:opacity-100"
                                    )}
                                  >
                                    {color.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                       <div className="font-semibold text-slate-950 dark:text-slate-50">Qué se aplica hoy</div>
                      <Separator className="my-3" />
                      <ul className="space-y-2 text-sm">
                        <li>• Columnas visibles</li>
                        <li>• Orden y ancho de columnas</li>
                        <li>• Mostrar u ocultar encabezados agrupados</li>
                        <li>• Nombre, color y orden de bloques</li>
                        <li>• Encabezados fijos</li>
                        <li>• Columnas fijas a la izquierda</li>
                        <li>• Modo compacto</li>
                        <li>• Vistas guardadas en este navegador</li>
                      </ul>
                    </div>
                  </div>
                </section>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="shrink-0 gap-3 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:justify-between sm:px-6">
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">Los cambios quedan preparados aquí hasta confirmar. Restaurar predeterminado solo recompone este borrador hasta usar Aplicar a tabla.</p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleResetReal} className="w-full sm:w-auto">Restaurar predeterminado</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="button" variant="secondary" onClick={handleSaveTemplate} disabled={!canSaveTemplate} className="w-full gap-2 sm:w-auto">
              <BookmarkPlus className="size-4" />
              Guardar vista
            </Button>
            <Button onClick={handleApply} disabled={!realConfigDirty} className="w-full gap-2 sm:w-auto">
              Aplicar a tabla
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
