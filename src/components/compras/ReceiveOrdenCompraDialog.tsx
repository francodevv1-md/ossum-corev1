"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OrdenCompraApiRow, ReceiveOrdenCompraPayload } from "@/lib/api/ordenes-compra"
import { ApiClientError } from "@/lib/api/client"

function remainingQuantity(quantity: string, received: string) {
  return Math.max(0, Number(quantity) - Number(received))
}

const policies = ["NONE", "LOT", "LOT_EXPIRY", "SERIAL", "SERIAL_EXPIRY", "LOT_SERIAL_EXPIRY"] as const
export type ReceiptTracePolicy = typeof policies[number]

// Article endpoints return the latest policy first; absent metadata is never NONE.
export function readReceiptTracePolicy(article: unknown): ReceiptTracePolicy | undefined {
  const rows = (article as { tracePolicies?: Array<{ policy?: unknown }> } | null)?.tracePolicies
  const policy = rows?.[0]?.policy
  return policies.find(value => value === policy)
}

function quantityUnits(value: string): bigint | null {
  if (!/^\d+(\.\d{1,4})?$/.test(value)) return null
  const [whole, fraction = ""] = value.split(".")
  return BigInt(whole) * BigInt(10000) + BigInt(fraction.padEnd(4, "0"))
}

