"use client"

import { useState } from "react"
import {
  Calendar,
  Download,
  ExternalLink,
  Eye,
  FileSearch,
  FolderOpen,
  Printer,
  Receipt,
  Scale,
  Send,
  ShieldCheck,
  Tag,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react"

import type { DocumentoAjuste } from "@/types/documentos-ajuste"
import { formatDecimalCurrency } from "@/lib/decimal-money"
import { formatDate } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { DocumentoAjustePdfModal } from "./DocumentoAjustePdfModal"

interface DocumentoAjusteDetailDrawerProps {
  documento: DocumentoAjuste | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmit?: (doc: DocumentoAjuste) => void
  onVoid?: (doc: DocumentoAjuste) => void
  onOpenSurgery?: (surgeryId: string) => void
}

function docNumber(doc: DocumentoAjuste) {
  const prefix = doc.tipo === "CREDITO" ? "NC" : "ND"
  return doc.visibleNumber == null ? `Borrador · ${doc.id.slice(0, 8)}` : `${prefix} 0001-${String(doc.visibleNumber).padStart(8, "0")}`
}

function fiscalStatusOf(doc: DocumentoAjuste): { label: string; badgeClass: string; isAuthorized: boolean } {
  const meta = doc.metadata && typeof doc.metadata === "object" ? doc.metadata as Record<string, unknown> : null
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

export function DocumentoAjusteDetailDrawer({
  documento,
  open,
  onOpenChange,
  onEmit,
  onVoid,
  onOpenSurgery,
}: DocumentoAjusteDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("resumen")
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)

  if (!documento) return null

  const isCredit = documento.tipo === "CREDITO"
  const fiscal = fiscalStatusOf(documento)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-md md:max-w-lg p-0 flex flex-col gap-0">
          {/* Header */}
          <SheetHeader className="p-4 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isCredit ? (
                  <TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <TrendingUp className="size-4 text-indigo-600 dark:text-indigo-400" />
                )}
                <SheetTitle className="font-mono text-base font-bold text-foreground">
                  {docNumber(documento)}
                </SheetTitle>
              </div>
              <div className="flex items-center gap-1.5 mr-6">
                <Badge
                  variant="outline"
                  className={`text-[11px] font-semibold ${
                    isCredit
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                  }`}
                >
                  {isCredit ? "Nota de crédito" : "Nota de débito"}
                </Badge>
                <StateBadge status={documento.state} />
              </div>
            </div>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              Motivo: <span className="font-medium text-foreground">{documento.motivo}</span> • Creado el {formatDate(documento.createdAt)}
            </SheetDescription>
          </SheetHeader>

          {/* Resumen Financiero Destacado */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 border-b text-center">
            <div className="rounded-md border bg-card p-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Importe del Ajuste
              </span>
              <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
                {formatDecimalCurrency(documento.total)}
              </span>
            </div>
            <div className="rounded-md border bg-card p-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-center gap-1">
                Impacto del ajuste
                <HelpTip text="Crédito reduce el saldo comercial; Débito incrementa el saldo a favor de la empresa." />
              </span>
              <span
                className={`font-mono text-xs font-bold block mt-0.5 ${
                  isCredit
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-indigo-600 dark:text-indigo-400"
                }`}
              >
                {isCredit ? `-${formatDecimalCurrency(documento.total)}` : `+${formatDecimalCurrency(documento.total)}`}
              </span>
            </div>
          </div>

          {/* Barra de Acciones */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-card">
            {documento.state === "Borrador" && onEmit ? (
              <Button
                size="sm"
                onClick={() => onEmit(documento)}
                className="h-7 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Send className="size-3.5" />
                Emitir Ajuste
              </Button>
            ) : null}

            {/* Vista Previa PDF */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPdfModalOpen(true)}
              className="h-7 gap-1.5 text-xs font-medium text-foreground"
              title="Vista previa del documento"
            >
              <Eye className="size-3.5 text-primary" />
              Vista previa
            </Button>

            {/* Descargar PDF */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPdfModalOpen(true)}
              className="h-7 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              title="Descargar documento PDF"
            >
              <Download className="size-3.5" />
              Descargar PDF
            </Button>

            {documento.state === "Emitida" && onVoid ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVoid(documento)}
                className="h-7 gap-1.5 text-xs font-semibold text-rose-700 hover:border-rose-500/40 hover:bg-rose-500/10 dark:text-rose-400 ml-auto"
              >
                <XCircle className="size-3.5" />
                Anular
              </Button>
            ) : null}
          </div>

          {/* Tabs de Detalle */}
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-8 grid grid-cols-4 bg-muted/60 p-0.5">
                <TabsTrigger value="resumen" className="text-[11px] h-7">Resumen</TabsTrigger>
                <TabsTrigger value="factura" className="text-[11px] h-7">Factura origen</TabsTrigger>
                <TabsTrigger value="items" className="text-[11px] h-7">Ítems / Ajuste</TabsTrigger>
                <TabsTrigger value="fiscal" className="text-[11px] h-7">Evidencia fiscal</TabsTrigger>
              </TabsList>

              {/* TAB: Resumen */}
              <TabsContent value="resumen" className="space-y-3 mt-3">
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Información General
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Modalidad:</span>
                      <span className="font-semibold text-foreground">
                        {documento.modalidad === "TOTAL"
                          ? "Ajuste total"
                          : documento.modalidad === "PARCIAL"
                          ? "Ajuste parcial por ítems"
                          : "Ajuste manual justificado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Motivo:</span>
                      <span className="font-semibold text-foreground">{documento.motivo}</span>
                    </div>
                  </div>
                  {documento.observaciones ? (
                    <div className="mt-2 pt-2 border-t text-xs">
                      <span className="text-[10px] text-muted-foreground block">Observaciones / Justificación:</span>
                      <p className="text-foreground italic mt-0.5">{documento.observaciones}</p>
                    </div>
                  ) : null}
                </div>

                {documento.clientName ? (
                  <div className="rounded-lg border bg-card p-3 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Cliente / Receptor
                    </span>
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-foreground">{documento.clientName}</p>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Fechas
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Fecha de Emisión:</span>
                      <span className="font-mono font-medium text-foreground">
                        {documento.issuedAt ? formatDate(documento.issuedAt) : "Sin emitir (Borrador)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Fecha de Registro:</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatDate(documento.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Factura Origen */}
              <TabsContent value="factura" className="space-y-3 mt-3">
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Factura Origen Inmutable</span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 bg-emerald-500/10">
                      Emitida
                    </Badge>
                  </span>
                  <div className="p-3 bg-muted/40 rounded-md border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="size-4 text-primary" />
                        <span className="text-xs font-bold font-mono text-foreground">
                          FV {documento.invoiceNumber}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ID: {documento.invoiceId}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Esta factura es la referencia inmutable que respalda la emisión del documento de ajuste.
                    </p>
                  </div>

                  {documento.surgeryId ? (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 border mt-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="size-4 text-primary" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Cirugía {documento.surgeryId}</p>
                          <p className="text-[10px] text-muted-foreground">Expediente quirúrgico asociado</p>
                        </div>
                      </div>
                      {onOpenSurgery ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenSurgery(documento.surgeryId!)}
                          className="h-7 text-xs gap-1"
                        >
                          Ver Expediente <ExternalLink className="size-3" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              {/* TAB: Ítems / Ajuste */}
              <TabsContent value="items" className="space-y-2 mt-3">
                <div className="rounded-lg border bg-card overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase">
                        <th className="px-3 py-2 text-left">Concepto / Ajuste</th>
                        <th className="px-2 py-2 text-right">Cant.</th>
                        <th className="px-2 py-2 text-right">Unitario</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {documento.items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">
                            Ajuste global sin detalle de ítems.
                          </td>
                        </tr>
                      ) : (
                        documento.items.map((item, index) => (
                          <tr key={index} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium text-foreground">
                              {item.description}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                              {item.adjustedQuantity ?? item.quantity}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                              {formatDecimalCurrency(item.unitPrice)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                              {formatDecimalCurrency(item.adjustedAmount ?? item.subtotal)}
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
                      <HelpTip text="La trazabilidad fiscal es independiente del documento y no bloquea cobranzas ni imputaciones." />
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${fiscal.badgeClass}`}>
                      {fiscal.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El comprobante fiscal asociado se procesa de manera asíncrona y no interfiere con el saldo operativo comercial.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de Vista Previa / Descarga PDF */}
      <DocumentoAjustePdfModal
        documento={documento}
        open={isPdfModalOpen}
        onOpenChange={setIsPdfModalOpen}
      />
    </>
  )
}
