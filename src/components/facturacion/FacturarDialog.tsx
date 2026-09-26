"use client"

import React, { useMemo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency } from "@/lib/formatters"
import {
  getConsumoValorizado,
  getDiferenciasPresupuestoConsumo,
  getMontoFacturable,
  suggestBaseFacturacion,
} from "@/lib/facturacion.utils"
import { BaseFacturacionSelector } from "./BaseFacturacionSelector"
import { ResumenEconomico } from "./ResumenEconomico"
import { DiferenciasPopup, type DiferenciaAccion } from "./DiferenciasPopup"
import type { BaseFacturacion, DiferenciaFactura } from "@/types"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { toLegacyPresupuestoProjection } from "@/lib/api/presupuestos"

// ── Data type emitted on confirm ──
export interface FacturarDialogData {
  facturaNumber: string
  baseFacturacion: BaseFacturacion
  totalPresupuestado: number
  totalConsumidoValorizado: number
  deltaDetectado: number
  diferenciasAceptadas: number
  totalAFacturar: number
  presupuestoBaseId?: string
  presupuestoVersion?: string
  diferencias?: DiferenciaFactura[]
}

interface FacturarDialogProps {
  surgeryId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onFacturar: (data: FacturarDialogData) => void
}

export function FacturarDialog({
  surgeryId,
  open,
  onOpenChange,
  onFacturar,
}: FacturarDialogProps) {
  const store = useOrtoTrackStore()

  // ── Local state ──
  const [facturaNumber, setFacturaNumber] = useState("")
  const [baseFacturacion, setBaseFacturacion] = useState<BaseFacturacion>("presupuesto")
  const [diferenciasAceptadas, setDiferenciasAceptadas] = useState(0)
  const [diferenciasPopupOpen, setDiferenciasPopupOpen] = useState(false)
  const [observado, setObservado] = useState<string | null>(null)

  // ── Computed data ──
  const surgery = surgeryId ? store.getSurgeryById(surgeryId) : undefined
  const consumo = surgeryId ? store.getConsumoBySurgeryId(surgeryId) : undefined
  const presupuestoAuthority = usePresupuestos(
    { surgeryId: surgery?.backendId ?? surgery?.id, take: 100 },
    open && Boolean(surgery),
  )
  const { current: currentPresupuesto, draft: draftPresupuesto } = presupuestoAuthority

  // Presupuesto vigente: el que tiene versionStatus "vigente" o "aprobada", último creado
  const presupuestoVigente = useMemo(() => {
    const authoritative = currentPresupuesto ?? draftPresupuesto
    return authoritative ? toLegacyPresupuestoProjection(authoritative) : undefined
  }, [currentPresupuesto, draftPresupuesto])

  // Consumo valorizado
  const consumoValorizado = useMemo(
    () => getConsumoValorizado(consumo, presupuestoVigente, store.stock),
    [consumo, presupuestoVigente, store.stock]
  )

  // Diferencias
  const diferencias = useMemo(
    () => getDiferenciasPresupuestoConsumo(presupuestoVigente, consumo),
    [presupuestoVigente, consumo]
  )

  // Sugerencia de base
  const suggestion = useMemo(
    () => suggestBaseFacturacion(presupuestoVigente, consumo, store.stock),
    [presupuestoVigente, consumo, store.stock]
  )

  // Monto facturable
  const montoFacturable = useMemo(
    () => getMontoFacturable(presupuestoVigente, consumo, store.stock, baseFacturacion, diferenciasAceptadas),
    [presupuestoVigente, consumo, store.stock, baseFacturacion, diferenciasAceptadas]
  )

  const tieneDiferencias = Math.abs(montoFacturable.deltaDetectado) >= 1

  // ── Reset state when dialog opens ──
  React.useEffect(() => {
    if (open) {
      // Opening the controlled dialog starts a fresh invoice attempt.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFacturaNumber("")
      setDiferenciasAceptadas(0)
      setObservado(null)
      setDiferenciasPopupOpen(false)
      // Set base from suggestion
      if (suggestion) {
        setBaseFacturacion(suggestion.base)
      }
    }
  }, [open, suggestion])

  // ── Handlers ──
  const handleConfirmar = useCallback(() => {
    if (!facturaNumber.trim()) return
    onFacturar({
      facturaNumber: facturaNumber.trim(),
      baseFacturacion,
      totalPresupuestado: montoFacturable.totalPresupuestado,
      totalConsumidoValorizado: montoFacturable.totalConsumidoValorizado,
      deltaDetectado: montoFacturable.deltaDetectado,
      diferenciasAceptadas,
      totalAFacturar: montoFacturable.totalAFacturar,
      presupuestoBaseId: presupuestoVigente?.id,
      presupuestoVersion: presupuestoVigente ? `v${presupuestoVigente.version}` : undefined,
      diferencias: diferencias.length > 0 ? diferencias : undefined,
    })
  }, [facturaNumber, baseFacturacion, montoFacturable, diferenciasAceptadas, presupuestoVigente, diferencias, onFacturar])

  const handleFacturarClick = useCallback(() => {
    if (tieneDiferencias) {
      // DF-Fact-02: Popup obligatorio cuando delta ≠ 0
      setDiferenciasPopupOpen(true)
    } else {
      // Delta = 0: facturar directamente
      handleConfirmar()
    }
  }, [tieneDiferencias, handleConfirmar])

  const handleDiferenciaAccion = useCallback((accion: DiferenciaAccion) => {
    setDiferenciasPopupOpen(false)

    switch (accion.tipo) {
      case "presupuesto":
        setBaseFacturacion("presupuesto")
        setDiferenciasAceptadas(0)
        // After selecting base, confirm
        setTimeout(() => handleConfirmar(), 0)
        break
      case "consumo":
        setBaseFacturacion("consumo")
        setDiferenciasAceptadas(0)
        setTimeout(() => handleConfirmar(), 0)
        break
      case "mixto":
        setBaseFacturacion("mixto")
        setDiferenciasAceptadas(accion.diferenciasAceptadas)
        setTimeout(() => handleConfirmar(), 0)
        break
      case "observado":
        setObservado(accion.observacion)
        // No se emite factura, solo se registra observación
        break
      case "cancelar":
        // Volver sin facturar
        break
    }
  }, [handleConfirmar])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Facturar Cirugía {surgeryId}</DialogTitle>
            <DialogDescription>
              {surgery?.patient || "—"} — {surgery?.institution || "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {presupuestoAuthority.error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{presupuestoAuthority.error}</p>}
            {/* Número de FV */}
            <div className="space-y-1.5">
              <Label className="text-sm">Número de factura *</Label>
              <Input
                value={facturaNumber}
                onChange={(e) => setFacturaNumber(e.target.value)}
                placeholder="FV-2026-XXXX"
                className="h-9"
              />
            </div>

            {/* Resumen económico */}
            <ResumenEconomico
              totalPresupuestado={montoFacturable.totalPresupuestado}
              totalConsumidoValorizado={montoFacturable.totalConsumidoValorizado}
              deltaDetectado={montoFacturable.deltaDetectado}
              baseFacturacion={baseFacturacion}
              totalAFacturar={montoFacturable.totalAFacturar}
              presupuestoId={presupuestoVigente?.id}
              itemsSinPrecio={consumoValorizado.itemsSinPrecio}
            />

            {/* Selector de base */}
            <BaseFacturacionSelector
              value={baseFacturacion}
              onChange={setBaseFacturacion}
              totalPresupuestado={montoFacturable.totalPresupuestado}
              totalConsumidoValorizado={montoFacturable.totalConsumidoValorizado}
              suggestion={suggestion.base}
              forced={suggestion.forced}
            />

            {/* Monto total */}
            <div className="flex items-center justify-between rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
              <span className="text-sm font-medium text-emerald-700">Total a facturar:</span>
              <span className="text-lg font-bold text-emerald-700">
                {formatCurrency(montoFacturable.totalAFacturar)}
              </span>
            </div>

            {/* Observación si se dejó observado */}
            {observado && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-xs text-amber-700">
                  <strong>Observado:</strong> {observado}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleFacturarClick}
              disabled={!facturaNumber.trim() || montoFacturable.totalAFacturar <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {tieneDiferencias ? "Ver diferencias y facturar" : "Emitir Factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup de diferencias (DF-Fact-02) */}
      <DiferenciasPopup
        open={diferenciasPopupOpen}
        onOpenChange={setDiferenciasPopupOpen}
        diferencias={diferencias}
        totalPresupuestado={montoFacturable.totalPresupuestado}
        totalConsumidoValorizado={montoFacturable.totalConsumidoValorizado}
        deltaDetectado={montoFacturable.deltaDetectado}
        onAccion={handleDiferenciaAccion}
      />
    </>
  )
}
