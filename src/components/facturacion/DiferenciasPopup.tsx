"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { DiferenciaFactura, BaseFacturacion } from "@/types"

export type DiferenciaAccion =
  | { tipo: "presupuesto" }
  | { tipo: "consumo" }
  | { tipo: "mixto"; diferenciasAceptadas: number }
  | { tipo: "observado"; observacion: string }
  | { tipo: "cancelar" }

interface DiferenciasPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  diferencias: DiferenciaFactura[]
  totalPresupuestado: number
  totalConsumidoValorizado: number
  deltaDetectado: number
  onAccion: (accion: DiferenciaAccion) => void
}

const TIPO_BADGES: Record<DiferenciaFactura["tipo"], { label: string; color: string }> = {
  cantidad: { label: "Cant.", color: "bg-blue-100 text-blue-700" },
  no_consumido: { label: "No consumido", color: "bg-amber-100 text-amber-700" },
  no_presupuestado: { label: "No presup.", color: "bg-orange-100 text-orange-700" },
  articulo_z: { label: "Art. Z", color: "bg-purple-100 text-purple-700" },
  precio: { label: "Precio", color: "bg-red-100 text-red-700" },
}

export function DiferenciasPopup({
  open,
  onOpenChange,
  diferencias,
  totalPresupuestado,
  totalConsumidoValorizado,
  deltaDetectado,
  onAccion,
}: DiferenciasPopupProps) {
  const [observacion, setObservacion] = React.useState("")

  const noConsumidos = diferencias.filter((d) => d.tipo === "no_consumido")
  const noPresupuestados = diferencias.filter((d) => d.tipo === "no_presupuestado")
  const articulosZ = diferencias.filter((d) => d.tipo === "articulo_z")
  const deltaPositivo = deltaDetectado > 0

  const handleAccion = (tipo: DiferenciaAccion) => {
    onAccion(tipo)
    setObservacion("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Diferencias detectadas
          </DialogTitle>
          <DialogDescription>
            Se detectaron diferencias entre lo presupuestado y lo consumido. Revise el detalle antes de facturar.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen numérico */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total presupuestado:</span>
            <span className="font-medium">{formatCurrency(totalPresupuestado)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total consumido valorizado:</span>
            <span className="font-medium">{formatCurrency(totalConsumidoValorizado)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground">Delta:</span>
            <span className={cn("font-bold", deltaPositivo ? "text-red-600" : "text-green-600")}>
              {deltaPositivo ? "+" : ""}{formatCurrency(deltaDetectado)}
            </span>
          </div>
        </div>

        {/* Tabla de diferencias */}
        {diferencias.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs h-8">Ítem</TableHead>
                  <TableHead className="text-xs h-8">Tipo</TableHead>
                  <TableHead className="text-xs h-8 text-right">Presup.</TableHead>
                  <TableHead className="text-xs h-8 text-right">Cons.</TableHead>
                  <TableHead className="text-xs h-8 text-right">Diff</TableHead>
                  <TableHead className="text-xs h-8 text-right">Impacto $</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diferencias.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-1.5 text-xs font-medium">{d.name}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className={cn("text-[9px] px-1.5", TIPO_BADGES[d.tipo].color)}>
                        {TIPO_BADGES[d.tipo].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-xs text-right">{d.cantPresupuestada}</TableCell>
                    <TableCell className="py-1.5 text-xs text-right">{d.cantConsumida}</TableCell>
                    <TableCell className={cn("py-1.5 text-xs text-right font-medium", d.diferencia > 0 ? "text-red-600" : "text-green-600")}>
                      {d.diferencia > 0 ? "+" : ""}{d.diferencia}
                    </TableCell>
                    <TableCell className={cn("py-1.5 text-xs text-right font-medium", d.impactoMonetario > 0 ? "text-red-600" : "text-green-600")}>
                      {d.impactoMonetario > 0 ? "+" : ""}{formatCurrency(d.impactoMonetario)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Listas específicas */}
        {noConsumidos.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-700">Ítems presupuestados no consumidos:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {noConsumidos.map((d, i) => (
                <li key={i}>• {d.name} ({formatCurrency(Math.abs(d.impactoMonetario))})</li>
              ))}
            </ul>
          </div>
        )}

        {noPresupuestados.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-orange-700">Ítems consumidos no presupuestados:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {noPresupuestados.map((d, i) => (
                <li key={i}>• {d.name} ({formatCurrency(Math.abs(d.impactoMonetario))})</li>
              ))}
            </ul>
          </div>
        )}

        {articulosZ.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-purple-700">Artículos Z involucrados:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {articulosZ.map((d, i) => (
                <li key={i}>• {d.name} ({formatCurrency(Math.abs(d.impactoMonetario))})</li>
              ))}
            </ul>
          </div>
        )}

        {/* Observación para "Dejar observado" */}
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Observación (opcional para 'Dejar observado')..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
          />
        </div>

        {/* Acciones */}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAccion({ tipo: "presupuesto" })}
          >
            Presupuesto ({formatCurrency(totalPresupuestado)})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAccion({ tipo: "consumo" })}
          >
            Consumo ({formatCurrency(totalConsumidoValorizado)})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAccion({
              tipo: "mixto",
              diferenciasAceptadas: Math.abs(deltaDetectado),
            })}
          >
            Importar diff
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-amber-600"
            onClick={() => handleAccion({ tipo: "observado", observacion })}
          >
            Dejar observado
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAccion({ tipo: "cancelar" })}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
