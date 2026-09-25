"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ColumnDefinition } from "./types"
import {
  detectWidthPreset,
  getWidthOptionsForColumn,
  PINNABLE_LEFT_COLUMN_KEY_SET,
} from "./constants"

interface ViewColumnRowProps {
  column: ColumnDefinition
  index: number
  totalColumns: number
  isVisible: boolean
  isFixed: boolean
  currentWidth: string | number
  onToggleVisibility: (key: string, visible: boolean) => void
  onToggleFixed: (key: string, fixed: boolean) => void
  onUpdateWidth: (key: string, width: number) => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFixedLimitReached: boolean
}

export function ViewColumnRow({
  column,
  index,
  totalColumns,
  isVisible,
  isFixed,
  currentWidth,
  onToggleVisibility,
  onToggleFixed,
  onUpdateWidth,
  onMoveUp,
  onMoveDown,
  isFixedLimitReached,
}: ViewColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [showCustomWidth, setShowCustomWidth] = useState(false)
  const isPinnable = PINNABLE_LEFT_COLUMN_KEY_SET.has(column.key)
  const widthPreset = detectWidthPreset(column.key, currentWidth)
  const widthOptions = getWidthOptionsForColumn(column.key)

  const handleWidthPresetClick = (preset: "ajustado" | "normal" | "amplio") => {
    onUpdateWidth(column.key, widthOptions[preset])
    setShowCustomWidth(false)
  }

  const handleCustomWidthChange = (valStr: string) => {
    const num = Number(valStr)
    if (Number.isFinite(num)) {
      onUpdateWidth(column.key, Math.max(50, Math.min(600, num)))
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex flex-col rounded-lg border bg-white p-2 transition-all dark:bg-slate-900",
        isDragging
          ? "z-50 border-blue-500 shadow-md ring-2 ring-blue-400/20"
          : isFixed
          ? "border-blue-200/80 bg-blue-50/20 dark:border-blue-900/60 dark:bg-blue-950/20"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
        !isVisible && "opacity-60 bg-slate-50/70 dark:bg-slate-950/40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {/* ── Left side: Drag handle, Checkbox, Full Column Label ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Drag handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400 p-0.5 rounded touch-none shrink-0"
            title="Arrastrar para reordenar"
            aria-label={`Arrastrar para reordenar columna ${column.label}`}
          >
            <GripVertical className="size-4" />
          </button>

          {/* Visibility Checkbox */}
          <Checkbox
            id={`col-vis-${column.key}`}
            checked={isVisible}
            onCheckedChange={(checked) => onToggleVisibility(column.key, !!checked)}
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
          />

          {/* Column Label */}
          <label
            htmlFor={`col-vis-${column.key}`}
            className="truncate text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer select-none"
            title={column.label}
          >
            {column.label}
          </label>
        </div>

        {/* ── Right side: Width indicator/dropdown, Pin toggle, Accessible reorder buttons ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Width Trigger (compact pill) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCustomWidth(!showCustomWidth)}
            className={cn(
              "h-6 px-1.5 text-[10px] font-mono gap-1 text-slate-600 dark:text-slate-300 border-slate-200 hover:border-slate-300 dark:border-slate-800",
              showCustomWidth && "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            )}
            title="Ajustar ancho de columna"
          >
            <span>{currentWidth}px</span>
            {showCustomWidth ? (
              <ChevronUp className="size-3 text-slate-400" />
            ) : (
              <ChevronDown className="size-3 text-slate-400" />
            )}
          </Button>

          {/* Pin toggle button */}
          {isPinnable ? (
            isFixed ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onToggleFixed(column.key, false)}
                className="h-6 px-2 text-[10px] font-semibold gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                title="Desfijar columna de la izquierda"
              >
                <Pin className="size-3 fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400" />
                <span>Fija</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onToggleFixed(column.key, true)}
                disabled={isFixedLimitReached}
                className="size-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                title={
                  isFixedLimitReached
                    ? "Límite de columnas fijas alcanzado"
                    : "Fijar columna a la izquierda"
                }
              >
                <Pin className="size-3.5" />
              </Button>
            )
          ) : (
            <div className="size-6" />
          )}

          {/* Accessible reorder buttons */}
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onMoveUp}
              disabled={index === 0}
              className="size-6 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-300"
              title="Mover arriba"
            >
              <ArrowUp className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onMoveDown}
              disabled={index === totalColumns - 1}
              className="size-6 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-300"
              title="Mover abajo"
            >
              <ArrowDown className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Collapsible: Presets & Custom px input ── */}
      {showCustomWidth && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 text-[10px] mr-0.5">Preajustes:</span>
            <button
              type="button"
              onClick={() => handleWidthPresetClick("ajustado")}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors border",
                widthPreset === "ajustado"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              )}
            >
              Ajustado ({widthOptions.ajustado}px)
            </button>
            <button
              type="button"
              onClick={() => handleWidthPresetClick("normal")}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors border",
                widthPreset === "normal"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              )}
            >
              Normal ({widthOptions.normal}px)
            </button>
            <button
              type="button"
              onClick={() => handleWidthPresetClick("amplio")}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors border",
                widthPreset === "amplio"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              )}
            >
              Amplio ({widthOptions.amplio}px)
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Manual:</span>
            <Input
              type="number"
              min={50}
              max={600}
              value={currentWidth}
              onChange={(e) => handleCustomWidthChange(e.target.value)}
              className="h-6 w-16 text-xs text-right font-mono px-1.5"
            />
            <span className="text-slate-400 text-[10px]">px</span>
          </div>
        </div>
      )}
    </div>
  )
}
