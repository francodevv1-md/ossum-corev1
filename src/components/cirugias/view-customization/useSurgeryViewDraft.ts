"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_FIXED_LEFT_COLUMNS,
  DEFAULT_VISIBLE_COLS,
  PINNABLE_LEFT_COLUMN_KEYS,
  type CxStatusVariant,
} from "@/lib/cirugias.constants"
import type { GroupedHeaderPreference } from "@/hooks/useColumnVisibility"
import type { ColumnDefinition, StoredUserTemplate, ViewDraft, ViewPreset } from "./types"
import {
  buildDefaultGroups,
  buildSystemPresets,
  cloneDraft,
  MAX_FIXED_COLUMNS,
  normalizeGroups,
  PINNABLE_LEFT_COLUMN_KEY_SET,
  USER_VIEW_TEMPLATES_KEY,
} from "./constants"

interface UseSurgeryViewDraftOptions {
  columns: ReadonlyArray<ColumnDefinition>
  visibleCols: Record<string, boolean>
  columnOrder: string[]
  stickyColumns: boolean
  columnWidths: Record<string, number>
  compactMode: boolean
  fixedColumns: string[]
  groups: GroupedHeaderPreference[]
  showGroupedHeaders: boolean
  cxVariant?: CxStatusVariant
  onResetToDefault: () => void
}

function buildDraftFromView({
  columns,
  visibleCols,
  columnOrder,
  stickyColumns,
  columnWidths,
  groups,
  showGroupedHeaders,
  fixedColumns,
  compactMode,
  cxVariant = "b",
}: {
  columns: ReadonlyArray<ColumnDefinition>
  visibleCols: Record<string, boolean>
  columnOrder: string[]
  stickyColumns: boolean
  columnWidths: Record<string, number>
  groups: GroupedHeaderPreference[]
  showGroupedHeaders: boolean
  fixedColumns: string[]
  compactMode: boolean
  cxVariant?: CxStatusVariant
}): ViewDraft {
  const allKeys = columns.map((c) => c.key)
  const knownKeysSet = new Set(allKeys)
  const ordered = columnOrder.filter((k) => knownKeysSet.has(k))
  const missing = allKeys.filter((k) => !ordered.includes(k))

  return {
    visibleColumnKeys: allKeys.filter((k) => visibleCols[k] !== false),
    orderedColumnKeys: [...ordered, ...missing],
    stickyColumnsEnabled: stickyColumns,
    showGroupedHeaders,
    compactMode,
    cxVariant,
    widths: Object.fromEntries(
      allKeys.map((k) => [k, String(columnWidths[k] ?? DEFAULT_COLUMN_WIDTHS[k] ?? 148)])
    ),
    fixedColumns: fixedColumns.filter((k) => knownKeysSet.has(k) && PINNABLE_LEFT_COLUMN_KEY_SET.has(k)),
    groups: normalizeGroups(groups, columns),
  }
}

function sanitizeDraftForColumns(draft: ViewDraft, columns: ReadonlyArray<ColumnDefinition>): ViewDraft {
  const allKeys = columns.map((c) => c.key)
  const knownSet = new Set(allKeys)
  const ordered = draft.orderedColumnKeys.filter((k) => knownSet.has(k))
  const missing = allKeys.filter((k) => !ordered.includes(k))

  return {
    ...cloneDraft(draft),
    visibleColumnKeys: draft.visibleColumnKeys.filter((k) => knownSet.has(k)),
    orderedColumnKeys: [...ordered, ...missing],
    fixedColumns: draft.fixedColumns.filter((k) => knownSet.has(k) && PINNABLE_LEFT_COLUMN_KEY_SET.has(k)),
    widths: Object.fromEntries(
      allKeys.map((k) => {
        const val = Number(draft.widths[k])
        return [k, Number.isFinite(val) && val > 0 ? String(val) : String(DEFAULT_COLUMN_WIDTHS[k] ?? 148)]
      })
    ),
    groups: normalizeGroups(draft.groups, columns),
  }
}

function loadUserTemplatesFromStorage(columns: ReadonlyArray<ColumnDefinition>): ViewPreset[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(USER_VIEW_TEMPLATES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredUserTemplate[]
    if (!Array.isArray(parsed)) return []

    return parsed.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || "Vista guardada en este navegador.",
      source: "user" as const,
      isDefault: !!item.isDefault,
      config: sanitizeDraftForColumns(item.config, columns),
    }))
  } catch {
    return []
  }
}

function persistUserTemplatesToStorage(templates: ViewPreset[]) {
  if (typeof window === "undefined") return
  try {
    const payload: StoredUserTemplate[] = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      summary: `${t.config.visibleColumnKeys.length} columnas visibles`,
      isDefault: t.isDefault,
      config: cloneDraft(t.config),
    }))
    localStorage.setItem(USER_VIEW_TEMPLATES_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota errors
  }
}

