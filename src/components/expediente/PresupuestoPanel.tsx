"use client"

import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Receipt, FileText, Printer, Edit, ShoppingCart, ShieldCheck,
  Plus, AlertCircle, Lock, Calendar, User, Building2, Coins,
  Info, Package,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { PresupuestoFormDialog } from "@/components/presupuestos/PresupuestoFormDialog"
import type { Surgery, Presupuesto, PresupuestoItem, PresupuestoState } from "@/types"

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface PresupuestoPanelProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  onOpenPresupuestoDialog?: (surgery: Surgery) => void  // Kept for backward compat but no longer used internally
}

// ═══════════════════════════════════════════════════════════════
// STATE BADGE COLORS
// ═══════════════════════════════════════════════════════════════

const PR_STATE_BADGE: Record<PresupuestoState, { variant: "warning" | "info" | "success" | "destructive"; className: string }> = {
  Borrador:   { variant: "warning",    className: "bg-amber-100 text-amber-800 border-amber-300" },
  Enviado:    { variant: "info",       className: "bg-blue-100 text-blue-800 border-blue-300" },
  Aprobado:   { variant: "success",    className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  Rechazado:  { variant: "destructive", className: "bg-red-100 text-red-800 border-red-300" },
}

const PR_STATE_DOT: Record<PresupuestoState, string> = {
  Borrador:  "bg-amber-500",
  Enviado:   "bg-blue-500",
  Aprobado:  "bg-emerald-500",
  Rechazado: "bg-red-500",
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getStateBadge(state: PresupuestoState) {
  const config = PR_STATE_BADGE[state]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-none", config.className)}>
      <span className={cn("size-1.5 rounded-full", PR_STATE_DOT[state])} />
      {state}
    </span>
  )
}

function computeItemSubtotal(item: PresupuestoItem): number {
  if (item.subtotal) return item.subtotal
  return item.quantity * item.unitPrice
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function DetailRow({ icon: Icon, label, value, mono }: {
  icon: React.ElementType; label: string; value: React.ReactNode; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn("text-xs font-medium mt-0.5", mono && "font-mono")}>{value || "—"}</p>
      </div>
    </div>
  )
}

function PresupuestoCard({
  pr,
  surgery,
}: {
  pr: Presupuesto
  surgery: Surgery
}) {
  const isApproved = pr.state === "Aprobado"
  const isDraft = pr.state === "Borrador"
  const isRejected = pr.state === "Rechazado"
  const isLocked = pr.bloqueado

  const itemsTotal = useMemo(
    () => pr.items.reduce((sum, item) => sum + computeItemSubtotal(item), 0),
    [pr.items]
  )

  const articuloZCount = pr.items.filter(i => i.isArticuloZ).length

  return (
    <div className="rounded-lg border bg-card">
      {/* ── Card Header ── */}
      <div className="px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-muted">
              <Receipt className="size-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold font-mono">{pr.id}</span>
                {getStateBadge(pr.state)}
                {isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="size-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Presupuesto bloqueado</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Creado el {formatDate(pr.createdAt)}
                {pr.approvedAt && ` · Aprobado el ${formatDate(pr.approvedAt)}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monto presupuestado</p>
            <p className="text-base font-bold">{formatCurrency(pr.total)}</p>
          </div>
        </div>
      </div>

      {/* ── Details Grid ── */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1">
          <DetailRow icon={FileText} label="ID Presupuesto" value={pr.id} mono />
          <DetailRow icon={User} label="Cliente / Obra Social" value={pr.obraSocial || pr.client} />
          <DetailRow icon={Building2} label="Financiador" value={pr.financiador} />
          <DetailRow icon={Calendar} label="Vigencia" value={pr.vigencia} />
          <DetailRow icon={User} label="Vendedor" value={pr.vendedor} />
          <DetailRow icon={Coins} label="Lista de precios" value={pr.listaPrecios} mono />
        </div>

        {articuloZCount > 0 && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-md border border-amber-200 bg-amber-50">
            <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800">
              Este presupuesto contiene <span className="font-semibold">{articuloZCount} artículo{articuloZCount > 1 ? "s" : ""} Z flexible</span>
              {articuloZCount > 1 ? "s" : ""}. Los artículos Z pueden variar al momento de la cirugía.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Items Table ── */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Detalle de artículos
          </h4>
          <Badge variant="outline" className="text-[10px]">
            {pr.items.length} artículo{pr.items.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[10px] h-8 w-12">#</TableHead>
                <TableHead className="text-[10px] h-8">Código</TableHead>
                <TableHead className="text-[10px] h-8">Artículo</TableHead>
                <TableHead className="text-[10px] h-8 text-right w-16">Cant.</TableHead>
                <TableHead className="text-[10px] h-8 text-right w-28">Precio unit.</TableHead>
                <TableHead className="text-[10px] h-8 text-right w-28">Subtotal</TableHead>
                <TableHead className="text-[10px] h-8 w-20 text-center">Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pr.items.map((item, idx) => (
                <TableRow key={`${item.stockItemId}-${idx}`} className="group">
                  <TableCell className="py-2 text-[10px] text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs font-mono font-medium">{item.code}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[240px]">{item.name}</p>
                      {item.isArticuloZ && item.descripcionLibre && (
                        <p className="text-[10px] text-amber-700 mt-0.5 truncate max-w-[240px]">
                          {item.descripcionLibre}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="py-2 text-xs text-right tabular-nums">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-right font-medium tabular-nums">
                    {formatCurrency(computeItemSubtotal(item))}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    {item.isArticuloZ ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 cursor-default">
                              Art. Z
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Artículo Z flexible</p>
                            <p className="text-[10px] text-muted-foreground">
                              Puede variar al momento de la cirugía
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Estándar</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableCell colSpan={5} className="text-xs font-semibold text-right py-2.5">
                  Total presupuestado
                </TableCell>
                <TableCell className="text-sm font-bold text-right py-2.5 tabular-nums">
                  {formatCurrency(itemsTotal)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>

      {/* ── Observaciones ── */}
      {pr.observaciones && (
        <>
          <Separator />
          <div className="px-4 py-3">
            <div className="flex items-start gap-2">
              <Info className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Observaciones
                </p>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {pr.observaciones}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* ── Action Buttons ── */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <FileText className="size-3.5" />
            Abrir
          </Button>

          {!isLocked && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={isRejected}>
              <Edit className="size-3.5" />
              Editar
            </Button>
          )}

          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Printer className="size-3.5" />
            Imprimir
          </Button>

          {isApproved && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <ShoppingCart className="size-3.5" />
              Generar pedido
            </Button>
          )}

          {isApproved && !surgery.autorizado && (
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <ShieldCheck className="size-3.5" />
              Autorizar CX
            </Button>
          )}
        </div>

        {/* Contextual hints */}
        {isDraft && (
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <AlertCircle className="size-3" />
            El presupuesto está en borrador. Debe enviarlo para que el cliente lo apruebe.
          </p>
        )}
        {isRejected && (
          <p className="text-[10px] text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="size-3" />
            El presupuesto fue rechazado. Puede generar uno nuevo o editar y reenviar.
          </p>
        )}
        {isApproved && surgery.autorizado && (
          <p className="text-[10px] text-emerald-700 mt-2 flex items-center gap-1">
            <ShieldCheck className="size-3" />
            La cirugía ya se encuentra autorizada.
          </p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

function EmptyState({ surgery, onOpenForm }: { surgery: Surgery; onOpenForm: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
        <Receipt className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1">Sin presupuesto generado</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-5">
        Genere un presupuesto (PR) para esta cirugía para registrar los artículos, precios y enviarlo a aprobación del cliente.
      </p>
      <Button
        size="sm"
        className="h-9 gap-2 text-xs"
        onClick={onOpenForm}
      >
        <Plus className="size-4" />
        Generar PR
      </Button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function PresupuestoPanel({
  surgery,
  presupuestos,
  onOpenPresupuestoDialog: _onOpenPresupuestoDialog,
}: PresupuestoPanelProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false)

  // Summary stats
  const stats = useMemo(() => {
    const total = presupuestos.reduce((sum, pr) => sum + pr.total, 0)
    const approved = presupuestos.filter(pr => pr.state === "Aprobado").length
    const pending = presupuestos.filter(pr => pr.state === "Enviado" || pr.state === "Borrador").length
    const rejected = presupuestos.filter(pr => pr.state === "Rechazado").length
    const allItems = presupuestos.flatMap(pr => pr.items)
    const articuloZCount = allItems.filter(i => i.isArticuloZ).length
    return { total, approved, pending, rejected, articuloZCount, itemCount: allItems.length }
  }, [presupuestos])

  // Empty state
  if (presupuestos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Presupuesto</h2>
        </div>
        <EmptyState surgery={surgery} onOpenForm={() => setFormDialogOpen(true)} />
        <PresupuestoFormDialog
          mode="dialog"
          context="surgery"
          surgeryId={surgery.id}
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Presupuesto</h2>
          <Badge variant="outline" className="text-[10px]">
            {presupuestos.length} PR{presupuestos.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setFormDialogOpen(true)}
        >
          <Plus className="size-3.5" />
          Nuevo PR
        </Button>
      </div>

      {/* ── Summary Strip ── */}
      <div className="flex items-center gap-6 rounded-md border bg-muted/30 px-4 py-2.5">
        <div className="text-xs">
          <span className="text-muted-foreground">Monto total: </span>
          <span className="font-semibold">{formatCurrency(stats.total)}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Artículos: </span>
          <span className="font-semibold">{stats.itemCount}</span>
        </div>
        {stats.articuloZCount > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Art. Z: </span>
            <span className="font-semibold text-amber-700">{stats.articuloZCount}</span>
          </div>
        )}
        {stats.approved > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Aprobados: </span>
            <span className="font-semibold text-emerald-700">{stats.approved}</span>
          </div>
        )}
        {stats.pending > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Pendientes: </span>
            <span className="font-semibold text-amber-700">{stats.pending}</span>
          </div>
        )}
        {stats.rejected > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Rechazados: </span>
            <span className="font-semibold text-red-600">{stats.rejected}</span>
          </div>
        )}
      </div>

      {/* ── Presupuesto Cards ── */}
      <div className="space-y-4">
        {presupuestos.map(pr => (
          <PresupuestoCard
            key={pr.id}
            pr={pr}
            surgery={surgery}
          />
        ))}
      </div>

      {/* ── Presupuesto Form Dialog ── */}
      <PresupuestoFormDialog
        mode="dialog"
        context="surgery"
        surgeryId={surgery.id}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
      />
    </div>
  )
}
