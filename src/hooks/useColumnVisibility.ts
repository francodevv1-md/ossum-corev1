/**
 * useColumnVisibility.ts
 * Hook para manejar preferencias de vista de la tabla de cirugías.
 * Prioriza server persistence y mantiene fallback temporal a localStorage.
 */

import { useState, useCallback, useEffect, useRef } from "react"

import { apiFetch } from "@/lib/api/client"
import {
  DEFAULT_VISIBLE_COLS,
  CIRUGIAS_COLUMNS,
  CIRUGIAS_COLUMN_GROUPS,
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_FIXED_LEFT_COLUMNS,
  PINNABLE_LEFT_COLUMN_KEYS,
} from "@/lib/cirugias.constants"

const STICKY_COLS_KEY = "ortotrack-sticky-columns"
const COL_ORDER_KEY = "ortotrack-column-order"
const COL_VISIBILITY_KEY = "ortotrack-column-visibility"
const COL_WIDTHS_KEY = "ortotrack-column-widths"
const FIXED_LEFT_COLUMNS_KEY = "ortotrack-fixed-left-columns"
const FIXED_LEFT_COLUMNS_EVENT = "ortotrack-fixed-left-columns-change"
const COMPACT_MODE_KEY = "ortotrack-compact-mode"
const COMPACT_MODE_EVENT = "ortotrack-compact-mode-change"
const COLUMN_GROUPS_KEY = "ortotrack-column-groups"
const SHOW_GROUPED_HEADERS_KEY = "ortotrack-show-grouped-headers"
const SERVER_MIGRATION_KEY_PREFIX = "ortotrack-surgeries-view-preferences-server-migrated"
const SERVER_PREFERENCES_DEFER_MS = 1400

const LEGACY_PREFERENCE_KEYS = [
  STICKY_COLS_KEY,
  COL_ORDER_KEY,
  COL_VISIBILITY_KEY,
  COL_WIDTHS_KEY,
  FIXED_LEFT_COLUMNS_KEY,
  COMPACT_MODE_KEY,
  COLUMN_GROUPS_KEY,
  SHOW_GROUPED_HEADERS_KEY,
] as const

