"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "./app-shell"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthProvider"
import { getCoordinationDestination } from "@/lib/permissions/coordination"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  Scissors,
  FolderOpen,
  FileText,
  Receipt,
  FileMinus,
  FilePlus,
  CreditCard,
  Link2,
  Package,
  Box,
  Truck,
  Activity,
  MapPin,
  ArrowRightLeft,
  Stethoscope,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
  Building2,
  BarChart3,
  Banknote,
  ArrowLeftRight,
  FileCheck,
  Search,
  BookOpen,
  Tags,
  PieChart,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  EyeOff,
  Users,
  Settings,
  CalendarDays,
  Kanban,
  BarChart2,
} from "lucide-react"

// ─────────────────────────────────────────
// Navigation Data
// ─────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  /** Short label for compact mode (optional) */
  shortLabel?: string
}

interface NavGroup {
  title: string
  key: string
  shortTitle?: string
  /** Tailwind color classes for the area indicator */
  color: string
  colorBg: string
  colorBorder: string
  items: NavItem[]
  compactBehavior?: "items" | "marker"
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "PRINCIPAL",
    key: "principal",
    color: "text-blue-600",
    colorBg: "bg-blue-500",
    colorBorder: "border-blue-400",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Cirugías", href: "/cirugias", icon: Scissors },
      { label: "Contactos", href: "/contactos", icon: Users, shortLabel: "Contactos" },
      { label: "Expediente", href: "/expediente", icon: FolderOpen },
      { label: "Coordinación", href: "/coordinadores", icon: Users, shortLabel: "Coord." },
      { label: "Calendario", href: "/calendario", icon: CalendarDays, shortLabel: "Calend." },
      { label: "Tableros", href: "/tableros-operativos", icon: Kanban, shortLabel: "Tableros" },
    ],
  },
  {
    title: "VENTAS",
    key: "ventas",
    color: "text-green-600",
    colorBg: "bg-green-500",
    colorBorder: "border-green-400",
    items: [
      { label: "Presupuestos", href: "/ventas/presupuestos", icon: FileText },
      { label: "Facturación", href: "/ventas/facturacion", icon: Receipt },
      { label: "Notas Crédito", href: "/ventas/notas-credito", icon: FileMinus, shortLabel: "NC" },
      { label: "Notas Débito", href: "/ventas/notas-debito", icon: FilePlus, shortLabel: "ND" },
       { label: "Cobros", href: "/ventas/cobros", icon: CreditCard },
       { label: "Recibos", href: "/ventas/recibos", icon: FileCheck },
       { label: "Comprobantes", href: "/ventas/comprobantes", icon: Link2, shortLabel: "Comp." },
    ],
  },
  {
    title: "OPERACIONES",
    key: "operaciones",
    color: "text-sky-600",
    colorBg: "bg-sky-500",
    colorBorder: "border-sky-400",
    items: [
      { label: "Stock", href: "/stock", icon: Package },
      { label: "Cajas", href: "/cajas", icon: Box },
      { label: "Remitos", href: "/remitos", icon: Truck },
      { label: "Consumo", href: "/consumo", icon: Activity },
      { label: "Logística", href: "/logistica", icon: MapPin },
      { label: "Mat. en Tránsito", href: "/material-transito", icon: ArrowRightLeft, shortLabel: "Tránsito" },
      { label: "Instrumentadores", href: "/instrumentadores", icon: Stethoscope, shortLabel: "Instrum." },
      { label: "Vencimientos", href: "/vencimientos", icon: AlertTriangle, shortLabel: "Venc." },
    ],
  },
  {
    title: "COMPRAS",
    key: "compras",
    color: "text-orange-600",
    colorBg: "bg-orange-500",
    colorBorder: "border-orange-400",
    items: [
      { label: "Nec. de Compra", href: "/compras/necesidades-compra", icon: ShoppingCart, shortLabel: "Nec.Comp." },
      { label: "Órd. de Compra", href: "/compras/ordenes-compra", icon: ClipboardList, shortLabel: "OC" },
      { label: "Proveedores", href: "/compras/proveedores", icon: Building2 },
      { label: "Forecast", href: "/compras/forecast", icon: BarChart3 },
      { label: "Órd. de Pago", href: "/compras/ordenes-pago", icon: Banknote, shortLabel: "OP" },
      { label: "Mov. Compra", href: "/compras/movimientos", icon: ArrowLeftRight, shortLabel: "Mov.Comp." },
      { label: "Facturas Compra", href: "/compras/facturas-compra", icon: FileCheck, shortLabel: "FC" },
    ],
  },
  {
    title: "SISTEMA",
    key: "sistema",
    color: "text-gray-500",
    colorBg: "bg-gray-500",
    colorBorder: "border-gray-400",
    items: [
      { label: "Estadísticas", href: "/estadisticas", icon: BarChart2, shortLabel: "Estad." },
      { label: "Trazabilidad", href: "/trazabilidad", icon: Search },
      { label: "Documentación", href: "/documentacion", icon: BookOpen, shortLabel: "Docs." },
      { label: "Clasificaciones", href: "/clasificaciones", icon: Tags },
      { label: "Reportes", href: "/reportes", icon: PieChart },
      { label: "Roles", href: "/roles", icon: Shield },
      { label: "Usuarios", href: "/usuarios", icon: Users },
      { label: "Auditoría", href: "/auditoria", icon: Shield },
      { label: "Configuración", href: "/configuracion", icon: Settings },
    ],
  },
]

