"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Truck, Plus, Trash2, Download, Building2, Stethoscope, Heart, User,
} from "lucide-react"
import { useOrtoTrackStore } from "@/lib/store"
import { generateId } from "@/lib/idGenerators"
import type {
  Surgery, RemitoEstado, DestinatarioTipo,
  DestinatarioSnapshot,
} from "@/types"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { toLegacyPresupuestoProjection } from "@/lib/api/presupuestos"

// ─── Local types for the form ─────────────────────────────────────

interface RemitoFormItem {
  codigo: string
  descripcion: string
  cantidad: number
  presupuestoItemId?: string
  catalogItemId?: string
}

// ─── Props ────────────────────────────────────────────────────────

interface RemitoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery: Surgery | null
}

// ─── Constants ────────────────────────────────────────────────────

const DESTINATARIO_CONFIG: Record<DestinatarioTipo, { label: string; icon: React.ReactNode }> = {
  cliente_pagador: { label: "Cliente / Pagador", icon: <Building2 className="size-4" /> },
  institucion: { label: "Institución", icon: <Building2 className="size-4" /> },
  medico: { label: "Médico", icon: <Stethoscope className="size-4" /> },
  paciente: { label: "Paciente", icon: <Heart className="size-4" /> },
}

// ─── Component ────────────────────────────────────────────────────