const GROUP_COLOR_OPTIONS = [
  { name: "Slate", className: "border-slate-200 bg-slate-50 text-slate-700" },
  { name: "Blue", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { name: "Emerald", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { name: "Amber", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { name: "Rose", className: "border-rose-200 bg-rose-50 text-rose-700" },
] as const

export type GroupedHeaderPreference = {
  id: string
  label: string
  colorName: string
  colorClassName: string
  columns: string[]
}

export type SurgeryViewPreferences = {
  visibleCols: Record<string, boolean>
  columnOrder: string[]
  stickyColumns: boolean
  columnWidths: Record<string, number>
  compactMode: boolean
  fixedLeftColumns: string[]
  columnGroups: GroupedHeaderPreference[]
  showGroupedHeaders: boolean
}

type SurgeryViewPreferenceEnvelope = {
  moduleKey: string
  preferences: SurgeryViewPreferences
  isPersisted: boolean
  createdAt: string | null
  updatedAt: string | null
}

type UseColumnVisibilityOptions = {
  companyId?: string | null
}

type BrowserWindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

const DEFAULT_COLUMN_ORDER = CIRUGIAS_COLUMNS.map((c) => c.key)
const DEFAULT_COLUMN_GROUPS: GroupedHeaderPreference[] = CIRUGIAS_COLUMN_GROUPS.map((group, index) => ({
  id: group.key,
  label: group.label,
  colorName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].name,
  colorClassName: GROUP_COLOR_OPTIONS[index % GROUP_COLOR_OPTIONS.length].className,
  columns: [...group.columns],
}))

function cloneColumnGroups(groups: GroupedHeaderPreference[]): GroupedHeaderPreference[] {
  return groups.map((group) => ({ ...group, columns: [...group.columns] }))
}

function normalizeColumnGroups(value: unknown): GroupedHeaderPreference[] {
  if (!Array.isArray(value)) return cloneColumnGroups(DEFAULT_COLUMN_GROUPS)

  const knownKeys = new Set<string>(CIRUGIAS_COLUMNS.map((column) => column.key))
  const defaultsById = new Map(DEFAULT_COLUMN_GROUPS.map((group) => [group.id, group]))
  const normalized: GroupedHeaderPreference[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue

    const candidate = entry as Partial<GroupedHeaderPreference>
    const defaultGroup = typeof candidate.id === "string" ? defaultsById.get(candidate.id) : undefined
    if (!defaultGroup) continue

    const columns = Array.isArray(candidate.columns)
      ? candidate.columns
        .filter((column): column is string => typeof column === "string" && knownKeys.has(column))
        .filter((column, index, self) => self.indexOf(column) === index)
      : defaultGroup.columns

    normalized.push({
      id: defaultGroup.id,
      label: typeof candidate.label === "string" && candidate.label.trim().length > 0 ? candidate.label : defaultGroup.label,
      colorName: typeof candidate.colorName === "string" && candidate.colorName.trim().length > 0 ? candidate.colorName : defaultGroup.colorName,
      colorClassName: typeof candidate.colorClassName === "string" && candidate.colorClassName.trim().length > 0 ? candidate.colorClassName : defaultGroup.colorClassName,
      columns: columns.length > 0 ? columns : [...defaultGroup.columns],
    })
  }

  const normalizedIds = new Set(normalized.map((group) => group.id))
  const missingDefaults = DEFAULT_COLUMN_GROUPS.filter((group) => !normalizedIds.has(group.id))

  return cloneColumnGroups([...normalized, ...missingDefaults])
}

function normalizeVisibleCols(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_VISIBLE_COLS }

  const next = { ...DEFAULT_VISIBLE_COLS }

  for (const key of Object.keys(DEFAULT_VISIBLE_COLS)) {
    if (typeof (value as Record<string, unknown>)[key] === "boolean") {
      next[key] = (value as Record<string, boolean>)[key]
    }
  }

  return next
}

function normalizeColumnOrder(order: unknown): string[] {
  if (!Array.isArray(order)) return [...DEFAULT_COLUMN_ORDER]

  const knownKeys = new Set<string>(DEFAULT_COLUMN_ORDER)
  const normalized = order
    .filter((entry): entry is string => typeof entry === "string" && knownKeys.has(entry))
    .filter((entry, index, self) => self.indexOf(entry) === index)

  const missing = DEFAULT_COLUMN_ORDER.filter((key) => !normalized.includes(key))
  return [...normalized, ...missing]
}

function normalizeColumnWidths(value: unknown): Record<string, number> {
  const defaults = { ...DEFAULT_COLUMN_WIDTHS }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults
  }

  for (const key of DEFAULT_COLUMN_ORDER) {
    const candidate = (value as Record<string, unknown>)[key]
    const numericValue = typeof candidate === "number" ? candidate : Number(candidate)
    if (Number.isFinite(numericValue) && numericValue > 0) {
      defaults[key] = numericValue
    }
  }

  return defaults
}

function normalizeFixedLeftColumns(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_FIXED_LEFT_COLUMNS]

  const allowedKeys = new Set<string>(PINNABLE_LEFT_COLUMN_KEYS)
  const normalized = value
    .filter((entry): entry is string => typeof entry === "string" && allowedKeys.has(entry))
    .filter((key, index, self) => self.indexOf(key) === index)

  if (normalized.length === 0 && value.length > 0) return [...DEFAULT_FIXED_LEFT_COLUMNS]

  return normalized
}

function normalizePreferences(value: Partial<SurgeryViewPreferences> | unknown): SurgeryViewPreferences {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<SurgeryViewPreferences>
    : {}

  return {
    visibleCols: normalizeVisibleCols(record.visibleCols),
    columnOrder: normalizeColumnOrder(record.columnOrder),
    stickyColumns: typeof record.stickyColumns === "boolean" ? record.stickyColumns : true,
    columnWidths: normalizeColumnWidths(record.columnWidths),
    compactMode: record.compactMode === true,
    fixedLeftColumns: normalizeFixedLeftColumns(record.fixedLeftColumns),
    columnGroups: normalizeColumnGroups(record.columnGroups),
    showGroupedHeaders: typeof record.showGroupedHeaders === "boolean" ? record.showGroupedHeaders : true,
  }
}

function buildDefaultPreferences(): SurgeryViewPreferences {
  return normalizePreferences({})
}

function loadColumnGroups(): GroupedHeaderPreference[] {
  if (typeof window === "undefined") return cloneColumnGroups(DEFAULT_COLUMN_GROUPS)

  try {
    const val = localStorage.getItem(COLUMN_GROUPS_KEY)
    if (!val) return cloneColumnGroups(DEFAULT_COLUMN_GROUPS)
    return normalizeColumnGroups(JSON.parse(val))
  } catch {
    return cloneColumnGroups(DEFAULT_COLUMN_GROUPS)
  }
}

