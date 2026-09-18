"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { getBadgeVariant } from "@/lib/statusHelpers"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { formatCurrency, formatDate } from "@/lib/formatters"
import type { ExpiryStatus } from "@/types"
import {
  Search,
  TrendingUp,
  TrendingDown,
  CircleAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Truck,
  Activity,
  BookOpen,
  MapPin,
  Link2,
  StickyNote,
  History,
  ShoppingCart,
  Receipt,
} from "lucide-react"

// ─────────────────────────────────────────
// StateBadge
// ─────────────────────────────────────────
interface StateBadgeProps {
  status: string
  className?: string
}

export function StateBadge({ status, className }: StateBadgeProps) {
  const variant = getBadgeVariant(status)
  return (
    <Badge variant={variant} className={cn("text-[11px]", className)}>
      {status}
    </Badge>
  )
}

// ─────────────────────────────────────────
// StatsCard
// ─────────────────────────────────────────
interface StatsCardProps {
  title: string
  value: string | number
  icon?: React.ElementType
  subtitle?: string
  trend?: { value: number; label: string }
  className?: string
}

export function StatsCard({ title, value, icon: Icon, subtitle, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend.value >= 0 ? (
                <TrendingUp className="size-3 text-emerald-600" />
              ) : (
                <TrendingDown className="size-3 text-red-500" />
              )}
              <span className={trend.value >= 0 ? "text-emerald-600" : "text-red-500"}>
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────
// FilterSelect
// ─────────────────────────────────────────
interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}

export function FilterSelect({ value, onChange, options, className }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// ─────────────────────────────────────────
// SearchInput
// ─────────────────────────────────────────
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = "Buscar...", className }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}

// ─────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────
interface SectionHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// ─────────────────────────────────────────
// ExpiryBadge
// ─────────────────────────────────────────
interface ExpiryBadgeProps {
  status: ExpiryStatus
  className?: string
}

const EXPIRY_CONFIG: Record<ExpiryStatus, { variant: "destructive" | "warning" | "success"; icon: React.ElementType }> = {
  Vencido: { variant: "destructive", icon: XCircle },
  "Próximo a vencer": { variant: "warning", icon: AlertTriangle },
  Correcto: { variant: "success", icon: CheckCircle2 },
}

export function ExpiryBadge({ status, className }: ExpiryBadgeProps) {
  const config = EXPIRY_CONFIG[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className={cn("gap-1 text-[11px]", className)}>
      <Icon className="size-3" />
      {status}
    </Badge>
  )
}

// ─────────────────────────────────────────
// SurgeryDrawer
// ─────────────────────────────────────────
const DRAWER_TABS = [
  { value: "resumen", label: "Resumen", icon: FileText },
  { value: "presupuesto", label: "Presupuesto", icon: Receipt },
  { value: "remitos", label: "Remitos", icon: Truck },
  { value: "consumo", label: "Consumo", icon: Activity },
  { value: "documentacion", label: "Documentación", icon: BookOpen },
  { value: "logistica", label: "Logística", icon: MapPin },
  { value: "comprobantes", label: "Comprobantes", icon: Link2 },
  { value: "notas", label: "Notas", icon: StickyNote },
  { value: "historial", label: "Historial", icon: History },
  { value: "ventas", label: "Ventas/FV", icon: ShoppingCart },
  { value: "compras", label: "Compras", icon: CircleAlert },
] as const

function DrawerPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileText className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        Datos de {label}
      </p>
      <p className="text-xs text-muted-foreground">
        Información disponible cuando la cirugía tenga datos asociados
      </p>
    </div>
  )
}

export function SurgeryDrawer() {
  const { open, selectedSurgeryId, closeExpediente } = useExpedienteDrawer()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeExpediente()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Expediente de Cirugía</DialogTitle>
          <DialogDescription>
            ID: {selectedSurgeryId || "—"} • Expediente completo
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="resumen" className="flex-1 flex flex-col min-h-0 mt-2">
          <div className="px-6">
            <TabsList className="w-full flex-wrap h-auto gap-0.5 p-0.5 bg-muted/50">
              {DRAWER_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-[11px] gap-1 px-2 py-1.5 data-[state=active]:shadow-sm"
                  >
                    <Icon className="size-3" />
                    <span className="hidden xl:inline">{tab.label}</span>
                    <span className="xl:hidden">{tab.label.slice(0, 3)}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 mt-2">
            {DRAWER_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <DrawerPlaceholder label={tab.label} />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <DialogFooter className="px-6 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={closeExpediente}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────
// ConfirmDialog
// ─────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  destructive?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Procesando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
