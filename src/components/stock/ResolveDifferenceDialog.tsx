"use client"

import React, { useState } from "react"
import { ArrowRightLeft, Flag, PackagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
import { fmtQty, type BoxArticleRow } from "@/data/stock-mock"

export type ResolveKind = "reposicion" | "movimiento" | "baja" | "incidencia"

const KINDS: Array<{ id: ResolveKind; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "reposicion", label: "Reposición", hint: "Repone el faltante hasta la cantidad ideal.", icon: PackagePlus },
  { id: "movimiento", label: "Movimiento", hint: "Registra un ingreso o egreso de inventario.", icon: ArrowRightLeft },
  { id: "baja", label: "Baja", hint: "Da de baja una pieza (rota, perdida).", icon: Trash2 },
  { id: "incidencia", label: "Incidencia", hint: "Deja el faltante registrado para revisión, sin tocar stock.", icon: Flag },
]

export function ResolveDifferenceDialog({ row, open, onOpenChange, onConfirm }: {
  row: BoxArticleRow | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (result: { kind: ResolveKind; delta: number; note: string }) => void
}) {
  const diff = row ? row.quantityIdeal - row.quantityActual : 0
  const [kind, setKind] = useState<ResolveKind>("reposicion")
  const [direction, setDirection] = useState<"ingreso" | "egreso">(() => (diff < 0 ? "egreso" : "ingreso"))
  const [qty, setQty] = useState(() => String(Math.max(1, Math.abs(diff))))
  const [note, setNote] = useState("")

  if (!row) return null

  const qtyNum = Number(qty) || 0
  const delta = kind === "reposicion" ? diff : kind === "baja" ? -qtyNum : kind === "movimiento" ? (direction === "ingreso" ? qtyNum : -qtyNum) : 0
  const resultQty = kind === "incidencia" ? row.quantityActual : Math.max(0, row.quantityActual + delta)

  const confirm = () => {
    if (kind !== "incidencia" && qtyNum <= 0) {
      toast.error("Indicá una cantidad válida")
      return
    }
    if (kind !== "incidencia" && !note.trim()) {
      toast.error("Indicá un motivo o referencia")
      return
    }
    onConfirm({ kind, delta, note: note.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 sm:max-w-md">
        <DialogHeader className="border-b border-[var(--ossum-line)] px-5 py-3.5">
          <DialogTitle className="text-base text-[var(--ossum-navy)]">Resolver diferencia</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-mono">{row.code}</span> · {row.name}
            {diff > 0 && <span className="ml-2 text-amber-600">falta {fmtQty(diff)}</span>}
            {diff < 0 && <span className="ml-2 text-blue-600">excede {fmtQty(-diff)}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {/* Acción */}
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de resolución">
            {KINDS.map((k) => {
              const Icon = k.icon
              const selected = kind === k.id
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setKind(k.id)}
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${selected ? "border-[var(--ossum-action)] bg-[#eef0ff] ring-1 ring-[var(--ossum-action)]" : "border-[var(--ossum-line)] bg-white hover:border-gray-300"}`}
                >
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${selected ? "text-[var(--ossum-action)]" : "text-gray-800"}`}>
                    <Icon className="size-3.5" /> {k.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-gray-400">{k.hint}</span>
                </button>
              )
            })}
          </div>

          {/* Cantidad + dirección (movimiento) */}
          {kind !== "incidencia" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {kind === "movimiento" && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-500">Dirección</Label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as "ingreso" | "egreso")}
                    className="h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"
                  >
                    <option value="ingreso">Ingreso (+)</option>
                    <option value="egreso">Egreso (−)</option>
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[11px] text-gray-500">
                  {kind === "reposicion" ? "Cantidad a reponer" : kind === "baja" ? "Cantidad a dar de baja" : "Cantidad"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  disabled={kind === "reposicion"}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1">
            <Label className="text-[11px] text-gray-500">{kind === "incidencia" ? "Descripción de la incidencia" : "Motivo / referencia"}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "incidencia" ? "Ej. faltante al devolver, pieza dañada…" : "Ej. reposición post-cirugía, REM-0042…"} className="h-8 text-xs" />
          </div>

          {/* Resultado */}
          <div className="flex items-center justify-between rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-surface)] px-3 py-2 text-xs">
            <span className="text-gray-500">Cantidad real</span>
            <span className="tabular-nums text-gray-700">
              <span className="text-gray-400">{fmtQty(row.quantityActual)}</span>
              <span className="mx-1.5 text-gray-400">→</span>
              <b className={kind !== "incidencia" && delta !== 0 ? "text-[var(--ossum-action)]" : ""}>{fmtQty(resultQty)}</b>
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-[var(--ossum-line)] px-5 py-3">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={confirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
