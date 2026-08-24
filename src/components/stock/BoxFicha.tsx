"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Container, Layers, PackageSearch, Wrench } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { boxArticles, boxInfo, fmtQty, type BoxArticleRow } from "@/data/stock-mock"
import { PlantillaFichaSheet } from "@/components/stock/PlantillaFicha"
import { ResolveDifferenceDialog, type ResolveKind } from "@/components/stock/ResolveDifferenceDialog"

const CONDITION_STYLE: Record<BoxArticleRow["condition"], string> = {
  Completa: "bg-emerald-100 text-emerald-800",
  Faltante: "bg-amber-100 text-amber-800",
  Excedente: "bg-blue-100 text-blue-800",
}

const KIND_LABEL: Record<ResolveKind, string> = {
  reposicion: "Reposición",
  movimiento: "Movimiento",
  baja: "Baja",
  incidencia: "Incidencia",
}

interface Resolution {
  id: string
  articleId: string
  code: string
  name: string
  kind: ResolveKind
  delta: number
  note: string
  at: string
}

function BoxFicha({ boxId }: { boxId: string }) {
  const [openPlantilla, setOpenPlantilla] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [resolveRow, setResolveRow] = useState<BoxArticleRow | null>(null)

  const info = boxInfo(boxId)

  if (!info) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <PackageSearch className="size-6 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">Caja no encontrada</p>
        <Link href="/stock" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Stock</Link>
      </div>
    )
  }

  const { box, template, version } = info
  const rows = boxArticles(boxId, overrides)
  const missingCount = rows.filter((r) => r.condition === "Faltante").length
  const completeCount = rows.filter((r) => r.condition === "Completa").length

  const applyResolution = ({ kind, delta, note }: { kind: ResolveKind; delta: number; note: string }) => {
    if (!resolveRow) return
    if (kind !== "incidencia") {
      const next = Math.max(0, resolveRow.quantityActual + delta)
      setOverrides((prev) => ({ ...prev, [resolveRow.articleId]: next }))
    }
    setResolutions((prev) => [{
      id: String(Date.now()),
      articleId: resolveRow.articleId,
      code: resolveRow.code,
      name: resolveRow.name,
      kind,
      delta,
      note,
      at: new Date().toISOString(),
    }, ...prev])
    setResolveRow(null)
    toast.success(kind === "incidencia" ? "Incidencia registrada (demo)" : "Diferencia resuelta (demo)")
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <header className="shrink-0 border-b border-[var(--ossum-line)] px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eef0ff] text-[var(--ossum-action)] ring-1 ring-[#dbe1ff]">
              <Container className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--ossum-navy)]">
                <span className="font-mono text-[13px]">{box.id}</span>
                <span className="mx-2 text-gray-300">·</span>
                {template.name}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span>Plantilla {version.version}</span>
                <span className="text-gray-300">·</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${missingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{box.state}</span>
                <span className="text-gray-300">·</span>
                <span>{rows.length} artículo{rows.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs" onClick={() => setOpenPlantilla(true)}>
            <Layers className="size-3.5" /> Ver plantilla
          </Button>
        </div>
      </header>

      {/* Summary */}
      <div className="shrink-0 border-b border-[var(--ossum-line)] bg-[var(--ossum-surface)] px-4 py-2">
        <p className="text-xs text-gray-700">
          {completeCount} completo{completeCount !== 1 ? "s" : ""} · {missingCount} con faltantes · {rows.length - completeCount - missingCount} excedente{rows.length - completeCount - missingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Inverse table */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="overflow-hidden rounded-md border border-[var(--ossum-line)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--ossum-navy)] text-white">
              <tr>
                {["Artículo", "Cantidad ideal", "Cantidad real", "Reservado", "Faltante", "Condición", ""].map((label, i) => (
                  <th key={i} className={`px-3 py-1.5 text-left font-medium ${label !== "Artículo" && label !== "Condición" && label !== "" ? "text-right" : ""}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.articleId} className="border-t border-[var(--ossum-line)]">
                  <td className="px-3 py-1.5">
                    <Link href={`/stock/articulos/${r.articleId}`} className="text-gray-800 hover:text-[var(--ossum-action)] hover:underline" title={`Abrir ${r.name}`}>
                      <span className="font-mono text-[11px] text-gray-500">{r.code}</span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      {r.name}
                      <span className="ml-1.5 text-[10px] text-gray-400">({r.relation})</span>
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{fmtQty(r.quantityIdeal)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium text-gray-800">{fmtQty(r.quantityActual)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">{r.reserved > 0 ? fmtQty(r.reserved) : "—"}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${r.missing > 0 ? "font-semibold text-amber-600" : "text-gray-400"}`}>{r.missing > 0 ? fmtQty(r.missing) : "—"}</td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CONDITION_STYLE[r.condition]}`}>{r.condition}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {r.condition !== "Completa" ? (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[var(--ossum-action)] hover:bg-[#eef0ff]" onClick={() => setResolveRow(r)}>
                        <Wrench className="size-3" /> Resolver
                      </Button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resoluciones de esta sesión */}
        {resolutions.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Resoluciones registradas (esta sesión)</h3>
            <div className="space-y-1">
              {resolutions.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-md border border-[var(--ossum-line)] bg-white px-3 py-1.5 text-xs">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{KIND_LABEL[r.kind]}</span>
                  <span className="font-mono text-[11px] text-gray-500">{r.code}</span>
                  <span className="truncate text-gray-600">{r.note}</span>
                  {r.kind !== "incidencia" && <span className={`ml-auto tabular-nums font-medium ${r.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>{r.delta >= 0 ? "+" : ""}{fmtQty(r.delta)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-[11px] text-gray-400">
          Cantidad ideal = plantilla versionada. Cantidad real = derivada del inventario y movimientos. Las diferencias se resuelven con movimiento, reposición, baja o incidencia — no se editan aquí.
        </p>
      </div>

      <PlantillaFichaSheet templateId={template.id} open={openPlantilla} onOpenChange={setOpenPlantilla} />
      <ResolveDifferenceDialog key={resolveRow?.articleId ?? "none"} row={resolveRow} open={Boolean(resolveRow)} onOpenChange={(v) => { if (!v) setResolveRow(null) }} onConfirm={applyResolution} />
    </div>
  )
}

export function BoxFichaSheet({ boxId, open, onOpenChange }: {
  boxId: string | null; open: boolean; onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] w-[min(96vw,1000px)] max-w-none flex-col gap-0 overflow-hidden rounded-xl border border-[var(--ossum-line)] p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Ficha de caja</DialogTitle>
        {boxId ? <BoxFicha boxId={boxId} /> : null}
      </DialogContent>
    </Dialog>
  )
}
