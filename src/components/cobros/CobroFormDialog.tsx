"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { MEDIOS_COBRO_OPTIONS, MEDIO_COBRO_LABELS } from "@/lib/cobros.constants"
import {
  getSaldoPendienteFactura,
  getImporteNoImputadoCobro,
  getEstadoCobro,
  getImputacionesByCobroId,
  getFacturasAbiertasByCliente,
} from "@/lib/cobros.utils"
import type { Comprobante, CobroV2, MedioCobro } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// CobroFormDialog — Two contexts: "invoice" | "general"
// ═══════════════════════════════════════════════════════════════

interface CobroFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: "invoice" | "general"
  preselectedFactura?: Comprobante
  preselectedCobro?: CobroV2  // For adding imputación to existing cobro
  onSuccess?: (cobro: CobroV2) => void
}

export function CobroFormDialog({
  open,
  onOpenChange,
  context,
  preselectedFactura,
  preselectedCobro,
  onSuccess,
}: CobroFormDialogProps) {
  const store = useOrtoTrackStore()

  // ── Form state ──
  const [step, setStep] = useState(1)
  const [formCliente, setFormCliente] = useState("")
  const [formImporte, setFormImporte] = useState(0)
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0])
  const [formMedio, setFormMedio] = useState<MedioCobro>("transferencia")
  const [formReferencia, setFormReferencia] = useState("")
  const [formObservaciones, setFormObservaciones] = useState("")

  // Imputaciones state for general context (facturaId → importe)
  const [imputaciones, setImputaciones] = useState<Record<string, number>>({})

  // Reset form when dialog opens
  const resetForm = () => {
    setStep(1)
    setFormCliente("")
    setFormImporte(0)
    setFormFecha(new Date().toISOString().split("T")[0])
    setFormMedio("transferencia")
    setFormReferencia("")
    setFormObservaciones("")
    setImputaciones({})
  }

  // Pre-fill for invoice context
  React.useEffect(() => {
    if (open && context === "invoice" && preselectedFactura) {
      setFormCliente(preselectedFactura.client)
      const saldo = getSaldoPendienteFactura(preselectedFactura, store.imputaciones ?? [])
      setFormImporte(saldo)
      setImputaciones({ [preselectedFactura.number]: saldo })
    } else if (open && context === "general" && preselectedCobro) {
      // Adding imputación to existing cobro
      setFormCliente(preselectedCobro.clienteNombre)
      setFormImporte(getImporteNoImputadoCobro(preselectedCobro, store.imputaciones ?? []))
      setFormFecha(preselectedCobro.fecha)
      setFormMedio(preselectedCobro.medioCobro)
      setFormReferencia(preselectedCobro.referencia || "")
      setFormObservaciones(preselectedCobro.observaciones || "")
    } else if (open) {
      resetForm()
    }
  }, [open, context, preselectedFactura, preselectedCobro])

  // ── Facturas abiertas del cliente seleccionado ──
  const facturasAbiertas = useMemo(() => {
    if (context === "invoice" && preselectedFactura) {
      return [preselectedFactura]
    }
    if (!formCliente) return []
    return getFacturasAbiertasByCliente(formCliente, store.comprobantes, store.imputaciones ?? [])
  }, [context, preselectedFactura, formCliente, store.comprobantes, store.imputaciones])

  // ── Imputación totals ──
  const totalImputado = useMemo(() => {
    return Object.values(imputaciones).reduce((s, v) => s + v, 0)
  }, [imputaciones])

  const saldoNoImputado = Math.max(0, formImporte - totalImputado)

  // ── Validation ──
  const canSubmitInvoice = useMemo(() => {
    if (formImporte <= 0) return false
    if (!preselectedFactura) return false
    const saldo = getSaldoPendienteFactura(preselectedFactura, store.imputaciones ?? [])
    const impImporte = imputaciones[preselectedFactura.number] || 0
    if (impImporte <= 0) return false
    if (impImporte > saldo) return false
    return true
  }, [formImporte, preselectedFactura, imputaciones, store.imputaciones])

  const canSubmitGeneral = useMemo(() => {
    if (!formCliente) return false
    if (formImporte <= 0) return false
    if (totalImputado > formImporte) return false
    // Check each imputación doesn't exceed factura saldo
    for (const [facturaId, importe] of Object.entries(imputaciones)) {
      if (importe < 0) return false
      const fv = store.comprobantes.find((c) => c.type === "FV" && c.number === facturaId)
      if (fv) {
        const saldo = getSaldoPendienteFactura(fv, store.imputaciones ?? [])
        if (importe > saldo) return false
      }
    }
    return true
  }, [formCliente, formImporte, totalImputado, imputaciones, store.comprobantes, store.imputaciones])

  // ── Handlers ──
  const handleInvoiceSubmit = () => {
    if (!preselectedFactura || !canSubmitInvoice) return

    const impImporte = imputaciones[preselectedFactura.number] || 0
    const result = store.createCobroConImputaciones(
      {
        fecha: formFecha,
        clienteId: formCliente,
        clienteNombre: formCliente,
        importe: formImporte,
        medioCobro: formMedio,
        referencia: formReferencia || undefined,
        observaciones: formObservaciones || undefined,
      },
      [{ facturaId: preselectedFactura.number, importeImputado: impImporte }]
    )

    toast.success(`Cobro ${result.cobro.id} registrado — ${formatCurrency(impImporte)} imputados a ${preselectedFactura.number}`)
    onSuccess?.(result.cobro)
    onOpenChange(false)
    resetForm()
  }

  const handleGeneralSubmit = () => {
    if (!canSubmitGeneral) return

    const imputacionesData = Object.entries(imputaciones)
      .filter(([, importe]) => importe > 0)
      .map(([facturaId, importeImputado]) => ({ facturaId, importeImputado }))

    const result = store.createCobroConImputaciones(
      {
        fecha: formFecha,
        clienteId: formCliente,
        clienteNombre: formCliente,
        importe: formImporte,
        medioCobro: formMedio,
        referencia: formReferencia || undefined,
        observaciones: formObservaciones || undefined,
      },
      imputacionesData
    )

    const imputadoStr = imputacionesData
      .map((i) => `${formatCurrency(i.importeImputado)} → ${i.facturaId}`)
      .join(", ")

    toast.success(`Cobro ${result.cobro.id} registrado — ${imputadoStr}`)
    onSuccess?.(result.cobro)
    onOpenChange(false)
    resetForm()
  }

  const handleImputacionChange = (facturaId: string, value: string) => {
    const num = Number(value) || 0
    setImputaciones((prev) => ({ ...prev, [facturaId]: num }))
  }

  // Available clients from FV comprobantes
  const clientsFromFV = useMemo(() => {
    const clients = new Set<string>()
    store.comprobantes
      .filter((c) => c.type === "FV")
      .forEach((c) => clients.add(c.client))
    return Array.from(clients).sort()
  }, [store.comprobantes])

  // ── Render ──
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {context === "invoice"
              ? `Registrar cobro — ${preselectedFactura?.number || ""}`
              : preselectedCobro
                ? `Imputar saldo — ${preselectedCobro.id}`
                : "Nuevo Cobro"}
          </DialogTitle>
          <DialogDescription>
            {context === "invoice"
              ? `Cliente: ${preselectedFactura?.client || ""} — Saldo pendiente: ${formatCurrency(
                  preselectedFactura ? getSaldoPendienteFactura(preselectedFactura, store.imputaciones ?? []) : 0
                )}`
              : preselectedCobro
                ? `Cobro: ${preselectedCobro.id} — Saldo no imputado: ${formatCurrency(
                    getImporteNoImputadoCobro(preselectedCobro, store.imputaciones ?? [])
                  )}`
                : "Registrar un cobro y distribuirlo entre facturas"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Step 1: Cobro data ── */}
          <div className="space-y-3">
            {context === "general" && !preselectedCobro && (
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={formCliente} onValueChange={(v) => { setFormCliente(v); setImputaciones({}) }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientsFromFV.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Importe recibido *</Label>
                <Input
                  type="number"
                  value={formImporte || ""}
                  onChange={(e) => setFormImporte(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha del cobro</Label>
                <Input
                  type="date"
                  value={formFecha}
                  onChange={(e) => setFormFecha(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Medio de cobro</Label>
                <Select value={formMedio} onValueChange={(v) => setFormMedio(v as MedioCobro)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEDIOS_COBRO_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={formReferencia}
                  onChange={(e) => setFormReferencia(e.target.value)}
                  placeholder="Nº transferencia, cheque..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={formObservaciones}
                onChange={(e) => setFormObservaciones(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          {/* ── Step 2: Imputación (general context only) ── */}
          {context === "general" && formCliente && !preselectedCobro && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Distribuir entre facturas</h4>
                <Badge variant="outline" className="text-[10px]">
                  {facturasAbiertas.length} FV abierta{facturasAbiertas.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {facturasAbiertas.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No hay facturas abiertas para este cliente
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Factura</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Fecha</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Total</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Cobrado</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Saldo</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Imputar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturasAbiertas.map((fv) => {
                        const saldo = getSaldoPendienteFactura(fv, store.imputaciones ?? [])
                        const cobrado = fv.amount - saldo
                        const impValue = imputaciones[fv.number] || 0
                        const exceeds = impValue > saldo
                        return (
                          <tr key={fv.id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-xs font-medium">{fv.number}</td>
                            <td className="px-3 py-2 text-xs">{formatDate(fv.date)}</td>
                            <td className="px-3 py-2 text-right text-xs">{formatCurrency(fv.amount)}</td>
                            <td className="px-3 py-2 text-right text-xs text-emerald-700">{formatCurrency(cobrado)}</td>
                            <td className="px-3 py-2 text-right text-xs font-medium text-amber-700">{formatCurrency(saldo)}</td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                className={`h-8 text-xs text-right w-28 ${exceeds ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                                value={impValue || ""}
                                onChange={(e) => handleImputacionChange(fv.number, e.target.value)}
                                placeholder="0"
                                max={saldo}
                              />
                              {exceeds && (
                                <span className="text-[10px] text-red-600 flex items-center gap-0.5 mt-0.5">
                                  <AlertCircle className="size-3" /> Excede saldo
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary row */}
              <div className="flex items-center gap-4 rounded-md border bg-muted/30 px-4 py-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Recibido: </span>
                  <span className="font-semibold">{formatCurrency(formImporte)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Imputado: </span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(totalImputado)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sin imputar: </span>
                  <span className={`font-semibold ${saldoNoImputado > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {formatCurrency(saldoNoImputado)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Invoice context: simple imputación display */}
          {context === "invoice" && preselectedFactura && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Imputación a factura</h4>
              </div>
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono">{preselectedFactura.number}</span>
                  <span className="text-muted-foreground">{formatDate(preselectedFactura.date)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <p className="font-medium">{formatCurrency(preselectedFactura.amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cobrado</span>
                    <p className="font-medium text-emerald-700">
                      {formatCurrency(preselectedFactura.amount - getSaldoPendienteFactura(preselectedFactura, store.imputaciones ?? []))}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Saldo</span>
                    <p className="font-medium text-amber-700">
                      {formatCurrency(getSaldoPendienteFactura(preselectedFactura, store.imputaciones ?? []))}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Importe a imputar</Label>
                  <Input
                    type="number"
                    value={imputaciones[preselectedFactura.number] || ""}
                    onChange={(e) => handleImputacionChange(preselectedFactura.number, e.target.value)}
                    placeholder="0"
                    max={getSaldoPendienteFactura(preselectedFactura, store.imputaciones ?? [])}
                  />
                  {(imputaciones[preselectedFactura.number] || 0) > getSaldoPendienteFactura(preselectedFactura, store.imputaciones ?? []) && (
                    <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                      <AlertCircle className="size-3" /> El importe excede el saldo pendiente
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {context === "invoice" ? (
            <Button
              onClick={handleInvoiceSubmit}
              disabled={!canSubmitInvoice}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-4 mr-1" /> Registrar Cobro
            </Button>
          ) : (
            <Button
              onClick={handleGeneralSubmit}
              disabled={!canSubmitGeneral}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-4 mr-1" /> Registrar Cobro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// ImputarSaldoDialog — Add imputación to existing cobro
// ═══════════════════════════════════════════════════════════════

interface ImputarSaldoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cobro: CobroV2 | null
  onSuccess?: () => void
}

export function ImputarSaldoDialog({ open, onOpenChange, cobro, onSuccess }: ImputarSaldoDialogProps) {
  const store = useOrtoTrackStore()
  const [selectedFactura, setSelectedFactura] = useState("")
  const [importe, setImporte] = useState(0)

  React.useEffect(() => {
    if (open) {
      setSelectedFactura("")
      setImporte(0)
    }
  }, [open])

  if (!cobro) return null

  const saldoCobro = getImporteNoImputadoCobro(cobro, store.imputaciones ?? [])
  const facturasAbiertas = getFacturasAbiertasByCliente(cobro.clienteId, store.comprobantes, store.imputaciones ?? [])

  const handleAdd = () => {
    if (!selectedFactura || importe <= 0) return
    if (importe > saldoCobro) {
      toast.error("El importe excede el saldo no imputado del cobro")
      return
    }
    const fv = store.comprobantes.find((c) => c.type === "FV" && c.number === selectedFactura)
    if (fv) {
      const saldoFV = getSaldoPendienteFactura(fv, store.imputaciones ?? [])
      if (importe > saldoFV) {
        toast.error("El importe excede el saldo pendiente de la factura")
        return
      }
    }
    const result = store.addImputacionCobro(cobro.id, selectedFactura, importe)
    if (result) {
      toast.success(`Imputación ${result.id}: ${formatCurrency(importe)} → ${selectedFactura}`)
      onSuccess?.()
      onOpenChange(false)
    } else {
      toast.error("No se pudo crear la imputación")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imputar saldo — {cobro.id}</DialogTitle>
          <DialogDescription>
            Cliente: {cobro.clienteNombre} — Saldo no imputado: {formatCurrency(saldoCobro)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Factura *</Label>
            <Select value={selectedFactura} onValueChange={(v) => {
              setSelectedFactura(v)
              const fv = store.comprobantes.find((c) => c.type === "FV" && c.number === v)
              if (fv) {
                const saldo = getSaldoPendienteFactura(fv, store.imputaciones ?? [])
                setImporte(Math.min(saldo, saldoCobro))
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar factura" /></SelectTrigger>
              <SelectContent>
                {facturasAbiertas.map((fv) => (
                  <SelectItem key={fv.id} value={fv.number}>
                    {fv.number} — {formatCurrency(getSaldoPendienteFactura(fv, store.imputaciones ?? []))} pendiente
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Importe a imputar *</Label>
            <Input
              type="number"
              value={importe || ""}
              onChange={(e) => setImporte(Number(e.target.value) || 0)}
              placeholder="0"
              max={saldoCobro}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedFactura || importe <= 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Imputar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
