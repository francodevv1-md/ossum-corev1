"use client"

import React from "react"

import { fmtDate, fmtQty, type StockItem } from "@/lib/stock/stock-ui-model"
import type { LotAvailability, StockMovementLedgerItem } from "@/lib/services/stock-ledger.service"

/** Existencias físicas por lote/serie — reusada por la ficha (Inventario/Trazabilidad). */
export function ExistenciasTable({ item, liveLots }: { item: StockItem; liveLots?: LotAvailability[] | null }) {
  const lots = liveLots !== undefined && liveLots !== null ? liveLots : item.lots

  if (!lots || lots.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-gray-500">Este artículo no registra existencias físicas.</div>
  }
  return (
    <div className="h-full overflow-auto border border-[var(--ossum-line)]">
      <table className="w-full min-w-[760px] text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--ossum-navy)] text-white">
          <tr>
            {["Depósito", "Ubicación", "Lote", "Serie", "Vencimiento", "Disponible", "Estado"].map((label) => (
              <th key={label} className={`px-3 py-1.5 text-left font-medium ${label === "Disponible" ? "text-right" : ""}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lots.map((l) => (
            <tr key={l.id} className="border-b border-[var(--ossum-line)] last:border-0">
              <td className="px-3 py-1.5 text-gray-700">{l.deposit}</td>
              <td className="px-3 py-1.5 font-mono text-gray-500">{l.location || "—"}</td>
              <td className="px-3 py-1.5 font-mono text-gray-600">{l.lot || "—"}</td>
              <td className="px-3 py-1.5 font-mono text-gray-600">{l.serial || "—"}</td>
              <td className="px-3 py-1.5 text-gray-500">{fmtDate(l.expiry) || "—"}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-medium text-gray-800">{fmtQty(l.available)}</td>
              <td className="px-3 py-1.5">
                <span className={`text-xs ${l.status === "Reservado" ? "text-amber-600" : l.status === "Vencido" ? "text-red-600" : l.status === "Próximo a vencer" ? "text-orange-600 font-medium" : "text-gray-600"}`}>{l.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Historial de movimientos — reusada por la ficha (Trazabilidad). */
export function MovimientosTable({ item, liveMovements }: { item: StockItem; liveMovements?: StockMovementLedgerItem[] | null }) {
  const movements = liveMovements !== undefined && liveMovements !== null ? liveMovements : item.movements

  if (!movements || movements.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-gray-500">Sin movimientos registrados.</div>
  }
  const rows = [...movements].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="h-full overflow-auto border border-[var(--ossum-line)]">
      <table className="w-full min-w-[680px] text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--ossum-navy)] text-white">
          <tr>
            {["Fecha", "Tipo", "Referencia", "Usuario", "Cantidad"].map((label) => (
              <th key={label} className={`px-3 py-1.5 text-left font-medium ${label === "Cantidad" ? "text-right" : ""}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-[var(--ossum-line)] last:border-0">
              <td className="px-3 py-1.5 text-gray-500">{fmtDate(m.date)}</td>
              <td className="px-3 py-1.5 text-gray-700">{m.type}</td>
              <td className="px-3 py-1.5 font-mono text-gray-500" title={"notes" in m && typeof m.notes === "string" ? m.notes : undefined}>{m.ref || "—"}</td>
              <td className="px-3 py-1.5 text-gray-500">{m.user}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${m.qty > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {m.qty > 0 ? "+" : ""}{fmtQty(m.qty)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
