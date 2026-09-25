"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SurgeryState } from "@/types"
import { cn } from "@/lib/utils"

export interface SurgeryStateOptionConfig {
  value: string
  label: string
  dotClass: string
  badgeClass: string
  description?: string
}

export const SURGERY_STATE_CONFIGS: Record<string, SurgeryStateOptionConfig> = {
  "": {
    value: "",
    label: "Todos los estados",
    dotClass: "bg-slate-400 dark:bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    description: "Sin filtro de estado",
  },
  "Sin autorizar": {
    value: "Sin autorizar",
    label: "Sin autorizar",
    dotClass: "bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    description: "Pendiente de aprobación médica/administrativa",
  },
  "Sin fecha": {
    value: "Sin fecha",
    label: "Sin fecha",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    description: "Fecha quirúrgica aún no definida",
  },
  "Pendiente": {
    value: "Pendiente",
    label: "Pendiente",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/70",
    description: "En gestión o espera de coordinación",
  },
  "Autorizada": {
    value: "Autorizada",
    label: "Autorizada",
    dotClass: "bg-sky-500",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700/70",
    description: "Aprobada para preparación y despacho",
  },
  "En tránsito": {
    value: "En tránsito",
    label: "En tránsito",
    dotClass: "bg-blue-600",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700/70",
    description: "Material despachado hacia la institución",
  },
  "Realizada": {
    value: "Realizada",
    label: "Realizada",
    dotClass: "bg-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700/70",
    description: "Cirugía efectuada en quirófano",
  },
  "Finalizada": {
    value: "Finalizada",
    label: "Finalizada",
    dotClass: "bg-indigo-600",
    badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700/70",
    description: "Circuito completado y cerrado",
  },
  "Suspendida": {
    value: "Suspendida",
    label: "Suspendida",
    dotClass: "bg-violet-600",
    badgeClass: "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-700/70",
    description: "Postergada temporalmente",
  },
  "Cancelada": {
    value: "Cancelada",
    label: "Cancelada",
    dotClass: "bg-red-600",
    badgeClass: "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-700/70",
    description: "Intervención anulada definitivamente",
  },
  "Sin consumo": {
    value: "Sin consumo",
    label: "Sin consumo",
    dotClass: "bg-amber-800",
    badgeClass: "bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-700/70",
    description: "Realizada sin reporte de implantes",
  },
}

export interface SurgeryStateSelectProps {
  value?: string | SurgeryState
  onChange: (value: SurgeryState | "") => void
  includeAllOption?: boolean
  allOptionLabel?: string
  allowedStates?: (SurgeryState | "")[]
  size?: "sm" | "default"
  className?: string
  disabled?: boolean
  placeholder?: string
  triggerVariant?: "default" | "pill"
}

export function SurgeryStateSelect({
  value = "",
  onChange,
  includeAllOption = false,
  allOptionLabel = "Todos los estados",
  allowedStates,
  size = "default",
  className,
  disabled = false,
  placeholder = "Seleccionar estado...",
  triggerVariant = "default",
}: SurgeryStateSelectProps) {
  const currentKey = value || (includeAllOption ? "" : "Pendiente")
  const currentConfig = React.useMemo(() => {
    const raw = SURGERY_STATE_CONFIGS[currentKey] || {
      value: currentKey,
      label: currentKey || placeholder,
      dotClass: "bg-slate-400",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    }
    if (currentKey === "" && allOptionLabel) {
      return { ...raw, label: allOptionLabel }
    }
    return raw
  }, [currentKey, placeholder, allOptionLabel])

  const options = React.useMemo(() => {
    let keys: string[] = []
    if (allowedStates && allowedStates.length > 0) {
      keys = allowedStates
    } else {
      keys = [
        ...(includeAllOption ? [""] : []),
        "Sin autorizar",
        "Pendiente",
        "Autorizada",
        "En tránsito",
        "Realizada",
        "Finalizada",
        "Suspendida",
        "Cancelada",
      ]
    }
    return keys.map((k) => {
      const config = SURGERY_STATE_CONFIGS[k] || {
        value: k,
        label: k || allOptionLabel,
        dotClass: "bg-slate-400",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      }
      if (k === "" && allOptionLabel) {
        return { ...config, label: allOptionLabel }
      }
      return config
    })
  }, [allowedStates, includeAllOption, allOptionLabel])

  return (
    <Select
      value={currentKey || "__ALL__"}
      onValueChange={(val) => {
        onChange(val === "__ALL__" ? "" : (val as SurgeryState))
      }}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        className={cn(
          "w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-xs shadow-2xs transition-colors cursor-pointer",
          triggerVariant === "pill" && "rounded-full px-3 py-1",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <span
            className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs", currentConfig.dotClass)}
          />
          <span className="truncate text-slate-800 dark:text-slate-100 font-medium">
            {currentConfig.label}
          </span>
        </div>
      </SelectTrigger>

      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-xl min-w-[200px] p-1 z-50">
        {options.map((opt) => {
          const itemVal = opt.value === "" ? "__ALL__" : opt.value
          return (
            <SelectItem
              key={itemVal}
              value={itemVal}
              className="px-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5 w-full">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs", opt.dotClass)} />
                <span className="text-slate-800 dark:text-slate-200 font-medium flex-1">
                  {opt.label}
                </span>
                {opt.value && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border font-semibold ml-auto hidden sm:inline-block",
                      opt.badgeClass
                    )}
                  >
                    {opt.value}
                  </span>
                )}
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
