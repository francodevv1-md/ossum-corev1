"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useSidebar } from "./app-shell"
import { BranchSelector } from "./BranchSelector"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
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
  "/ventas/documentos-ajuste": "Documentos de ajuste",
  "/ventas/notas-credito": "Notas Crédito",
  "/ventas/notas-debito": "Notas Débito",
  "/ventas/cobros": "Cobros",
  "/ventas/pendientes-facturar": "Pendientes Facturar",
  "/ventas/comprobantes": "Comprobantes Asociados",
  "/stock": "Stock",
  "/cajas": "Cajas",
  "/tablero": "Tablero quirúrgico",
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
  "/compras/remitos-proveedor": "Remitos Proveedor",
  "/compras/facturas-compra": "Facturas Compra",
  "/trazabilidad": "Trazabilidad",
  "/documentacion": "Documentación",
  "/clasificaciones": "Clasificaciones",
  "/reportes": "Reportes",
  "/roles": "Roles",
  "/usuarios": "Usuarios",
  "/configuracion": "Configuración",
}

export function Header() {
  const pathname = usePathname()
  const { sidebarState, setSidebarState } = useSidebar()
  const pageTitle = ROUTE_LABELS[pathname] || "OSSUM COR"
  const isCirugiasRoute = pathname.startsWith("/cirugias")

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
        "sticky z-30 flex items-center gap-2.5",
        isCirugiasRoute
          ? "top-0 min-h-0 px-0 py-0"
          : "h-11 rounded-2xl border border-border/60 bg-background/90 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-3.5"
      )}
    >
      {/* Sidebar toggle in header — desktop only. Mobile uses MobileAppBar. */}
      {!isCirugiasRoute && sidebarState === "hidden" ? (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-8 hidden lg:flex"
          onClick={handleShowMenu}
          aria-label="Mostrar menú"
        >
          <Menu className="size-4" />
        </Button>
      ) : !isCirugiasRoute ? (
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
      ) : null}

      {isCirugiasRoute && (
        <div className="sr-only" aria-live="polite">
          Cirugías
        </div>
      )}

      {!isCirugiasRoute && (
        <>
          {/* Mobile-only spacer when sidebar is not hidden */}
          {sidebarState !== "hidden" && <div className="w-8 lg:hidden" />}

          {/* Page title */}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              Área activa
            </span>
            <h1 className="truncate text-[12px] font-semibold leading-none text-foreground/85">{pageTitle}</h1>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <BranchSelector />
          </div>
        </>
      )}
    </header>
  )
}
