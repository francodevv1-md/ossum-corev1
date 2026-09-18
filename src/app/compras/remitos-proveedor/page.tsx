"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
import { StatsCard, StateBadge, SearchInput, FilterSelect, SurgeryDrawer } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Truck, Clock, CheckCircle2, Package } from "lucide-react"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Recibido", label: "Recibido" },
  { value: "Verificado", label: "Verificado" },
  { value: "Anulado", label: "Anulado" },
]

export default function RemitosProveedorPage() {
  const store = useOrtoTrackStore()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [provFilter, setProvFilter] = useState("")

  const remitos = store.remitosProveedor
  const proveedores = store.proveedores.filter((p) => p.active)

  const provFilterOptions = useMemo(
    () => [
      { value: "", label: "Todos los proveedores" },
      ...proveedores.map((p) => ({ value: p.id, label: p.name })),
    ],
    [proveedores]
  )

  const filtered = useMemo(() => {
    let data = remitos.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.proveedorName.toLowerCase().includes(q) ||
          r.number.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((r) => r.state === stateFilter)
    if (provFilter) data = data.filter((r) => r.proveedorId === provFilter)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [remitos, search, stateFilter, provFilter])

  const stats = useMemo(() => {
    const total = remitos.length
    const pendientes = remitos.filter((r) => r.state === "Pendiente").length
    const recibidos = remitos.filter((r) => r.state === "Recibido" || r.state === "Verificado").length
    const unidades = remitos.reduce((sum, r) => sum + r.items.reduce((s, it) => s + it.quantity, 0), 0)
    return { total, pendientes, recibidos, unidades }
  }, [remitos])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Remitos de Proveedor</h1>
          <p className="text-sm text-muted-foreground">Ingreso de mercadería por compra</p>
        </div>
        <Button onClick={() => router.push("/compras/remitos-proveedor/nuevo")} className="gap-2">
          <Sparkles className="size-4" />
          Cargar comprobante
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Truck} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
        <StatsCard title="Recibidos" value={stats.recibidos} icon={CheckCircle2} />
        <StatsCard title="Unidades" value={stats.unidades} icon={Package} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Número, proveedor..."
              className="w-full sm:w-72"
            />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={provFilter} onChange={setProvFilter} options={provFilterOptions} />
            {(stateFilter || provFilter || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-9"
                onClick={() => {
                  setSearch("")
                  setStateFilter("")
                  setProvFilter("")
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">
              {filtered.length} remito{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Número</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Proveedor</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Items</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">OC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs font-medium">{r.number}</td>
                    <td className="px-3 py-2.5">{r.proveedorName}</td>
                    <td className="px-3 py-2.5 text-right">{r.items.length}</td>
                    <td className="px-3 py-2.5"><StateBadge status={r.state} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{r.ordenCompraId || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron remitos de proveedor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SurgeryDrawer />
    </div>
  )
}
