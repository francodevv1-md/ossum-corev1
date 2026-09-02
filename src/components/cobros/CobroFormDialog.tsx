"use client"

import { useState, type FormEvent } from "react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import type { CreateInvoicePaymentPayload, PaymentMethod } from "@/lib/api/payments"
import { parseDecimalScale4 } from "@/lib/decimal-money"
import { AlertCircle, Info } from "lucide-react"

type CobroFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceApiRow | null
  onSubmit: (payload: CreateInvoicePaymentPayload) => Promise<unknown> | unknown
  submitting?: boolean
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" },
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

export function CobroFormDialog({ open, onOpenChange, invoice, onSubmit, submitting = false }: CobroFormDialogProps) {
  const invoiceLabel = invoice?.visibleNumber ? `FV ${invoice.visibleNumber}` : "Factura sin número visible"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
          <DialogDescription>
            {invoiceLabel} · Saldo pendiente: {invoice?.currency ?? "ARS"} {invoice?.balance ?? "0"}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <CobroPaymentForm
            key={invoice?.id ?? "no-invoice"}
            invoice={invoice}
            onSubmit={onSubmit}
            onOpenChange={onOpenChange}
            submitting={submitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CobroPaymentForm({ invoice, onSubmit, onOpenChange, submitting }: Omit<CobroFormDialogProps, "open">) {
  const balance = parseDecimalScale4(invoice?.balance ?? "")
  const [amount, setAmount] = useState(balance !== null && balance > BigInt(0) ? invoice?.balance ?? "" : "")
  const [method, setMethod] = useState<PaymentMethod>("transfer")
  const [receivedAt, setReceivedAt] = useState(today)
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!invoice) return
    const trimmedAmount = amount.trim()
    if (trimmedAmount.startsWith("-")) {
      setError("El importe debe ser mayor que cero.")
      return
    }
    const parsedAmount = parseDecimalScale4(trimmedAmount)
    if (parsedAmount === null) {
      setError("Ingresá un importe decimal válido, con hasta 14 enteros y 4 decimales.")
      return
    }
    if (parsedAmount <= BigInt(0)) {
      setError("El importe debe ser mayor que cero.")
      return
    }
    if (balance === null) {
      setError("El saldo backend no tiene un formato decimal válido.")
      return
    }
    if (parsedAmount > balance) {
      setError("El importe no puede superar el saldo pendiente de la factura.")
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
        invoiceId: invoice.id,
        surgeryId: invoice.surgeryId ?? undefined,
        amount: trimmedAmount,
        method,
        receivedAt: receivedAtIso,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el cobro.")
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || submitting

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Registro operativo no fiscal</AlertTitle>
            <AlertDescription>
              Este cobro se imputa únicamente a esta factura operativa. No emite comprobantes fiscales.
            </AlertDescription>
          </Alert>

          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Importe recibido</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                max={balance !== null ? invoice?.balance : undefined}
                step="0.0001"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Fecha del cobro</Label>
              <Input
                id="payment-date"
                type="date"
                value={receivedAt}
                onChange={(event) => setReceivedAt(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Medio de cobro</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-reference">Referencia interna</Label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Transferencia, cheque u otra referencia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notas</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observaciones internas opcionales"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!invoice || busy}>
              {busy ? "Registrando…" : "Registrar cobro"}
            </Button>
          </DialogFooter>
    </form>
  )
}
