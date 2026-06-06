"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import {
  StatsCard, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  BarChart3, AlertTriangle, Package, Clock,
  ChevronDown, ChevronRight, ShoppingCart,
  TrendingDown, XCircle,
} from "lucide-react"
import type { NecesidadCompraPriority, NecesidadCompraOrigin } from "@/types"

// ── Priority badge for forecast ──
function ForecastPriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string }> = {
    Urgente: { className: "bg-red-600 text-white border-transparent" },
    Alta: { className: "bg-orange-500 text-white border-transparent" },
    Media: { className: "bg-yellow-500 text-white border-transparent" },
    Baja: { className: "bg-emerald-600 text-white border-transparent" },
  }
  const c = config[priority] || config.Media
  return <Badge className={c.className}>{priority}</Badge>
}

// ── Stock level indicator ──
function StockIndicator({ actual, min }: { actual: number; min: number }) {
  const ratio = min > 0 ? actual / min : 1
  const isBelow = ratio < 1
  const isClose = ratio >= 1 && ratio <= 1.5

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[60px]">
        <div
          className={`h-full rounded-full transition-all ${
            isBelow ? "bg-red-500" : isClose ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${isBelow ? "text-red-600" : isClose ? "text-amber-600" : "text-emerald-600"}`}>
        {actual}/{min}
      </span>
    </div>
  )
}

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas las prioridades" },
  { value: "Urgente", label: "Urgente" },
  { value: "Alta", label: "Alta" },
  { value: "Media", label: "Media" },
  { value: "Baja", label: "Baja" },
]

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas las categorías" },
  { value: "Implantes", label: "Implantes" },
  { value: "Instrumental", label: "Instrumental" },
  { value: "Descartable", label: "Descartable" },
  { value: "Insumos", label: "Insumos" },
]