export function useSurgeryViewDraft(options: UseSurgeryViewDraftOptions) {
  const {
    columns,
    visibleCols,
    columnOrder,
    stickyColumns,
    columnWidths,
    compactMode,
    fixedColumns,
    groups,
    showGroupedHeaders,
    cxVariant = "b",
  } = options

  const systemPresets = useMemo(() => buildSystemPresets(columns), [columns])

  const currentViewDraft = useMemo(
    () =>
      buildDraftFromView({
        columns,
        visibleCols,
        columnOrder,
        stickyColumns,
        columnWidths,
        groups,
        showGroupedHeaders,
        fixedColumns,
        compactMode,
        cxVariant,
      }),
    [columns, visibleCols, columnOrder, stickyColumns, columnWidths, groups, showGroupedHeaders, fixedColumns, compactMode, cxVariant]
  )

  const [draft, setDraft] = useState<ViewDraft>(() => cloneDraft(currentViewDraft))
  const [userTemplates, setUserTemplates] = useState<ViewPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

  // Load user templates on mount
  useEffect(() => {
    setUserTemplates(loadUserTemplatesFromStorage(columns))
  }, [columns])

  // Reset draft to currentViewDraft when opening with fresh props
  const resetDraftToCurrent = useCallback(() => {
    setDraft(cloneDraft(currentViewDraft))
    setSelectedPresetId(null)
  }, [currentViewDraft])

  // Calculate real dirty state
  const realConfigDirty = useMemo(() => {
    const currVis = new Set(currentViewDraft.visibleColumnKeys)
    const draftVis = new Set(draft.visibleColumnKeys)
    if (currVis.size !== draftVis.size) return true
    for (const k of currVis) {
      if (!draftVis.has(k)) return true
    }

    if (currentViewDraft.orderedColumnKeys.join(",") !== draft.orderedColumnKeys.join(",")) return true
    if (currentViewDraft.fixedColumns.join(",") !== draft.fixedColumns.join(",")) return true
    if (currentViewDraft.compactMode !== draft.compactMode) return true
    if (currentViewDraft.stickyColumnsEnabled !== draft.stickyColumnsEnabled) return true
    if (currentViewDraft.cxVariant !== draft.cxVariant) return true
    if (currentViewDraft.showGroupedHeaders !== draft.showGroupedHeaders) return true

    for (const col of columns) {
      const currW = Number(currentViewDraft.widths[col.key] ?? DEFAULT_COLUMN_WIDTHS[col.key])
      const draftW = Number(draft.widths[col.key] ?? DEFAULT_COLUMN_WIDTHS[col.key])
      if (Math.abs(currW - draftW) > 1) return true
    }

    return false
  }, [currentViewDraft, draft, columns])

  // Apply a preset (system or user)
  const selectPreset = useCallback((preset: ViewPreset) => {
    setDraft(cloneDraft(preset.config))
    setSelectedPresetId(preset.id)
  }, [])

  // Column visibility
  const updateColumnVisibility = useCallback((columnKey: string, visible: boolean) => {
    setDraft((prev) => {
      const next = visible
        ? Array.from(new Set([...prev.visibleColumnKeys, columnKey]))
        : prev.visibleColumnKeys.filter((k) => k !== columnKey)
      return { ...prev, visibleColumnKeys: next }
    })
    setSelectedPresetId(null)
  }, [])

  // Set all visible or minimal
  const setAllColumnsVisible = useCallback((visible: boolean) => {
    setDraft((prev) => ({
      ...prev,
      visibleColumnKeys: visible ? columns.map((c) => c.key) : ["id", "state", "patient", "actions"],
    }))
    setSelectedPresetId(null)
  }, [columns])

  // Reorder columns
  const reorderColumns = useCallback((newOrder: string[]) => {
    setDraft((prev) => ({
      ...prev,
      orderedColumnKeys: newOrder,
    }))
    setSelectedPresetId(null)
  }, [])

  const moveColumn = useCallback((index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.orderedColumnKeys.length) return prev
      const reordered = [...prev.orderedColumnKeys]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(nextIndex, 0, moved)
      return { ...prev, orderedColumnKeys: reordered }
    })
    setSelectedPresetId(null)
  }, [])

  // Column width
  const updateColumnWidth = useCallback((columnKey: string, width: string | number) => {
    setDraft((prev) => ({
      ...prev,
      widths: {
        ...prev.widths,
        [columnKey]: String(width),
      },
    }))
    setSelectedPresetId(null)
  }, [])

  // Fixed column (Pinning) with max 3 enforcement
  const toggleFixedColumn = useCallback((columnKey: string, fixed: boolean): { success: boolean; reason?: string } => {
    if (!PINNABLE_LEFT_COLUMN_KEY_SET.has(columnKey)) {
      return { success: false, reason: "Esta columna no admite fijación a la izquierda." }
    }

    let success = true
    let reason: string | undefined

    setDraft((prev) => {
      if (fixed) {
        if (prev.fixedColumns.includes(columnKey)) return prev
        if (prev.fixedColumns.length >= MAX_FIXED_COLUMNS) {
          success = false
          reason = `Podés fijar hasta ${MAX_FIXED_COLUMNS} columnas simultáneas para mantener el espacio operativo.`
          return prev
        }
        const currentFixed = prev.fixedColumns
        const newFixed = [...currentFixed, columnKey]
        const remaining = prev.orderedColumnKeys.filter((k) => k !== columnKey)
        const insertionIndex = currentFixed.length
        const newOrdered = [...remaining.slice(0, insertionIndex), columnKey, ...remaining.slice(insertionIndex)]

        return {
          ...prev,
          fixedColumns: newFixed,
          orderedColumnKeys: newOrdered,
        }
      } else {
        return {
          ...prev,
          fixedColumns: prev.fixedColumns.filter((k) => k !== columnKey),
        }
      }
    })

    if (success) setSelectedPresetId(null)
    return { success, reason }
  }, [])

  // Appearance controls
  const setCompactMode = useCallback((compact: boolean) => {
    setDraft((prev) => ({ ...prev, compactMode: compact }))
    setSelectedPresetId(null)
  }, [])

  const setCxVariant = useCallback((variant: CxStatusVariant) => {
    setDraft((prev) => ({ ...prev, cxVariant: variant }))
    setSelectedPresetId(null)
  }, [])

  const setStickyHeaders = useCallback((sticky: boolean) => {
    setDraft((prev) => ({ ...prev, stickyColumnsEnabled: sticky }))
    setSelectedPresetId(null)
  }, [])

  // Reset to default standard draft
  const resetToDefaultDraft = useCallback(() => {
    const allKeys = columns.map((c) => c.key)
    setDraft({
      visibleColumnKeys: allKeys.filter((k) => DEFAULT_VISIBLE_COLS[k] !== false),
      orderedColumnKeys: allKeys,
      stickyColumnsEnabled: true,
      showGroupedHeaders: false,
      compactMode: false,
      fixedColumns: [...DEFAULT_FIXED_LEFT_COLUMNS],
      groups: buildDefaultGroups(),
      widths: Object.fromEntries(allKeys.map((k) => [k, String(DEFAULT_COLUMN_WIDTHS[k] ?? 148)])),
      cxVariant: "b",
    })
    setSelectedPresetId(null)
  }, [columns])

  // User templates management
  const saveUserTemplate = useCallback((name: string, isDefault = false): { success: boolean; error?: string } => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { success: false, error: "Ingresá un nombre para la vista." }
    }

    const collision = userTemplates.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    if (collision) {
      return { success: false, error: "Ya existe una vista guardada con ese nombre." }
    }

    const newTemplate: ViewPreset = {
      id: `user-${Date.now()}`,
      name: trimmed,
      description: "Vista personalizada guardada en este navegador.",
      source: "user",
      isDefault,
      config: cloneDraft(draft),
    }

    setUserTemplates((prev) => {
      const updated = isDefault
        ? [newTemplate, ...prev.map((t) => ({ ...t, isDefault: false }))]
        : [newTemplate, ...prev]
      persistUserTemplatesToStorage(updated)
      return updated
    })

    setSelectedPresetId(newTemplate.id)
    return { success: true }
  }, [draft, userTemplates])

  const renameUserTemplate = useCallback((id: string, newName: string): { success: boolean; error?: string } => {
    const trimmed = newName.trim()
    if (!trimmed) {
      return { success: false, error: "El nombre no puede estar vacío." }
    }

    const collision = userTemplates.some((t) => t.id !== id && t.name.toLowerCase() === trimmed.toLowerCase())
    if (collision) {
      return { success: false, error: "Ya existe otra vista con ese nombre." }
    }

    setUserTemplates((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t))
      persistUserTemplatesToStorage(updated)
      return updated
    })

    return { success: true }
  }, [userTemplates])

  const deleteUserTemplate = useCallback((id: string) => {
    setUserTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id)
      persistUserTemplatesToStorage(updated)
      return updated
    })

    if (selectedPresetId === id) {
      setSelectedPresetId(null)
    }
  }, [selectedPresetId])

  const setDefaultUserTemplate = useCallback((id: string) => {
    setUserTemplates((prev) => {
      const updated = prev.map((t) => ({ ...t, isDefault: t.id === id }))
      persistUserTemplatesToStorage(updated)
      return updated
    })
  }, [])

  return {
    draft,
    realConfigDirty,
    systemPresets,
    userTemplates,
    selectedPresetId,
    selectPreset,
    updateColumnVisibility,
    setAllColumnsVisible,
    reorderColumns,
    moveColumn,
    updateColumnWidth,
    toggleFixedColumn,
    setCompactMode,
    setCxVariant,
    setStickyHeaders,
    resetToDefaultDraft,
    resetDraftToCurrent,
    saveUserTemplate,
    renameUserTemplate,
    deleteUserTemplate,
    setDefaultUserTemplate,
  }
}
