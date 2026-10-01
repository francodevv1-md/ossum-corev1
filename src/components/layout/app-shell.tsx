"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

type SidebarState = "expanded" | "compact" | "hidden"

const DEFAULT_DESKTOP_SIDEBAR_STATE: SidebarState = "expanded"
const SIDEBAR_STATE_STORAGE_KEY = "ossum.sidebarState"

interface SidebarContextType {
  sidebarState: SidebarState
  setSidebarState: (v: SidebarState) => void
  collapsedGroups: Record<string, boolean>
  toggleGroup: (groupTitle: string) => void
  collapsed: boolean // backward compat
  setCollapsed: (v: boolean) => void
  /**
   * When true, the floating "open menu" button is hidden (mobile only).
   * Used by surfaces that own the top-left corner of the viewport on
   * mobile (e.g. cirugias expediente back button).
   */
  hideMobileMenuButton: boolean
  setHideMobileMenuButton: (v: boolean) => void
  /** Mobile drawer open/close state, lifted so the global app bar can
   *  open the sidebar without prop-drilling. */
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  sidebarState: "expanded",
  setSidebarState: () => {},
  collapsedGroups: {},
  toggleGroup: () => {},
  collapsed: false,
  setCollapsed: () => {},
  hideMobileMenuButton: false,
  setHideMobileMenuButton: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
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

function loadSidebarState(): SidebarState {
  if (typeof window === "undefined") return DEFAULT_DESKTOP_SIDEBAR_STATE
  try {
    const stored = localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY)
    return stored === "expanded" || stored === "compact" || stored === "hidden"
      ? stored
      : DEFAULT_DESKTOP_SIDEBAR_STATE
  } catch {
    return DEFAULT_DESKTOP_SIDEBAR_STATE
  }
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarState, setSidebarStateValue] = useState<SidebarState>(DEFAULT_DESKTOP_SIDEBAR_STATE)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [expedienteOpen, setExpedienteOpen] = useState(false)
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string | null>(null)
  const [hideMobileMenuButton, setHideMobileMenuButton] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarStateValue(loadSidebarState())
      setCollapsedGroups(loadCollapsedGroups())
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const toggleGroup = useCallback((groupTitle: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupTitle]: !prev[groupTitle] }
      saveCollapsedGroups(next)
      return next
    })
  }, [])

  const setSidebarState = useCallback((value: SidebarState) => {
    setSidebarStateValue(value)
    try {
      localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, value)
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
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
      value={{
        sidebarState,
        setSidebarState,
        collapsedGroups,
        toggleGroup,
        collapsed,
        setCollapsed,
        hideMobileMenuButton,
        setHideMobileMenuButton,
        mobileOpen,
        setMobileOpen,
      }}
    >
      <ExpedienteDrawerContext.Provider
        value={{ open: expedienteOpen, selectedSurgeryId, openExpediente, closeExpediente }}
      >
        {children}
      </ExpedienteDrawerContext.Provider>
    </SidebarContext.Provider>
  )
}
