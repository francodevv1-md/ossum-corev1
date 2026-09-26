"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { AlertCircle, Banknote, FilePlus2, FileSearch, FileText, FolderOpen, Info, Mail, Receipt, Send } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { CobroFormDialog } from "@/components/cobros/CobroFormDialog"
import { FiscalEvidenceDialog } from "@/components/facturacion/FiscalEvidenceDialog"
import { SendExistingFinancialDocumentDialog } from "@/components/email/SendExistingFinancialDocumentDialog"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { SearchInput, StateBadge, StatsCard, SurgeryDrawer } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInvoices } from "@/hooks/useInvoices"
import { usePayments } from "@/hooks/usePayments"
import { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries"
import type { InvoiceApiRow, InvoiceState } from "@/lib/api/invoices"
import type { CreateInvoicePaymentPayload } from "@/lib/api/payments"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { canSendFinancialDocumentEmail } from "@/lib/permissions/financial-document-email"
import { formatDate } from "@/lib/formatters"

type StateTab = "all" | InvoiceState

const STATE_TABS: Array<{ value: StateTab; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "Borrador", label: "Borrador" },
  { value: "Emitida", label: "Emitida" },
  { value: "Parcialmente_cobrada", label: "Cobro parcial" },
  { value: "Cobrada", label: "Cobrada" },
  { value: "Anulada", label: "Anulada" },
]

function referenceOf(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return ""
  const reference = (metadata as Record<string, unknown>).reference
  return typeof reference === "string" ? reference : ""
}

function invoiceNumber(invoice: InvoiceApiRow) {
  return invoice.visibleNumber == null ? `Borrador · ${invoice.id.slice(0, 8)}` : `FV ${invoice.visibleNumber}`
}

function surgeryLabel(id: string | null) {
  return id ? `Cirugía ${id}` : "Sin cirugía vinculada"
}

