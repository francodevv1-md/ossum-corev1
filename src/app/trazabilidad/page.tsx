"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate, formatDateTime } from "@/lib/formatters"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import {
  ScanSearch, ArrowRightLeft, History,
} from "lucide-react"
import type { StockMovementType } from "@/types"

const MOVEMENT_TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "Ingreso", label: "Ingreso" },
  { value: "Egreso", label: "Egreso" },
  { value: "Ajuste positivo", label: "Ajuste positivo" },
  { value: "Ajuste negativo", label: "Ajuste negativo" },
  { value: "Devolución", label: "Devolución" },
  { value: "Traspaso", label: "Traspaso" },
]

export default function TrazabilidadPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [tab, setTab] = useState<"trazas" | "movimientos">("trazas")

  const traceEntries = store.traceEntries
  const stockMovements = store.stockMovements

  const filteredTraces = useMemo(() => {
    let data = traceEntries.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (t) =>
          t.itemName.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.lot.toLowerCase().includes(q) ||
          t.action.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.details.toLowerCase().includes(q)
      )
    }
    return data.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [traceEntries, search])

  const filteredMovements = useMemo(() => {
    let data = stockMovements.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (m) =>
          m.itemName.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.lot.toLowerCase().includes(q) ||
          m.userName.toLowerCase().includes(q) ||
          m.details.toLowerCase().includes(q)
      )
    }
    if (typeFilter) data = data.filter((m) => m.type === typeFilter)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [stockMovements, search, typeFilter])

  const traceStats = useMemo(() => ({
    total: traceEntries.length,
    today: traceEntries.filter((t) => t.timestamp.startsWith(new Date().toISOString().split("T")[0])).length,
  }), [traceEntries])

  const movementStats = useMemo(() => ({
    total: stockMovements.length,
    ingresos: stockMovements.filter((m) => m.type === "Ingreso").length,
    egresos: stockMovements.filter((m) => m.type === "Egreso").length,
  }), [stockMovements])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Trazabilidad</h1>
          <p className="text-sm text-muted-foreground">Registro de trazas y movimientos de stock</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Trazas totales" value={traceStats.total} icon={ScanSearch} />
        <StatsCard title="Trazas hoy" value={traceStats.today} icon={History} />
        <StatsCard title="Movimientos" value={movementStats.total} icon={ArrowRightLeft} />
        <StatsCard title="Ingresos" value={movementStats.ingresos} icon={ArrowRightLeft} />
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        <Button
          variant={tab === "trazas" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("trazas")}
        >
          Trazas
        </Button>
        <Button
          variant={tab === "movimientos" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("movimientos")}
        >
          Movimientos de Stock
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Artículo, código, lote, usuario, detalle..." className="w-full sm:w-80" />
            {tab === "movimientos" && (
              <FilterSelect value={typeFilter} onChange={setTypeFilter} options={MOVEMENT_TYPE_OPTIONS} />
            )}
            {(search || typeFilter) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setTypeFilter("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trace Entries Table */}
      {tab === "trazas" && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredTraces.length} traza{filteredTraces.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Código</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Lote</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Acción</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha/Hora</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Usuario</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTraces.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-medium">{t.itemName}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{t.code}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{t.lot}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className="text-[10px]">{t.action}</Badge></td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">{t.timestamp}</td>
                      <td className="px-3 py-2.5 text-xs">{t.userName}</td>
                      <td className="px-3 py-2.5 text-xs max-w-[250px] truncate">{t.details}</td>
                    </tr>
                  ))}
                  {filteredTraces.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No hay trazas registradas. Las trazas se generan automáticamente con las operaciones del sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Movements Table */}
      {tab === "movimientos" && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredMovements.length} movimiento{filteredMovements.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Código</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Lote</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Cantidad</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Usuario</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-medium">{m.itemName}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{m.code}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{m.lot}</td>
                      <td className="px-3 py-2.5"><StateBadge status={m.type} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={m.quantity > 0 ? "font-bold text-emerald-600" : "font-bold text-destructive"}>
                          {m.quantity > 0 ? "+" : ""}{m.quantity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">{formatDate(m.date)}</td>
                      <td className="px-3 py-2.5 text-xs">{m.userName}</td>
                      <td className="px-3 py-2.5 text-xs max-w-[200px] truncate">{m.details}</td>
                    </tr>
                  ))}
                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        No se encontraron movimientos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <SurgeryDrawer />
    </div>
  )
}
