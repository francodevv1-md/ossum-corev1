"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertCircle, Banknote, CreditCard, FileText, FolderOpen, Info, ReceiptText, Undo2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInvoices } from "@/hooks/useInvoices"
import { usePayments } from "@/hooks/usePayments"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { CreateInvoicePaymentPayload, PaymentApiRow } from "@/lib/api/payments"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { formatDate } from "@/lib/formatters"

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  check: "Cheque",
  other: "Otro",
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
  const [invoiceSelection, setInvoiceSelection] = useState<{ companyId: string; invoice: InvoiceApiRow } | null>(null)
  const [paymentSelection, setPaymentSelection] = useState<{ companyId: string; payment: PaymentApiRow } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const selectedInvoice = invoiceSelection && invoiceSelection.companyId === invoicesApi.companyId ? invoiceSelection.invoice : null
  const paymentToCancel = paymentSelection && paymentSelection.companyId === paymentsApi.companyId ? paymentSelection.payment : null

  const outstanding = useMemo(() => invoicesApi.invoices.filter((invoice) =>
    (parseDecimalScale4(invoice.balance) ?? BigInt(0)) > BigInt(0) && (invoice.state === "Emitida" || invoice.state === "Parcialmente_cobrada"),
  ), [invoicesApi.invoices])

  const invoiceById = useMemo(() => new Map(invoicesApi.invoices.map((invoice) => [invoice.id, invoice])), [invoicesApi.invoices])
  const registeredPayments = useMemo(() => paymentsApi.payments.filter((payment) => payment.state === "Registrado"), [paymentsApi.payments])
  const outstandingTotal = useMemo(() => outstanding.reduce((sum, invoice) => sum + (parseDecimalScale4(invoice.balance) ?? BigInt(0)), BigInt(0)), [outstanding])
  const registeredTotal = useMemo(() => registeredPayments.reduce((sum, payment) => sum + (parseDecimalScale4(payment.amount) ?? BigInt(0)), BigInt(0)), [registeredPayments])

  const refreshBoth = () => Promise.all([invoicesApi.refresh(), paymentsApi.refresh()])

  const registerPayment = async (payload: CreateInvoicePaymentPayload) => {
    setActionError(null)
    try {
      await paymentsApi.create(payload)
      await refreshBoth()
      toast.success("Cobro operativo registrado")
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
      toast.success("Cobro operativo anulado")
      setPaymentSelection(null)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo anular el cobro.")
    }
  }

  const pageError = actionError ?? invoicesApi.error ?? paymentsApi.error

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Cobros operativos</h1>
          <p className="text-sm text-muted-foreground">Registro por factura e historial respaldados por el backend.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/ventas/recibos?from=cobros"><FileText className="size-4" /> Ver recibos digitales</Link>
        </Button>
      </div>

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Registro operativo no fiscal</AlertTitle>
        <AlertDescription>
          Cada cobro se registra contra una factura backend específica. Esta pantalla no emite comprobantes fiscales.
        </AlertDescription>
      </Alert>

      {pageError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>No se pudo completar la operación</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{pageError}</span>
            {invoicesApi.error || paymentsApi.error ? (
              <Button variant="outline" size="sm" onClick={() => void refreshBoth()}>Reintentar</Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Facturas con saldo" value={outstanding.length} icon={FileText} />
        <StatsCard title="Saldo operativo" value={formatDecimalCurrency(outstandingTotal)} icon={CreditCard} />
        <StatsCard title="Cobros registrados" value={registeredPayments.length} icon={Banknote} />
        <StatsCard title="Total registrado" value={formatDecimalCurrency(registeredTotal)} icon={ReceiptText} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="outstanding">Facturas con saldo ({outstanding.length})</TabsTrigger>
          <TabsTrigger value="history">Historial de cobros ({paymentsApi.payments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding">
          <Card>
            <CardContent className="p-0">
              {invoicesApi.loading ? (
                <p className="p-10 text-center text-sm text-muted-foreground" role="status">Cargando facturas con saldo…</p>
              ) : outstanding.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">No hay facturas emitidas con saldo operativo.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Factura</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Descripción</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Cobrado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Saldo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstanding.map((invoice) => (
                        <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2.5 font-mono font-medium">{invoiceNumber(invoice)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(invoice.issuedAt ?? invoice.createdAt)}</td>
                          <td className="max-w-72 px-3 py-2.5"><span className="line-clamp-2">{invoice.items.map((item) => item.description).join(" · ") || "Sin descripción"}</span></td>
                          <td className="px-3 py-2.5 text-right">{formatDecimalCurrency(invoice.total)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-700">{formatDecimalCurrency(invoice.paidTotal)}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{formatDecimalCurrency(invoice.balance)}</td>
                          <td className="px-3 py-2.5"><StateBadge status={invoice.state} /></td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex justify-end gap-1">
                               <Button size="sm" variant="outline" onClick={() => invoicesApi.companyId && setInvoiceSelection({ companyId: invoicesApi.companyId, invoice })}>
                                <Banknote className="size-3" /> Registrar cobro
                              </Button>
                              {invoice.surgeryId ? (
                                <Button size="icon" variant="ghost" aria-label={`Ver expediente ${invoice.surgeryId}`} onClick={() => openExpediente(invoice.surgeryId!)}>
                                  <FolderOpen className="size-4" />
                                </Button>
                              ) : null}
                              {invoice.surgeryId && invoice.visibleNumber != null ? (
                                <Button size="icon" variant="ghost" aria-label={`Ver recibos de ${invoiceNumber(invoice)}`} asChild>
                                  <Link href={`/ventas/recibos?from=cobros&surgeryId=${encodeURIComponent(invoice.surgeryId)}&invoice=${encodeURIComponent(String(invoice.visibleNumber))}`}>
                                    <FileText className="size-4" />
                                  </Link>
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

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {paymentsApi.loading ? (
                <p className="p-10 text-center text-sm text-muted-foreground" role="status">Cargando historial de cobros…</p>
              ) : paymentsApi.payments.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">No hay cobros backend registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Cobro</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Medio</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Factura asociada</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Referencia / notas</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Importe</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsApi.payments.map((payment) => {
                        const reference = metadataValue(payment.metadata, "reference")
                        const notes = metadataValue(payment.metadata, "notes")
                        return (
                          <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-2.5 font-mono font-medium">Cobro {payment.visibleNumber}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(payment.receivedAt)}</td>
                            <td className="px-3 py-2.5">{payment.method ? METHOD_LABELS[payment.method] ?? payment.method : "Sin método informado"}</td>
                            <td className="px-3 py-2.5">
                              {payment.imputations.length > 0
                                ? payment.imputations.map((imputation) => invoiceNumber(invoiceById.get(imputation.invoiceId) ?? { id: imputation.invoiceId, visibleNumber: null } as InvoiceApiRow)).join(" · ")
                                : "Sin factura asociada en la respuesta backend"}
                            </td>
                            <td className="max-w-64 px-3 py-2.5 text-muted-foreground">{[reference, notes].filter(Boolean).join(" · ") || "—"}</td>
                            <td className="px-3 py-2.5 text-right font-medium">{formatDecimalCurrency(payment.amount)}</td>
                            <td className="px-3 py-2.5"><StateBadge status={payment.state} /></td>
                            <td className="px-3 py-2.5 text-right">
                              {payment.state === "Registrado" ? (
                                 <Button size="sm" variant="outline" onClick={() => paymentsApi.companyId && setPaymentSelection({ companyId: paymentsApi.companyId, payment })}>
                                  <Undo2 className="size-3" /> Anular
                                </Button>
                              ) : null}
                            </td>
                          </tr>
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

      <CobroFormDialog
        open={selectedInvoice != null}
        onOpenChange={(open) => { if (!open) setInvoiceSelection(null) }}
        invoice={selectedInvoice}
        onSubmit={registerPayment}
        submitting={paymentsApi.mutatingId === "__create__"}
      />

      <AlertDialog open={paymentToCancel != null} onOpenChange={(open) => { if (!open) setPaymentSelection(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular cobro operativo</AlertDialogTitle>
            <AlertDialogDescription>
              Se anulará el cobro backend {paymentToCancel?.visibleNumber}. Los saldos de sus facturas serán recalculados por el backend.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paymentsApi.mutatingId === paymentToCancel?.id}>Conservar cobro</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={paymentsApi.mutatingId === paymentToCancel?.id}
              onClick={() => void cancelPayment()}
            >
              Confirmar anulación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SurgeryDrawer />
    </div>
  )
}
