"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OrdenCompraApiRow, ReceiveOrdenCompraPayload } from "@/lib/api/ordenes-compra"

function remainingQuantity(quantity: string, received: string) {
  return Math.max(0, Number(quantity) - Number(received))
}

export function ReceiveOrdenCompraDialog({ open, onOpenChange, ordenCompra, onSubmit }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ordenCompra: OrdenCompraApiRow | null
  onSubmit: (payload: ReceiveOrdenCompraPayload) => Promise<void>
}) {
  const [quantities, setQuantities] = React.useState<Record<string, string>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open && ordenCompra) {
      setQuantities(Object.fromEntries(ordenCompra.items.map(item => [item.id, "0"])))
      setError(null)
    }
  }, [open, ordenCompra])

  const submit = async () => {
    if (!ordenCompra) return
    const receivedByItem = ordenCompra.items.map(item => ({ itemId: item.id, received: quantities[item.id] ?? "" }))
    const valid = receivedByItem.every(({ itemId, received }) => {
      const value = Number(received)
      const item = ordenCompra.items.find(candidate => candidate.id === itemId)
      return item && Number.isFinite(value) && value >= 0 && value <= remainingQuantity(item.quantity, item.received)
    })
    if (!valid) return setError("Ingresá cantidades válidas, sin superar el saldo pendiente de cada artículo.")
    if (!receivedByItem.some(({ received }) => Number(received) > 0)) return setError("Ingresá una cantidad mayor a cero para al menos un artículo.")

    setSubmitting(true)
    try {
      await onSubmit({ receivedByItem })
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la recepción.")
    } finally {
      setSubmitting(false)
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>Registrar recepción</DialogTitle></DialogHeader>
      {ordenCompra && <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ordenCompra.id} — {ordenCompra.proveedorName}</p>
        {ordenCompra.items.map(item => {
          const remaining = remainingQuantity(item.quantity, item.received)
          return <div key={item.id} className="grid grid-cols-[1fr_9rem] items-end gap-3 border-b pb-3">
            <div><Label htmlFor={`received-${item.id}`}>{item.name}</Label><p className="text-xs text-muted-foreground">Pendiente: {remaining} de {item.quantity}</p></div>
            <Input id={`received-${item.id}`} aria-label={`Recibir ${item.name}`} type="number" min="0" max={remaining} step="any" value={quantities[item.id] ?? "0"} onChange={event => setQuantities(current => ({ ...current, [item.id]: event.target.value }))} />
          </div>
        })}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>}
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!ordenCompra || submitting} onClick={() => void submit()}>Registrar recepción</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