const CIRUGIAS_PRIMARY_LABELS = [
  "Cirugías",
  "Expediente",
  "Contactos",
  "Coordinación",
  "Calendario",
  "Tableros",
] as const

const CIRUGIAS_SECONDARY_GROUP_KEYS = new Set([
  "cirugias-commercial",
  "cirugias-operations",
  "cirugias-purchases",
  "cirugias-admin",
])

const CIRUGIAS_SCROLLAREA_CLASSNAME = [
  "[&_[data-slot=scroll-area-viewport]]:pr-1.5",
  "[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:w-2",
  "[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:rounded-full",
  "[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:bg-foreground/[0.045]",
  "[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:p-px",
  "[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:transition-colors",
  "[&_[data-slot=scroll-area-thumb]]:rounded-full",
  "[&_[data-slot=scroll-area-thumb]]:bg-foreground/28",
  "[&_[data-slot=scroll-area-thumb]]:ring-1",
  "[&_[data-slot=scroll-area-thumb]]:ring-background/75",
  "[&_[data-slot=scroll-area-thumb]]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
  "hover:[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:bg-foreground/[0.075]",
  "hover:[&_[data-slot=scroll-area-thumb]]:bg-foreground/42",
].join(" ")

function pickItemsByLabel(labels: readonly string[]): NavItem[] {
  const items = NAV_GROUPS.flatMap((group) => group.items)
  return labels
    .map((label) => items.find((item) => item.label === label))
    .filter((item): item is NavItem => Boolean(item))
}

function getCirugiasNavGroups(): NavGroup[] {
  const primaryItems = pickItemsByLabel(CIRUGIAS_PRIMARY_LABELS)
  const ventasGroup = NAV_GROUPS.find((group) => group.key === "ventas")
  const operacionesGroup = NAV_GROUPS.find((group) => group.key === "operaciones")
  const comprasGroup = NAV_GROUPS.find((group) => group.key === "compras")
  const sistemaGroup = NAV_GROUPS.find((group) => group.key === "sistema")
  const dashboardItem = NAV_GROUPS.find((group) => group.key === "principal")?.items.find((item) => item.label === "Dashboard")

  return [
    {
      title: "PRINCIPAL",
      key: "cirugias-primary",
      color: "text-blue-600",
      colorBg: "bg-blue-500",
      colorBorder: "border-blue-400",
      items: primaryItems,
      compactBehavior: "items",
    },
    {
      title: "COMERCIAL",
      key: "cirugias-commercial",
      shortTitle: "Comercial",
      color: "text-green-600",
      colorBg: "bg-green-500",
      colorBorder: "border-green-400",
      items: [dashboardItem, ...(ventasGroup?.items ?? [])].filter((item): item is NavItem => Boolean(item)),
      compactBehavior: "marker",
    },
    {
      title: "OPERACIÓN",
      key: "cirugias-operations",
      shortTitle: "Operación",
      color: "text-sky-600",
      colorBg: "bg-sky-500",
      colorBorder: "border-sky-400",
      items: operacionesGroup?.items ?? [],
      compactBehavior: "marker",
    },
    {
      title: "COMPRAS",
      key: "cirugias-purchases",
      shortTitle: "Compras",
      color: "text-orange-600",
      colorBg: "bg-orange-500",
      colorBorder: "border-orange-400",
      items: comprasGroup?.items ?? [],
      compactBehavior: "marker",
    },
    {
      title: "ADMINISTRACIÓN",
      key: "cirugias-admin",
      shortTitle: "Administración",
      color: "text-gray-500",
      colorBg: "bg-gray-500",
      colorBorder: "border-gray-400",
      items: sistemaGroup?.items ?? [],
      compactBehavior: "marker",
    },
  ]
}

