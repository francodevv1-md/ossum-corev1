"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import {
  StatsCard, SearchInput, SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Tag, CheckCircle2, XCircle, Settings2,
} from "lucide-react"
import type { ClassificationConfig } from "@/types"

export default function ClasificacionesPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")

  const classifications = store.classifications

  const filtered = useMemo(() => {
    let data = classifications.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      )
    }
    return data.sort((a, b) => a.name.localeCompare(b.name))
  }, [classifications, search])

  const stats = useMemo(() => {
    const total = filtered.length
    const activas = filtered.filter((c) => c.active).length
    const inactivas = filtered.filter((c) => !c.active).length
    return { total, activas, inactivas }
  }, [filtered])

  const handleToggle = (id: string) => {
    store.toggleClassificationActive(id)
    const cls = store.classifications.find((c) => c.id === id)
    toast.success(`Clasificación "${cls?.name}" ${cls?.active ? "desactivada" : "activada"}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Clasificaciones</h1>
          <p className="text-sm text-muted-foreground">Configuración de clasificaciones de cirugía</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard title="Total" value={stats.total} icon={Tag} />
        <StatsCard title="Activas" value={stats.activas} icon={CheckCircle2} />
        <StatsCard title="Inactivas" value={stats.inactivas} icon={XCircle} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar clasificación..." className="w-full sm:w-72" />
            {search && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => setSearch("")}>
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
            <span className="text-sm text-muted-foreground">{filtered.length} clasificación{filtered.length !== 1 ? "es" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nombre</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Descripción</th>
                  <th className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls) => (
                  <tr key={cls.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs">{cls.id}</td>
                    <td className="px-3 py-2.5 font-medium">{cls.name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[300px] truncate">{cls.description}</td>
                    <td className="px-3 py-2.5 text-center">
                      {cls.active ? (
                        <Badge variant="success" className="text-[10px]">Activa</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inactiva</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={cls.active}
                            onCheckedChange={() => handleToggle(cls.id)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {cls.active ? "Activar" : "Desactivar"}
                          </span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron clasificaciones
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