export default function FacturacionPage() {
  const invoicesApi = useInvoices()
  const paymentsApi = usePayments(undefined, false)
  const { activeCompany, currentAccess } = useAuth()
  const { openExpediente } = useExpedienteDrawer()
  const [search, setSearch] = useState("")
  const [activeState, setActiveState] = useState<StateTab>("all")
  const [draftOpen, setDraftOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [surgeryId, setSurgeryId] = useState("__none__")
  const [reference, setReference] = useState("")
  const [draftError, setDraftError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [paymentSelection, setPaymentSelection] = useState<{ companyId: string; invoice: InvoiceApiRow } | null>(null)
  const [fiscalEvidenceSelection, setFiscalEvidenceSelection] = useState<{ companyId: string; invoice: InvoiceApiRow } | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [storedSurgeries, setStoredSurgeries] = useState<{ companyId: string; rows: Awaited<ReturnType<typeof fetchBackendActiveSurgeries>> }>({ companyId: "", rows: [] })
  const surgeries = storedSurgeries.companyId === activeCompany?.id ? storedSurgeries.rows : []
  const paymentInvoice = paymentSelection && paymentSelection.companyId === invoicesApi.companyId ? paymentSelection.invoice : null
  const fiscalEvidenceSelectionForActiveCompany = fiscalEvidenceSelection?.companyId === invoicesApi.companyId ? fiscalEvidenceSelection : null

  useEffect(() => {
    return () => setFiscalEvidenceSelection(null)
  }, [invoicesApi.companyId])

  useEffect(() => {
    const companyId = activeCompany?.id
    if (!companyId) return
    let active = true
    void fetchBackendActiveSurgeries(companyId)
      .then((rows) => { if (active) setStoredSurgeries({ companyId, rows }) })
      .catch(() => { if (active) setStoredSurgeries({ companyId, rows: [] }) })
    return () => { active = false }
  }, [activeCompany?.id])

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es")
    return invoicesApi.invoices.filter((invoice) => {
      if (activeState !== "all" && invoice.state !== activeState) return false
      if (!query) return true
      return [
        invoice.visibleNumber == null ? "" : String(invoice.visibleNumber),
        ...invoice.items.map((item) => item.description),
        referenceOf(invoice.metadata),
        surgeryLabel(invoice.surgeryId),
      ].some((value) => value.toLocaleLowerCase("es").includes(query))
    })
  }, [activeState, invoicesApi.invoices, search])

  const totals = useMemo(() => invoicesApi.invoices.reduce((result, invoice) => {
    if (invoice.state !== "Borrador" && invoice.state !== "Anulada") result.emitted += parseDecimalScale4(invoice.total) ?? BigInt(0)
    if (invoice.state !== "Anulada") result.collected += parseDecimalScale4(invoice.paidTotal) ?? BigInt(0)
    if (invoice.state === "Emitida" || invoice.state === "Parcialmente_cobrada") result.outstanding += parseDecimalScale4(invoice.balance) ?? BigInt(0)
    return result
  }, { emitted: BigInt(0), collected: BigInt(0), outstanding: BigInt(0) }), [invoicesApi.invoices])

  const counts = useMemo(() => new Map(STATE_TABS.map((tab) => [
    tab.value,
    tab.value === "all" ? invoicesApi.invoices.length : invoicesApi.invoices.filter((invoice) => invoice.state === tab.value).length,
  ])), [invoicesApi.invoices])

  const resetDraft = () => {
    setDescription("")
    setAmount("")
    setSurgeryId("__none__")
    setReference("")
    setDraftError(null)
  }

  const createDraft = async (event: FormEvent) => {
    event.preventDefault()
    const parsedAmount = parseDecimalScale4(amount)
    if (!description.trim()) {
      setDraftError("La descripción es obligatoria.")
      return
    }
    if (parsedAmount === null || parsedAmount <= BigInt(0)) {
      setDraftError("Ingresá un importe mayor que cero, con hasta 14 enteros y 4 decimales.")
      return
    }
    setDraftError(null)
    try {
      await invoicesApi.create({
        description: description.trim(),
        amount,
        surgeryId: surgeryId === "__none__" ? undefined : surgeryId,
        reference: reference.trim() || undefined,
      })
      setDraftOpen(false)
      resetDraft()
      toast.success("Borrador operativo creado")
    } catch (cause) {
      setDraftError(cause instanceof Error ? cause.message : "No se pudo crear el borrador.")
    }
  }

  const emit = async (invoice: InvoiceApiRow) => {
    setActionError(null)
    try {
      await invoicesApi.emit(invoice.id)
      toast.success("Factura operativa emitida; el número fue asignado por el backend")
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo emitir la factura.")
    }
  }

  const registerPayment = async (payload: CreateInvoicePaymentPayload) => {
    setActionError(null)
    try {
      await paymentsApi.create(payload)
      await invoicesApi.refresh()
      toast.success("Cobro operativo registrado")
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo registrar el cobro."
      setActionError(message)
      throw cause
    }
  }

  const pageError = actionError ?? invoicesApi.error ?? paymentsApi.error

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Facturación operativa</h1>
          <p className="text-sm text-muted-foreground">Borradores, emisión y cobranza respaldados por el backend.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSendFinancialDocumentEmail(currentAccess?.role) ? (
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="size-4" /> Enviar existente
            </Button>
          ) : null}
          <Button size="sm" onClick={() => { resetDraft(); setDraftOpen(true) }}>
            <FilePlus2 className="size-4" /> Nuevo borrador
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Documentos operativos y no fiscales</AlertTitle>
        <AlertDescription>
          Esta pantalla registra facturas internas. No emite comprobantes fiscales ni informa CAE.
        </AlertDescription>
      </Alert>

      {pageError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>No se pudo completar la operación</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{pageError}</span>
            {invoicesApi.error ? <Button size="sm" variant="outline" onClick={() => void invoicesApi.refresh()}>Reintentar</Button> : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total emitido operativo" value={formatDecimalCurrency(totals.emitted)} icon={Receipt} />
        <StatsCard title="Cobrado registrado" value={formatDecimalCurrency(totals.collected)} icon={Banknote} />
        <StatsCard title="Saldo operativo" value={formatDecimalCurrency(totals.outstanding)} icon={FileText} />
        <StatsCard title="Registros backend" value={invoicesApi.invoices.length} icon={FileText} />
      </div>

      <Card>
        <CardContent className="pt-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Número, descripción, referencia o cirugía"
            className="w-full sm:max-w-md"
          />
        </CardContent>
      </Card>

      <Tabs value={activeState} onValueChange={(value) => setActiveState(value as StateTab)}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          {STATE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label} <span className="text-[10px] opacity-60">({counts.get(tab.value)})</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeState}>
          <Card>
            <CardContent className="p-0">
              {invoicesApi.loading ? (
                <p className="p-10 text-center text-sm text-muted-foreground" role="status">Cargando facturas operativas…</p>
              ) : filteredInvoices.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  {invoicesApi.invoices.length === 0 ? "No hay facturas operativas registradas." : "No hay resultados para este filtro."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Factura</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Descripción</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Cirugía</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Cobrado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Saldo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Estado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => {
                        const canCollect = (parseDecimalScale4(invoice.balance) ?? BigInt(0)) > BigInt(0) && (invoice.state === "Emitida" || invoice.state === "Parcialmente_cobrada")
                        return (
                          <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-2.5 font-mono font-medium">
                              <div>{invoiceNumber(invoice)}</div>
                              {referenceOf(invoice.metadata) ? <div className="text-xs font-sans text-muted-foreground">Ref. {referenceOf(invoice.metadata)}</div> : null}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(invoice.issuedAt ?? invoice.createdAt)}</td>
                            <td className="max-w-64 px-3 py-2.5">
                              <span className="line-clamp-2">{invoice.items.map((item) => item.description).join(" · ") || "Sin descripción"}</span>
                            </td>
                            <td className="px-3 py-2.5">{surgeryLabel(invoice.surgeryId)}</td>
                            <td className="px-3 py-2.5 text-right font-medium">{formatDecimalCurrency(invoice.total)}</td>
                            <td className="px-3 py-2.5 text-right text-emerald-700">{formatDecimalCurrency(invoice.paidTotal)}</td>
                            <td className="px-3 py-2.5 text-right font-medium">{formatDecimalCurrency(invoice.balance)}</td>
                            <td className="px-3 py-2.5"><StateBadge status={invoice.state} /></td>
                            <td className="px-3 py-2.5">
                              <div className="flex justify-end gap-1">
                                {invoice.state === "Borrador" ? (
                                  <Button size="sm" variant="outline" disabled={invoicesApi.mutatingId === invoice.id} onClick={() => void emit(invoice)}>
                                    <Send className="size-3" /> Emitir
                                  </Button>
                                ) : null}
                                 {canCollect ? (
                                  <Button size="sm" variant="outline" onClick={() => invoicesApi.companyId && setPaymentSelection({ companyId: invoicesApi.companyId, invoice })}>
                                    <Banknote className="size-3" /> Cobrar
                                  </Button>
                                 ) : null}
                                 <Button size="sm" variant="ghost" onClick={() => invoicesApi.companyId && setFiscalEvidenceSelection({ companyId: invoicesApi.companyId, invoice })}>
                                   <FileSearch className="size-3" /> Evidencia fiscal
                                 </Button>
                                 {invoice.surgeryId ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Ver ${surgeryLabel(invoice.surgeryId)}`}
                                    onClick={() => { if (invoice.surgeryId) openExpediente(invoice.surgeryId) }}
                                  >
                                    <FolderOpen className="size-4" />
                                  </Button>
                                ) : null}
                              </div>
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

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo borrador operativo</DialogTitle>
            <DialogDescription>Una línea manual. El número visible será asignado únicamente al emitir.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createDraft} noValidate>
            {draftError ? <p className="text-sm text-destructive" role="alert">{draftError}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="invoice-description">Descripción</Label>
              <Input id="invoice-description" value={description} onChange={(event) => setDescription(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-amount">Importe</Label>
              <Input id="invoice-amount" type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-surgery">Cirugía vinculada (opcional)</Label>
              <Select value={surgeryId} onValueChange={setSurgeryId}>
                <SelectTrigger id="invoice-surgery"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cirugía vinculada</SelectItem>
                  {surgeries.map((surgery) => surgery.backendId ? (
                    <SelectItem key={surgery.backendId} value={surgery.backendId}>{surgery.id} · {surgery.patient}</SelectItem>
                  ) : null)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-reference">Referencia interna (opcional)</Label>
              <Input id="invoice-reference" value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDraftOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={invoicesApi.mutatingId === "__create__"}>Guardar borrador</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CobroFormDialog
        open={paymentInvoice != null}
        onOpenChange={(open) => { if (!open) setPaymentSelection(null) }}
        invoice={paymentInvoice}
        onSubmit={registerPayment}
        submitting={paymentsApi.mutatingId === "__create__"}
      />

      {fiscalEvidenceSelectionForActiveCompany ? <FiscalEvidenceDialog
        key={fiscalEvidenceSelectionForActiveCompany.invoice.id}
        companyId={fiscalEvidenceSelectionForActiveCompany.companyId}
        invoiceId={fiscalEvidenceSelectionForActiveCompany.invoice.id}
        invoiceLabel={invoiceNumber(fiscalEvidenceSelectionForActiveCompany.invoice)}
        open
        onOpenChange={(open) => { if (!open) setFiscalEvidenceSelection(null) }}
      /> : null}

      {emailOpen ? <SendExistingFinancialDocumentDialog kind="invoice" onOpenChange={setEmailOpen} /> : null}
      <SurgeryDrawer />
    </div>
  )
}