// ─────────────────────────────────────────
// Width constants
// ─────────────────────────────────────────

const SIDEBAR_WIDTH_EXPANDED = "200px"
const SIDEBAR_WIDTH_COMPACT = "64px"

// ─────────────────────────────────────────
// Sidebar Component
// ─────────────────────────────────────────

export function Sidebar({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname()
  const { currentAccess } = useAuth()
  const { sidebarState, setSidebarState, collapsedGroups, toggleGroup } = useSidebar()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isCirugiasRoute = pathname.startsWith("/cirugias")

  const isExpanded = sidebarState === "expanded"
  const isCompact = sidebarState === "compact"
  const isHidden = sidebarState === "hidden"
  const navGroups = React.useMemo(
    () => (isCirugiasRoute ? getCirugiasNavGroups() : NAV_GROUPS).map((group) => ({
      ...group,
      items: group.items.map((item) => item.label === "Coordinación"
        ? { ...item, href: getCoordinationDestination(currentAccess?.role) }
        : item),
    })),
    [currentAccess?.role, isCirugiasRoute]
  )
  const desktopWidth = isHidden ? 0 : isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COMPACT
  const currentWidth = mobileOpen ? SIDEBAR_WIDTH_EXPANDED : desktopWidth
  const navWidth = mobileOpen || isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COMPACT

  // Close mobile drawer on navigation
  const handleNavClick = () => setMobileOpen(false)

  return (
    <>
      {/* ─── Mobile hamburger button ─── */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </Button>

      {/* ─── Desktop hamburger when hidden ─── */}
      {isHidden && (
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "fixed left-3 top-3 z-40 hidden h-9 items-center gap-2 border-border/80 bg-background/92 pl-2 pr-3 text-[11px] font-medium shadow-sm backdrop-blur lg:flex",
            isCirugiasRoute && "border-border bg-muted/95 text-foreground"
          )}
          onClick={() => setSidebarState("compact")}
          aria-label="Mostrar menú"
        >
          <PanelLeftOpen className="size-3.5" />
          <span>Menú</span>
        </Button>
      )}

      {/* ─── Mobile overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
        <aside
        style={{
          width: currentWidth,
        }}
          className={cn(
             "z-40 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
             embedded
               ? "fixed inset-y-0 left-0 border-r border-border/70 bg-muted/55 shadow-none lg:relative lg:inset-auto lg:h-full lg:border-0 lg:border-r lg:bg-transparent"
               : "fixed bottom-2 left-2 top-2 h-auto border border-border/60 bg-background/95 shadow-sm backdrop-blur-md",
             !embedded && (isCirugiasRoute
               ? "bottom-1 left-1 top-1 rounded-2xl border-border/70 bg-muted/80 shadow-none"
               : "rounded-[22px]"),
             embedded && "lg:rounded-none lg:backdrop-blur-none",
             mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
           )}
        >
        {/* ─── Logo area ─── */}
          <div className={cn(
            "flex h-12 shrink-0 items-center border-b border-border/60",
            isCirugiasRoute && "border-border/70 bg-background/55",
            isExpanded ? "gap-2.5 px-3" : "justify-center px-0"
          )}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Scissors className="size-3.5" />
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="truncate text-[12px] font-semibold leading-tight text-foreground/90">OrtoTrack</span>
              <span className="truncate text-[9px] uppercase tracking-[0.14em] text-muted-foreground leading-tight">ERP v2.3</span>
            </div>
          )}
        </div>

        {/* ─── Navigation ─── */}
        <ScrollArea className={cn("min-h-0 flex-1", isCirugiasRoute && CIRUGIAS_SCROLLAREA_CLASSNAME)}>
          <nav className={cn("flex flex-col py-2", isCirugiasRoute && "gap-1 py-1.5")} aria-label="Navegación principal" style={{ width: navWidth }}>
            {navGroups.map((group, gi) => {
              const defaultCollapsed = isCirugiasRoute && group.compactBehavior === "marker"
              const isGroupCollapsed = collapsedGroups[group.key] ?? defaultCollapsed
              const hasActiveItem = group.items.some((item) => pathname === item.href)
              const showCompactMarker = !isCompact || group.compactBehavior === "marker" || !isCirugiasRoute
              const showCompactItems = !isCompact || group.compactBehavior !== "marker"
              const isCirugiasSecondaryGroup = isCirugiasRoute && CIRUGIAS_SECONDARY_GROUP_KEYS.has(group.key)
              const activeCompactItem = isCompact && group.compactBehavior === "marker"
                ? group.items.find((item) => pathname === item.href)
                : undefined

              return (
                <React.Fragment key={group.key}>
                  {/* Category header */}
                  {isExpanded ? (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className={cn(
                        "flex w-full items-center gap-1.5 px-3 py-1 text-[9px] font-semibold tracking-[0.08em] uppercase select-none transition-colors",
                        group.color,
                        "hover:opacity-80",
                        isCirugiasSecondaryGroup && "mx-1 w-auto rounded-md border border-border/40 bg-background/40 px-2.5 py-0.5 shadow-sm hover:bg-background/65",
                        gi > 0 && "mt-1"
                      )}
                    >
                      <span className={cn(
                        "size-1.5 rounded-full shrink-0",
                        group.colorBg,
                        isCirugiasSecondaryGroup && "size-2"
                      )} />
                        <span className={cn(
                          "truncate flex-1 text-left",
                          isCirugiasSecondaryGroup && "text-[9px] tracking-[0.03em] text-foreground/82"
                        )}>
                        {group.shortTitle ?? group.title}
                      </span>
                      {isCirugiasSecondaryGroup && (
                          <span className="rounded-full border border-border/35 bg-background/85 px-1.5 py-px text-[8px] font-medium tracking-normal text-muted-foreground shadow-sm">
                            {group.items.length}
                          </span>
                      )}
                      {isGroupCollapsed ? (
                        <ChevronRight className="size-2.5 shrink-0 opacity-50" />
                      ) : (
                        <ChevronDown className="size-2.5 shrink-0 opacity-50" />
                      )}
                    </button>
                  ) : (
                    showCompactMarker ? (
                      <CompactGroupMarker
                        group={group}
                        hasActiveItem={hasActiveItem}
                        showDivider={gi > 0}
                      />
                    ) : null
                  )}

                  {/* Items — hidden when group is collapsed in expanded mode */}
                  {showCompactItems && !(isExpanded && isGroupCollapsed) && group.items.map((item) => {
                    const isActive = pathname === item.href

                    return isCompact ? (
                      <CompactNavItem
                        key={item.href}
                        item={item}
                        isActive={isActive}
                        isCirugiasRoute={isCirugiasRoute}
                        onClick={handleNavClick}
                      />
                    ) : (
                      <ExpandedNavItem
                        key={item.href}
                        item={item}
                        isActive={isActive}
                        isCirugiasRoute={isCirugiasRoute}
                        showIcon={!isCirugiasSecondaryGroup}
                        onClick={handleNavClick}
                      />
                    )
                  })}

                  {activeCompactItem && (
                    <CompactNavItem
                      key={`${group.key}-active`}
                      item={activeCompactItem}
                      isActive
                      isCirugiasRoute={isCirugiasRoute}
                      onClick={handleNavClick}
                    />
                  )}

                  {/* When group is collapsed in expanded mode, show count indicator */}
                  {isExpanded && isGroupCollapsed && (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className={cn(
                        "mx-3 mb-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-muted-foreground/60",
                        "hover:bg-muted/30 hover:text-muted-foreground transition-colors"
                      )}
                    >
                      <ChevronRight className="size-2.5" />
                      <span>{group.items.length} ítems</span>
                      {hasActiveItem && <span className="size-1.5 rounded-full bg-primary" />}
                    </button>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        </ScrollArea>

        {/* ─── Bottom controls ─── */}
        <div className={cn("shrink-0 border-t", isCirugiasRoute && "border-border/70 bg-background/45")}>
          {isExpanded ? (
            <div className="flex items-center gap-1 px-2 py-2">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 flex-1 justify-start gap-1.5 text-[11px] text-muted-foreground hover:text-foreground",
                  isCirugiasRoute && "hover:bg-accent/55"
                )}
                onClick={() => setSidebarState("compact")}
                aria-label="Compactar menú"
              >
                <PanelLeftClose className="size-3.5 shrink-0" />
                Compactar
              </Button>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7 shrink-0 text-muted-foreground hover:text-foreground",
                      isCirugiasRoute && "hover:bg-accent/55"
                    )}
                    onClick={() => setSidebarState("hidden")}
                    aria-label="Ocultar menú"
                  >
                    <EyeOff className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">Ocultar</TooltipContent>
              </Tooltip>
            </div>
          ) : isCompact ? (
            <div className="flex flex-col items-center gap-0.5 py-1.5">
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7 text-muted-foreground hover:text-foreground",
                      isCirugiasRoute && "hover:bg-accent/55"
                    )}
                    onClick={() => setSidebarState("expanded")}
                    aria-label="Expandir menú"
                  >
                    <PanelLeftOpen className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">Expandir</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7 text-muted-foreground hover:text-foreground",
                      isCirugiasRoute && "hover:bg-accent/55"
                    )}
                    onClick={() => setSidebarState("hidden")}
                    aria-label="Ocultar menú"
                  >
                    <EyeOff className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">Ocultar</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}