function saveColumnGroups(groups: GroupedHeaderPreference[]) {
  try {
    localStorage.setItem(COLUMN_GROUPS_KEY, JSON.stringify(normalizeColumnGroups(groups)))
  } catch {
    // Silently fail
  }
}

function loadShowGroupedHeaders(): boolean {
  if (typeof window === "undefined") return true

  try {
    const val = localStorage.getItem(SHOW_GROUPED_HEADERS_KEY)
    if (val === null) return true
    return val === "true"
  } catch {
    return true
  }
}

function saveShowGroupedHeaders(value: boolean) {
  try {
    localStorage.setItem(SHOW_GROUPED_HEADERS_KEY, String(value))
  } catch {
    // Silently fail
  }
}

function loadStickyColumns(): boolean {
  if (typeof window === "undefined") return false
  try {
    const val = localStorage.getItem(STICKY_COLS_KEY)
    if (val === null) return true
    return val === "true"
  } catch {
    return true
  }
}

function saveStickyColumns(value: boolean) {
  try {
    localStorage.setItem(STICKY_COLS_KEY, String(value))
  } catch {
    // Silently fail if localStorage is not available
  }
}

function loadColumnOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_COLUMN_ORDER
  try {
    const val = localStorage.getItem(COL_ORDER_KEY)
    if (!val) return DEFAULT_COLUMN_ORDER
    return normalizeColumnOrder(JSON.parse(val))
  } catch {
    return DEFAULT_COLUMN_ORDER
  }
}

function saveColumnOrder(order: string[]) {
  try {
    localStorage.setItem(COL_ORDER_KEY, JSON.stringify(normalizeColumnOrder(order)))
  } catch {
    // Silently fail
  }
}

function loadVisibleCols(): Record<string, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_VISIBLE_COLS }
  try {
    const val = localStorage.getItem(COL_VISIBILITY_KEY)
    if (!val) return { ...DEFAULT_VISIBLE_COLS }
    return normalizeVisibleCols(JSON.parse(val))
  } catch {
    return { ...DEFAULT_VISIBLE_COLS }
  }
}

function saveVisibleCols(cols: Record<string, boolean>) {
  try {
    localStorage.setItem(COL_VISIBILITY_KEY, JSON.stringify(normalizeVisibleCols(cols)))
  } catch {
    // Silently fail
  }
}

function loadColumnWidths(): Record<string, number> {
  if (typeof window === "undefined") return { ...DEFAULT_COLUMN_WIDTHS }
  try {
    const val = localStorage.getItem(COL_WIDTHS_KEY)
    if (!val) return { ...DEFAULT_COLUMN_WIDTHS }
    return normalizeColumnWidths(JSON.parse(val))
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS }
  }
}

function saveColumnWidths(widths: Record<string, number>) {
  try {
    localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(normalizeColumnWidths(widths)))
  } catch {
    // Silently fail
  }
}

function loadCompactMode(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(COMPACT_MODE_KEY) === "true"
  } catch {
    return false
  }
}

function emitCompactModeChange(value: boolean) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(COMPACT_MODE_EVENT, { detail: value }))
}

function saveCompactMode(value: boolean) {
  try {
    localStorage.setItem(COMPACT_MODE_KEY, String(value))
  } catch {
    // Silently fail
  }

  emitCompactModeChange(value)
}

export function loadFixedLeftColumns(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_FIXED_LEFT_COLUMNS]

  try {
    const val = localStorage.getItem(FIXED_LEFT_COLUMNS_KEY)
    if (!val) return [...DEFAULT_FIXED_LEFT_COLUMNS]
    return normalizeFixedLeftColumns(JSON.parse(val))
  } catch {
    return [...DEFAULT_FIXED_LEFT_COLUMNS]
  }
}

function emitFixedLeftColumnsChange(value: string[]) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(FIXED_LEFT_COLUMNS_EVENT, { detail: value }))
}

function saveFixedLeftColumns(value: string[]) {
  const normalized = normalizeFixedLeftColumns(value)

  try {
    localStorage.setItem(FIXED_LEFT_COLUMNS_KEY, JSON.stringify(normalized))
  } catch {
    // Silently fail
  }

  emitFixedLeftColumnsChange(normalized)
}

