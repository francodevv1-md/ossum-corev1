"use client"

import React, { useMemo, useState, type FormEvent } from "react"
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  DollarSign,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { CreatePaymentPayload, PaymentMethod } from "@/lib/api/payments"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type CobroFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoices: InvoiceApiRow[]
  initialInvoice?: InvoiceApiRow | null
  onSubmit: (payload: CreatePaymentPayload) => Promise<unknown> | unknown
  submitting?: boolean
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "transfer", label: "Transferencia bancaria" },
  { value: "cash", label: "Efectivo" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro medio" },
]

function today() {
  const value = new Date()
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function localNoonIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 12)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date.toISOString()
}

function invoiceLabel(invoice: InvoiceApiRow) {
  return invoice.visibleNumber == null ? `Factura backend ${invoice.id}` : `FV ${invoice.visibleNumber}`
}

export function CobroFormDialog({
  open,
  onOpenChange,
  invoices,
  initialInvoice,
  onSubmit,
  submitting = false,
}: CobroFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Banknote className="size-5 text-emerald-600" />
            Registrar cobro operativo multi-imputación
          </DialogTitle>
          <DialogDescription>
            Distribuí el importe cobrado entre una o varias facturas abiertas. Los saldos se actualizarán desde backend.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <CobroMultiImputationForm
            invoices={invoices}
            initialInvoice={initialInvoice}
            onSubmit={onSubmit}
            onOpenChange={onOpenChange}
            submitting={submitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CobroMultiImputationForm({
  invoices,
  initialInvoice,
  onSubmit,
  onOpenChange,
  submitting,
}: {
  invoices: InvoiceApiRow[]
  initialInvoice?: InvoiceApiRow | null
  onSubmit: (payload: CreatePaymentPayload) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  submitting: boolean
}) {
  // Candidate open invoices with positive balance
  const openInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        (parseDecimalScale4(inv.balance) ?? BigInt(0)) > BigInt(0) &&
        inv.state !== "Anulada" &&
        inv.state !== "Borrador"
    )
  }, [invoices])

  const initialAmount = useMemo(() => {
    if (initialInvoice) {
      const bal = parseDecimalScale4(initialInvoice.balance)
      if (bal !== null && bal > BigInt(0)) return initialInvoice.balance
    }
    return ""
  }, [initialInvoice])

  const [totalAmount, setTotalAmount] = useState(initialAmount)
  const [method, setMethod] = useState<PaymentMethod>("transfer")
  const [receivedAt, setReceivedAt] = useState(today)
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  // Allocations map: invoiceId -> string amount
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    if (initialInvoice) {
      const bal = parseDecimalScale4(initialInvoice.balance)
      if (bal !== null && bal > BigInt(0)) {
        return { [initialInvoice.id]: initialInvoice.balance }
      }
    }
    return {}
  })

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Decimal math calculations
  const parsedTotalAmount = useMemo(() => parseDecimalScale4(totalAmount) ?? BigInt(0), [totalAmount])

  const { totalImputedUnits, hasOverAllocationPerInvoice, imputationList } = useMemo(() => {
    let sum = BigInt(0)
    let hasOver = false
    const list: Array<{ invoiceId: string; amount: string; units: bigint }> = []

    for (const [invId, strVal] of Object.entries(allocations)) {
      const trimmed = strVal.trim()
      if (!trimmed) continue
      const units = parseDecimalScale4(trimmed)
      if (units !== null && units > BigInt(0)) {
        sum += units
        list.push({ invoiceId: invId, amount: trimmed, units })

        const targetInvoice = openInvoices.find((inv) => inv.id === invId)
        const invBalance = parseDecimalScale4(targetInvoice?.balance ?? "") ?? BigInt(0)
        if (units > invBalance) {
          hasOver = true
        }
      }
    }

    return {
      totalImputedUnits: sum,
      hasOverAllocationPerInvoice: hasOver,
      imputationList: list,
    }
  }, [allocations, openInvoices])

  const unappliedUnits = parsedTotalAmount > totalImputedUnits ? parsedTotalAmount - totalImputedUnits : BigInt(0)
  const isOverTotal = totalImputedUnits > parsedTotalAmount

  // Helper to set allocation for a specific invoice
  const handleSetAllocation = (invoiceId: string, value: string) => {
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: value,
    }))
  }

  // Quick action: Allocate full balance to a specific invoice
  const handleAllocateFull = (invoice: InvoiceApiRow) => {
    handleSetAllocation(invoice.id, invoice.balance)
  }

  // Auto-distribute total amount sequentially across open invoices
  const handleAutoDistribute = () => {
    if (parsedTotalAmount <= BigInt(0)) {
      setError("Ingresá un importe total cobrado mayor a cero para auto-distribuir.")
      return
    }

    let remaining = parsedTotalAmount
    const newAllocations: Record<string, string> = {}

    for (const inv of openInvoices) {
      if (remaining <= BigInt(0)) break
      const invBalance = parseDecimalScale4(inv.balance) ?? BigInt(0)
      if (invBalance <= BigInt(0)) continue

      if (remaining >= invBalance) {
        newAllocations[inv.id] = inv.balance
        remaining -= invBalance
      } else {
        // Partial allocation format: (remaining / 10000).toFixed(4)
        const whole = remaining / BigInt(10000)
        const frac = remaining % BigInt(10000)
        newAllocations[inv.id] = `${whole}.${String(frac).padStart(4, "0")}`
        remaining = BigInt(0)
      }
    }

    setAllocations(newAllocations)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedTotal = totalAmount.trim()

    if (parsedTotalAmount <= BigInt(0)) {
      setError("El importe total cobrado debe ser mayor que cero.")
      return
    }

    if (isOverTotal) {
      setError("La suma de las imputaciones no puede superar el importe total cobrado.")
      return
    }

    if (hasOverAllocationPerInvoice) {
      setError("Una o más imputaciones superan el saldo pendiente de su respectiva factura.")
      return
    }

    const receivedAtIso = localNoonIso(receivedAt)
    if (!receivedAtIso) {
      setError("Seleccioná una fecha de cobro válida.")
      return
    }

    setError(null)
    setSaving(true)

    try {
      await onSubmit({
        amount: trimmedTotal,
        method,
        currency: "ARS",
        receivedAt: receivedAtIso,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        surgeryId: initialInvoice?.surgeryId ?? undefined,
        imputations: imputationList.map((imp) => ({
          invoiceId: imp.invoiceId,
          amount: imp.amount,
        })),
      })
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el cobro.")
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || submitting
  const canSubmit = parsedTotalAmount > BigInt(0) && !isOverTotal && !hasOverAllocationPerInvoice && !busy

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Alert>
        <Info className="size-4" />
        <AlertTitle>Registro operativo en cuenta corriente</AlertTitle>
        <AlertDescription>
          El importe recibido se distribuirá entre las facturas seleccionadas. Los saldos de las facturas se recalcularán automáticamente en el backend.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Header Fields: Total Amount, Date, Method */}
      <div className="grid gap-3 sm:grid-cols-3 bg-muted/20 p-3.5 rounded-lg border">
        <div className="space-y-1.5">
          <Label htmlFor="payment-total-amount" className="text-xs font-semibold">
            Importe total recibido <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="payment-total-amount"
              type="number"
              min="0"
              step="0.0001"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              placeholder="0.00"
              className="pl-8 font-semibold text-sm"
              inputMode="decimal"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-date" className="text-xs font-semibold">
            Fecha del cobro <span className="text-red-500">*</span>
          </Label>
          <Input
            id="payment-date"
            type="date"
            value={receivedAt}
            onChange={(event) => setReceivedAt(event.target.value)}
            className="text-xs"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-method" className="text-xs font-semibold">
            Medio de cobro
          </Label>
          <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
            <SelectTrigger id="payment-method" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reference & Notes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="payment-reference" className="text-xs">
            Referencia interna (transferencia, cheque, etc.)
          </Label>
          <Input
            id="payment-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Ej: Transf. Galicia #98421"
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-notes" className="text-xs">
            Observaciones
          </Label>
          <Input
            id="payment-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notas internas opcionales"
            className="text-xs"
          />
        </div>
      </div>

      {/* Multi-imputation Allocation Table */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Imputación a facturas abiertas ({openInvoices.length})
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ingresá el importe a aplicar a cada factura con saldo pendiente.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 self-start sm:self-auto"
            onClick={handleAutoDistribute}
            disabled={parsedTotalAmount <= BigInt(0)}
          >
            <Sparkles className="size-3 text-amber-600" />
            Auto-distribuir importe
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border bg-white dark:border-slate-800 dark:bg-slate-900/90">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/60 text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Factura</th>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-right font-medium">Total Factura</th>
                <th className="px-3 py-2 text-right font-medium">Saldo Pendiente</th>
                <th className="px-3 py-2 text-right font-medium w-40">Importe a imputar</th>
                <th className="px-2 py-2 text-center w-16">Acción</th>
              </tr>
            </thead>
            <tbody>
              {openInvoices.map((inv) => {
                const invBalance = parseDecimalScale4(inv.balance) ?? BigInt(0)
                const currentVal = allocations[inv.id] ?? ""
                const currentUnits = parseDecimalScale4(currentVal) ?? BigInt(0)
                const isOverInvoiceBalance = currentUnits > invBalance

                return (
                  <tr
                    key={inv.id}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/30 transition-colors",
                      currentUnits > BigInt(0) && "bg-emerald-50/20 dark:bg-emerald-950/10"
                    )}
                  >
                    <td className="px-3 py-2 font-mono font-medium">
                      {invoiceLabel(inv)}
                      {inv.surgeryId ? (
                        <span className="block text-[10px] font-sans text-muted-foreground">
                          Expediente {inv.surgeryId}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDate(inv.issuedAt ?? inv.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatDecimalCurrency(inv.total)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatDecimalCurrency(inv.balance)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="space-y-0.5">
                        <Input
                          type="number"
                          min="0"
                          max={inv.balance}
                          step="0.0001"
                          value={currentVal}
                          onChange={(e) => handleSetAllocation(inv.id, e.target.value)}
                          placeholder="0.00"
                          className={cn(
                            "h-7 text-right text-xs font-semibold tabular-nums",
                            isOverInvoiceBalance && "border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500"
                          )}
                        />
                        {isOverInvoiceBalance ? (
                          <span className="block text-[10px] text-red-600 text-left font-medium">
                            Supera saldo
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => handleAllocateFull(inv)}
                        title="Imputar todo el saldo"
                      >
                        Todo
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {openInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                    No hay facturas con saldo pendiente para imputar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Allocation Summary Bar */}
      <div className="grid gap-2.5 sm:grid-cols-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
        <div>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Total recibido
          </span>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {formatDecimalCurrency(parsedTotalAmount)}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Total imputado ({imputationList.length} facturas)
          </span>
          <p
            className={cn(
              "text-sm font-bold",
              isOverTotal ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {formatDecimalCurrency(totalImputedUnits)}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Saldo sin aplicar (excedente)
          </span>
          <p className="text-sm font-semibold text-muted-foreground">
            {formatDecimalCurrency(unappliedUnits)}
          </p>
        </div>
      </div>

      {isOverTotal && (
        <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
          <AlertCircle className="size-4" />
          La suma imputada supera el importe total cobrado por{" "}
          {formatDecimalCurrency(totalImputedUnits - parsedTotalAmount)}.
        </p>
      )}

      <DialogFooter className="gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {busy ? "Registrando cobro…" : "Registrar cobro"}
        </Button>
      </DialogFooter>
    </form>
  )
}
