"use client"

import React, { useState } from "react"
import { Bell, Menu } from "lucide-react"
import { useSidebar } from "./app-shell"
import { useNotifications } from "@/hooks/useNotifications"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MobileNotificationsSheet } from "./MobileNotificationsSheet"

interface MobileAppBarProps {
  title?: string
  className?: string
}

const TITLES: Record<string, string> = {
  "/cirugias": "Cirugías",
  "/expediente": "Expediente",
  "/coordinadores": "Coordinación",
  "/contactos": "Contactos",
  "/calendario": "Calendario",
  "/stock": "Stock",
  "/cajas": "Cajas",
  "/remitos": "Remitos",
  "/consumo": "Consumo",
  "/logistica": "Logística",
  "/compras": "Compras",
  "/ventas/presupuestos": "Presupuestos",
  "/ventas/facturacion": "Facturación",
  "/ventas/cobros": "Cobros",
  "/notificaciones": "Notificaciones",
  "/perfil": "Mi Perfil",
}

export function MobileAppBar({ title, className }: MobileAppBarProps) {
  const pathname = usePathname()
  const { hideMobileMenuButton, setMobileOpen } = useSidebar()
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)

  const resolvedTitle = (() => {
    if (title) return title
    const exact = TITLES[pathname]
    if (exact) return exact
    const prefix = Object.keys(TITLES).find((key) => key !== "/" && pathname.startsWith(`${key}/`))
    return prefix ? TITLES[prefix] : "OSSUM COR"
  })()

  const openSidebar = () => {
    setMobileOpen(true)
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 flex h-11 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden dark:border-slate-800 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/80",
          className,
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {!hideMobileMenuButton ? (
          <button
            type="button"
            onClick={openSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition active:scale-90 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <span className="h-9 w-9" aria-hidden />
        )}
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {resolvedTitle}
        </h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition active:scale-90 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label={`Notificaciones (${unreadCount} sin leer)`}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </header>
      <MobileNotificationsSheet
        open={open}
        onOpenChange={setOpen}
        onCloseSidebar={openSidebar}
      />
    </>
  )
}