function loadPreferencesFromLocalStorage(): SurgeryViewPreferences {
  return normalizePreferences({
    visibleCols: loadVisibleCols(),
    columnOrder: loadColumnOrder(),
    stickyColumns: loadStickyColumns(),
    columnWidths: loadColumnWidths(),
    compactMode: loadCompactMode(),
    fixedLeftColumns: loadFixedLeftColumns(),
    columnGroups: loadColumnGroups(),
    showGroupedHeaders: loadShowGroupedHeaders(),
  })
}

function persistPreferencesToLocalStorage(preferences: SurgeryViewPreferences) {
  saveVisibleCols(preferences.visibleCols)
  saveStickyColumns(preferences.stickyColumns)
  saveColumnOrder(preferences.columnOrder)
  saveColumnWidths(preferences.columnWidths)
  saveCompactMode(preferences.compactMode)
  saveFixedLeftColumns(preferences.fixedLeftColumns)
  saveColumnGroups(preferences.columnGroups)
  saveShowGroupedHeaders(preferences.showGroupedHeaders)
}

function hasLegacyLocalStoragePreferences(): boolean {
  if (typeof window === "undefined") return false

  try {
    return LEGACY_PREFERENCE_KEYS.some((key) => localStorage.getItem(key) !== null)
  } catch {
    return false
  }
}

function buildServerMigrationKey(companyId: string) {
  return `${SERVER_MIGRATION_KEY_PREFIX}:${companyId}`
}

function hasCompletedServerMigration(companyId: string): boolean {
  if (typeof window === "undefined") return false

  try {
    return localStorage.getItem(buildServerMigrationKey(companyId)) === "true"
  } catch {
    return false
  }
}

function markServerMigrationCompleted(companyId: string) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(buildServerMigrationKey(companyId), "true")
  } catch {
    // Silently fail
  }
}

