"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSearch,
  FileText,
  FolderOpen,
  Info,
  Layers,
  Plus,
  Receipt,
  Scale,
  Send,
  ShieldCheck,
  Tag,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react"

import type { InvoiceApiRow } from "@/lib/api/invoices"
import { useDocumentosAjuste } from "@/lib/documentos-ajuste"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { formatDate } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { HelpTip } from "@/components/ui/info-tooltip"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StateBadge } from "@/components/shared"

interface InvoiceDetailDrawerProps {
  invoice: InvoiceApiRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmit?: (invoice: InvoiceApiRow) => void
  onCollect?: (invoice: InvoiceApiRow) => void
  onOpenEvidence?: (invoice: InvoiceApiRow) => void
  onOpenSurgery?: (surgeryId: string) => void
  isEmitting?: boolean
}

function invoiceNumber(invoice: InvoiceApiRow) {
  return invoice.visibleNumber == null ? `Borrador · ${invoice.id.slice(0, 8)}` : `FV ${invoice.visibleNumber}`
}

function referenceOf(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return ""
  const reference = (metadata as Record<string, unknown>).reference
  return typeof reference === "string" ? reference : ""
}

function clientNameOf(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return ""
  const name = (metadata as Record<string, unknown>).clientName
  return typeof name === "string" ? name : ""
}

function fiscalStatusOf(invoice: InvoiceApiRow): { label: string; badgeClass: string; isAuthorized: boolean } {
  const meta = invoice.metadata && typeof invoice.metadata === "object" ? invoice.metadata as Record<string, unknown> : null
  const fiscalDisplayState = meta?.fiscalDisplayState as string | undefined
  const fiscalState = meta?.fiscalState as string | undefined
  const cae = meta?.cae as string | undefined

  if (fiscalDisplayState === "SIMULATED" || fiscalState === "AUTHORIZED" || cae) {
    return {
      label: cae ? `CAE ${cae}` : "Simulada Sandbox",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold",
      isAuthorized: true,
    }
  }
  if (fiscalState === "REJECTED" || fiscalState === "FAILED") {
    return {
      label: "Rechazada AFIP",
      badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold",
      isAuthorized: false,
    }
  }
  if (fiscalState === "PENDING" || fiscalState === "SUBMITTED") {
    return {
      label: "Pendiente",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
      isAuthorized: false,
    }
  }
  return {
    label: "No fiscal",
    badgeClass: "border-slate-300 dark:border-slate-700/80 bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-medium",
    isAuthorized: false,
  }
}