// ─────────────────────────────────────────
// Expanded Nav Item
// ─────────────────────────────────────────

function ExpandedNavItem({
  item,
  isActive,
  isCirugiasRoute,
  showIcon = true,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  isCirugiasRoute?: boolean
  showIcon?: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 px-3 py-[6px] text-[12px] transition-all duration-150",
        isCirugiasRoute ? "mx-1 rounded-md" : "rounded-r-md",
        isCirugiasRoute && !showIcon && "gap-2 pl-4 pr-3 py-[5px] text-[11px]",
        "hover:bg-accent/60 hover:text-accent-foreground",
        isActive
          ? cn(
              "border-l-[3px] border-primary font-semibold text-primary",
              isCirugiasRoute ? "bg-primary/12 shadow-sm ring-1 ring-primary/10" : "bg-primary/8"
            )
          : "text-muted-foreground border-l-[3px] border-transparent"
      )}
    >
      {showIcon ? (
        <Icon className={cn(
          "size-[15px] shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-muted-foreground"
        )} />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full transition-colors",
            isActive ? "bg-primary/75" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/45"
          )}
        />
      )}
      <span className={cn("truncate leading-tight", isActive && "text-foreground")}>{item.label}</span>
      {isActive && (
        <span className="ml-auto size-1.5 shrink-0 rounded-full bg-primary/60" />
      )}
    </Link>
  )
}

