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
}

const PRIMARY_TABS: TabDef[] = [
  { value: "ficha", label: "Ficha", Icon: FileText },
  { value: "novedades", label: "Seguim.", Icon: StickyNote },
  { value: "comercial", label: "Compro.", Icon: Receipt },
  { value: "logistica", label: "Logíst.", Icon: MapPin },
]

const MORE_TABS: TabDef[] = [
  { value: "consumo", label: "Consumo", Icon: Activity },
  { value: "documentacion", label: "Doc. y trazab.", Icon: BookOpen },
  { value: "correo", label: "Correo", Icon: Mail },
  { value: "instrumentador", label: "Instrumentador", Icon: Stethoscope },
  { value: "historial", label: "Historial", Icon: History },
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
                "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition active:scale-95",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
              )}
            >
              <tab.Icon className={cn("h-5 w-5", isActive && "fill-current")} aria-hidden />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-current={isMoreActive ? "page" : undefined}
          className={cn(
            "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition active:scale-95",
            isMoreActive
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
          )}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          <span>Más</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0"
        >
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
          <SheetHeader className="px-5 pt-3">
            <SheetTitle className="text-base">Más secciones</SheetTitle>
            <SheetDescription>
              Accedé a las secciones de uso menos frecuente.
            </SheetDescription>
          </SheetHeader>
          <ul className="px-5 pb-2" role="list">
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
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition active:scale-[0.99] active:bg-slate-50",
                      isActive
                        ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <tab.Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500",
                        )}
                        aria-hidden
                      />
                      {tab.label}
                    </span>
                    {isActive ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
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