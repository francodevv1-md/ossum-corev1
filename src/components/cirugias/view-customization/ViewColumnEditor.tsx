"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Search, Info, CheckSquare, Square } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ColumnDefinition, ViewDraft } from "./types"
import { MAX_FIXED_COLUMNS } from "./constants"
import { ViewColumnRow } from "./ViewColumnRow"

interface ViewColumnEditorProps {
  columns: ReadonlyArray<ColumnDefinition>
  draft: ViewDraft
  onUpdateVisibility: (key: string, visible: boolean) => void
  onSetAllVisible: (visible: boolean) => void
  onReorderColumns: (newOrder: string[]) => void
  onMoveColumn: (index: number, direction: -1 | 1) => void
  onUpdateWidth: (key: string, width: number) => void
  onToggleFixed: (key: string, fixed: boolean) => { success: boolean; reason?: string }
}

export function ViewColumnEditor({
  columns,
  draft,
  onUpdateVisibility,
  onSetAllVisible,
  onReorderColumns,
  onMoveColumn,
  onUpdateWidth,
  onToggleFixed,
}: ViewColumnEditorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [fixedWarning, setFixedWarning] = useState<string | null>(null)

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.key, c])),
    [columns]
  )

  // Ordered list of columns based on draft.orderedColumnKeys
  const orderedColumns = useMemo(() => {
    return draft.orderedColumnKeys
      .map((key) => columnMap.get(key))
      .filter((c): c is ColumnDefinition => !!c)
  }, [draft.orderedColumnKeys, columnMap])

  // Filtered by search query
  const filteredColumns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return orderedColumns
    return orderedColumns.filter((col) => col.label.toLowerCase().includes(q))
  }, [orderedColumns, searchQuery])

  const visibleCount = draft.visibleColumnKeys.length
  const totalCount = columns.length
  const fixedCount = draft.fixedColumns.length
  const isFixedLimitReached = fixedCount >= MAX_FIXED_COLUMNS

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = draft.orderedColumnKeys.indexOf(String(active.id))
    const newIndex = draft.orderedColumnKeys.indexOf(String(over.id))

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...draft.orderedColumnKeys]
      const [moved] = newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, moved)
      onReorderColumns(newOrder)
    }
  }

  const handleToggleFixedWithWarning = (key: string, fixed: boolean) => {
    const res = onToggleFixed(key, fixed)
    if (!res.success && res.reason) {
      setFixedWarning(res.reason)
      setTimeout(() => setFixedWarning(null), 4000)
    } else {
      setFixedWarning(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Subheader: Search, Counter, Quick Select ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Columnas
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {visibleCount} de {totalCount} visibles
          </span>
          {fixedCount > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {fixedCount} fijas
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSetAllVisible(true)}
            className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <CheckSquare className="mr-1 size-3.5" />
            Todas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSetAllVisible(false)}
            className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Square className="mr-1 size-3.5" />
            Solo básicas
          </Button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar columna por nombre…"
          className="h-9 pl-9 text-xs"
        />
      </div>

      {/* ── Fixed column warning notice ── */}
      {fixedWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <Info className="size-4 shrink-0" />
          <span>{fixedWarning}</span>
        </div>
      )}

      {/* ── Drag & Drop Column List ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredColumns.map((c) => c.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredColumns.map((col, idx) => {
              const isVisible = draft.visibleColumnKeys.includes(col.key)
              const isFixed = draft.fixedColumns.includes(col.key)
              const currentWidth = draft.widths[col.key] ?? 120
              const realIndex = draft.orderedColumnKeys.indexOf(col.key)

              return (
                <ViewColumnRow
                  key={col.key}
                  column={col}
                  index={realIndex}
                  totalColumns={totalCount}
                  isVisible={isVisible}
                  isFixed={isFixed}
                  currentWidth={currentWidth}
                  onToggleVisibility={onUpdateVisibility}
                  onToggleFixed={handleToggleFixedWithWarning}
                  onUpdateWidth={(key, w) => onUpdateWidth(key, w)}
                  onMoveUp={() => onMoveColumn(realIndex, -1)}
                  onMoveDown={() => onMoveColumn(realIndex, 1)}
                  isFixedLimitReached={isFixedLimitReached}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
