"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import {
  StatsCard, StateBadge, SearchInput,
  SurgeryDrawer,
} from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  Users, UserCheck, Eye, MoreHorizontal,
  Pencil, Plus, Stethoscope,
} from "lucide-react"
import type { Instrumentador } from "@/types"

export default function InstrumentadoresPage() {
  const store = useOrtoTrackStore()

  const [search, setSearch] = useState("")

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formSpeciality, setFormSpeciality] = useState("")

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedInst, setSelectedInst] = useState<Instrumentador | null>(null)

  const instrumentadores = store.instrumentadores

  const filtered = useMemo(() => {
    let data = instrumentadores.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.speciality.toLowerCase().includes(q)
      )
    }
    return data.sort((a, b) => a.name.localeCompare(b.name))
  }, [instrumentadores, search])

  const stats = useMemo(() => {
    const total = filtered.length
    const activos = filtered.length // all are considered active in the current model
    return { total, activos }
  }, [filtered])

  const resetForm = () => {
    setEditId(null)
    setFormName("")
    setFormEmail("")
    setFormPhone("")
    setFormSpeciality("")
  }

  const handleCreate = () => {
    if (!formName) {
      toast.error("Complete el nombre")
      return
    }
    store.createInstrumentador({
      name: formName,
      email: formEmail,
      phone: formPhone,
      speciality: formSpeciality,
    })
    toast.success("Instrumentador creado exitosamente")
    setDialogOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!editId || !formName) return
    useOrtoTrackStore.setState({
      instrumentadores: instrumentadores.map((i) =>
        i.id === editId
          ? { ...i, name: formName, email: formEmail, phone: formPhone, speciality: formSpeciality }
          : i
      ),
    })
    toast.success("Instrumentador actualizado")
    setDialogOpen(false)
    resetForm()
  }

  const openEditDialog = (i: Instrumentador) => {
    setEditId(i.id)
    setFormName(i.name)
    setFormEmail(i.email)
    setFormPhone(i.phone)
    setFormSpeciality(i.speciality)
    setDialogOpen(true)
  }

  // Get surgeries for instrumentador
  const getSurgeries = (instId: string) => {
    return store.instrumentadorSurgeries.filter((is) => is.instrumentadorId === instId)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Instrumentadores</h1>
          <p className="text-sm text-muted-foreground">Gestión de instrumentadores quirúrgicos</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus className="size-4" /> Nuevo Instrumentador
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatsCard title="Total" value={stats.total} icon={Users} />
        <StatsCard title="Activos" value={stats.activos} icon={UserCheck} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Nombre, email, especialidad..." className="w-full sm:w-72" />
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
            <span className="text-sm text-muted-foreground">{filtered.length} instrumentador{filtered.length !== 1 ? "es" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Nombre</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Email</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Teléfono</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Especialidad</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => (
                  <tr key={inst.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs">{inst.id}</td>
                    <td className="px-3 py-2.5 font-medium">{inst.name}</td>
                    <td className="px-3 py-2.5 text-xs">{inst.email}</td>
                    <td className="px-3 py-2.5 text-xs">{inst.phone}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">{inst.speciality}</Badge>
                    </td>
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
                            <DropdownMenuItem onClick={() => { setSelectedInst(inst); setDetailDialogOpen(true) }}>
                              <Eye className="size-4" /> Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(inst)}>
                              <Pencil className="size-4" /> Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron instrumentadores
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Instrumentador" : "Nuevo Instrumentador"}</DialogTitle>
            <DialogDescription>{editId ? "Modificar datos del instrumentador" : "Registrar un nuevo instrumentador"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="11-XXXX-XXXX" />
            </div>
            <div className="space-y-2">
              <Label>Especialidad</Label>
              <Input value={formSpeciality} onChange={(e) => setFormSpeciality(e.target.value)} placeholder="Traumatología, Artroscopía..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={editId ? handleEdit : handleCreate} disabled={!formName}>
              {editId ? "Guardar Cambios" : "Crear Instrumentador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Instrumentador</DialogTitle>
            <DialogDescription>{selectedInst?.name}</DialogDescription>
          </DialogHeader>
          {selectedInst && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">ID:</span><p className="font-mono">{selectedInst.id}</p></div>
                <div><span className="text-muted-foreground">Especialidad:</span><p><Badge variant="outline" className="text-[10px]">{selectedInst.speciality}</Badge></p></div>
                <div><span className="text-muted-foreground">Email:</span><p>{selectedInst.email}</p></div>
                <div><span className="text-muted-foreground">Teléfono:</span><p>{selectedInst.phone}</p></div>
              </div>

              {/* Surgeries assigned */}
              {(() => {
                const surgeries = getSurgeries(selectedInst.id)
                return surgeries.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Cirugías asignadas ({surgeries.length})</span>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {surgeries.map((is) => (
                        <div key={is.id} className="border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{is.patient}</p>
                            <p className="text-xs text-muted-foreground">{is.institution} — {is.date}</p>
                          </div>
                          <StateBadge status={is.state} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin cirugías asignadas</p>
                )
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}