function allocationTotal(rows: Array<{ quantity: string }>): string {
  let total = BigInt(0)
  for (const row of rows) {
    const value = quantityUnits(row.quantity)
    if (value === null) return ""
    total += value
  }
  const fraction = (total % BigInt(10000)).toString().padStart(4, "0").replace(/0+$/, "")
  return `${total / BigInt(10000)}${fraction ? `.${fraction}` : ""}`
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

type AllocationInput = { id: string; quantity: string; lotCode: string; serialNumber: string; expirationDate: string }

export function ReceiveOrdenCompraDialog({ open, onOpenChange, ordenCompra, onSubmit, tracePolicies }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ordenCompra: OrdenCompraApiRow | null
  onSubmit: (payload: ReceiveOrdenCompraPayload) => Promise<void>
  tracePolicies?: Readonly<Record<string, ReceiptTracePolicy | undefined>>
}) {
  const [quantities, setQuantities] = React.useState<Record<string, string>>({})
  const [allocations, setAllocations] = React.useState<Record<string, AllocationInput[]>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [location, setLocation] = React.useState("")
  const [uncertain, setUncertain] = React.useState(false)
  const attempt = React.useRef<ReceiveOrdenCompraPayload | null>(null)

  React.useEffect(() => {
    if (open && ordenCompra && !attempt.current) {
      setQuantities(Object.fromEntries(ordenCompra.items.map(item => [item.id, "0"])))
      setAllocations({})
      setError(null)
      setLocation("")
      setUncertain(false)
    }
  }, [open, ordenCompra?.id])

  const policyKnown = !!ordenCompra && ordenCompra.items.every(item => policies.includes(tracePolicies?.[item.id] as ReceiptTracePolicy))
  const frozen = submitting || uncertain
  const today = new Date().toISOString().slice(0, 10)
  const updateAllocation = (itemId: string, rowId: string, field: keyof Omit<AllocationInput, "id">, value: string) => {
    if (frozen) return
    setAllocations(current => ({ ...current, [itemId]: (current[itemId] ?? []).map(row => row.id === rowId ? { ...row, [field]: value } : row) }))
  }

  const submit = async () => {
    if (!ordenCompra || submitting) return
    if (!attempt.current) {
    if (!policyKnown) return setError("No se pudo verificar la política de trazabilidad de todos los artículos.")
    const receivedByItem: ReceiveOrdenCompraPayload["receivedByItem"] = []
    for (const item of ordenCompra.items) {
      const policy = tracePolicies![item.id]!
      const rows = allocations[item.id] ?? []
      if (policy === "NONE") {
        if (rows.length) return setError("La política del artículo cambió. Eliminá las asignaciones antes de continuar.")
        receivedByItem.push({ itemId: item.id, received: quantities[item.id] ?? "" })
        continue
      }
      const lot = policy.includes("LOT"), serial = policy.includes("SERIAL"), expiry = policy.includes("EXPIRY")
      if (rows.some(row => quantityUnits(row.quantity) === null || quantityUnits(row.quantity)! <= BigInt(0) || (serial && row.quantity !== "1") || (lot && !row.lotCode.trim()) || (serial && !row.serialNumber.trim()) || (expiry && !validDate(row.expirationDate)) || (!lot && !!row.lotCode) || (!serial && !!row.serialNumber) || (!expiry && !!row.expirationDate)))
        return setError("Completá cada asignación con cantidad positiva y lote, serie o fecha válida según la política del artículo.")
      receivedByItem.push({ itemId: item.id, received: allocationTotal(rows), ...(rows.length ? { allocations: rows.map(row => ({ quantity: row.quantity, ...(lot ? { lotCode: row.lotCode.trim() } : {}), ...(serial ? { serialNumber: row.serialNumber.trim() } : {}), ...(expiry ? { expirationDate: row.expirationDate } : {}) })) } : {}) })
    }
    const valid = receivedByItem.every(({ itemId, received }) => {
      const value = Number(received)
      const item = ordenCompra.items.find(candidate => candidate.id === itemId)
      const units = quantityUnits(String(received))
      const ordered = item && quantityUnits(item.quantity), alreadyReceived = item && quantityUnits(item.received)
      return item && units !== null && ordered != null && alreadyReceived != null && Number.isFinite(value) && value >= 0 && units <= ordered - alreadyReceived
    })
    if (!valid) return setError("Ingresá cantidades válidas, sin superar el saldo pendiente de cada artículo.")
    if (!receivedByItem.some(({ received }) => Number(received) > 0)) return setError("Ingresá una cantidad mayor a cero para al menos un artículo.")
    if (!location.trim()) return setError("Ingresá un destino explícito para el stock recibido.")
    attempt.current = { receivedByItem, location: location.trim(), operationKey: crypto.randomUUID() }
    }

    setSubmitting(true)
    try {
      await onSubmit(attempt.current)
      attempt.current = null
      setUncertain(false)
      onOpenChange(false)
    } catch (cause) {
      // A transport/server/refresh failure may follow an accepted commit. Freeze intent until replay reconciles it.
      const rejected = !uncertain && cause instanceof ApiClientError && cause.status >= 400 && cause.status < 500
      if (rejected) attempt.current = null
      setUncertain(!rejected)
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la recepción.")
    } finally {
      setSubmitting(false)
    }
  }

  const changeOpen = (value: boolean) => { if (value || !attempt.current) onOpenChange(value) }
  return <Dialog open={open} onOpenChange={changeOpen}>
     <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Registrar recepción</DialogTitle><DialogDescription>Indicá las cantidades recibidas y el destino físico del stock.</DialogDescription></DialogHeader>
      {ordenCompra && <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ordenCompra.id} — {ordenCompra.proveedorName}</p>
        <div><Label htmlFor="receipt-location">Destino del stock</Label><Input id="receipt-location" value={location} disabled={submitting || uncertain} onChange={event => setLocation(event.target.value)} /></div>
        {ordenCompra.items.map(item => {
          const remaining = remainingQuantity(item.quantity, item.received)
          const policy = tracePolicies?.[item.id]
          const known = policies.includes(policy as ReceiptTracePolicy)
          const tracked = known && policy !== "NONE"
          const rows = allocations[item.id] ?? []
          const serial = !!policy?.includes("SERIAL"), lot = !!policy?.includes("LOT"), expiry = !!policy?.includes("EXPIRY")
          return <div key={item.id} data-testid={`receipt-item-${item.id}`} className="space-y-3 border-b pb-3">
            <div className="grid grid-cols-[1fr_9rem] items-end gap-3">
            <div><Label htmlFor={`received-${item.id}`}>{item.name}</Label><p className="text-xs text-muted-foreground">Pendiente: {remaining} de {item.quantity}</p></div>
            <Input id={`received-${item.id}`} aria-label={`Recibir ${item.name}`} type="number" min="0" max={remaining} step="0.0001" readOnly={tracked} disabled={frozen || !known} value={tracked ? allocationTotal(rows) : quantities[item.id] ?? "0"} onChange={event => setQuantities(current => ({ ...current, [item.id]: event.target.value }))} />
            </div>
            {!known && <p role="status" className="text-sm">Política de trazabilidad pendiente o no disponible. La recepción está bloqueada hasta verificarla.</p>}
            {(tracked || rows.length > 0) && <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{serial ? "Una asignación por unidad; cantidad fija: 1." : "El total recibido se calcula a partir de las asignaciones."}</p>
              {rows.map((row, index) => <div key={row.id} data-testid={`receipt-allocation-${item.id}-${index}`} className="grid gap-2 rounded border p-3 sm:grid-cols-2">
                <div><Label htmlFor={`allocation-quantity-${row.id}`}>Cantidad — {item.name}, asignación {index + 1}</Label><Input id={`allocation-quantity-${row.id}`} type="number" min="0.0001" step="0.0001" readOnly={serial} disabled={frozen || !known} value={row.quantity} onChange={event => updateAllocation(item.id, row.id, "quantity", event.target.value)} /></div>
                {(lot || row.lotCode) && <div><Label htmlFor={`allocation-lot-${row.id}`}>Lote — {item.name}, asignación {index + 1}</Label><Input id={`allocation-lot-${row.id}`} required={lot} disabled={frozen || !known} value={row.lotCode} onChange={event => updateAllocation(item.id, row.id, "lotCode", event.target.value)} /></div>}
                {(serial || row.serialNumber) && <div><Label htmlFor={`allocation-serial-${row.id}`}>Número de serie — {item.name}, asignación {index + 1}</Label><Input id={`allocation-serial-${row.id}`} required={serial} disabled={frozen || !known} value={row.serialNumber} onChange={event => updateAllocation(item.id, row.id, "serialNumber", event.target.value)} /></div>}
                {(expiry || row.expirationDate) && <div><Label htmlFor={`allocation-expiry-${row.id}`}>Vencimiento — {item.name}, asignación {index + 1}</Label><Input id={`allocation-expiry-${row.id}`} type="date" required={expiry} disabled={frozen || !known} value={row.expirationDate} onChange={event => updateAllocation(item.id, row.id, "expirationDate", event.target.value)} /></div>}
                {validDate(row.expirationDate) && row.expirationDate < today && <p role="alert" className="text-sm text-amber-700 sm:col-span-2">Material vencido: la recepción se registrará y generará un aviso</p>}
                <Button variant="outline" disabled={frozen || !known} aria-label={`Eliminar asignación ${index + 1} de ${item.name}`} onClick={() => setAllocations(current => ({ ...current, [item.id]: (current[item.id] ?? []).filter(candidate => candidate.id !== row.id) }))}>Eliminar</Button>
              </div>)}
              {tracked && <Button variant="outline" disabled={frozen} aria-label={`Agregar asignación de ${item.name}`} onClick={() => setAllocations(current => ({ ...current, [item.id]: [...(current[item.id] ?? []), { id: crypto.randomUUID(), quantity: serial ? "1" : "", lotCode: "", serialNumber: "", expirationDate: "" }] }))}>Agregar asignación</Button>}
            </div>}
          </div>
        })}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {uncertain && <p role="status" className="text-sm">Resultado pendiente de reconciliación. Reintentá la misma recepción para verificarla; las cantidades y el destino se conservan.</p>}
      </div>}
       <DialogFooter><Button variant="outline" disabled={frozen} onClick={() => changeOpen(false)}>Cancelar</Button><Button disabled={!ordenCompra || submitting || (!uncertain && !policyKnown)} onClick={() => void submit()}>{uncertain ? "Reconciliar recepción" : "Registrar recepción"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
