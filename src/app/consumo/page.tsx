"use client"

import React, { useState, useMemo } from "react"
import { formatDate } from "@/lib/formatters"
import {
  StatsCard, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LegacyStandaloneNotice } from "@/components/legacy/LegacyStandaloneNotice"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  Activity, Clock, CheckCircle2, Receipt,
  Eye, MoreHorizontal, FolderOpen,
  ChevronDown, ChevronRight, ShieldCheck,
  Send, Loader2, AlertTriangle, Package, RefreshCw,
} from "lucide-react"
import { useConsumos } from "@/hooks/useConsumos"
import { getConsumoVisibleNumber, type ConsumoApiRow, type ConsumoState } from "@/lib/api/consumos"
import { cn } from "@/lib/utils"

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Borrador", label: "Borrador" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Validado", label: "Validado" },
  { value: "Facturado", label: "Facturado" },
  { value: "Anulado", label: "Anulado" },
]

const CONSUMO_STATE_BADGES: Record<string, string> = {
  Borrador: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Pendiente: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  Validado: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  Facturado: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  Anulado: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
}

function ConsumoStateBadge({ state }: { state: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold", CONSUMO_STATE_BADGES[state] ?? CONSUMO_STATE_BADGES.Borrador)}>
      {state}
    </span>
  )
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default function ConsumoPage() {
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedConsumo, setSelectedConsumo] = useState<ConsumoApiRow | null>(null)

  const listParams = useMemo(() => ({
    state: stateFilter ? (stateFilter as ConsumoState) : undefined,
    take: 100,
  }), [stateFilter])

  const {
    consumos,
    loading,
    ready,
    error,
    blocked,
    mutatingId,
    refresh,
    validate,
    emit,
  } = useConsumos(listParams)

  const filtered = useMemo(() => {
    let data = consumos.slice()
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      data = data.filter((c) => {
        const visibleNum = getConsumoVisibleNumber(c).toLowerCase()
        const rawId = c.id.toLowerCase()
        const surgeryId = (c.surgeryId ?? "").toLowerCase()
        const remitoId = (c.remitoId ?? "").toLowerCase()
        const hasItemMatch = (c.items ?? []).some((item) =>
          item.description.toLowerCase().includes(q) ||
          (item.sku ?? "").toLowerCase().includes(q) ||
          (item.lotNumber ?? "").toLowerCase().includes(q)
        )
        return (
          visibleNum.includes(q) ||
          rawId.includes(q) ||
          surgeryId.includes(q) ||
          remitoId.includes(q) ||
          hasItemMatch
        )
      })
    }
    return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [consumos, search])

  const stats = useMemo(() => {
    const total = consumos.length
    const pendientes = consumos.filter((c) => c.state === "Pendiente").length
    const validados = consumos.filter((c) => c.state === "Validado").length
    const facturados = consumos.filter((c) => c.state === "Facturado").length
    return { total, pendientes, validados, facturados }
  }, [consumos])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleValidate = async () => {
    if (!selectedConsumo) return
    try {
      await validate(selectedConsumo.id)
      toast.success(`Consumo ${getConsumoVisibleNumber(selectedConsumo)} validado`)
      setValidateDialogOpen(false)
      setSelectedConsumo(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al validar el consumo")
    }
  }

  const handleEmit = async (consumo: ConsumoApiRow) => {
    try {
      await emit(consumo.id)
      toast.success(`Consumo ${getConsumoVisibleNumber(consumo)} emitido a pendiente`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al emitir el consumo")
    }
  }

  return (
    <div className="space-y-4">
      <LegacyStandaloneNotice
        description="La operación real de consumo y devolución vive en Ficha CX. Esta pantalla standalone consulta el registro canónico de consumos backend para auditoría y seguimiento."
        tabHint="Para registrar o conciliar consumo de una cirugía, abrí la Ficha CX y seleccioná la pestaña Consumo."
      />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Consumo</h1>
          <p className="text-sm text-muted-foreground">Registro canónico de materiales consumidos en cirugías</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading} className="gap-1.5 self-start sm:self-auto">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Activity} />
        <StatsCard title="Pendientes" value={stats.pendientes} icon={Clock} />
        <StatsCard title="Validados" value={stats.validados} icon={CheckCircle2} />
        <StatsCard title="Facturados" value={stats.facturados} icon={Receipt} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por ID, cirugía, remito, artículo..."
              className="w-full sm:w-80"
            />
            <FilterSelect
              value={stateFilter}
              onChange={setStateFilter}
              options={STATE_OPTIONS}
            />
            {(stateFilter || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-9"
                onClick={() => {
                  setSearch("")
                  setStateFilter("")
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blocked or Error States */}
      {blocked && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertTriangle className="size-8 text-amber-500" />
            <p className="text-sm font-medium">Empresa no seleccionada</p>
            <p className="text-xs text-muted-foreground">Seleccioná una empresa activa para ver los consumos registrados.</p>
          </CardContent>
        </Card>
      )}

      {error && !blocked && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertTriangle className="size-7 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">No se pudieron cargar los consumos</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void refresh()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table with expandable rows */}
      {!blocked && !error && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">
                {loading && !ready ? "Cargando consumos..." : `${filtered.length} consumo${filtered.length !== 1 ? "s" : ""}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2.5 w-8"></th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Remito</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Items</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Validado por</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !ready ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          <span>Cargando consumos desde backend...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((c) => {
                    const isExpanded = expandedRows.has(c.id)
                    const visibleNumber = getConsumoVisibleNumber(c)
                    const items = c.items ?? []
                    const isMutating = mutatingId === c.id

                    return (
                      <React.Fragment key={c.id}>
                        <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-2 py-2.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleRow(c.id)}
                            >
                              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            </Button>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold">{visibleNumber}</td>
                          <td className="px-3 py-2.5">
                            {c.surgeryId ? (
                              <button
                                type="button"
                                className="text-xs text-primary font-medium hover:underline text-left cursor-pointer"
                                onClick={() => openExpediente(c.surgeryId!)}
                              >
                                {c.surgeryId}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.remitoId || "—"}</td>
                          <td className="px-3 py-2.5">
                            <ConsumoStateBadge state={c.state} />
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums">{items.length}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {c.updatedById ?? c.createdById ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {formatDate(c.createdAt)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isMutating}>
                                    {isMutating ? <Loader2 className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-4" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setSelectedConsumo(c); setDetailDialogOpen(true) }}>
                                    <Eye className="size-4" /> Ver detalle
                                  </DropdownMenuItem>
                                  {c.state === "Borrador" && (
                                    <DropdownMenuItem onClick={() => void handleEmit(c)}>
                                      <Send className="size-4" /> Emitir a pendiente
                                    </DropdownMenuItem>
                                  )}
                                  {c.state === "Pendiente" && (
                                    <DropdownMenuItem onClick={() => { setSelectedConsumo(c); setValidateDialogOpen(true) }}>
                                      <ShieldCheck className="size-4" /> Validar
                                    </DropdownMenuItem>
                                  )}
                                  {c.surgeryId && (
                                    <DropdownMenuItem onClick={() => openExpediente(c.surgeryId!)}>
                                      <FolderOpen className="size-4" /> Ver cirugía
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded row with items */}
                        {isExpanded && (
                          <tr className="bg-muted/20 border-b">
                            <td colSpan={9} className="px-6 py-3">
                              {items.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">Sin ítems informados en este consumo.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Código / SKU</th>
                                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Descripción</th>
                                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Lote</th>
                                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Vencimiento</th>
                                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Solicitado</th>
                                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Consumido</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, i) => (
                                      <tr key={item.id ?? i} className="border-b last:border-0">
                                        <td className="px-2 py-1.5 font-mono text-muted-foreground">{item.sku || item.remitoItemId || "—"}</td>
                                        <td className="px-2 py-1.5 font-medium">{item.description}</td>
                                        <td className="px-2 py-1.5 font-mono">{item.lotNumber || <span className="italic text-muted-foreground">Sin lote</span>}</td>
                                        <td className="px-2 py-1.5 text-muted-foreground">{item.expirationDate ? formatDate(item.expirationDate) : "—"}</td>
                                        <td className="px-2 py-1.5 text-right font-medium text-muted-foreground">{toNumber(item.requestedQuantity)} {item.unit ?? ""}</td>
                                        <td className="px-2 py-1.5 text-right font-bold text-emerald-600">{toNumber(item.consumedQuantity)} {item.unit ?? ""}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {ready && filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="size-8 text-muted-foreground/50" />
                          <p className="text-sm font-medium">No se encontraron consumos</p>
                          <p className="text-xs text-muted-foreground">
                            {search || stateFilter ? "Probá cambiando los filtros aplicados." : "Los consumos registrados desde Ficha CX aparecerán acá."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validate Dialog */}
      <ConfirmDialog
        open={validateDialogOpen}
        onOpenChange={setValidateDialogOpen}
        title="Validar Consumo"
        description={`¿Confirma la validación del consumo ${selectedConsumo ? getConsumoVisibleNumber(selectedConsumo) : ""}? Esta acción registrará el consumo de forma definitiva en el backend.`}
        confirmLabel="Validar"
        onConfirm={handleValidate}
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Consumo</DialogTitle>
            <DialogDescription>{selectedConsumo ? getConsumoVisibleNumber(selectedConsumo) : ""}</DialogDescription>
          </DialogHeader>
          {selectedConsumo && (
            <div className="py-2 max-h-[65vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Cirugía</span>
                  <p className="font-semibold text-sm">{selectedConsumo.surgeryId || "Sin cirugía"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Remito</span>
                  <p className="font-semibold text-sm font-mono">{selectedConsumo.remitoId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Estado</span>
                  <div className="mt-0.5"><ConsumoStateBadge state={selectedConsumo.state} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Validación</span>
                  <p className="font-medium">
                    {selectedConsumo.validatedAt ? `Validado (${formatDate(selectedConsumo.validatedAt)})` : "Pendiente"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Creado</span>
                  <p className="text-muted-foreground">{formatDate(selectedConsumo.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Actualizado por</span>
                  <p className="text-muted-foreground">{selectedConsumo.updatedById ?? selectedConsumo.createdById ?? "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2">Artículos ({(selectedConsumo.items ?? []).length})</p>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Descripción</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Lote</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Solicitado</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Consumido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedConsumo.items ?? []).map((item, i) => (
                        <tr key={item.id ?? i} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono text-[11px]">{item.sku || item.remitoItemId || "—"}</td>
                          <td className="px-3 py-2 font-medium">{item.description}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">{item.lotNumber || "—"}</td>
                          <td className="px-3 py-2 text-right font-medium text-muted-foreground">{toNumber(item.requestedQuantity)}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600">{toNumber(item.consumedQuantity)}</td>
                        </tr>
                      ))}
                      {(selectedConsumo.items ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                            Sin ítems detallados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedConsumo?.state === "Pendiente" && (
              <Button
                size="sm"
                onClick={() => {
                  setDetailDialogOpen(false)
                  setValidateDialogOpen(true)
                }}
              >
                <ShieldCheck className="size-4 mr-1.5" />
                Validar Consumo
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}
