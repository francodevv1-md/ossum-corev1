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
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import {
  ArrowRightLeft, Plane, Anchor, Warehouse,
} from "lucide-react"
import type { TransitType } from "@/types"

const TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "En tránsito CX", label: "En tránsito CX" },
  { value: "En tránsito permanente", label: "En tránsito permanente" },
]

const DEPOSIT_OPTIONS = [
  { value: "", label: "Todos los depósitos" },
  { value: "Depósito Central", label: "Depósito Central" },
  { value: "Depósito Quirúrgico", label: "Depósito Quirúrgico" },
  { value: "Depósito Logística", label: "Depósito Logística" },
]

export default function MaterialTransitoPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [depositFilter, setDepositFilter] = useState("")

  const material = store.materialTransito

  const filtered = useMemo(() => {
    let data = material.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (m) =>
          m.articleName.toLowerCase().includes(q) ||
          m.articleCode.toLowerCase().includes(q) ||
          m.surgeryId.toLowerCase().includes(q) ||
          m.patient.toLowerCase().includes(q) ||
          m.institution.toLowerCase().includes(q)
      )
    }
    if (typeFilter) data = data.filter((m) => m.type === typeFilter)
    if (depositFilter) data = data.filter((m) => m.deposit === depositFilter)
    return data
  }, [material, search, typeFilter, depositFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const transitoCx = filtered.filter((m) => m.type === "En tránsito CX").length
    const permanente = filtered.filter((m) => m.type === "En tránsito permanente").length
    return { total, transitoCx, permanente }
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Material en Tránsito</h1>
          <p className="text-sm text-muted-foreground">Artículos enviados a cirugías o en tránsito permanente</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard title="Total" value={stats.total} icon={ArrowRightLeft} />
        <StatsCard title="En tránsito CX" value={stats.transitoCx} icon={Plane} />
        <StatsCard title="Permanente" value={stats.permanente} icon={Anchor} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Artículo, código, cirugía, paciente..." className="w-full sm:w-80" />
            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            <FilterSelect value={depositFilter} onChange={setDepositFilter} options={DEPOSIT_OPTIONS} />
            {(typeFilter || depositFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setTypeFilter(""); setDepositFilter("") }}>
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
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Código</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Departamento</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">NR</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Destino</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Depósito</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <div>
                        <p className="font-medium text-sm">{m.articleName}</p>
                        <p className="text-xs text-muted-foreground">
                          CX: <span className="text-primary cursor-pointer hover:underline" onClick={() => openExpediente(m.surgeryId)}>{m.surgeryId}</span>
                          {" — "}{m.patient} • {m.surgeon}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.articleCode}</td>
                    <td className="px-3 py-2.5 text-xs">{m.department}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={m.type === "En tránsito CX" ? "info" : "warning"} className="text-[10px]">
                        {m.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.nrNumber || "—"}</td>
                    <td className="px-3 py-2.5 text-xs">{m.institution}</td>
                    <td className="px-3 py-2.5 text-xs">{m.deposit}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontró material en tránsito
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
