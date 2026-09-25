"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PreparationState } from "@/types"
import { cn } from "@/lib/utils"

export interface PreparationStateOptionConfig {
  value: string
  label: string
  dotClass: string
  badgeClass: string
}

export const PREPARATION_STATE_CONFIGS: Record<string, PreparationStateOptionConfig> = {
  "": {
    value: "",
    label: "Todas las preparaciones",
    dotClass: "bg-slate-400 dark:bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  },
  "Sin preparar": {
    value: "Sin preparar",
    label: "Sin preparar",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
  "En preparación": {
    value: "En preparación",
    label: "En preparación",
    dotClass: "bg-cyan-500",
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200",
  },
  "Congelado": {
    value: "Congelado",
    label: "Congelado",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200",
  },
  "Congelado con faltantes": {
    value: "Congelado con faltantes",
    label: "Congelado con faltantes",
    dotClass: "bg-orange-600",
    badgeClass: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200",
  },
  "Enviado": {
    value: "Enviado",
    label: "Enviado",
    dotClass: "bg-blue-600",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200",
  },
  "Entregado": {
    value: "Entregado",
    label: "Entregado",
    dotClass: "bg-teal-600",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200",
  },
  "Retirado": {
    value: "Retirado",
    label: "Retirado",
    dotClass: "bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
}

export interface PreparationStateSelectProps {
  value?: string | PreparationState
  onChange: (value: PreparationState | "") => void
  includeAllOption?: boolean
  allOptionLabel?: string
  size?: "sm" | "default"
  className?: string
  disabled?: boolean
  placeholder?: string
}

export function PreparationStateSelect({
  value = "",
  onChange,
  includeAllOption = false,
  allOptionLabel = "Todas las preparaciones",
  size = "default",
  className,
  disabled = false,
  placeholder = "Seleccionar preparación...",
}: PreparationStateSelectProps) {
  const currentKey = value || (includeAllOption ? "" : "Sin preparar")
  const currentConfig = React.useMemo(() => {
    const raw = PREPARATION_STATE_CONFIGS[currentKey] || {
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
    const keys = [
      ...(includeAllOption ? [""] : []),
      "Sin preparar",
      "En preparación",
      "Congelado",
      "Congelado con faltantes",
      "Enviado",
      "Entregado",
      "Retirado",
    ]
    return keys.map((k) => {
      const config = PREPARATION_STATE_CONFIGS[k] || {
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
  }, [includeAllOption, allOptionLabel])

  return (
    <Select
      value={currentKey || "__ALL__"}
      onValueChange={(val) => {
        onChange(val === "__ALL__" ? "" : (val as PreparationState))
      }}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        className={cn(
          "w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-xs shadow-2xs transition-colors cursor-pointer",
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