export default function ForecastPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Generate necesidad dialog
  const [genDialogOpen, setGenDialogOpen] = useState(false)
  const [genItem, setGenItem] = useState<typeof store.forecast[0] | null>(null)
  const [genOrigin, setGenOrigin] = useState<NecesidadCompraOrigin>("Consumo")

  const forecast = store.forecast

  const filtered = useMemo(() => {
    let data = forecast.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (f) =>
          f.articleName.toLowerCase().includes(q) ||
          f.articleCode.toLowerCase().includes(q)
      )
    }
    if (priorityFilter) data = data.filter((f) => f.prioridad === priorityFilter)
    if (categoryFilter) data = data.filter((f) => f.category === categoryFilter)
    // Sort by priority then stock level
    const prioOrder: Record<string, number> = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 }
    return data.sort((a, b) => {
      const pa = prioOrder[a.prioridad] ?? 2
      const pb = prioOrder[b.prioridad] ?? 2
      if (pa !== pb) return pa - pb
      return (a.stockActual / Math.max(a.stockMinimo, 1)) - (b.stockActual / Math.max(b.stockMinimo, 1))
    })
  }, [forecast, search, priorityFilter, categoryFilter])

  const stats = useMemo(() => {
    const total = forecast.length
    const urgentes = forecast.filter((f) => f.prioridad === "Urgente").length
    const bajoMinimo = forecast.filter((f) => f.stockActual < f.stockMinimo).length
    const vencimientos = forecast.filter((f) => f.vencimientosProximos > 0).length
    return { total, urgentes, bajoMinimo, vencimientos }
  }, [forecast])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleGenerarNecesidad = () => {
    if (!genItem) return
    store.createNecesidadCompra({
      stockItemId: genItem.stockItemId,
      articleName: genItem.articleName,
      articleCode: genItem.articleCode,
      isArticuloZ: false,
      cantidad: genItem.sugerenciaCompra,
      priority: genItem.prioridad as NecesidadCompraPriority,
      origin: genOrigin,
      state: "Pendiente",
    })
    toast.success(`Necesidad de compra generada para ${genItem.articleName} (x${genItem.sugerenciaCompra})`)
    setGenDialogOpen(false)
    setGenItem(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Forecast de Compras</h1>
          <p className="text-sm text-muted-foreground">Análisis de demanda y sugerencias de compra</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total artículos" value={stats.total} icon={BarChart3} />
        <StatsCard
          title="Urgentes"
          value={stats.urgentes}
          icon={XCircle}
          className={stats.urgentes > 0 ? "border-red-200" : ""}
        />
        <StatsCard
          title="Bajo mínimo"
          value={stats.bajoMinimo}
          icon={TrendingDown}
          className={stats.bajoMinimo > 0 ? "border-amber-200" : ""}
        />
        <StatsCard
          title="Vencimientos próximos"
          value={stats.vencimientos}
          icon={Clock}
          className={stats.vencimientos > 0 ? "border-amber-200" : ""}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Artículo, código..." className="w-full sm:w-72" />
            <FilterSelect value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_OPTIONS} />
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
            {(priorityFilter || categoryFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setPriorityFilter(""); setCategoryFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} artículo{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Código</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Categoría</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">3m</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">6m</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">12m</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Stock act/mín</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Venc.</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">CX futuras</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Sugerencia</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Prioridad</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const isExpanded = expandedRows.has(f.id)
                  const isBelowMin = f.stockActual < f.stockMinimo
                  const isCloseToMin = f.stockActual >= f.stockMinimo && f.stockActual <= f.stockMinimo * 1.5

                  return (
                    <React.Fragment key={f.id}>
                      <tr className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isBelowMin ? "bg-red-50/50 dark:bg-red-950/20" : isCloseToMin ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                        <td className="px-3 py-2.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(f.id)}>
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{f.articleName}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{f.articleCode}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">{f.consumoHistorico3m}</td>
                        <td className="px-3 py-2.5 text-right">{f.consumoHistorico6m}</td>
                        <td className="px-3 py-2.5 text-right">{f.consumoHistorico12m}</td>
                        <td className="px-3 py-2.5">
                          <StockIndicator actual={f.stockActual} min={f.stockMinimo} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {f.vencimientosProximos > 0 ? (
                            <Badge variant="warning" className="text-[10px]">{f.vencimientosProximos}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">{f.cirugiasFuturas}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-primary">{f.sugerenciaCompra}</td>
                        <td className="px-3 py-2.5"><ForecastPriorityBadge priority={f.prioridad} /></td>
                        <td className="px-3 py-2.5 text-right">
                          {f.sugerenciaCompra > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-7"
                              onClick={() => { setGenItem(f); setGenDialogOpen(true) }}
                            >
                              <ShoppingCart className="size-3" /> Generar
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={13} className="px-6 py-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                              {/* Consumo por médico */}
                              <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">Consumo por Médico</span>
                                {f.consumoPorMedico.map((m, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="truncate">{m.medico}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-primary/60 rounded-full"
                                          style={{ width: `${(m.cantidad / Math.max(...f.consumoPorMedico.map((x) => x.cantidad), 1)) * 100}%` }}
                                        />
                                      </div>
                                      <span className="font-medium w-6 text-right">{m.cantidad}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Consumo por institución */}
                              <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">Consumo por Institución</span>
                                {f.consumoPorInstitucion.map((inst, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="truncate">{inst.institucion}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-sky-500/60 rounded-full"
                                          style={{ width: `${(inst.cantidad / Math.max(...f.consumoPorInstitucion.map((x) => x.cantidad), 1)) * 100}%` }}
                                        />
                                      </div>
                                      <span className="font-medium w-6 text-right">{inst.cantidad}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Consumo por clasificación */}
                              <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">Consumo por Clasificación</span>
                                {f.consumoPorClasificacion.map((c, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="truncate">{c.clasificacion}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-emerald-500/60 rounded-full"
                                          style={{ width: `${(c.cantidad / Math.max(...f.consumoPorClasificacion.map((x) => x.cantidad), 1)) * 100}%` }}
                                        />
                                      </div>
                                      <span className="font-medium w-6 text-right">{c.cantidad}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron artículos en forecast
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Generate Necesidad Dialog ── */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Necesidad de Compra</DialogTitle>
            <DialogDescription>Crear requerimiento desde forecast</DialogDescription>
          </DialogHeader>
          {genItem && (
            <div className="grid gap-4 py-4">
              <div className="border rounded-lg p-3 space-y-1">
                <p className="font-medium">{genItem.articleName}</p>
                <p className="text-xs text-muted-foreground font-mono">{genItem.articleCode}</p>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span>Sugerencia: <strong className="text-primary">{genItem.sugerenciaCompra}</strong> u.</span>
                  <span>Stock: {genItem.stockActual}/{genItem.stockMinimo}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Origen de la necesidad</label>
                <Select value={genOrigin} onValueChange={(v) => setGenOrigin(v as NecesidadCompraOrigin)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Consumo", "Stock crítico", "Vencimiento próximo"] as NecesidadCompraOrigin[]).map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerarNecesidad} className="bg-emerald-600 hover:bg-emerald-700">
              Generar Necesidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}