function CompactGroupMarker({
  group,
  hasActiveItem,
  showDivider,
}: {
  group: NavGroup
  hasActiveItem: boolean
  showDivider: boolean
}) {
  return (
    <>
      {showDivider && (
        <div className={cn("mx-2 my-1.5 border-t", group.colorBorder, "opacity-25")} />
      )}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            aria-hidden="true"
            className="flex items-center justify-center py-1"
          >
            <span
              className={cn(
                "size-1.5 rounded-full opacity-70 shadow-[0_0_0_3px_transparent] transition-all",
                group.colorBg,
                hasActiveItem && "opacity-100 shadow-[0_0_0_3px_hsl(var(--background))]"
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-[11px] font-medium">
          {group.title}
        </TooltipContent>
      </Tooltip>
    </>
  )
}

// ─────────────────────────────────────────
// Compact Nav Item (icon only + tooltip)
// ─────────────────────────────────────────

function CompactNavItem({
  item,
  isActive,
  isCirugiasRoute,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  isCirugiasRoute?: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          prefetch={false}
          onClick={onClick}
          aria-label={item.label}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative mx-1.5 my-[1px] flex items-center justify-center rounded-md py-[7px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isCirugiasRoute && "mx-1",
            "hover:bg-accent/60 hover:text-accent-foreground",
            isActive
              ? cn("text-primary", isCirugiasRoute ? "bg-primary/12 shadow-sm ring-1 ring-primary/10" : "bg-primary/10")
              : "text-muted-foreground/70"
          )}
        >
          <Icon className={cn(
            "size-[17px] shrink-0",
            isActive ? "text-primary" : "text-muted-foreground/70"
          )} />
          <span className="sr-only">{item.label}</span>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-primary" />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="text-[11px] font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}
