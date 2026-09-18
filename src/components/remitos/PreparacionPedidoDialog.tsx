"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, ClipboardList } from "lucide-react"
import { useOrtoTrackStore } from "@/lib/store"
import type { Surgery, PreparacionPedidoItem } from "@/types"

interface PreparacionPedidoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery: Surgery | null
}

export function PreparacionPedidoDialog({ open, onOpenChange, surgery }: PreparacionPedidoDialogProps) {
  const store = useOrtoTrackStore()
  const [text, setText] = useState("")
  const [items, setItems] = useState<PreparacionPedidoItem[]>([])

  const addItem = () => {
    setItems((prev) => [...prev, { codigo: "", descripcion: "", cantidad: undefined }])
  }

  const updateItem = (index: number, field: keyof PreparacionPedidoItem, value: string | number | undefined) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!surgery || !text.trim()) return
    store.addPreparacionPedido(surgery.id, text, items)
    setText("")
    setItems([])
    onOpenChange(false)
  }

  useEffect(() => {
    if (!open) {
      setText("")
      setItems([])
    }
  }, [open])

  if (!surgery) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5" />
            Preparación de pedido
          </DialogTitle>
          <DialogDescription>
            Cirugía {surgery.expedienteNumber ?? surgery.id} — Registrar nota de preparación para depósito
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Texto</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Instrucciones para depósito..." rows={2} className="text-xs" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ítems referenciados</Label>
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={addItem}>
                <Plus className="size-3" /> Agregar
              </Button>
            </div>
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={item.codigo} onChange={(e) => updateItem(idx, "codigo", e.target.value)} className="h-7 text-xs font-mono w-24" placeholder="Código" />
                    <Input value={item.descripcion} onChange={(e) => updateItem(idx, "descripcion", e.target.value)} className="h-7 text-xs flex-1" placeholder="Descripción" />
                    <Input type="number" min={1} value={item.cantidad ?? ""} onChange={(e) => updateItem(idx, "cantidad", parseInt(e.target.value) || undefined)} className="h-7 text-xs w-16" placeholder="Cant." />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Esta nota NO mueve stock ni genera numeración PE. Es solo referencia interna para depósito.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!text.trim()}>
            <ClipboardList className="size-4" /> Guardar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
