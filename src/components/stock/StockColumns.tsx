"use client"

import React, { useMemo, useState } from "react"
import { Columns3, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CONTROL_LABEL,
  FAMILY_STYLE,
  fmtDate,
  fmtMoney,
  fmtQty,
  nearestExpiryOf,
  STOCK_STATE_CELL_COLORS,
  type StockItem,
  type StockOperationalState,
} from "@/data/stock-mock"

export type StockColumnKey =
  | "thumb" | "code" | "name" | "descExtra"
  | "category" | "rubro" | "seccion" | "linea"
  | "brand" | "manufacturer" | "gtin" | "pm" | "type" | "family"
  | "unit" | "unitBuy" | "supplier"
  | "available" | "reserved" | "inTransit"
  | "control" | "expiry" | "cost" | "price" | "status"

export interface StockColumn {
  key: StockColumnKey
  label: string
  align?: "right"
  pinned?: boolean
  width?: number
  render: (item: StockItem) => React.ReactNode
}

export function FamilyThumb({ item }: { item: StockItem }) {
  const family = FAMILY_STYLE[item.family]
  const Icon = family.icon
  return (
    <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ring-1 ${family.thumb}`} title={family.label}>
      <Icon className="size-3.5" />
    </span>
  )
}

function availableCell(item: StockItem) {
  return (
    <span className={item.available === 0 ? "font-bold text-red-600" : item.available <= item.min ? "font-bold text-amber-600" : "font-medium text-gray-800"}>
      {fmtQty(item.available)}
    </span>
  )
}

export function StateBadge({ state }: { state: StockOperationalState }) {
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${STOCK_STATE_CELL_COLORS[state]}`}>{state}</span>
}

function statusCell(item: StockItem) {
  return <StateBadge state={item.state} />
}

export const STOCK_COLUMNS: StockColumn[] = [
  { key: "thumb", label: "Imagen", pinned: true, width: 44, render: (i) => <FamilyThumb item={i} /> },
  { key: "code", label: "Código", pinned: true, width: 112, render: (i) => <span className="font-mono text-[11px] text-gray-500">{i.code}</span> },
  { key: "name", label: "Artículo", pinned: true, width: 288, render: (i) => <p className="max-w-[272px] truncate text-[13px] font-medium text-gray-900" title={i.name}>{i.name}</p> },
  { key: "descExtra", label: "Descripción adicional", render: (i) => <span className="block max-w-[220px] truncate text-gray-500" title={i.descriptionExtra}>{i.descriptionExtra || "—"}</span> },
  { key: "category", label: "Categoría", render: (i) => <span className="text-gray-500">{i.category}</span> },
  { key: "rubro", label: "Rubro", render: (i) => <span className="text-gray-500">{i.rubro}</span> },
  { key: "seccion", label: "Sección", render: (i) => <span className="text-gray-500">{i.seccion}</span> },
  { key: "linea", label: "Línea", render: (i) => <span className="text-gray-500">{i.linea}</span> },
  { key: "brand", label: "Marca", render: (i) => <span className="block max-w-[140px] truncate text-gray-600" title={i.brand}>{i.brand}</span> },
  { key: "manufacturer", label: "Fabricante", render: (i) => <span className="text-gray-600">{i.manufacturer}</span> },
  { key: "gtin", label: "GTIN / EAN", render: (i) => <span className="font-mono text-[11px] text-gray-500">{i.gtin || "—"}</span> },
  { key: "pm", label: "PM / Registro", render: (i) => <span className="font-mono text-[11px] text-gray-500">{i.pm || "—"}</span> },
  { key: "type", label: "Tipo", render: (i) => <span className="text-gray-500">{i.type}</span> },
  { key: "family", label: "Familia / Patología", render: (i) => <span className="text-gray-500">{FAMILY_STYLE[i.family].label}</span> },
  { key: "unit", label: "Unidad de venta", render: (i) => <span className="text-gray-500">{i.unit}</span> },
  { key: "unitBuy", label: "Unidad de compra", render: (i) => <span className="text-gray-500">{i.unitBuy}</span> },
  { key: "supplier", label: "Proveedor preferido", render: (i) => <span className="block max-w-[180px] truncate text-gray-600" title={i.preferredSupplier}>{i.preferredSupplier || "—"}</span> },
  { key: "available", label: "Disponible", align: "right", render: availableCell },
  { key: "reserved", label: "Reservado", align: "right", render: (i) => <span className="tabular-nums text-gray-500">{i.reserved > 0 ? fmtQty(i.reserved) : "—"}</span> },
  { key: "inTransit", label: "En tránsito", align: "right", render: (i) => <span className="tabular-nums text-gray-500">{i.inTransit > 0 ? fmtQty(i.inTransit) : "—"}</span> },
  { key: "control", label: "Control", render: (i) => <span className="text-gray-500">{CONTROL_LABEL[i.control]}</span> },
  { key: "expiry", label: "Vencimiento", render: (i) => <span className="tabular-nums text-gray-500">{fmtDate(nearestExpiryOf(i))}</span> },
  { key: "cost", label: "Costo", align: "right", render: (i) => <span className="tabular-nums text-gray-600">{fmtMoney(i.cost)}</span> },
  { key: "price", label: "Precio", align: "right", render: (i) => <span className="tabular-nums font-medium text-gray-800">{fmtMoney(i.price)}</span> },
  { key: "status", label: "Estado", render: statusCell },
]

