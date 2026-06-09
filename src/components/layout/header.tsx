"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSidebar } from "./app-shell"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserMenu } from "./UserMenu"
import {
  Bell,
  Menu,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react"

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/cirugias": "Cirugías",
  "/expediente": "Expediente",
  "/ventas/presupuestos": "Presupuestos",
  "/ventas/facturacion": "Facturación",
  "/ventas/notas-credito": "Notas Crédito",
  "/ventas/notas-debito": "Notas Débito",
  "/ventas/cobros": "Cobros",
  "/ventas/pendientes-facturar": "Pendientes Facturar",
  "/ventas/comprobantes": "Comprobantes Asociados",
  "/stock": "Stock",
  "/cajas": "Cajas",
  "/remitos": "Remitos",
  "/consumo": "Consumo",
  "/logistica": "Logística",
  "/material-transito": "Material en Tránsito",
  "/instrumentadores": "Instrumentadores",
  "/vencimientos": "Vencimientos",
  "/compras/necesidades-compra": "Necesidades de Compra",
  "/compras/ordenes-compra": "Órdenes de Compra",
  "/compras/proveedores": "Proveedores",
  "/compras/forecast": "Forecast",
  "/compras/ordenes-pago": "Órdenes de Pago",
  "/compras/movimientos": "Movimientos Compra",
  "/compras/facturas-compra": "Facturas Compra",
  "/trazabilidad": "Trazabilidad",
  "/documentacion": "Documentación",
  "/clasificaciones": "Clasificaciones",
  "/reportes": "Reportes",
  "/roles": "Roles",
  "/usuarios": "Usuarios",
  "/configuracion": "Configuración",
}

const MOCK_NOTIFICATIONS = [
  { id: "1", title: "Cirugía programada", description: "Nueva cirugía asignada para mañana 08:00", time: "Hace 5 min", read: false },
  { id: "2", title: "Stock bajo", description: "Implante CF-200 por debajo del stock mínimo", time: "Hace 30 min", read: false },
  { id: "3", title: "Factura vencida", description: "Factura FV-2024-0134 vencida hace 3 días", time: "Hace 1 hora", read: true },
  { id: "4", title: "Remito devuelto", description: "Remito RM-0087 devuelto sin control", time: "Hace 2 horas", read: true },
]

export function Header() {
  const pathname = usePathname()
  const { sidebarState, setSidebarState } = useSidebar()
  const [dateTime, setDateTime] = useState<string>("")

  useEffect(() => {
    const update = () => {
      setDateTime(
        new Date().toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) +
          " — " +
          new Date().toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })
      )
    }
    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [])

  const pageTitle = ROUTE_LABELS[pathname] || "OSSUM COR"

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length

  // When sidebar is hidden, show a compact menu toggle in the header
  // Clicking it restores to compact (not expanded) for operational efficiency
  const handleShowMenu = () => {
    setSidebarState("compact")
  }

  // Toggle between expanded and compact when sidebar is visible
  const handleToggleSidebar = () => {
    if (sidebarState === "expanded") setSidebarState("compact")
    else if (sidebarState === "compact") setSidebarState("expanded")
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-11 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-5"
      )}
    >
      {/* Sidebar toggle in header */}
      {sidebarState === "hidden" ? (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-8"
          onClick={handleShowMenu}
          aria-label="Mostrar menú"
        >
          <Menu className="size-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-8 hidden lg:flex"
          onClick={handleToggleSidebar}
          aria-label={sidebarState === "expanded" ? "Compactar menú" : "Expandir menú"}
        >
          {sidebarState === "expanded" ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </Button>
      )}

      {/* Mobile-only spacer when sidebar is not hidden */}
      {sidebarState !== "hidden" && <div className="w-8 lg:hidden" />}

      {/* Page title */}
      <div className="flex flex-col min-w-0">
        <h1 className="text-[13px] font-semibold truncate leading-tight">{pageTitle}</h1>
        {dateTime && (
          <span className="text-[10px] text-muted-foreground truncate capitalize leading-tight">
            {dateTime}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-8" aria-label="Notificaciones">
              <Bell className="size-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificaciones</span>
              <span className="text-xs font-normal text-muted-foreground">
                {unreadCount} sin leer
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MOCK_NOTIFICATIONS.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
                <div className="flex items-center gap-2">
                  {!n.read && <span className="size-2 rounded-full bg-primary" />}
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                <span className="text-xs text-muted-foreground pl-4">{n.description}</span>
                <span className="text-[10px] text-muted-foreground pl-4">{n.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center text-xs text-primary cursor-pointer">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5" />

        <UserMenu />
      </div>
    </header>
  )
}
