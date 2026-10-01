"use client"

import React, { useState } from "react"
import { Activity, BookOpen, FileText, History, Mail, MapPin, MoreHorizontal, Receipt, Stethoscope, StickyNote } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type ExpTabKey =
  | "ficha"
  | "novedades"
  | "comercial"
  | "consumo"
  | "documentacion"
  | "logistica"
  | "correo"
  | "instrumentador"
  | "historial"

interface TabDef {
  value: ExpTabKey
  label: string
  Icon: React.ComponentType<{ className?: string }>
  // ponytail: kept short so 5 tabs fit cleanly in a 360dp viewport without
  // truncation. Truncated labels read like noise on mobile.
  shortLabel: string
}

// Priority order is intentional — follow what the user touches most:
// novedades (voice, mail, evidence) > ficha > logística > comercial.
// Anything else moves to the "Más" sheet so the bottom bar stays one tap.
const PRIMARY_TABS: TabDef[] = [
  { value: "novedades", label: "Seguimiento", shortLabel: "Seguim.", Icon: StickyNote },
  { value: "ficha", label: "Ficha", shortLabel: "Ficha", Icon: FileText },
  { value: "logistica", label: "Logística", shortLabel: "Logíst.", Icon: MapPin },
  { value: "comercial", label: "Comprobantes", shortLabel: "Compro.", Icon: Receipt },
]

const MORE_TABS: TabDef[] = [
  { value: "consumo", label: "Consumo", shortLabel: "Consumo", Icon: Activity },
  { value: "documentacion", label: "Doc. y trazab.", shortLabel: "Doc.", Icon: BookOpen },
  { value: "correo", label: "Correo", shortLabel: "Correo", Icon: Mail },
  { value: "instrumentador", label: "Instrumentador", shortLabel: "Instr.", Icon: Stethoscope },
  { value: "historial", label: "Historial", shortLabel: "Hist.", Icon: History },
]

interface MobileExpedienteTabsProps {
  value: ExpTabKey
  onChange: (tab: ExpTabKey) => void
}

export function MobileExpedienteTabs({ value, onChange }: MobileExpedienteTabsProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const isMoreActive = MORE_TABS.some((t) => t.value === value)

  return (
    <>
      <nav
        aria-label="Secciones del expediente"
        className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRIMARY_TABS.map((tab) => {
          const isActive = tab.value === value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10.5px] font-semibold leading-none tracking-tight",
                // emil: press feedback that compounds with the active bar. Scale
                // on press never combined with the active indicator — only one
                // visual response per gesture.
                "transition-[color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.94]",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
              )}
            >
              <tab.Icon
                className={cn(
                  "h-[22px] w-[22px] transition-transform duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
                  isActive && "scale-[1.05]",
                )}
                aria-hidden
              />
              <span className="truncate">{tab.shortLabel}</span>
              {/* emil: the active underline is a transform, not a border, so it
                  animates smoothly on tab switch instead of repainting. */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-3 top-0 h-[2px] origin-center rounded-full bg-blue-600 transition-transform duration-[200ms] ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-blue-400",
                  isActive ? "scale-x-100" : "scale-x-0",
                )}
              />
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-current={isMoreActive ? "page" : undefined}
          className={cn(
            "group relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10.5px] font-semibold leading-none tracking-tight",
            "transition-[color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.94]",
            isMoreActive
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
          )}
        >
          <MoreHorizontal
            className={cn(
              "h-[22px] w-[22px] transition-transform duration-[200ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
              isMoreActive && "scale-[1.05]",
            )}
            aria-hidden
          />
          <span>Más</span>
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-3 top-0 h-[2px] origin-center rounded-full bg-blue-600 transition-transform duration-[200ms] ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-blue-400",
              isMoreActive ? "scale-x-100" : "scale-x-0",
            )}
          />
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0"
        >
          {/* emil: drag handle is the established affordance for bottom sheets.
              The pill gives users a target they can grab. */}
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
          <SheetHeader className="px-5 pt-4">
            <SheetTitle className="text-base font-semibold tracking-tight">
              Más secciones
            </SheetTitle>
            <SheetDescription className="text-xs">
              Secciones de uso menos frecuente.
            </SheetDescription>
          </SheetHeader>
          <ul className="px-3 pb-2 pt-1" role="list">
            {MORE_TABS.map((tab) => {
              const isActive = tab.value === value
              return (
                <li key={tab.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(tab.value)
                      setMoreOpen(false)
                    }}
                    className={cn(
                      // emil: press feedback, not a hover-only effect (touch devices
                      // can't hover). Transform on active so the gesture feels
                      // physically linked.
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3.5 text-left transition-[background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99] active:bg-slate-100 dark:active:bg-slate-800",
                      isActive
                        ? "bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <tab.Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500",
                        )}
                        aria-hidden
                      />
                      <span className="truncate text-sm font-medium">{tab.label}</span>
                    </span>
                    {isActive ? (
                      <span className="shrink-0 rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
                        Actual
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}