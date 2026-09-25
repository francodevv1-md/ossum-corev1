"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSidebar } from "./app-shell"
import { UserMenu } from "./UserMenu"
import { NotificationMenu } from "./ShellUtilityMenus"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthProvider"
import { getCoordinationDestination } from "@/lib/permissions/coordination"
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRightLeft,
  Banknote,
  BarChart2,
  BarChart3,
  BookOpen,
  Box,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleX,
  ClipboardList,
  Clock3,
  CreditCard,
  EyeOff,
  FileCheck,
  FileMinus,
  FilePlus,
  FileText,
  FolderOpen,
  Kanban,
  LayoutDashboard,
  Link2,
  MapPin,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Receipt,
  Scissors,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Stethoscope,
  Tags,
  Truck,
  Users,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  shortLabel?: string
}

interface NavGroup {
  title: string
  key: string
  rootLabel: string
  rootHref?: string
  rootIcon: React.ElementType
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "PRINCIPAL",
    key: "principal",
    rootLabel: "Cirugías",
    rootHref: "/cirugias",
    rootIcon: Scissors,
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Contactos", href: "/contactos", icon: Users },
      { label: "Expediente", href: "/expediente", icon: FolderOpen },
      { label: "Coordinación", href: "/coordinadores", icon: Users },
      { label: "Calendario", href: "/calendario", icon: CalendarDays },
      { label: "Tableros", href: "/tableros-operativos", icon: Kanban },
      { label: "Tablero quirúrgico", href: "/tablero", icon: LayoutDashboard },
    ],
  },
  {
    title: "COMERCIAL",
    key: "ventas",
    rootLabel: "Presupuestos",
    rootHref: "/ventas/presupuestos",
    rootIcon: FileText,
    items: [
      { label: "Facturación", href: "/ventas/facturacion", icon: Receipt },
      { label: "Pendientes Facturar", href: "/ventas/pendientes-facturar", icon: Clock3 },
      { label: "Notas Crédito", href: "/ventas/notas-credito", icon: FileMinus },
      { label: "Notas Débito", href: "/ventas/notas-debito", icon: FilePlus },
      { label: "Cobros", href: "/ventas/cobros", icon: CreditCard },
      { label: "Recibos", href: "/ventas/recibos", icon: FileCheck },
      { label: "Comprobantes", href: "/ventas/comprobantes", icon: Link2 },
    ],
  },
  {
    title: "OPERACIÓN",
    key: "operaciones",
    rootLabel: "Stock",
    rootHref: "/stock",
    rootIcon: Package,
    items: [
      { label: "Cajas", href: "/cajas", icon: Box },
      { label: "Remitos", href: "/remitos", icon: Truck },
      { label: "Consumo", href: "/consumo", icon: Activity },
      { label: "Logística", href: "/logistica", icon: MapPin },
      { label: "Mat. en Tránsito", href: "/material-transito", icon: ArrowRightLeft },
      { label: "Instrumentadores", href: "/instrumentadores", icon: Stethoscope },
      { label: "Vencimientos", href: "/vencimientos", icon: AlertTriangle },
    ],
  },
  {
    title: "COMPRAS",
    key: "compras",
    rootLabel: "Compras",
    rootIcon: ShoppingCart,
    items: [
      { label: "Nec. de Compra", href: "/compras/necesidades-compra", icon: ShoppingCart },
      { label: "Órd. de Compra", href: "/compras/ordenes-compra", icon: ClipboardList },
      { label: "Proveedores", href: "/compras/proveedores", icon: Building2 },
      { label: "Forecast", href: "/compras/forecast", icon: BarChart3 },
      { label: "Órd. de Pago", href: "/compras/ordenes-pago", icon: Banknote },
      { label: "Mov. Compra", href: "/compras/movimientos", icon: ArrowLeftRight },
      { label: "Remitos Proveedor", href: "/compras/remitos-proveedor", icon: Truck },
      { label: "Facturas Compra", href: "/compras/facturas-compra", icon: FileCheck },
    ],
  },
  {
    title: "ADMINISTRACIÓN",
    key: "sistema",
    rootLabel: "Administración",
    rootIcon: Settings,
    items: [
      { label: "Estadísticas", href: "/estadisticas", icon: BarChart2 },
      { label: "Trazabilidad", href: "/trazabilidad", icon: Search },
      { label: "Documentación", href: "/documentacion", icon: BookOpen },
      { label: "Clasificaciones", href: "/clasificaciones", icon: Tags },
      { label: "Reportes", href: "/reportes", icon: PieChart },
      { label: "Roles", href: "/roles", icon: Shield },
      { label: "Usuarios", href: "/usuarios", icon: Users },
      { label: "Auditoría", href: "/auditoria", icon: Shield },
      { label: "Configuración", href: "/configuracion", icon: Settings },
    ],
  },
]

