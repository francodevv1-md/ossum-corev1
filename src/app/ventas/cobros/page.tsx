"use client"

import Link from "next/link"
import React, { useMemo, useState } from "react"
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  FolderOpen,
  Info,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"

import { CobroFormDialog } from "@/components/cobros/CobroFormDialog"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { StateBadge, StatsCard, SurgeryDrawer } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInvoices } from "@/hooks/useInvoices"
import { usePayments } from "@/hooks/usePayments"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { CreatePaymentPayload, PaymentApiRow } from "@/lib/api/payments"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  check: "Cheque",
  other: "Otro medio",
}

function invoiceNumber(invoice: InvoiceApiRow) {
  return invoice.visibleNumber == null ? `Factura backend ${invoice.id}` : `FV ${invoice.visibleNumber}`
}

function metadataValue(metadata: unknown, key: "reference" | "notes") {
  if (!metadata || typeof metadata !== "object") return ""
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === "string" ? value : ""
}

export default function CobrosPage() {
  const invoicesApi = useInvoices()
  const paymentsApi = usePayments()
  const { openExpediente } = useExpedienteDrawer()

  const [activeTab, setActiveTab] = useState("outstanding")
  const [isNewPaymentDialogOpen, setIsNewPaymentDialogOpen] = useState(false)
  const [selectedInitialInvoice, setSelectedInitialInvoice] = useState<InvoiceApiRow | null>(null)
  const [paymentSelection, setPaymentSelection] = useState<{ companyId: string; payment: PaymentApiRow } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [paymentSearch, setPaymentSearch] = useState("")
  const [paymentStateFilter, setPaymentStateFilter] = useState<string>("all")
  const [expandedPaymentRows, setExpandedPaymentRows] = useState<Set<string>>(new Set())

  const paymentToCancel =
    paymentSelection && paymentSelection.companyId === paymentsApi.companyId ? paymentSelection.payment : null

  // Open invoices with positive balance
  const outstanding = useMemo(
    () =>
      invoicesApi.invoices.filter(
        (invoice) =>
          (parseDecimalScale4(invoice.balance) ?? BigInt(0)) > BigInt(0) &&
          (invoice.state === "Emitida" || invoice.state === "Parcialmente_cobrada")
      ),
    [invoicesApi.invoices]
  )

  const filteredOutstanding = useMemo(() => {
    let data = outstanding
    if (invoiceSearch.trim()) {
      const q = invoiceSearch.trim().toLowerCase()
      data = data.filter(
        (inv) =>
          invoiceNumber(inv).toLowerCase().includes(q) ||
          (inv.surgeryId ?? "").toLowerCase().includes(q) ||
          inv.items.some((item) => item.description.toLowerCase().includes(q))
      )
    }
    return data
  }, [outstanding, invoiceSearch])

  const invoiceById = useMemo(
    () => new Map(invoicesApi.invoices.map((invoice) => [invoice.id, invoice])),
    [invoicesApi.invoices]
  )

  const registeredPayments = useMemo(
    () => paymentsApi.payments.filter((payment) => payment.state === "Registrado"),
    [paymentsApi.payments]
  )

  const filteredPayments = useMemo(() => {
    let data = paymentsApi.payments
    if (paymentStateFilter === "Registrado") {
      data = data.filter((p) => p.state === "Registrado")
    } else if (paymentStateFilter === "Anulado") {
      data = data.filter((p) => p.state === "Anulado")
    }

    if (paymentSearch.trim()) {
      const q = paymentSearch.trim().toLowerCase()
      data = data.filter((p) => {
        const num = `cobro ${p.visibleNumber}`.toLowerCase()
        const ref = metadataValue(p.metadata, "reference").toLowerCase()
        const notes = metadataValue(p.metadata, "notes").toLowerCase()
        const surg = (p.surgeryId ?? "").toLowerCase()
        return num.includes(q) || ref.includes(q) || notes.includes(q) || surg.includes(q)
      })
    }
    return data
  }, [paymentsApi.payments, paymentStateFilter, paymentSearch])

  const outstandingTotal = useMemo(
    () =>
      outstanding.reduce(
        (sum, invoice) => sum + (parseDecimalScale4(invoice.balance) ?? BigInt(0)),
        BigInt(0)
      ),
    [outstanding]
  )

  const registeredTotal = useMemo(
    () =>
      registeredPayments.reduce(
        (sum, payment) => sum + (parseDecimalScale4(payment.amount) ?? BigInt(0)),
        BigInt(0)
      ),
    [registeredPayments]
  )

  const refreshBoth = () => Promise.all([invoicesApi.refresh(), paymentsApi.refresh()])

  const handleOpenCobroModal = (invoice?: InvoiceApiRow | null) => {
    setSelectedInitialInvoice(invoice ?? null)
    setIsNewPaymentDialogOpen(true)
  }

  const registerPayment = async (payload: CreatePaymentPayload) => {
    setActionError(null)
    try {
      await paymentsApi.createPayment(payload)
      await refreshBoth()
      toast.success("Cobro operativo registrado con éxito")
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo registrar el cobro."
      setActionError(message)
      throw cause
    }
  }

  const cancelPayment = async () => {
    if (!paymentToCancel) return
    setActionError(null)
    try {
      await paymentsApi.cancel(paymentToCancel.id)
      await refreshBoth()
      toast.success(`Cobro ${paymentToCancel.visibleNumber} anulado. Saldos revertidos.`)
      setPaymentSelection(null)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo anular el cobro.")
    }
  }

  const togglePaymentRow = (id: string) => {
    setExpandedPaymentRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pageError = actionError ?? invoicesApi.error ?? paymentsApi.error
  const isRefreshing = invoicesApi.loading || paymentsApi.loading

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Cuenta corriente y cobros</h1>
          <p className="text-sm text-muted-foreground">
            Imputación multi-factura, saldos en tiempo real y cuenta corriente respaldada por backend.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenCobroModal(null)}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-4" /> Registrar cobro
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ventas/recibos?from=cobros">
              <FileText className="size-4" /> Recibos digitales
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshBoth()}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      <Alert className="bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <Info className="size-4 text-slate-700 dark:text-slate-300" />
        <AlertTitle className="text-xs font-semibold">Registro operativo multi-imputación</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          Un cobro puede aplicarse a una o múltiples facturas abiertas. Cada anulación revierte atómicamente el saldo en el backend conservando trazabilidad.
        </AlertDescription>
      </Alert>

      {pageError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error en la operación</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2 text-xs">
            <span>{pageError}</span>
            <Button variant="outline" size="sm" onClick={() => void refreshBoth()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Facturas con saldo" value={outstanding.length} icon={FileText} />
        <StatsCard
          title="Saldo pendiente a cobrar"
          value={formatDecimalCurrency(outstandingTotal)}
          icon={CreditCard}
        />
        <StatsCard title="Cobros registrados" value={registeredPayments.length} icon={Banknote} />
        <StatsCard
          title="Total cobrado registrado"
          value={formatDecimalCurrency(registeredTotal)}
          icon={ReceiptText}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60">
          <TabsTrigger value="outstanding" className="text-xs">
            Facturas abiertas ({outstanding.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Historial de cobros ({paymentsApi.payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Facturas Abiertas / Cuenta Corriente */}
        <TabsContent value="outstanding" className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Buscar por factura, cirugía, ítem..."
                className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredOutstanding.length} factura{filteredOutstanding.length !== 1 ? "s" : ""}
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              {invoicesApi.loading && !invoicesApi.invoices.length ? (
                <p className="p-10 text-center text-sm text-muted-foreground" role="status">
                  Cargando facturas con saldo…
                </p>
              ) : filteredOutstanding.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="size-8 text-emerald-500/60" />
                  <p className="text-xs font-medium text-foreground">
                    {invoiceSearch ? "Sin resultados para la búsqueda" : "Al día — No hay facturas con saldo pendiente"}
                  </p>
                  <p className="text-[11px]">
                    {invoiceSearch ? "Probá con otro término." : "Todas las facturas emitidas están cobradas o no hay comprobantes pendientes."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-xs">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Factura</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fecha emisión</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Cirugía / Expediente</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Detalle ítems</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Cobrado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Saldo pendiente</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOutstanding.map((invoice) => (
                        <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-semibold text-xs">
                            {invoiceNumber(invoice)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(invoice.issuedAt ?? invoice.createdAt)}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {invoice.surgeryId ? (
                              <button
                                type="button"
                                className="text-primary hover:underline font-medium text-left"
                                onClick={() => openExpediente(invoice.surgeryId!)}
                              >
                                {invoice.surgeryId}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="max-w-64 px-3 py-2.5 text-xs">
                            <span className="line-clamp-1 text-muted-foreground">
                              {invoice.items.map((item) => item.description).join(" · ") || "Sin descripción"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                            {formatDecimalCurrency(invoice.total)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            {formatDecimalCurrency(invoice.paidTotal)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                            {formatDecimalCurrency(invoice.balance)}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            <StateBadge status={invoice.state} />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 bg-white hover:bg-slate-50 dark:bg-slate-900"
                                onClick={() => handleOpenCobroModal(invoice)}
                              >
                                <Banknote className="size-3.5 text-emerald-600" />
                                Cobrar
                              </Button>
                              {invoice.surgeryId ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title={`Ver expediente ${invoice.surgeryId}`}
                                  onClick={() => openExpediente(invoice.surgeryId!)}
                                >
                                  <FolderOpen className="size-3.5 text-muted-foreground" />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Historial de Cobros con Imputaciones Expandibles */}
        <TabsContent value="history" className="space-y-3 pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Buscar cobro, ref, notas..."
                  className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-md text-xs">
                <Button
                  variant={paymentStateFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => setPaymentStateFilter("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={paymentStateFilter === "Registrado" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] px-2 text-emerald-700 dark:text-emerald-300"
                  onClick={() => setPaymentStateFilter("Registrado")}
                >
                  Registrados
                </Button>
                <Button
                  variant={paymentStateFilter === "Anulado" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] px-2 text-zinc-600 dark:text-zinc-400"
                  onClick={() => setPaymentStateFilter("Anulado")}
                >
                  Anulados
                </Button>
              </div>
            </div>

            <span className="text-xs text-muted-foreground">
              {filteredPayments.length} cobro{filteredPayments.length !== 1 ? "s" : ""}
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              {paymentsApi.loading && !paymentsApi.payments.length ? (
                <p className="p-10 text-center text-sm text-muted-foreground" role="status">
                  Cargando historial de cobros…
                </p>
              ) : filteredPayments.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  No hay cobros registrados con los filtros aplicados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-xs">
                        <th className="px-2 py-2.5 w-8"></th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Cobro</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Medio</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Imputaciones</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Referencia / notas</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Importe total</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => {
                        const reference = metadataValue(payment.metadata, "reference")
                        const notes = metadataValue(payment.metadata, "notes")
                        const isExpanded = expandedPaymentRows.has(payment.id)
                        const imputations = payment.imputations ?? []

                        return (
                          <React.Fragment key={payment.id}>
                            <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-2 py-2.5">
                                {imputations.length > 0 ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => togglePaymentRow(payment.id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="size-3.5" />
                                    ) : (
                                      <ChevronRight className="size-3.5" />
                                    )}
                                  </Button>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-bold text-xs">
                                Cobro #{payment.visibleNumber}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                                {formatDate(payment.receivedAt)}
                              </td>
                              <td className="px-3 py-2.5 text-xs">
                                {payment.method ? METHOD_LABELS[payment.method] ?? payment.method : "Sin medio"}
                              </td>
                              <td className="px-3 py-2.5 text-xs">
                                {imputations.length > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 font-medium">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {imputations.length} factura{imputations.length !== 1 ? "s" : ""}
                                    </Badge>
                                    <span className="text-muted-foreground truncate max-w-48">
                                      {imputations
                                        .map((imp) => {
                                          const inv = invoiceById.get(imp.invoiceId)
                                          return inv?.visibleNumber ? `FV ${inv.visibleNumber}` : imp.invoiceId.slice(0, 8)
                                        })
                                        .join(", ")}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">Sin imputaciones</span>
                                )}
                              </td>
                              <td className="max-w-56 px-3 py-2.5 text-xs text-muted-foreground truncate">
                                {[reference, notes].filter(Boolean).join(" · ") || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold tabular-nums text-xs text-slate-900 dark:text-slate-100">
                                {formatDecimalCurrency(payment.amount)}
                              </td>
                              <td className="px-3 py-2.5 text-xs">
                                <StateBadge status={payment.state} />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {payment.state === "Registrado" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      paymentsApi.companyId &&
                                      setPaymentSelection({ companyId: paymentsApi.companyId, payment })
                                    }
                                  >
                                    <Undo2 className="size-3 mr-1" /> Anular
                                  </Button>
                                ) : null}
                              </td>
                            </tr>

                            {/* Expanded Imputations Detail */}
                            {isExpanded && imputations.length > 0 && (
                              <tr className="bg-muted/20 border-b">
                                <td colSpan={9} className="px-8 py-3">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                      Detalle de imputación a facturas
                                    </p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b text-muted-foreground">
                                          <th className="py-1 text-left font-medium">Factura asociada</th>
                                          <th className="py-1 text-left font-medium">Cirugía</th>
                                          <th className="py-1 text-right font-medium">Importe imputado</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {imputations.map((imp) => {
                                          const inv = invoiceById.get(imp.invoiceId)
                                          return (
                                            <tr key={imp.id} className="border-b last:border-0">
                                              <td className="py-1 font-mono font-medium">
                                                {inv ? invoiceNumber(inv) : `ID ${imp.invoiceId}`}
                                              </td>
                                              <td className="py-1">
                                                {inv?.surgeryId ? (
                                                  <button
                                                    type="button"
                                                    className="text-primary hover:underline"
                                                    onClick={() => openExpediente(inv.surgeryId!)}
                                                  >
                                                    {inv.surgeryId}
                                                  </button>
                                                ) : (
                                                  "—"
                                                )}
                                              </td>
                                              <td className="py-1 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                                                {formatDecimalCurrency(imp.amount)}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Multi-imputation Cobro Modal */}
      <CobroFormDialog
        open={isNewPaymentDialogOpen}
        onOpenChange={(open) => {
          setIsNewPaymentDialogOpen(open)
          if (!open) setSelectedInitialInvoice(null)
        }}
        invoices={invoicesApi.invoices}
        initialInvoice={selectedInitialInvoice}
        onSubmit={registerPayment}
        submitting={paymentsApi.mutatingId === "__create__"}
      />

      {/* Anulación Confirmation Dialog with Explicit Impact */}
      <AlertDialog
        open={paymentToCancel != null}
        onOpenChange={(open) => {
          if (!open) setPaymentSelection(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Undo2 className="size-5" />
              Anular cobro operativo #{paymentToCancel?.visibleNumber}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-xs text-foreground">
                <p>
                  Esta acción anulará el cobro de{" "}
                  <strong>{formatDecimalCurrency(paymentToCancel?.amount)}</strong>.
                </p>
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <p className="font-semibold text-xs text-muted-foreground uppercase">
                    Impacto en facturas imputadas:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    {(paymentToCancel?.imputations ?? []).map((imp) => {
                      const inv = invoiceById.get(imp.invoiceId)
                      return (
                        <li key={imp.id}>
                          <strong>{inv ? invoiceNumber(inv) : imp.invoiceId}</strong>: se restaurará el saldo por{" "}
                          <strong>{formatDecimalCurrency(imp.amount)}</strong>.
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  El cobro conservará su número visible en estado <em>Anulado</em> para fines de auditoría histórica.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paymentsApi.mutatingId === paymentToCancel?.id}>
              Conservar cobro
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={paymentsApi.mutatingId === paymentToCancel?.id}
              onClick={() => void cancelPayment()}
            >
              {paymentsApi.mutatingId === paymentToCancel?.id ? "Anulando…" : "Confirmar anulación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SurgeryDrawer />
    </div>
  )
}
