"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { usePathname } from "next/navigation"

type SidebarState = "expanded" | "compact" | "hidden"

// Routes where sidebar should default to compact (operational / data-intensive pages)
const COMPACT_ROUTES = [
  "/cirugias",
  "/expediente",
  "/stock",
  "/cajas",
  "/logistica",
  "/remitos",
  "/consumo",
  "/material-transito",
  "/compras/necesidades-compra",
  "/compras/ordenes-compra",
  "/compras/forecast",
  "/compras/movimientos",
  "/compras/facturas-compra",
  "/ventas/facturacion",
  "/ventas/presupuestos",
  "/ventas/pendientes-facturar",
  "/ventas/comprobantes",
]

// Routes where sidebar should default to expanded (overview / management pages)
const EXPANDED_ROUTES = [
  "/",
  "/reportes",
  "/clasificaciones",
  "/roles",
]

interface SidebarContextType {
  sidebarState: SidebarState
  setSidebarState: (v: SidebarState) => void
  collapsedGroups: Record<string, boolean>
  toggleGroup: (groupTitle: string) => void
  collapsed: boolean // backward compat
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  sidebarState: "expanded",
  setSidebarState: () => {},
  collapsedGroups: {},
  toggleGroup: () => {},
  collapsed: false,
  setCollapsed: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

interface ExpedienteDrawerContextType {
  open: boolean
  selectedSurgeryId: string | null
  openExpediente: (surgeryId: string) => void
  closeExpediente: () => void
}

const ExpedienteDrawerContext = createContext<ExpedienteDrawerContextType>({
  open: false,
  selectedSurgeryId: null,
  openExpediente: () => {},
  closeExpediente: () => {},
})

export function useExpedienteDrawer() {
  return useContext(ExpedienteDrawerContext)
}

// Helper to load collapsed groups from localStorage
function loadCollapsedGroups(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem("ortotrack-sidebar-groups")
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveCollapsedGroups(groups: Record<string, boolean>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("ortotrack-sidebar-groups", JSON.stringify(groups))
  } catch {
    // ignore
  }
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarState, setSidebarState] = useState<SidebarState>("expanded")
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [expedienteOpen, setExpedienteOpen] = useState(false)
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Load persisted collapsed groups on mount
  useEffect(() => {
    setCollapsedGroups(loadCollapsedGroups())
  }, [])

  // Context-aware sidebar default: when navigating to a new page, adjust sidebar state
  // only on first visit or if user hasn't manually changed it
  useEffect(() => {
    if (!initialized) {
      // First load — determine default state from current route
      if (COMPACT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
        setSidebarState("compact")
      } else if (EXPANDED_ROUTES.some((r) => pathname === r)) {
        setSidebarState("expanded")
      }
      setInitialized(true)
    }
  }, [pathname, initialized])

  const toggleGroup = useCallback((groupTitle: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupTitle]: !prev[groupTitle] }
      saveCollapsedGroups(next)
      return next
    })
  }, [])

  const openExpediente = useCallback((id: string) => {
    setSelectedSurgeryId(id)
    setExpedienteOpen(true)
  }, [])

  const closeExpediente = useCallback(() => {
    setExpedienteOpen(false)
    setSelectedSurgeryId(null)
  }, [])

  // Backward compat
  const collapsed = sidebarState === "compact"
  const setCollapsed = (v: boolean) => setSidebarState(v ? "compact" : "expanded")

  return (
    <SidebarContext.Provider
      value={{ sidebarState, setSidebarState, collapsedGroups, toggleGroup, collapsed, setCollapsed }}
    >
      <ExpedienteDrawerContext.Provider
        value={{ open: expedienteOpen, selectedSurgeryId, openExpediente, closeExpediente }}
      >
        {children}
      </ExpedienteDrawerContext.Provider>
    </SidebarContext.Provider>
  )
}