const SIDEBAR_WIDTH_EXPANDED = "248px"
const SIDEBAR_WIDTH_COMPACT = "56px"

function isPathActive(pathname: string, href?: string) {
  if (!href) return false
  const hasMoreSpecificRoute = NAV_GROUPS.some((group) => [
    ...(group.rootHref ? [group.rootHref] : []),
    ...group.items.map((item) => item.href),
  ].some((candidate) => candidate !== href && candidate.startsWith(`${href}/`) && isPathActive(pathname, candidate)))
  return !hasMoreSpecificRoute && (href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))
}

function matchesQuery(label: string, query: string) {
  return label.toLocaleLowerCase("es").includes(query)
}

export function Sidebar({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentAccess } = useAuth()
  const { sidebarState, setSidebarState, collapsedGroups, toggleGroup } = useSidebar()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const searchRef = React.useRef<HTMLInputElement>(null)
  const isExpanded = sidebarState === "expanded"
  const isHidden = sidebarState === "hidden"
  const normalizedQuery = query.trim().toLocaleLowerCase("es")

  const navGroups = React.useMemo(
    () => NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.map((item) => item.label === "Coordinación"
        ? { ...item, href: getCoordinationDestination(currentAccess?.role) }
        : item),
    })),
    [currentAccess?.role]
  )

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === "k") {
        event.preventDefault()
        if (window.innerWidth < 1024) setMobileOpen(true)
        if (!isExpanded) setSidebarState("expanded")
        window.requestAnimationFrame(() => searchRef.current?.focus())
      } else if (key === "j") {
        event.preventDefault()
        router.push("/notificaciones")
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [isExpanded, setSidebarState, router])

  const desktopWidth = isHidden ? "0px" : isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COMPACT
  const currentWidth = mobileOpen ? SIDEBAR_WIDTH_EXPANDED : desktopWidth
  const navWidth = mobileOpen || isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COMPACT
  const showExpandedContent = mobileOpen || isExpanded
  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-3 top-3 z-50 size-8 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="size-4" />
      </Button>

      {isHidden && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-3 top-3 z-40 hidden size-8 bg-background lg:flex"
          onClick={() => setSidebarState("compact")}
          aria-label="Mostrar menú"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        style={{ width: currentWidth }}
        className={cn(
          "z-40 flex flex-col overflow-hidden border-r border-[#E2E4E8] bg-[#FBFBFB] text-[#454B55] transition-[width,transform] duration-150 dark:border-border dark:bg-background dark:text-foreground",
          embedded ? "fixed inset-y-0 left-0 lg:relative lg:inset-auto lg:h-full" : "fixed inset-y-0 left-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn("relative flex h-[54px] shrink-0 items-center border-b border-[#E2E4E8] dark:border-border", showExpandedContent ? "gap-2.5 px-3" : "justify-center px-0")}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#1D2FC0] text-white">
            <Scissors className="size-[15px]" strokeWidth={1.8} />
          </div>
          {showExpandedContent && (
            <>
              <div className="min-w-0 flex-1 leading-none">
                <div className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[#071935] dark:text-foreground">OSSUM COR</div>
                <div className="mt-1 truncate text-[10px] text-[#858A94]">ERP Operativo</div>
              </div>
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-[#717680] hover:bg-[#F3F3F3] hover:text-[#071935] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2FC0]/35 dark:hover:bg-accent dark:hover:text-foreground"
                onClick={() => mobileOpen ? setMobileOpen(false) : setSidebarState("compact")}
                aria-label={mobileOpen ? "Cerrar menú" : "Compactar menú"}
              >
                <PanelLeftClose className="size-[15px]" />
              </button>
              <button
                type="button"
                className="hidden size-7 shrink-0 items-center justify-center rounded-md text-[#717680] hover:bg-[#F3F3F3] hover:text-[#071935] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2FC0]/35 dark:hover:bg-accent dark:hover:text-foreground lg:flex"
                onClick={() => setSidebarState("hidden")}
                aria-label="Ocultar menú"
                title="Ocultar menú"
              >
                <EyeOff className="size-[15px]" />
              </button>
            </>
          )}
          {!showExpandedContent && (
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setSidebarState("expanded")}
              aria-label="Expandir menú"
              title="Expandir menú"
            />
          )}
        </div>

        {showExpandedContent && (
          <div className="shrink-0 space-y-2 px-2.5 pb-2.5 pt-2">
            <NotificationMenu
              label="Notificaciones"
              dropdownSide="right"
              dropdownAlign="start"
              buttonClassName="border border-[#1D2FC0]/25 bg-[#EEF0FF] text-[#1D2FC0] font-medium hover:bg-[#1D2FC0] hover:text-white hover:border-[#1D2FC0] focus-visible:border-[#1D2FC0] focus-visible:ring-1 focus-visible:ring-[#1D2FC0]/25 data-[state=open]:bg-[#1D2FC0] data-[state=open]:text-white data-[state=open]:border-[#1D2FC0] dark:border-[#1D2FC0]/30 dark:bg-[#1D2FC0]/10 dark:text-[#1D2FC0] dark:hover:bg-[#1D2FC0] dark:hover:text-white dark:data-[state=open]:bg-[#1D2FC0] dark:data-[state=open]:text-white"
            />
            <div className="flex h-[34px] items-center gap-2 rounded-md border border-[#DEE1E6] bg-white px-2.5 focus-within:border-[#1D2FC0] focus-within:ring-1 focus-within:ring-[#1D2FC0]/15 dark:border-border dark:bg-background">
              <Search className="size-3.5 shrink-0 text-[#858A94]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[#071935] outline-none placeholder:text-[#858A94] dark:text-foreground"
                placeholder="Buscar módulo..."
                aria-label="Buscar módulo"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="text-[#858A94] hover:text-[#071935]" aria-label="Limpiar búsqueda">
                  <CircleX className="size-3.5" />
                </button>
              ) : (
                <kbd className="whitespace-nowrap text-[9px] text-[#858A94]">Ctrl K</kbd>
              )}
            </div>
          </div>
        )}

        {!showExpandedContent && (
          <div className="shrink-0 border-b border-[#E2E4E8] py-1 dark:border-border">
            <NotificationMenu
              title="Notificaciones (Ctrl+J)"
              dropdownSide="right"
              dropdownAlign="start"
              buttonClassName="mx-1.5 rounded-md bg-[#EEF0FF] text-[#1D2FC0] hover:bg-[#1D2FC0] hover:text-white data-[state=open]:bg-[#1D2FC0] data-[state=open]:text-white dark:bg-[#1D2FC0]/10 dark:text-[#1D2FC0] dark:hover:bg-[#1D2FC0] dark:hover:text-white dark:data-[state=open]:bg-[#1D2FC0] dark:data-[state=open]:text-white"
            />
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:hidden">
          <nav className="flex flex-col pb-2" aria-label="Navegación principal" style={{ width: navWidth }}>
            {navGroups.map((group) => {
              const rootMatches = !normalizedQuery || matchesQuery(group.rootLabel, normalizedQuery)
              const matchingItems = normalizedQuery
                ? group.items.filter((item) => matchesQuery(item.label, normalizedQuery))
                : group.items
              const visibleItems = rootMatches ? group.items : matchingItems
              const forcedOpen = Boolean(normalizedQuery)
              const isOpen = forcedOpen || !(collapsedGroups[group.key] ?? false)

              if (normalizedQuery && !rootMatches && matchingItems.length === 0) return null

              return showExpandedContent ? (
                <SidebarSection
                  key={group.key}
                  group={group}
                  items={visibleItems}
                  pathname={pathname}
                  open={isOpen}
                  forcedOpen={forcedOpen}
                  onToggle={() => toggleGroup(group.key)}
                  onNavigate={closeMobile}
                />
              ) : (
                <CompactSection key={group.key} group={group} pathname={pathname} onNavigate={closeMobile} />
              )
            })}
            {showExpandedContent && normalizedQuery && !navGroups.some((group) =>
              matchesQuery(group.rootLabel, normalizedQuery) || group.items.some((item) => matchesQuery(item.label, normalizedQuery))
            ) && (
              <div className="px-3 py-8 text-center text-[11px] text-[#858A94]">No se encontraron módulos</div>
            )}
          </nav>
        </ScrollArea>

        <div className="h-[54px] shrink-0 border-t border-[#E2E4E8] bg-[#FBFBFB] p-1.5 dark:border-border dark:bg-background">
          <UserMenu sidebar compact={!showExpandedContent} className="h-full w-full" />
        </div>
      </aside>
    </>
  )
}

import { motion, AnimatePresence } from "framer-motion"

function SidebarSection({ group, items, pathname, open, forcedOpen, onToggle, onNavigate }: {
  group: NavGroup
  items: NavItem[]
  pathname: string
  open: boolean
  forcedOpen: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  const RootIcon = group.rootIcon
  const rootActive = isPathActive(pathname, group.rootHref)

  return (
    <section className="mt-2.5 first:mt-0" aria-labelledby={`sidebar-${group.key}`}>
      <div id={`sidebar-${group.key}`} className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#838791]">
        {group.title}
      </div>
      <div className="px-1.5">
        <div className={cn("relative flex h-8 items-center rounded-md transition-colors", rootActive ? "bg-[#EEF0FF] text-[#071935]" : "text-[#454B55] hover:bg-[#F3F3F3] dark:text-foreground dark:hover:bg-accent")}>
          {rootActive && (
            <motion.span
              layoutId="active-sidebar-indicator"
              className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-[#1D2FC0]"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          {group.rootHref ? (
            <Link
              href={group.rootHref}
              prefetch={false}
              onClick={onNavigate}
              aria-current={rootActive ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 px-2.5 text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1D2FC0]/35 transition-transform hover:translate-x-0.5"
            >
              <RootIcon className={cn("size-[15px] shrink-0 transition-colors", rootActive ? "text-[#1D2FC0]" : "text-[#717680]")} strokeWidth={1.7} />
              <span className={cn("truncate", rootActive && "font-semibold")}>{group.rootLabel}</span>
            </Link>
          ) : (
            <button type="button" onClick={onToggle} disabled={forcedOpen} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1D2FC0]/35 disabled:cursor-default transition-transform hover:translate-x-0.5">
              <RootIcon className="size-[15px] shrink-0 text-[#717680]" strokeWidth={1.7} />
              <span className="truncate">{group.rootLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            disabled={forcedOpen}
            className="mr-1 flex size-7 shrink-0 items-center justify-center rounded text-[#777C85] hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2FC0]/35 disabled:cursor-default disabled:opacity-60 transition-colors"
            aria-label={forcedOpen ? `${group.rootLabel} expandido durante la búsqueda` : `${open ? "Contraer" : "Expandir"} ${group.rootLabel}`}
            aria-expanded={open}
          >
            <motion.span
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="inline-flex items-center justify-center pointer-events-none"
            >
              <ChevronRight className="size-[13px]" />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="relative ml-[17px] border-l border-[#D9DCE3] py-0.5 dark:border-border">
                {items.map((item) => (
                  <TreeNavItem key={item.href} item={item} active={isPathActive(pathname, item.href)} onNavigate={onNavigate} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

function TreeNavItem({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative ml-1.5 flex h-[29px] items-center rounded-md pl-[17px] pr-2 text-[12px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1D2FC0]/35 hover:translate-x-0.5",
        active ? "bg-[#EEF0FF] font-semibold text-[#071935]" : "text-[#5F6570] hover:bg-[#F3F3F3] hover:text-[#071935] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
      )}
    >
      <span aria-hidden="true" className="absolute -left-[7px] top-0 h-1/2 w-[13px] rounded-bl border-b border-l border-[#D9DCE3] dark:border-border pointer-events-none" />
      {active && (
        <motion.span
          layoutId="active-sidebar-indicator"
          className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-[#1D2FC0]"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function CompactSection({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate: () => void }) {
  const items = group.rootHref
    ? [{ label: group.rootLabel, href: group.rootHref, icon: group.rootIcon }, ...group.items]
    : group.items

  return (
    <div className="border-b border-[#E2E4E8] py-1 last:border-b-0 dark:border-border">
      {items.map((item) => {
        const Icon = item.icon
        const active = isPathActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative mx-1.5 flex h-8 items-center justify-center rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1D2FC0]/35 hover:scale-105 active:scale-95",
              active ? "bg-[#EEF0FF] text-[#1D2FC0]" : "text-[#717680] hover:bg-[#F3F3F3] hover:text-[#071935] dark:hover:bg-accent dark:hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="active-compact-sidebar-indicator"
                className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-[#1D2FC0]"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <Icon className="size-[17px]" strokeWidth={1.7} />
          </Link>
        )
      })}
    </div>
  )
}

