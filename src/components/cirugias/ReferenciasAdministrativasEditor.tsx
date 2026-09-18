"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIPO_REFERENCIA_OPTIONS } from "@/lib/shared-constants"
import type { ReferenciaAdministrativa, TipoReferencia } from "@/types"
import { Plus, Trash2 } from "lucide-react"

interface ReferenciasAdministrativasEditorProps {
  value: ReferenciaAdministrativa[]
  onChange: (refs: ReferenciaAdministrativa[]) => void
}

export function ReferenciasAdministrativasEditor({
  value,
  onChange,
}: ReferenciasAdministrativasEditorProps) {
  const handleAdd = () => {
    const newRef: ReferenciaAdministrativa = {
      id: `ref-${Date.now()}-${value.length}`,
      tipo: "Autorización",
      valor: "",
      observacion: "",
    }
    onChange([...value, newRef])
  }

  const handleRemove = (idx: number) => {
    const updated = [...value]
    updated.splice(idx, 1)
    onChange(updated)
  }

  const handleTipoChange = (idx: number, tipo: TipoReferencia) => {
    const updated = [...value]
    updated[idx] = { ...updated[idx], tipo }
    onChange(updated)
  }

  const handleValorChange = (idx: number, valor: string) => {
    const updated = [...value]
    updated[idx] = { ...updated[idx], valor }
    onChange(updated)
  }

  const handleObservacionChange = (idx: number, observacion: string) => {
    const updated = [...value]
    updated[idx] = { ...updated[idx], observacion: observacion || undefined }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Referencias administrativas</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          Agregar referencia
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No hay referencias administrativas. Haga clic en &quot;Agregar referencia&quot; para añadir una.
        </p>
      )}

      {value.map((ref, idx) => (
        <div
          key={ref.id}
          className="grid gap-2 sm:grid-cols-[140px_1fr_1fr_auto] items-end rounded-md border p-2"
        >
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Tipo</Label>
            <Select
              value={ref.tipo}
              onValueChange={(v) => handleTipoChange(idx, v as TipoReferencia)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_REFERENCIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Valor</Label>
            <Input
              value={ref.valor}
              onChange={(e) => handleValorChange(idx, e.target.value)}
              placeholder="Nº de referencia"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Observación</Label>
            <Input
              value={ref.observacion || ""}
              onChange={(e) => handleObservacionChange(idx, e.target.value)}
              placeholder="(opcional)"
              className="h-8 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(idx)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
