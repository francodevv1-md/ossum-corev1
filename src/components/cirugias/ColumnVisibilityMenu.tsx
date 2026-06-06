"use client"
import React, { useState, useRef, useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Columns3, Pin, GripVertical, RotateCcw } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ColumnVisibilityMenuProps {
  colVisOpen: boolean
  setColVisOpen: (open: boolean) => void
  columns: ReadonlyArray<{ key: string; label: string }>
  visibleCols: Record<string, boolean>
  toggleColumn: (key: string, checked: boolean) => void
  stickyColumns: boolean
  onToggleStickyColumns: () => void
  columnOrder: string[]
  onReorderColumns: (fromIndex: number, toIndex: number) => void
  onResetToDefault: () => void
}

// ═══════════════════════════════════════════════════════════════
// Draggable column item
// ═══════════════════════════════════════════════════════════════

function DraggableColumnItem({
  col,
  index,
  isVisible,
  onToggle,
  onReorder,
  columnCount,
}: {
  col: { key: string; label: string }
  index: number
  isVisible: boolean
  onToggle: (key: string, checked: boolean) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  columnCount: number
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(index))
    e.dataTransfer.effectAllowed = "move"
    setIsDragging(true)
  }, [index])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDragOverIndex(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [index])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10)
    if (fromIndex !== index) {
      onReorder(fromIndex, index)
    }
    setDragOverIndex(null)
  }, [index, onReorder])

  return (
    <div
      ref={itemRef}
      className={cn(
        "flex items-center gap-1.5 py-0.5 px-1 rounded transition-colors",
        isDragging && "opacity-40",
        dragOverIndex === index && "bg-accent/60",
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag handle */}
      <GripVertical className="size-3 text-muted-foreground/50 cursor-grab shrink-0" />

      {/* Visibility checkbox */}
      <Checkbox
        checked={isVisible}
        onCheckedChange={(checked) => onToggle(col.key, !!checked)}
      />

      {/* Column label */}
      <span className="text-xs flex-1 truncate">{col.label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function ColumnVisibilityMenu({
  colVisOpen, setColVisOpen, columns, visibleCols, toggleColumn,
  stickyColumns, onToggleStickyColumns,
  columnOrder, onReorderColumns, onResetToDefault,
}: ColumnVisibilityMenuProps) {
  // Build ordered column list from columnOrder
  const columnsMap = new Map(columns.map((c) => [c.key, c]))
  const orderedColumns = columnOrder
    .map((key) => columnsMap.get(key))
    .filter(Boolean) as Array<{ key: string; label: string }>

  // Add any columns not in the order (new columns)
  const orderedKeys = new Set(columnOrder)
  const newColumns = columns.filter((c) => !orderedKeys.has(c.key))
  const allOrderedColumns = [...orderedColumns, ...newColumns]

  return (
    <Popover open={colVisOpen} onOpenChange={setColVisOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1 shrink-0">
          <Columns3 className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3 space-y-2">
        {/* Column visibility + drag reorder */}
        <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
          {allOrderedColumns.map((col, index) => (
            <DraggableColumnItem
              key={col.key}
              col={col}
              index={index}
              isVisible={visibleCols[col.key]}
              onToggle={toggleColumn}
              onReorder={onReorderColumns}
              columnCount={allOrderedColumns.length}
            />
          ))}
        </div>

        <Separator />

        {/* Sticky columns toggle */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Columnas fijas
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={stickyColumns}
              onCheckedChange={onToggleStickyColumns}
            />
            <div className="flex items-center gap-1.5">
              <Pin className="size-3 text-muted-foreground" />
              <span className="text-xs">Activar columnas fijas</span>
            </div>
          </label>
          {stickyColumns && (
            <p className="text-[10px] text-muted-foreground leading-tight pl-5">
              ID CX, PR Nº, Expediente y Estado CX fijas a la izquierda. Acciones fija a la derecha.
            </p>
          )}
        </div>

        <Separator />

        {/* Reset to default */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onResetToDefault}
        >
          <RotateCcw className="size-3" />
          Restaurar predeterminado
        </Button>
      </PopoverContent>
    </Popover>
  )
}
