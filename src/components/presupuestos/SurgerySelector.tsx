"use client"

import React from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Surgery } from "@/types"
import { Search } from "lucide-react"

interface SurgerySelectorProps {
  surgeryId?: string
  onSelect: (surgery: Surgery) => void
  surgeries: Surgery[]
}

export function SurgerySelector({
  surgeryId,
  onSelect,
  surgeries,
}: SurgerySelectorProps) {
  const selectedSurgery = surgeries.find((s) => s.id === surgeryId)

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Vincular a cirugía existente (opcional)</Label>
      <Select
        value={surgeryId || ""}
        onValueChange={(v) => {
          const surgery = surgeries.find((s) => s.id === v)
          if (surgery) onSelect(surgery)
        }}
      >
        <SelectTrigger>
          <Search className="size-3.5 text-muted-foreground mr-2" />
          <SelectValue placeholder="Buscar cirugía..." />
        </SelectTrigger>
        <SelectContent>
          {surgeries.length === 0 ? (
            <SelectItem value="__none" disabled>
              No hay cirugías disponibles
            </SelectItem>
          ) : (
            surgeries.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.id} — {s.patient} ({s.institution})
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {selectedSurgery && (
        <p className="text-[10px] text-muted-foreground">
          Se autocompletarán los datos de la cirugía seleccionada.
        </p>
      )}
    </div>
  )
}
