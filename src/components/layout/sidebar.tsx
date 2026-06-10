"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "./app-shell"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
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
  /** Tailwind color classes for the area indicator */
  color: string
  colorBg: string
  colorBorder: string
  items: NavItem[]
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
      { label: "Coordinadores", href: "/coordinadores", icon: Users, shortLabel: "Coords." },
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

// ─────────────────────────────────────────
// Width constants
// ─────────────────────────────────────────

const SIDEBAR_WIDTH_EXPANDED = "192px" // ~w-48
const SIDEBAR_WIDTH_COMPACT = "60px"

// ─────────────────────────────────────────
// Sidebar Component
// ─────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarState, setSidebarState, collapsedGroups, toggleGroup } = useSidebar()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const isExpanded = sidebarState === "expanded"
  const isCompact = sidebarState === "compact"
  const isHidden = sidebarState === "hidden"

  // Close mobile drawer on navigation
  const handleNavClick = () => setMobileOpen(false)

  return (
    <>
      {/* ─── Mobile hamburger button ─── */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </Button>

      {/* ─── Desktop hamburger when hidden ─── */}
      {isHidden && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-40 hidden lg:flex"
          onClick={() => setSidebarState("compact")}
          aria-label="Mostrar menú"
        >
          <Menu className="size-5" />
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
          width: isHidden ? 0 : isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COMPACT,
        }}
        className={cn(
          "fixed top-0 left-0 z-40 flex h-full flex-col border-r bg-card/95 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* ─── Logo area ─── */}
        <div className={cn(
          "flex h-11 items-center border-b shrink-0",
          isExpanded ? "px-3 gap-2.5" : "justify-center px-0"
        )}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-3.5" />
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="truncate text-[13px] font-bold leading-tight">OrtoTrack</span>
              <span className="truncate text-[9px] text-muted-foreground leading-tight">ERP v2.3</span>
            </div>
          )}
        </div>

        {/* ─── Navigation ─── */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="flex flex-col py-1.5" style={{ width: isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COMPACT }}>
            {NAV_GROUPS.map((group, gi) => {
              const isGroupCollapsed = collapsedGroups[group.key] ?? false
              const hasActiveItem = group.items.some((item) => pathname === item.href)

              return (
                <React.Fragment key={group.key}>
                  {/* Category header */}
                  {isExpanded ? (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className={cn(
                        "flex w-full items-center gap-1.5 px-3 py-1.5 text-[9px] font-semibold tracking-[0.08em] uppercase select-none",
                        group.color,
                        "hover:opacity-80 transition-colors",
                        gi > 0 && "mt-1.5"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full shrink-0", group.colorBg)} />
                      <span className="truncate flex-1 text-left">{group.title}</span>
                      {isGroupCollapsed ? (
                        <ChevronRight className="size-2.5 shrink-0 opacity-50" />
                      ) : (
                        <ChevronDown className="size-2.5 shrink-0 opacity-50" />
                      )}
                    </button>
                  ) : (
                    gi > 0 && (
                      <div className={cn("mx-2 my-1.5 border-t", group.colorBorder, "opacity-30")} />
                    )
                  )}

                  {/* Compact mode: show a tiny colored category indicator */}
                  {isCompact && gi > 0 && (
                    <div className="flex items-center justify-center py-0.5">
                      <span className={cn("size-1.5 rounded-full", group.colorBg, "opacity-60")} />
                    </div>
                  )}

                  {/* Items — hidden when group is collapsed in expanded mode */}
                  {!(isExpanded && isGroupCollapsed) && group.items.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return isCompact ? (
                      <CompactNavItem
                        key={item.href}
                        item={item}
                        isActive={isActive}
                        onClick={handleNavClick}
                      />
                    ) : (
                      <ExpandedNavItem
                        key={item.href}
                        item={item}
                        isActive={isActive}
                        onClick={handleNavClick}
                      />
                    )
                  })}

                  {/* When group is collapsed in expanded mode, show count indicator */}
                  {isExpanded && isGroupCollapsed && (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className={cn(
                        "mx-3 mb-1 flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-muted-foreground/60",
                        "hover:text-muted-foreground hover:bg-muted/30 transition-colors"
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
        <div className="border-t shrink-0">
          {isExpanded ? (
            <div className="flex items-center gap-1 px-2 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-1.5 h-7 text-[11px] text-muted-foreground hover:text-foreground"
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
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
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
                    className="size-7 text-muted-foreground hover:text-foreground"
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
                    className="size-7 text-muted-foreground hover:text-foreground"
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
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-r-md px-3 py-[5px] text-[12px] transition-all duration-150",
        "hover:bg-accent/60 hover:text-accent-foreground",
        isActive
          ? "bg-primary/8 text-primary font-semibold border-l-[3px] border-primary"
          : "text-muted-foreground border-l-[3px] border-transparent"
      )}
    >
      <Icon className={cn(
        "size-3.5 shrink-0 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-muted-foreground"
      )} />
      <span className="truncate leading-tight">{item.label}</span>
      {isActive && (
        <span className="ml-auto size-1.5 shrink-0 rounded-full bg-primary/60" />
      )}
    </Link>
  )
}

// ─────────────────────────────────────────
// Compact Nav Item (icon only + tooltip)
// ─────────────────────────────────────────

function CompactNavItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          onClick={onClick}
          className={cn(
            "flex items-center justify-center rounded-md mx-1.5 my-[1px] py-[6px] transition-all duration-150",
            "hover:bg-accent/60 hover:text-accent-foreground",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground/70"
          )}
        >
          <Icon className={cn(
            "size-4 shrink-0",
            isActive ? "text-primary" : "text-muted-foreground/70"
          )} />
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
