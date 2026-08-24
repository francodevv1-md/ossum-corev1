"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Container, GitBranch, PackageSearch, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  boxesUsingVersion,
  currentVersionOf,
  fmtQty,
  templateById,
  templateVersionArticles,
} from "@/data/stock-mock"

const RELATION_STYLE: Record<string, string> = {
  "Instrumental fijo": "bg-[#eef0ff] text-[var(--ossum-action)]",
  Implante: "bg-sky-50 text-sky-700",
  Consumible: "bg-rose-50 text-rose-700",
  Opcional: "bg-slate-100 text-slate-600",
  Reposición: "bg-amber-50 text-amber-700",
}

function PlantillaFicha({ templateId }: { templateId: string }) {
  const template = templateById(templateId)
  const [versionId, setVersionId] = useState<string>(() => currentVersionOf(templateId)?.id ?? "")

  if (!template) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <PackageSearch className="size-6 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">Plantilla no encontrada</p>
        <Link href="/stock" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Stock</Link>
      </div>
    )
  }

  const selected = template.versions.find((v) => v.id === versionId) ?? currentVersionOf(templateId) ?? template.versions[template.versions.length - 1]
  const rows = templateVersionArticles(selected.id)
  const boxes = boxesUsingVersion(selected.id)

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
                Plantilla <span className="font-normal text-gray-500">·</span> {template.name}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span>{template.versions.length} versione{template.versions.length !== 1 ? "s" : ""}</span>
                <span className="text-gray-300">·</span>
                <span>vigente: {currentVersionOf(templateId)?.version}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs" onClick={() => toast.info("Nueva versión de plantilla (próximamente)")}>
            <Plus className="size-3.5" /> Nueva versión
          </Button>
        </div>

        {/* Version selector */}
        <div className="mt-2 flex items-center gap-2">
          <label className="text-[11px] text-gray-500">Versión:</label>
          <select
            value={selected.id}
            onChange={(e) => setVersionId(e.target.value)}
            className="h-7 rounded-md border border-[var(--ossum-line)] bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"
            aria-label="Seleccionar versión de plantilla"
          >
            {[...template.versions].reverse().map((v) => (
              <option key={v.id} value={v.id}>{v.version}{v.current ? " (vigente)" : ""}</option>
            ))}
          </select>
          {selected.current && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Vigente</span>}
        </div>
      </header>

      {/* Contenido ideal */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="overflow-hidden rounded-md border border-[var(--ossum-line)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--ossum-navy)] text-white">
              <tr>
                {["Artículo", "Relación", "Cantidad ideal"].map((label) => (
                  <th key={label} className={`px-3 py-1.5 text-left font-medium ${label === "Cantidad ideal" ? "text-right" : ""}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.articleId} className="border-t border-[var(--ossum-line)]">
                  <td className="px-3 py-1.5">
                    <Link href={`/stock/articulos/${r.articleId}`} className="text-gray-800 hover:text-[var(--ossum-action)] hover:underline">
                      <span className="font-mono text-[11px] text-gray-500">{r.code}</span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${RELATION_STYLE[r.relation] ?? "bg-gray-100 text-gray-600"}`}>{r.relation}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium text-gray-800">{fmtQty(r.quantityIdeal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Versiones */}
        <div className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">
            <GitBranch className="size-3.5" /> Versiones
          </h3>
          <div className="flex flex-wrap gap-2">
            {[...template.versions].reverse().map((v) => {
              const isCurrent = v.current
              const isSelected = v.id === selected.id
              const boxes = boxesUsingVersion(v.id)
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVersionId(v.id)}
                  className={`rounded-md border px-3 py-1.5 text-left text-xs transition-colors ${isSelected ? "border-[var(--ossum-action)] bg-[#eef0ff]" : "border-[var(--ossum-line)] bg-white hover:border-gray-300"}`}
                >
                  <span className="flex items-center gap-1.5 font-medium text-gray-800">
                    {v.version}
                    {isCurrent && <span className="rounded bg-emerald-100 px-1 py-px text-[9px] font-medium text-emerald-800">Vigente</span>}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-gray-400">{v.items.length} artículos · {boxes.length} caja{boxes.length !== 1 ? "s" : ""}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cajas que usan esta versión */}
        <div className="mt-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Cajas que usan esta versión</h3>
          {boxes.length === 0 ? (
            <p className="text-xs text-gray-400">Ninguna caja física usa esta versión.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {boxes.map((b) => (
                <span key={b.id} className="rounded-md border border-[var(--ossum-line)] bg-white px-2.5 py-1 font-mono text-xs text-gray-700">
                  {b.id}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] text-gray-400">
          La cantidad ideal es versionada y pertenece a la plantilla. El contenido real de cada caja se deriva del inventario y los movimientos.
        </p>
      </div>
    </div>
  )
}

export function PlantillaFichaSheet({ templateId, open, onOpenChange }: {
  templateId: string | null; open: boolean; onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] w-[min(96vw,900px)] max-w-none flex-col gap-0 overflow-hidden rounded-xl border border-[var(--ossum-line)] p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Plantilla de caja</DialogTitle>
        {templateId ? <PlantillaFicha templateId={templateId} /> : null}
      </DialogContent>
    </Dialog>
  )
}
