"use client"

import { motion } from "framer-motion"
import { Check, Palette, Sparkles, Pin, Sliders, Rows3, StretchHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { CxStatusVariant } from "@/lib/cirugias.constants"

interface ViewAppearanceSettingsProps {
  compactMode: boolean
  onCompactModeChange: (compact: boolean) => void
  cxVariant: CxStatusVariant
  onCxVariantChange: (variant: CxStatusVariant) => void
  stickyHeaders: boolean
  onStickyHeadersChange: (sticky: boolean) => void
  showOperationPresets: boolean
  onShowOperationPresetsChange: (show: boolean) => void
  onOpenColorReference?: () => void
}

export function ViewAppearanceSettings({
  compactMode,
  onCompactModeChange,
  cxVariant,
  onCxVariantChange,
  stickyHeaders,
  onStickyHeadersChange,
  showOperationPresets,
  onShowOperationPresetsChange,
  onOpenColorReference,
}: ViewAppearanceSettingsProps) {
  return (
    <div className="space-y-6 max-h-[520px] overflow-y-auto pr-1">
      {/* ── Section: Densidad ── */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Densidad de tabla
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ajustá la altura de filas para optimizar la cantidad de información visible en pantalla.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Cómoda (Standard ~32px) */}
          <button
            type="button"
            onClick={() => onCompactModeChange(false)}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200",
              !compactMode
                ? "border-[var(--ossum-action)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--ossum-action)]/30 dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Rows3 className={cn("size-4", !compactMode ? "text-[var(--ossum-action)]" : "text-slate-400")} />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Cómoda
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">~32px</span>
                </div>
                {!compactMode && (
                  <motion.span
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="flex size-5 items-center justify-center rounded-full bg-[var(--ossum-action)] text-white shadow-2xs dark:bg-blue-500"
                  >
                    <Check className="size-3 stroke-[3]" />
                  </motion.span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Altura estándar balanceada. Máxima legibilidad y espacio amplio para interactuar.
              </p>
            </div>

            {/* Visual Row Preview */}
            <div className="mt-3 space-y-1 rounded-lg border border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex h-5 items-center justify-between rounded bg-white px-2 text-[9px] font-medium text-slate-600 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                <span>#3421 · Juan Pérez</span>
                <span className="rounded bg-emerald-100 px-1 py-0.2 text-[8px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">CONFIRMADA</span>
              </div>
              <div className="flex h-5 items-center justify-between rounded bg-white px-2 text-[9px] font-medium text-slate-600 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                <span>#3422 · María Gómez</span>
                <span className="rounded bg-blue-100 px-1 py-0.2 text-[8px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">PRESUPUESTADA</span>
              </div>
            </div>
          </button>

          {/* Compacta (CompactMode ~26px) */}
          <button
            type="button"
            onClick={() => onCompactModeChange(true)}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200",
              compactMode
                ? "border-[var(--ossum-action)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--ossum-action)]/30 dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <StretchHorizontal className={cn("size-4", compactMode ? "text-[var(--ossum-action)]" : "text-slate-400")} />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Compacta
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">~26px</span>
                </div>
                {compactMode && (
                  <motion.span
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="flex size-5 items-center justify-center rounded-full bg-[var(--ossum-action)] text-white shadow-2xs dark:bg-blue-500"
                  >
                    <Check className="size-3 stroke-[3]" />
                  </motion.span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Alta densidad operacional. Reduce padding para visualizar más filas simultáneamente.
              </p>
            </div>

            {/* Visual Row Preview (Tighter) */}
            <div className="mt-3 space-y-0.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex h-3.5 items-center justify-between rounded bg-white px-1.5 text-[8px] font-medium text-slate-600 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                <span>#3421 · Juan Pérez</span>
                <span className="rounded bg-emerald-100 px-1 text-[7px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">CONF</span>
              </div>
              <div className="flex h-3.5 items-center justify-between rounded bg-white px-1.5 text-[8px] font-medium text-slate-600 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                <span>#3422 · María Gómez</span>
                <span className="rounded bg-blue-100 px-1 text-[7px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">PRES</span>
              </div>
              <div className="flex h-3.5 items-center justify-between rounded bg-white px-1.5 text-[8px] font-medium text-slate-600 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                <span>#3423 · Carlos Ruiz</span>
                <span className="rounded bg-amber-100 px-1 text-[7px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">AUT</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Section: Estado de Cirugía ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Estilo del Estado CX
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Definí cómo se representan visualmente los estados de cada cirugía.
            </p>
          </div>
          {onOpenColorReference && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenColorReference}
              className="h-7.5 gap-1.5 rounded-lg border-blue-200 bg-blue-50/70 text-[11px] font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 shadow-2xs"
            >
              <Palette className="size-3.5 text-blue-600 dark:text-blue-400" />
              Ver referencia de colores
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Barra lateral + texto (Variant B - Recommended) */}
          <button
            type="button"
            onClick={() => onCxVariantChange("b")}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200",
              cxVariant === "b"
                ? "border-[var(--ossum-action)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--ossum-action)]/30 dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Barra lateral + texto
                </span>
                {cxVariant === "b" && (
                  <motion.span
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="flex size-4 items-center justify-center rounded-full bg-[var(--ossum-action)] text-white dark:bg-blue-500 shrink-0 shadow-2xs"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.span>
                )}
              </div>
              <Badge
                variant="secondary"
                className="mt-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] px-1.5 py-0 font-semibold"
              >
                Recomendada
              </Badge>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Barra de 4px con texto semántico. Sin saturación visual.
              </p>
            </div>

            {/* Mini preview */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950">
              <span className="h-4 w-1.5 rounded-sm bg-emerald-600 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Realizada
              </span>
            </div>
          </button>

          {/* Celda coloreada (Variant A) */}
          <button
            type="button"
            onClick={() => onCxVariantChange("a")}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200",
              cxVariant === "a"
                ? "border-[var(--ossum-action)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--ossum-action)]/30 dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Celda coloreada
                </span>
                {cxVariant === "a" && (
                  <motion.span
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="flex size-4 items-center justify-center rounded-full bg-[var(--ossum-action)] text-white dark:bg-blue-500 shrink-0 shadow-2xs"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.span>
                )}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Fondo pleno saturado en toda la celda para máximo impacto.
              </p>
            </div>

            {/* Mini preview */}
            <div className="mt-3 flex items-center justify-center rounded-lg bg-emerald-600 p-2 text-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                Realizada
              </span>
            </div>
          </button>

          {/* Indicador puntual (Variant C) */}
          <button
            type="button"
            onClick={() => onCxVariantChange("c")}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200",
              cxVariant === "c"
                ? "border-[var(--ossum-action)] bg-blue-50/50 shadow-xs ring-1 ring-[var(--ossum-action)]/30 dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Indicador puntual
                </span>
                {cxVariant === "c" && (
                  <motion.span
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="flex size-4 items-center justify-center rounded-full bg-[var(--ossum-action)] text-white dark:bg-blue-500 shrink-0 shadow-2xs"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.span>
                )}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Dot circular discreto junto al texto del estado.
              </p>
            </div>

            {/* Mini preview */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950">
              <span className="size-2.5 rounded-full bg-emerald-600 shrink-0 shadow-2xs" />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Realizada
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Section: Comportamiento de tabla y accesos rápidos ── */}
      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Navegación y cabeceras
          </h4>
        </div>

        <div className="space-y-2.5">
          {/* Sticky header toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Pin className="size-4" />
              </div>
              <div className="space-y-0.5">
                <Label
                  htmlFor="sticky-headers"
                  className="text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  Mantener encabezado visible al desplazarse
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Fija la fila de títulos de columnas durante el scroll vertical de la tabla.
                </p>
              </div>
            </div>
            <Switch
              id="sticky-headers"
              checked={stickyHeaders}
              onCheckedChange={onStickyHeadersChange}
            />
          </div>

          {/* Operation presets bar toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Sliders className="size-4" />
              </div>
              <div className="space-y-0.5">
                <Label
                  htmlFor="operation-presets"
                  className="text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  Mostrar accesos rápidos de operación
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Muestra la barra superior con filtros directos (Urgentes, Sin PR, Confeccionar, etc.).
                </p>
              </div>
            </div>
            <Switch
              id="operation-presets"
              checked={showOperationPresets}
              onCheckedChange={onShowOperationPresetsChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