export function InvoiceDetailDrawer({
  invoice,
  open,
  onOpenChange,
  onEmit,
  onCollect,
  onOpenEvidence,
  onOpenSurgery,
  isEmitting = false,
}: InvoiceDetailDrawerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("resumen")
  const { getDocumentosForInvoice, getNetImpactForInvoice } = useDocumentosAjuste()

  if (!invoice) return null

  const client = clientNameOf(invoice.metadata)
  const ref = referenceOf(invoice.metadata)
  const fiscal = fiscalStatusOf(invoice)
  const balanceBigInt = parseDecimalScale4(invoice.balance) ?? BigInt(0)
  const isIssued = invoice.state === "Emitida" || invoice.state === "Parcialmente_cobrada"
  const canCollect = balanceBigInt > BigInt(0) && isIssued

  const relatedAdjustments = getDocumentosForInvoice(invoice.id)
  const netAdjustmentImpact = getNetImpactForInvoice(invoice.id)

  const handleCreateAdjustment = () => {
    onOpenChange(false)
    router.push(`/ventas/documentos-ajuste/nueva/editor?tipo=credito&facturaOrigen=${invoice.id}`)
  }

  const handleViewAdjustments = () => {
    onOpenChange(false)
    router.push(`/ventas/documentos-ajuste?facturaOrigen=${invoice.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md md:max-w-lg p-0 flex flex-col gap-0">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <SheetTitle className="font-mono text-base font-bold text-foreground">
                {invoiceNumber(invoice)}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1.5 mr-6">
              <StateBadge status={invoice.state} />
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${fiscal.badgeClass}`}>
                {fiscal.label}
              </Badge>
            </div>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-0.5">
            {ref ? `Referencia: ${ref} • ` : ""}
            Creado el {formatDate(invoice.createdAt)}
          </SheetDescription>
        </SheetHeader>

        {/* Resumen Financiero Destacado */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 border-b text-center">
          <div className="rounded-md border bg-card p-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total</span>
            <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
              {formatDecimalCurrency(invoice.total)}
            </span>
          </div>
          <div className="rounded-md border bg-card p-2">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Cobrado</span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {formatDecimalCurrency(invoice.paidTotal)}
            </span>
          </div>
          <div className="rounded-md border bg-card p-2">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Saldo</span>
            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
              {formatDecimalCurrency(invoice.balance)}
            </span>
          </div>
        </div>

        {/* Barra de Acciones Principales */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-card">
          {invoice.state === "Borrador" && onEmit ? (
            <Button
              size="sm"
              disabled={isEmitting}
              onClick={() => onEmit(invoice)}
              className="h-7 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send className="size-3.5" />
              Emitir Factura
            </Button>
          ) : null}

          {canCollect && onCollect ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCollect(invoice)}
              className="h-7 gap-1.5 text-xs font-semibold text-emerald-700 hover:border-emerald-500/40 hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              <Banknote className="size-3.5" />
              Imputar Cobro
            </Button>
          ) : null}

          {isIssued && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateAdjustment}
              className="h-7 gap-1.5 text-xs font-semibold text-foreground hover:bg-muted/60"
            >
              <Scale className="size-3.5 text-primary" />
              Crear Ajuste
            </Button>
          )}

          {onOpenEvidence ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenEvidence(invoice)}
              className="h-7 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <FileSearch className="size-3.5 text-primary" />
              Evidencia Fiscal
            </Button>
          ) : null}
        </div>

        {/* Tabs de Detalle */}
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-8 grid grid-cols-3 bg-muted/60 p-0.5">
              <TabsTrigger value="resumen" className="text-[11px] h-7">Resumen & Origen</TabsTrigger>
              <TabsTrigger value="items" className="text-[11px] h-7">Ítems ({invoice.items.length})</TabsTrigger>
              <TabsTrigger value="fiscal" className="text-[11px] h-7">Evidencia Fiscal</TabsTrigger>
            </TabsList>

            {/* TAB: Resumen & Origen */}
            <TabsContent value="resumen" className="space-y-3 mt-3">
              {/* Tarjeta de Origen */}
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Origen del Comprobante
                </span>
                {invoice.surgeryId ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 border">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="size-4 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-foreground">Cirugía {invoice.surgeryId}</p>
                        <p className="text-[10px] text-muted-foreground">Expediente quirúrgico vinculado</p>
                      </div>
                    </div>
                    {onOpenSurgery ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenSurgery(invoice.surgeryId!)}
                        className="h-7 text-xs gap-1"
                      >
                        Ver Expediente <ExternalLink className="size-3" />
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <Tag className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Venta Directa</p>
                      <p className="text-[10px] text-muted-foreground">Facturación general independiente sin cirugía</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección Documentos de Ajuste */}
              <div className="rounded-lg border bg-card p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Scale className="size-3.5 text-primary" />
                    Documentos de ajuste ({relatedAdjustments.length})
                  </span>
                  {relatedAdjustments.length > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-foreground">
                      Neto: {formatDecimalCurrency(netAdjustmentImpact)}
                    </span>
                  )}
                </div>

                {relatedAdjustments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Esta factura no posee notas de crédito ni débito asociadas.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {relatedAdjustments.map((adj) => (
                      <div
                        key={adj.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {adj.tipo === "CREDITO" ? (
                            <TrendingDown className="size-3.5 text-amber-600" />
                          ) : (
                            <TrendingUp className="size-3.5 text-indigo-600" />
                          )}
                          <span className="font-mono font-bold text-foreground">
                            {adj.tipo === "CREDITO" ? "NC" : "ND"} {adj.visibleNumber ? `0001-${String(adj.visibleNumber).padStart(8, "0")}` : "Borrador"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">({adj.motivo})</span>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            adj.tipo === "CREDITO" ? "text-amber-600" : "text-indigo-600"
                          }`}
                        >
                          {adj.tipo === "CREDITO" ? `-${formatDecimalCurrency(adj.total)}` : `+${formatDecimalCurrency(adj.total)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t">
                  {relatedAdjustments.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleViewAdjustments}
                      className="h-7 text-xs flex-1 gap-1"
                    >
                      <FileSearch className="size-3" />
                      Ver documentos de ajuste
                    </Button>
                  )}
                  {isIssued && (
                    <Button
                      size="sm"
                      variant={relatedAdjustments.length === 0 ? "outline" : "ghost"}
                      onClick={handleCreateAdjustment}
                      className="h-7 text-xs flex-1 gap-1"
                    >
                      <Plus className="size-3" />
                      Crear ajuste
                    </Button>
                  )}
                </div>
              </div>

              {/* Cliente / Datos adicionales */}
              {client ? (
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Cliente / Receptor
                  </span>
                  <p className="text-xs font-semibold text-foreground">{client}</p>
                </div>
              ) : null}

              {/* Fechas */}
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Fechas Operativas
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Fecha de Emisión:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatDate(invoice.issuedAt ?? invoice.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Fecha de Registro:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatDate(invoice.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Ítems */}
            <TabsContent value="items" className="space-y-2 mt-3">
              <div className="rounded-lg border bg-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase">
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-2 py-2 text-right">Cant.</th>
                      <th className="px-2 py-2 text-right">Unitario</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoice.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">
                          No hay ítems detallados en este comprobante.
                        </td>
                      </tr>
                    ) : (
                      invoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium text-foreground">
                            {item.description}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                            {item.quantity}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                            {formatDecimalCurrency(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                            {formatDecimalCurrency((item as { subtotal?: string }).subtotal ?? item.total ?? "0")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: Evidencia Fiscal */}
            <TabsContent value="fiscal" className="space-y-3 mt-3">
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center">
                    Estado Fiscal Desacoplado
                    <HelpTip text="La evidencia fiscal es independiente del documento y no bloquea cobranzas ni imputaciones." />
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${fiscal.badgeClass}`}>
                    {fiscal.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  La evidencia fiscal es independiente del estado operativo del comprobante y no condiciona el registro contable ni de cobranzas.
                </p>
                {onOpenEvidence ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenEvidence(invoice)}
                    className="w-full h-8 text-xs gap-1.5 mt-2"
                  >
                    <FileSearch className="size-3.5 text-primary" />
                    Abrir Trazabilidad Fiscal Sandbox
                  </Button>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
