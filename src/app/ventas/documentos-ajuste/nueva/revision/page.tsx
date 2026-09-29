"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Loader2,
  Receipt,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import type { DocumentoAjuste, DocumentoAjusteItem } from "@/types/documentos-ajuste"
import { useDocumentosAjuste } from "@/lib/documentos-ajuste"
import { formatDecimalCurrency } from "@/lib/decimal-money"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type EmitStage = "idle" | "validating" | "registering" | "done"

function RevisionAjusteContent() {
  const router = useRouter()
  const { addDocumento } = useDocumentosAjuste()

  const [draft, setDraft] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emitStage, setEmitStage] = useState<EmitStage>("idle")

  useEffect(() => {
    const raw = sessionStorage.getItem("OSSUM_ADJUSTMENT_DRAFT")
    if (raw) {
      try {
        setDraft(JSON.parse(raw))
      } catch {
        router.push("/ventas/documentos-ajuste")
      }
    } else {
      router.push("/ventas/documentos-ajuste")
    }
  }, [router])

  if (!draft) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        Cargando revisión de comprobante...
      </div>
    )
  }

  const isCredit = draft.tipo === "CREDITO"
  const totals = draft.totals || { subtotal: "0", taxTotal: "0", total: "0" }
  const financial = draft.financialSummary || {}

  const handleEmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setEmitStage("validating")

    // Etapa 1: Validación de integridad (100ms)
    await new Promise((r) => setTimeout(r, 100))
    setEmitStage("registering")

    // Etapa 2: Registro del documento (120ms)
    await new Promise((r) => setTimeout(r, 120))

    try {
      const docItems: DocumentoAjusteItem[] = (draft.items || []).map((it: any) => ({
        id: it.id,
        description: it.noteDescription,
        quantity: it.quantity,
        unitPrice: it.unitPrice || it.netUnitPrice || "0.0000",
        subtotal: it.subtotal,
        adjustedQuantity: it.quantity,
        adjustedAmount: it.total,
      }))

      addDocumento({
        visibleNumber: Math.floor(Math.random() * 900) + 10,
        tipo: draft.tipo,
        state: "Emitida",
        invoiceId: draft.facturaOrigenId || `ext-${Date.now()}`,
        invoiceNumber: draft.facturaOrigenId ? `0001-00009901` : `${draft.extPtoVta}-${draft.extNumber}`,
        surgeryId: null,
        clientName: draft.extClientName || "Cliente General",
        modalidad: "PARCIAL",
        motivo: draft.motivo,
        observaciones: draft.observaciones?.trim() || undefined,
        total: totals.total,
        impacto: isCredit
          ? `-${formatDecimalCurrency(totals.total)}`
          : `+${formatDecimalCurrency(totals.total)}`,
        issuedAt: new Date().toISOString(),
        metadata: {
          fiscalState: "AUTHORIZED",
          fiscalDisplayState: "SIMULATED",
          cae: "74328901239876",
          caeExpiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
          originType:
            draft.origenParam === "externo"
              ? "EXTERNAL_INVOICE"
              : draft.origenParam === "periodo"
              ? "PERIOD"
              : "INTERNAL_INVOICE",
        },
        items: docItems,
      })

      setEmitStage("done")
      sessionStorage.removeItem("OSSUM_ADJUSTMENT_DRAFT")
      toast.success(
        `${isCredit ? "Nota de Crédito" : "Nota de Débito"} emitida exitosamente`
      )

      setTimeout(() => {
        router.push("/ventas/documentos-ajuste")
      }, 150)
    } catch (err) {
      setIsSubmitting(false)
      setEmitStage("idle")
      toast.error("Ocurrió un error al emitir el documento de ajuste.")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex flex-col gap-5 p-4 lg:p-6 max-w-4xl mx-auto w-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="size-8 p-0"
            title="Volver a editar"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Scale className="size-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Revisión y emisión final
              </h1>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  isCredit
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                }`}
              >
                {isCredit ? "Nota de crédito" : "Nota de débito"}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-700 bg-emerald-500/10">
                Paso 3: Solo lectura
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verificá el contenido definitivo antes de emitir. No se permitirán modificaciones posteriores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="text-xs font-semibold gap-1"
          >
            <ArrowLeft className="size-3.5" />
            Volver a editar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={handleEmit}
            className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm min-w-[160px]"
          >
            {emitStage === "validating" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Validando datos...</span>
              </>
            ) : emitStage === "registering" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : emitStage === "done" ? (
              <>
                <CheckCircle2 className="size-3.5 text-white" />
                <span>Emitido</span>
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                <span>Emitir documento</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tarjeta de Resumen Ejecutivo y Auditoría */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-600" />
            Resumen del Comprobante a Emitir
          </CardTitle>
          <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
            Próxima emisión
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border">
            <div>
              <span className="text-[10px] text-muted-foreground block">Tipo:</span>
              <span className="font-bold text-foreground block">
                {isCredit ? "Nota de Crédito (NC)" : "Nota de Débito (ND)"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Motivo:</span>
              <span className="font-semibold text-foreground block">{draft.motivo}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Origen:</span>
              <span className="font-medium text-foreground block">
                {draft.origenParam === "externo"
                  ? "Comprobante Externo"
                  : draft.origenParam === "periodo"
                  ? "Ajuste por Período"
                  : "Factura Interna OSSUM"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Total Final a Emitir:</span>
              <span className={`font-mono text-sm font-bold block ${isCredit ? "text-amber-700 dark:text-amber-400" : "text-indigo-700 dark:text-indigo-400"}`}>
                {isCredit ? "-" : "+"}{formatDecimalCurrency(totals.total)}
              </span>
            </div>
          </div>

          {draft.observaciones && (
            <div className="p-2.5 rounded-md bg-muted/20 border text-xs">
              <span className="text-[10px] text-muted-foreground font-semibold block">Observaciones al pie:</span>
              <p className="text-foreground mt-0.5">{draft.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Conceptos Definitivos con P. Final y Neto */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Lock className="size-4 text-primary" />
            Conceptos y Descripciones Definitivas (Inmutables)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/30 border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Descripción para la Nota</th>
                <th className="py-2.5 px-2 text-center w-16">Cant.</th>
                <th className="py-2.5 px-2 text-right w-28">P. Final (IVA inc.)</th>
                <th className="py-2.5 px-2 text-center w-20">IVA</th>
                <th className="py-2.5 px-3 text-right w-28">Total Línea</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(draft.items || []).map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    <div>{item.noteDescription}</div>
                    {item.originalDescription !== item.noteDescription && (
                      <div className="text-[10px] text-muted-foreground">
                        Orig: {item.originalDescription}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono">{item.quantity}</td>
                  <td className="py-2.5 px-2 text-right font-mono font-medium">
                    {formatDecimalCurrency(item.grossUnitPrice || item.total)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono">
                    {item.vatRate === -1 ? "Exento" : `${item.vatRate}%`}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                    {formatDecimalCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Impacto Financiero y Advertencias Fiscales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="p-3 border-b bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Scale className="size-4 text-primary" />
              Impacto Financiero Proyectado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nuevo Saldo Exigible:</span>
              <span className="font-mono font-bold text-foreground">
                {formatDecimalCurrency(financial.projectedNewBalance || "0")}
              </span>
            </div>
            {Number(financial.pendingResolutionCredit || 0) > 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] mt-1">
                <strong>Crédito pendiente:</strong> {formatDecimalCurrency(financial.pendingResolutionCredit)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="p-3 border-b bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-primary" />
              Estado Fiscal y Trazabilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-1.5 text-xs text-muted-foreground">
            <p className="text-[11px] leading-relaxed">
              Documento Operativo DEV: Se emitirá con registro correlativo y simulación para previsualización PDF sin impacto tributario real.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer de Confirmación */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border mt-2">
        <span className="text-xs text-muted-foreground">
          Al confirmar, el comprobante se emitirá con número correlativo inmutable.
        </span>

        <Button
          type="button"
          size="sm"
          disabled={isSubmitting}
          onClick={handleEmit}
          className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 h-9"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Emitiendo...</span>
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              <span>Confirmar y emitir</span>
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}

export default function RevisionAjustePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Cargando revisión...
        </div>
      }
    >
      <RevisionAjusteContent />
    </Suspense>
  )
}