export const STOCK_COLUMN_BY_KEY: Record<StockColumnKey, StockColumn> = Object.fromEntries(
  STOCK_COLUMNS.map((c) => [c.key, c]),
) as Record<StockColumnKey, StockColumn>

export const PINNED_KEYS: StockColumnKey[] = ["thumb", "code", "name"]

export interface StockViewDef {
  key: string
  label: string
  columns: StockColumnKey[]
}

export const STOCK_VIEWS: StockViewDef[] = [
  { key: "operativo", label: "Stock operativo", columns: ["thumb", "code", "name", "category", "brand", "available", "reserved", "inTransit", "status"] },
  { key: "catalogo", label: "Catálogo", columns: ["thumb", "code", "name", "descExtra", "category", "rubro", "brand", "manufacturer", "gtin", "pm", "type", "price", "status"] },
  { key: "trazabilidad", label: "Trazabilidad", columns: ["thumb", "code", "name", "control", "expiry", "family", "manufacturer", "gtin", "pm", "status"] },
  { key: "comercial", label: "Comercial", columns: ["thumb", "code", "name", "unit", "unitBuy", "supplier", "cost", "price", "available", "status"] },
  { key: "personalizada", label: "Personalizada", columns: ["thumb", "code", "name", "category", "brand", "available", "reserved", "inTransit", "status"] },
]

export const DEFAULT_VIEW_KEY = "operativo"

/** Computes the sticky `left` offset (px) for pinned columns, in display order. */
export function pinnedOffsets(columns: StockColumn[]): Record<string, number> {
  const offsets: Record<string, number> = {}
  let acc = 0
  for (const col of columns) {
    if (col.pinned) {
      offsets[col.key] = acc
      acc += col.width ?? 0
    }
  }
  return offsets
}

// ─── Columnas panel (visibility toggle + search) ──────────

export function ColumnsPanel({ visibleKeys, onToggle }: {
  visibleKeys: Set<StockColumnKey>; onToggle: (key: StockColumnKey) => void
}) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return STOCK_COLUMNS
    return STOCK_COLUMNS.filter((c) => c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q))
  }, [search])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs"><Columns3 className="size-3.5" /> Columnas</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-[var(--ossum-line)] p-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar columna…" className="h-8 text-xs" />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.map((col) => (
            <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[var(--ossum-surface-2)]">
              <Checkbox checked={visibleKeys.has(col.key)} onCheckedChange={() => onToggle(col.key)} className="size-4" />
              <span className="flex-1 text-gray-700">{col.label}</span>
              {col.pinned && <Lock className="size-3 text-gray-400" aria-label="Columna fija" />}
            </label>
          ))}
          {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-gray-400">Sin coincidencias</p>}
        </div>
        <div className="border-t border-[var(--ossum-line)] px-2 py-1.5 text-[10px] text-gray-400">
          Reordenar, redimensionar y persistir: próximamente. Columnas con candado quedan fijas al desplazar.
        </div>
      </PopoverContent>
    </Popover>
  )
}