function buildViewPreferencesUrl(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/surgeries/view-preferences`
}

function scheduleDeferredServerPreferencesTask(task: () => void): () => void {
  if (typeof window === "undefined") return () => undefined

  const browserWindow = window as BrowserWindowWithIdleCallback

  if (typeof browserWindow.requestIdleCallback === "function") {
    const handle = browserWindow.requestIdleCallback(task, { timeout: SERVER_PREFERENCES_DEFER_MS })
    return () => {
      browserWindow.cancelIdleCallback?.(handle)
    }
  }

  const handle = window.setTimeout(task, SERVER_PREFERENCES_DEFER_MS)
  return () => {
    window.clearTimeout(handle)
  }
}

async function fetchServerPreferences(companyId: string) {
  return apiFetch<SurgeryViewPreferenceEnvelope>(buildViewPreferencesUrl(companyId))
}

async function persistServerPreferences(companyId: string, preferences: SurgeryViewPreferences) {
  return apiFetch<SurgeryViewPreferenceEnvelope>(buildViewPreferencesUrl(companyId), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ preferences }),
  })
}

export function useFixedLeftColumnsPreference() {
  const [fixedLeftColumns, setFixedLeftColumnsInternal] = useState<string[]>(() => [...DEFAULT_FIXED_LEFT_COLUMNS])

  useEffect(() => {
    setFixedLeftColumnsInternal(loadFixedLeftColumns())

    const handleCustomChange = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail
      setFixedLeftColumnsInternal(normalizeFixedLeftColumns(detail))
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FIXED_LEFT_COLUMNS_KEY) return
      setFixedLeftColumnsInternal(loadFixedLeftColumns())
    }

    window.addEventListener(FIXED_LEFT_COLUMNS_EVENT, handleCustomChange as EventListener)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(FIXED_LEFT_COLUMNS_EVENT, handleCustomChange as EventListener)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const setFixedLeftColumns = useCallback((value: string[] | ((prev: string[]) => string[])) => {
    setFixedLeftColumnsInternal((prev) => {
      const next = normalizeFixedLeftColumns(typeof value === "function" ? value(prev) : value)
      saveFixedLeftColumns(next)
      return next
    })
  }, [])

  const resetFixedLeftColumns = useCallback(() => {
    setFixedLeftColumnsInternal([...DEFAULT_FIXED_LEFT_COLUMNS])
    saveFixedLeftColumns([...DEFAULT_FIXED_LEFT_COLUMNS])
  }, [])

  return {
    fixedLeftColumns,
    setFixedLeftColumns,
    resetFixedLeftColumns,
  }
}

export function useCompactModePreference() {
  const [compactMode, setCompactModeInternal] = useState<boolean>(false)

  useEffect(() => {
    setCompactModeInternal(loadCompactMode())

    const handleCustomChange = (event: Event) => {
      setCompactModeInternal((event as CustomEvent<boolean>).detail === true)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== COMPACT_MODE_KEY) return
      setCompactModeInternal(loadCompactMode())
    }

    window.addEventListener(COMPACT_MODE_EVENT, handleCustomChange as EventListener)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(COMPACT_MODE_EVENT, handleCustomChange as EventListener)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const setCompactMode = useCallback((value: boolean) => {
    setCompactModeInternal(value)
    saveCompactMode(value)
  }, [])

  const resetCompactMode = useCallback(() => {
    setCompactModeInternal(false)
    saveCompactMode(false)
  }, [])

  return {
    compactMode,
    setCompactMode,
    resetCompactMode,
  }
}

export function useColumnVisibility(options: UseColumnVisibilityOptions = {}) {
  const companyId = options.companyId ?? null
  const [colVisOpen, setColVisOpen] = useState(false)
  const [visibleCols, setVisibleColsInternal] = useState<Record<string, boolean>>({ ...DEFAULT_VISIBLE_COLS })
  const [stickyColumns, setStickyColumnsInternal] = useState<boolean>(true)
  const [columnOrder, setColumnOrderInternal] = useState<string[]>(DEFAULT_COLUMN_ORDER)
  const [columnWidths, setColumnWidthsInternal] = useState<Record<string, number>>({ ...DEFAULT_COLUMN_WIDTHS })
  const [compactMode, setCompactModeInternal] = useState<boolean>(false)
  const [fixedLeftColumns, setFixedLeftColumnsInternal] = useState<string[]>([...DEFAULT_FIXED_LEFT_COLUMNS])
  const [columnGroups, setColumnGroupsInternal] = useState<GroupedHeaderPreference[]>(() => cloneColumnGroups(DEFAULT_COLUMN_GROUPS))
  const [showGroupedHeaders, setShowGroupedHeadersInternal] = useState<boolean>(true)
  const saveSequenceRef = useRef(0)

  const applyPreferencesState = useCallback((preferences: SurgeryViewPreferences) => {
    setVisibleColsInternal(preferences.visibleCols)
    setStickyColumnsInternal(preferences.stickyColumns)
    setColumnOrderInternal(preferences.columnOrder)
    setColumnWidthsInternal(preferences.columnWidths)
    setCompactModeInternal(preferences.compactMode)
    setFixedLeftColumnsInternal(preferences.fixedLeftColumns)
    setColumnGroupsInternal(cloneColumnGroups(preferences.columnGroups))
    setShowGroupedHeadersInternal(preferences.showGroupedHeaders)
  }, [])

  const persistPreferences = useCallback((preferences: SurgeryViewPreferences) => {
    const normalized = normalizePreferences(preferences)
    applyPreferencesState(normalized)
    persistPreferencesToLocalStorage(normalized)

    if (!companyId) return

    const requestId = saveSequenceRef.current + 1
    saveSequenceRef.current = requestId

    persistServerPreferences(companyId, normalized).catch((error: unknown) => {
      if (requestId !== saveSequenceRef.current) return
      console.warn("Failed to persist surgery view preferences to server", error)
    })
  }, [applyPreferencesState, companyId])

  useEffect(() => {
    const localPreferences = loadPreferencesFromLocalStorage()
    const hasLegacyPreferences = hasLegacyLocalStoragePreferences()
    applyPreferencesState(localPreferences)

    if (!companyId) return

    let cancelled = false
    saveSequenceRef.current = 0

    const cancelServerPreferencesLoad = scheduleDeferredServerPreferencesTask(() => {
      fetchServerPreferences(companyId)
        .then(async (response) => {
          if (cancelled || saveSequenceRef.current > 0) return

          if (response.isPersisted) {
            const normalized = normalizePreferences(response.preferences)
            applyPreferencesState(normalized)
            persistPreferencesToLocalStorage(normalized)
            markServerMigrationCompleted(companyId)
            return
          }

          if (!hasLegacyPreferences || hasCompletedServerMigration(companyId)) return

          const migrated = await persistServerPreferences(companyId, localPreferences)
          if (cancelled || saveSequenceRef.current > 0) return

          const normalized = normalizePreferences(migrated.preferences)
          applyPreferencesState(normalized)
          persistPreferencesToLocalStorage(normalized)
          markServerMigrationCompleted(companyId)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          console.warn("Failed to load surgery view preferences from server", error)
        })
    })

    return () => {
      cancelled = true
      cancelServerPreferencesLoad()
    }
  }, [applyPreferencesState, companyId])

  const buildNextPreferences = useCallback((patch: Partial<SurgeryViewPreferences>) => normalizePreferences({
    visibleCols,
    columnOrder,
    stickyColumns,
    columnWidths,
    compactMode,
    fixedLeftColumns,
    columnGroups,
    showGroupedHeaders,
    ...patch,
  }), [visibleCols, columnOrder, stickyColumns, columnWidths, compactMode, fixedLeftColumns, columnGroups, showGroupedHeaders])

  const applyViewPreferences = useCallback((next: SurgeryViewPreferences) => {
    persistPreferences(next)
  }, [persistPreferences])

  const setVisibleCols = useCallback((cols: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    const nextVisibleCols = typeof cols === "function" ? cols(visibleCols) : cols
    persistPreferences(buildNextPreferences({ visibleCols: nextVisibleCols }))
  }, [buildNextPreferences, persistPreferences, visibleCols])

  const toggleColumn = useCallback((key: string, checked: boolean) => {
    persistPreferences(buildNextPreferences({ visibleCols: { ...visibleCols, [key]: checked } }))
  }, [buildNextPreferences, persistPreferences, visibleCols])

  const isColumnVisible = useCallback((key: string): boolean => {
    return visibleCols[key] !== false
  }, [visibleCols])

  const toggleStickyColumns = useCallback(() => {
    persistPreferences(buildNextPreferences({ stickyColumns: !stickyColumns }))
  }, [buildNextPreferences, persistPreferences, stickyColumns])

  const setStickyColumnsEnabled = useCallback((value: boolean) => {
    persistPreferences(buildNextPreferences({ stickyColumns: value }))
  }, [buildNextPreferences, persistPreferences])

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    const next = [...columnOrder]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    persistPreferences(buildNextPreferences({ columnOrder: next }))
  }, [buildNextPreferences, columnOrder, persistPreferences])

  const setColumnOrder = useCallback((order: string[]) => {
    persistPreferences(buildNextPreferences({ columnOrder: order }))
  }, [buildNextPreferences, persistPreferences])

  const setColumnWidths = useCallback((widths: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    const nextWidths = typeof widths === "function" ? widths(columnWidths) : widths
    persistPreferences(buildNextPreferences({ columnWidths: nextWidths }))
  }, [buildNextPreferences, columnWidths, persistPreferences])

  const setCompactMode = useCallback((value: boolean) => {
    persistPreferences(buildNextPreferences({ compactMode: value }))
  }, [buildNextPreferences, persistPreferences])

  const setFixedLeftColumns = useCallback((value: string[] | ((prev: string[]) => string[])) => {
    const nextFixedLeftColumns = typeof value === "function" ? value(fixedLeftColumns) : value
    persistPreferences(buildNextPreferences({ fixedLeftColumns: nextFixedLeftColumns }))
  }, [buildNextPreferences, fixedLeftColumns, persistPreferences])

  const setColumnGroups = useCallback((groups: GroupedHeaderPreference[] | ((prev: GroupedHeaderPreference[]) => GroupedHeaderPreference[])) => {
    const nextGroups = typeof groups === "function" ? groups(columnGroups) : groups
    persistPreferences(buildNextPreferences({ columnGroups: nextGroups }))
  }, [buildNextPreferences, columnGroups, persistPreferences])

  const setShowGroupedHeadersEnabled = useCallback((value: boolean) => {
    persistPreferences(buildNextPreferences({ showGroupedHeaders: value }))
  }, [buildNextPreferences, persistPreferences])

  const resetToDefault = useCallback(() => {
    persistPreferences(buildDefaultPreferences())
  }, [persistPreferences])

  return {
    colVisOpen, setColVisOpen,
    visibleCols, setVisibleCols,
    toggleColumn,
    isColumnVisible,
    stickyColumns,
    toggleStickyColumns,
    setStickyColumnsEnabled,
    columnOrder,
    setColumnOrder,
    columnWidths,
    setColumnWidths,
    compactMode,
    setCompactMode,
    fixedLeftColumns,
    setFixedLeftColumns,
    columnGroups,
    setColumnGroups,
    showGroupedHeaders,
    setShowGroupedHeadersEnabled,
    reorderColumns,
    resetToDefault,
    applyViewPreferences,
  }
}