export function RemitoFormDialog({ open, onOpenChange, surgery }: RemitoFormDialogProps) {
  const store = useOrtoTrackStore()
  const presupuestoAuthority = usePresupuestos(
    { surgeryId: surgery?.backendId ?? surgery?.id, take: 100 },
    open && Boolean(surgery),
  )
  const { current: currentPresupuesto, draft: draftPresupuesto } = presupuestoAuthority

  // ── Form state ──
  const [destinatarioTipo, setDestinatarioTipo] = useState<DestinatarioTipo | "">("")
  const [destinatarioContactId, setDestinatarioContactId] = useState("")
  const [destinatarioSnapshot, setDestinatarioSnapshot] = useState<DestinatarioSnapshot | null>(null)
  const [items, setItems] = useState<RemitoFormItem[]>([])
  const [observaciones, setObservaciones] = useState("")

  // ── Derived data ──
  const presupuesto = useMemo(() => {
    const authoritative = currentPresupuesto ?? draftPresupuesto
    return authoritative ? toLegacyPresupuestoProjection(authoritative) : null
  }, [currentPresupuesto, draftPresupuesto])

  const preparacionesPendientes = useMemo(() => {
    if (!surgery) return []
    return store.notes.filter(
      (n) => n.surgeryId === surgery.id && n.type === "preparacion_pedido"
    )
  }, [surgery, store.notes])

  // ── Destinatario resolution ──
  const destinatarioOptions = useMemo(() => {
    if (!surgery) return []
    const options: { tipo: DestinatarioTipo; contactId: string; nombre: string; codigo?: string; cuitDni?: string; domicilio?: string; localidad?: string; provincia?: string }[] = []

    // Cliente/Pagador
    if (surgery.clientContactId) {
      const c = store.getContactoById(surgery.clientContactId)
      if (c) options.push({ tipo: "cliente_pagador", contactId: c.id, nombre: c.nombre, codigo: c.codigoContacto, cuitDni: c.cuit || c.dni, domicilio: c.domicilio, localidad: c.localidad, provincia: c.provincia })
    } else if (surgery.client) {
      options.push({ tipo: "cliente_pagador", contactId: "", nombre: surgery.client })
    }

    // Institución
    if (surgery.institutionContactId) {
      const c = store.getContactoById(surgery.institutionContactId)
      if (c) options.push({ tipo: "institucion", contactId: c.id, nombre: c.nombre, codigo: c.codigoContacto, cuitDni: c.cuit || c.dni, domicilio: c.domicilio, localidad: c.localidad, provincia: c.provincia })
    } else if (surgery.institution) {
      options.push({ tipo: "institucion", contactId: "", nombre: surgery.institution })
    }

    // Médico
    if (surgery.surgeonContactId) {
      const c = store.getContactoById(surgery.surgeonContactId)
      if (c) options.push({ tipo: "medico", contactId: c.id, nombre: c.nombre, codigo: c.codigoContacto, cuitDni: c.cuit || c.dni, domicilio: c.domicilio, localidad: c.localidad, provincia: c.provincia })
    } else if (surgery.surgeon) {
      options.push({ tipo: "medico", contactId: "", nombre: surgery.surgeon })
    }

    // Paciente
    if (surgery.patientContactId) {
      const c = store.getContactoById(surgery.patientContactId)
      if (c) options.push({ tipo: "paciente", contactId: c.id, nombre: c.nombre, codigo: c.codigoContacto, cuitDni: c.cuit || c.dni, domicilio: c.domicilio, localidad: c.localidad, provincia: c.provincia })
    } else if (surgery.patient) {
      options.push({ tipo: "paciente", contactId: "", nombre: surgery.patient })
    }

    return options
  }, [surgery, store])

  // ── Handlers ──
  const selectDestinatario = useCallback((tipo: DestinatarioTipo) => {
    const opt = destinatarioOptions.find((o) => o.tipo === tipo)
    if (opt) {
      setDestinatarioTipo(tipo)
      setDestinatarioContactId(opt.contactId)
      setDestinatarioSnapshot({
        codigoContacto: opt.codigo,
        nombre: opt.nombre,
        cuitDni: opt.cuitDni,
        domicilio: opt.domicilio,
        localidad: opt.localidad,
        provincia: opt.provincia,
      })
    }
  }, [destinatarioOptions])

  const importFromPresupuesto = useCallback(() => {
    if (!presupuesto) return
    const newItems: RemitoFormItem[] = presupuesto.items.map((pi) => ({
      codigo: pi.code,
      descripcion: pi.name,
      cantidad: pi.quantity,
      presupuestoItemId: pi.stockItemId,
      catalogItemId: pi.catalogItemId || pi.stockItemId,
    }))
    setItems(newItems)
  }, [presupuesto])

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { codigo: "", descripcion: "", cantidad: 1 } as RemitoFormItem])
  }, [])

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = useCallback((estado: RemitoEstado) => {
    if (!surgery || !destinatarioTipo || !destinatarioSnapshot) return

    store.createRemito({
      surgeryId: surgery.id,
      presupuestoId: presupuesto?.id,
      fechaEmision: estado === "emitido" ? new Date().toISOString().split("T")[0] : "",
      usuarioEmisor: store.users.find((u) => u.id === store.currentUserId)?.name || "",
      destinatarioTipo,
      destinatarioContactId,
      destinatarioSnapshot,
      estado,
      observaciones: observaciones || undefined,
      items: items.map((item) => ({ ...item, id: generateId("NR-ITM") })),
    })

    // Reset and close
    setDestinatarioTipo("")
    setDestinatarioContactId("")
    setDestinatarioSnapshot(null)
    setItems([])
    setObservaciones("")
    onOpenChange(false)
  }, [surgery, presupuesto, destinatarioTipo, destinatarioContactId, destinatarioSnapshot, items, observaciones, store, onOpenChange])

  const isValid = destinatarioTipo && destinatarioSnapshot && items.length > 0 && items.every((it) => it.descripcion?.trim() && it.cantidad > 0)

  // ── Reset form when dialog opens/closes ──
  useEffect(() => {
    if (!open) {
      // Closing the controlled dialog is the reset boundary for abandoned drafts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDestinatarioTipo("")
      setDestinatarioContactId("")
      setDestinatarioSnapshot(null)
      setItems([])
      setObservaciones("")
    }
  }, [open])

  if (!surgery) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            Remitir NR
          </DialogTitle>
          <DialogDescription>
            Cirugía {surgery.expedienteNumber ?? surgery.id} — {surgery.patient}
          </DialogDescription>
        </DialogHeader>
        {presupuestoAuthority.error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{presupuestoAuthority.error}</p>}

        <ScrollArea className="max-h-[65vh] pr-2">
          <div className="grid gap-6 py-4">
            {/* ── A. Destinatario ── */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">A. Destinatario</Label>
              <p className="text-xs text-muted-foreground">
                Seleccione entre los 4 actores de la cirugía
              </p>
              <div className="grid grid-cols-2 gap-2">
                {destinatarioOptions.map((opt) => {
                  const config = DESTINATARIO_CONFIG[opt.tipo]
                  const isSelected = destinatarioTipo === opt.tipo
                  return (
                    <button
                      key={opt.tipo}
                      type="button"
                      onClick={() => selectDestinatario(opt.tipo)}
                      className={`flex items-center gap-2 rounded-md border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-muted hover:bg-muted/50"
                      }`}
                    >
                      {config?.icon}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{opt.nombre}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {config?.label}
                          {opt.codigo ? ` · #${opt.codigo}` : ""}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {destinatarioSnapshot && (
                <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground space-y-0.5">
                  {destinatarioSnapshot.cuitDni && <p>CUIT/DNI: {destinatarioSnapshot.cuitDni}</p>}
                  {destinatarioSnapshot.domicilio && <p>Domicilio: {destinatarioSnapshot.domicilio}</p>}
                  {destinatarioSnapshot.localidad && <p>{destinatarioSnapshot.localidad}{destinatarioSnapshot.provincia ? `, ${destinatarioSnapshot.provincia}` : ""}</p>}
                </div>
              )}
            </div>

            <Separator />

            {/* ── B. Items ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">B. Ítems del remito</Label>
                <div className="flex items-center gap-2">
                  {presupuesto && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={importFromPresupuesto}>
                      <Download className="size-3" /> Importar desde presupuesto
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={addItem}>
                    <Plus className="size-3" /> Agregar ítem
                  </Button>
                </div>
              </div>

              {presupuesto && items.length === 0 && (
                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  Existe un presupuesto vigente ({presupuesto.id}). Podés importar los ítems como base y luego ajustar.
                  El remito es la foto de lo que efectivamente sale, no copia rígida del presupuesto.
                </p>
              )}

              {/* Preparación de pedido reference */}
              {preparacionesPendientes.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2 space-y-1">
                  <p className="text-xs font-medium text-amber-800">
                    Existe una preparación de pedido registrada para esta cirugía
                  </p>
                  {preparacionesPendientes.map((nota) => (
                    <div key={nota.id} className="text-[10px] text-amber-700">
                      {nota.preparacionItems?.map((it) => `${it.codigo} — ${it.descripcion} (x${it.cantidad ?? "-"})`).join(" · ")}
                      <span className="ml-1">[{nota.preparacionEstado === "confirmado_por_deposito" ? "Confirmada" : "Pendiente"}]</span>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-[10px] h-7 w-28">Código</TableHead>
                        <TableHead className="text-[10px] h-7">Descripción</TableHead>
                        <TableHead className="text-[10px] h-7 w-20 text-right">Cantidad</TableHead>
                        <TableHead className="text-[10px] h-7 w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="py-1">
                            <Input
                              value={item.codigo}
                              onChange={(e) => updateItem(idx, "codigo", e.target.value)}
                              className="h-7 text-xs font-mono"
                              placeholder="Código"
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input
                              value={item.descripcion}
                              onChange={(e) => updateItem(idx, "descripcion", e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Descripción del artículo"
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input
                              type="number"
                              min={1}
                              value={item.cantidad}
                              onChange={(e) => updateItem(idx, "cantidad", parseInt(e.target.value) || 0)}
                              className="h-7 text-xs text-right w-16"
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(idx)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center border rounded-md bg-muted/10">
                  <Truck className="size-6 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Sin ítems. Agregá manualmente o importá desde presupuesto.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* ── C. Observaciones ── */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">C. Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones del remito (opcional)..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            disabled={!isValid}
            onClick={() => handleSave("borrador")}
          >
            Guardar borrador
          </Button>
          <Button
            disabled={!isValid}
            onClick={() => handleSave("emitido")}
          >
            <Truck className="size-4" />
            Emitir remito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
