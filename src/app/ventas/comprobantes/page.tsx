"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { getBadgeVariant, CLIENT_OPTIONS, comprobanteTypeLabels } from "@/lib/statusHelpers"
import { getSaldoPendienteFactura } from "@/lib/cobros.utils"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  FileText, Eye, MoreHorizontal, DollarSign,
  Clock, CheckCircle2, FolderOpen, List,
  Receipt, CreditCard,
} from "lucide-react"
import type { Comprobante } from "@/types"

const TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "PR", label: "Presupuesto (PR)" },
  { value: "PE", label: "Pedido (PE)" },
  { value: "NR", label: "Nota remisión (NR)" },
  { value: "FV", label: "Factura venta (FV)" },
  { value: "CO", label: "Cobro (CO)" },
  { value: "NC", label: "Nota crédito (NC)" },
  { value: "ND", label: "Nota débito (ND)" },
]

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Emitida", label: "Emitida" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Aprobado", label: "Aprobado" },
  { value: "Enviado", label: "Enviado" },
  { value: "Cobrado", label: "Cobrado" },
  { value: "Devuelto", label: "Devuelto" },
  { value: "Borrador", label: "Borrador" },
  { value: "Anulada", label: "Anulada" },
]

export default function ComprobantesPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")

  const comprobantes = store.comprobantes

  const filtered = useMemo(() => {
    let data = comprobantes.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (c) =>
          c.number.toLowerCase().includes(q) ||
          c.client.toLowerCase().includes(q) ||
          c.concept.toLowerCase().includes(q) ||
          c.surgeryId.toLowerCase().includes(q)
      )
    }
    if (typeFilter) data = data.filter((c) => c.type === typeFilter)
    if (stateFilter) data = data.filter((c) => c.state === stateFilter)
    if (clientFilter) data = data.filter((c) => c.client === clientFilter)
    return data.sort((a, b) => b.date.localeCompare(a.date))
  }, [comprobantes, search, typeFilter, stateFilter, clientFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const facturacionTotal = filtered.filter((c) => c.type === "FV").reduce((sum, c) => sum + c.amount, 0)
    const pendienteCobro = filtered.filter((c) => c.type === "FV").reduce((sum, c) => sum + getSaldoPendienteFactura(c, store.imputaciones), 0)
    const cobrado = filtered.filter((c) => c.type === "FV").reduce((sum, c) => sum + (c.amount - getSaldoPendienteFactura(c, store.imputaciones)), 0)
    return { total, facturacionTotal, pendienteCobro, cobrado }
  }, [filtered, store.imputaciones])

  // ── Group by surgeryId ──
  const grouped = useMemo(() => {
    const groups: Record<string, Comprobante[]> = {}
    for (const c of filtered) {
      const key = c.surgeryId || "SIN-CIRUGIA"
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    return groups
  }, [filtered])

  const surgeryIds = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Comprobantes</h1>
          <p className="text-sm text-muted-foreground">Vista unificada de todos los comprobantes agrupados por cirugía</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total comprobantes" value={stats.total} icon={List} />
        <StatsCard title="Facturación total" value={formatCurrency(stats.facturacionTotal)} icon={Receipt} />
        <StatsCard title="Pendiente cobro" value={formatCurrency(stats.pendienteCobro)} icon={Clock} />
        <StatsCard title="Cobrado" value={formatCurrency(stats.cobrado)} icon={CreditCard} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Número, cliente, concepto, cirugía..." className="w-full sm:w-72" />
            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={clientFilter} onChange={setClientFilter} options={CLIENT_OPTIONS} />
            {(typeFilter || stateFilter || clientFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setTypeFilter(""); setStateFilter(""); setClientFilter("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grouped table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">{filtered.length} comprobante{filtered.length !== 1 ? "s" : ""} en {surgeryIds.length} cirugía{surgeryIds.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Flat table with surgery grouping visual separators */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Número</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cliente</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Monto</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">A cobrar</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Concepto</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {surgeryIds.map((surgeryId) => {
                  const comps = grouped[surgeryId]
                  const surgery = store.getSurgeryById(surgeryId)
                  return (
                    <React.Fragment key={surgeryId}>
                      {/* Surgery group header */}
                      <tr className="bg-muted/20 border-b">
                        <td colSpan={9} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="size-3.5 text-primary" />
                            <span className="font-semibold text-xs text-primary">
                              {surgeryId === "SIN-CIRUGIA" ? "Sin cirugía asociada" : `CX: ${surgeryId}`}
                            </span>
                            {surgery && (
                              <>
                                <span className="text-xs text-muted-foreground">—</span>
                                <span className="text-xs">{surgery.patient}</span>
                                <span className="text-xs text-muted-foreground">({surgery.client})</span>
                              </>
                            )}
                            <Badge variant="outline" className="text-[10px] ml-auto">{comps.length} comprobantes</Badge>
                          </div>
                        </td>
                      </tr>
                      {/* Comprobantes in this group */}
                      {comps.map((c) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5">
                            <Badge variant={getBadgeVariant(c.type)} className="text-[10px]">
                              {c.type}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-medium">{c.number}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(c.date)}</td>
                          <td className="px-3 py-2.5">{c.client}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(c.amount)}</td>
                          <td className="px-3 py-2.5 text-right">{formatCurrency(c.type === "FV" ? getSaldoPendienteFactura(c, store.imputaciones) : c.toCollect)}</td>
                          <td className="px-3 py-2.5 max-w-[200px] truncate">{c.concept}</td>
                          <td className="px-3 py-2.5"><StateBadge status={c.state} /></td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => toast.info(`Detalle ${c.number}`)}>
                                    <Eye className="size-4" /> Ver detalle
                                  </DropdownMenuItem>
                                  {c.surgeryId && (
                                    <DropdownMenuItem onClick={() => openExpediente(c.surgeryId)}>
                                      <FolderOpen className="size-4" /> Ver cirugía
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron comprobantes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expediente Drawer */}
      <SurgeryDrawer />
    </div>
  )
}
