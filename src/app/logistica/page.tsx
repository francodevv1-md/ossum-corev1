"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
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
import { LogisticsMapPanel } from "@/components/logistica/LogisticsMapPanel"
import { useLogisticsMap } from "@/hooks/useLogisticsMap"
import { toast } from "sonner"
import {
  Truck, PackageCheck, RotateCcw, Warehouse,
  MoreHorizontal, FolderOpen, ArrowRightLeft,
} from "lucide-react"
import type { LogisticsState, PreparationState } from "@/types"

const IDA_OPTIONS = [
  { value: "", label: "Ida: Todos" },
  { value: "Sin preparar", label: "Sin preparar" },
  { value: "Preparado", label: "Preparado" },
  { value: "Enviado", label: "Enviado" },
  { value: "Retirado", label: "Retirado" },
  { value: "Congelado", label: "Congelado" },
  { value: "Congelado con faltantes", label: "Congelado con faltantes" },
]

const VUELTA_OPTIONS = [
  { value: "", label: "Vuelta: Todos" },
  { value: "Sin preparar", label: "Sin preparar" },
  { value: "Devuelto", label: "Devuelto" },
  { value: "Controlado", label: "Controlado" },
]

export default function LogisticaPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()
  const map = useLogisticsMap()

  const [search, setSearch] = useState("")
  const [idaFilter, setIdaFilter] = useState("")
  const [vueltaFilter, setVueltaFilter] = useState("")

  const logistics = store.logisticsDetails

  const filtered = useMemo(() => {
    let data = logistics.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter((ld) => {
        const surgery = store.getSurgeryById(ld.surgeryId)
        return (
          ld.surgeryId.toLowerCase().includes(q) ||
          (surgery?.patient || "").toLowerCase().includes(q) ||
          (surgery?.institution || "").toLowerCase().includes(q)
        )
      })
    }
    if (idaFilter) data = data.filter((ld) => ld.ida === idaFilter)
    if (vueltaFilter) data = data.filter((ld) => ld.vuelta === vueltaFilter)
    return data
  }, [logistics, search, idaFilter, vueltaFilter, store])

  const stats = useMemo(() => {
    const total = filtered.length
    const enviados = filtered.filter((ld) => ld.ida === "Enviado" || ld.ida === "Retirado").length
    const devueltos = filtered.filter((ld) => ld.vuelta === "Devuelto" || ld.vuelta === "Controlado").length
    const enPreparacion = filtered.filter((ld) => ld.ida === "Preparado" || ld.ida === "Congelado" || ld.ida === "Congelado con faltantes").length
    return { total, enviados, devueltos, enPreparacion }
  }, [filtered])

  const handleLogisticsChange = (surgeryId: string, field: "ida" | "vuelta", newState: LogisticsState) => {
    store.changeLogisticsStatus(surgeryId, field, newState)
    toast.success(`${field === "ida" ? "Ida" : "Vuelta"} cambiado a ${newState}`)
  }

  const IDA_STATES: LogisticsState[] = ["Sin preparar", "Preparado", "Enviado", "Retirado", "Congelado", "Congelado con faltantes"]
  const VUELTA_STATES: LogisticsState[] = ["Sin preparar", "Devuelto", "Controlado"]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Logística</h1>
          <p className="text-sm text-muted-foreground">Seguimiento de envíos y devoluciones</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Truck} />
        <StatsCard title="Enviados" value={stats.enviados} icon={PackageCheck} />
        <StatsCard title="Devueltos" value={stats.devueltos} icon={RotateCcw} />
        <StatsCard title="En preparación" value={stats.enPreparacion} icon={Warehouse} />
      </div>

      {map.error ? <section role="alert" className="border border-amber-200 bg-amber-50 p-3 text-sm">El mapa no está disponible: {map.error}</section> : map.data && <LogisticsMapPanel markers={map.data.markers} excluded={map.data.excluded} vehicles={map.data.vehicles} feed={map.data.feed} route={map.route} routeLoading={map.routeLoading} routeError={map.routeError} onShowRoute={map.showRoute} onHideRoute={map.hideRoute} onOpen={openExpediente} />}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Cirugía, paciente, institución..." className="w-full sm:w-72" />
            <FilterSelect value={idaFilter} onChange={setIdaFilter} options={IDA_OPTIONS} />
            <FilterSelect value={vueltaFilter} onChange={setVueltaFilter} options={VUELTA_OPTIONS} />
            {(idaFilter || vueltaFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setIdaFilter(""); setVueltaFilter("") }}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cirugía</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Paciente</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Institución</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Ida</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Vuelta</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Preparación</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha envío</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ld) => {
                  const surgery = store.getSurgeryById(ld.surgeryId)
                  return (
                    <tr key={ld.surgeryId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <span
                          className="font-mono text-xs text-primary cursor-pointer hover:underline font-medium"
                          onClick={() => openExpediente(ld.surgeryId)}
                        >
                          {ld.surgeryId}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{surgery?.patient || "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{surgery?.institution || "—"}</td>
                      <td className="px-3 py-2.5"><StateBadge status={ld.ida} /></td>
                      <td className="px-3 py-2.5"><StateBadge status={ld.vuelta} /></td>
                      <td className="px-3 py-2.5"><StateBadge status={ld.preparation} /></td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                        {ld.fechaEnvioMateriales ? formatDate(ld.fechaEnvioMateriales) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-xs">Cambiar estado</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Ida</DropdownMenuLabel>
                              {IDA_STATES.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  disabled={ld.ida === s}
                                  onClick={() => handleLogisticsChange(ld.surgeryId, "ida", s)}
                                >
                                  {s}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Vuelta</DropdownMenuLabel>
                              {VUELTA_STATES.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  disabled={ld.vuelta === s}
                                  onClick={() => handleLogisticsChange(ld.surgeryId, "vuelta", s)}
                                >
                                  {s}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openExpediente(ld.surgeryId)}>
                                <FolderOpen className="size-4" /> Ver cirugía
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron registros de logística
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
