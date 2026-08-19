"use client"

import * as React from "react"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOrtoTrackStore } from "@/lib/store"
import type { Proveedor } from "@/types"

export type CreateProveedorModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefill?: {
    name?: string
    cuit?: string
  }
  onCreated?: (proveedor: Proveedor) => void
}

export function CreateProveedorModal({
  open,
  onOpenChange,
  prefill,
  onCreated,
}: CreateProveedorModalProps) {
  const store = useOrtoTrackStore()

  const [name, setName] = React.useState(prefill?.name ?? "")
  const [cuit, setCuit] = React.useState(prefill?.cuit ?? "")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [category, setCategory] = React.useState("")

  const handleCreate = React.useCallback(() => {
    if (!name.trim()) {
      toast.error("El nombre del proveedor es obligatorio.")
      return
    }

    const prov = store.createProveedor({
      name: name.trim(),
      cuit: cuit.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      category: category.trim() || "General",
      rating: 0,
      active: true,
    })

    toast.success(`Proveedor "${prov.name}" creado.`)
    onCreated?.(prov)
    onOpenChange(false)
  }, [name, cuit, email, phone, address, category, store, onCreated, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <DialogTitle>Crear proveedor</DialogTitle>
          </div>
          <DialogDescription>
            Dalos de alta con los datos detectados por el OCR. Podés completar el resto después.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="prov-name">Nombre *</Label>
            <Input
              id="prov-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Razón social del proveedor"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prov-cuit">CUIT</Label>
            <Input
              id="prov-cuit"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="30-71234567-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prov-email">Email</Label>
              <Input
                id="prov-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@proveedor.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prov-phone">Teléfono</Label>
              <Input
                id="prov-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prov-address">Dirección</Label>
              <Input
                id="prov-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dirección"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prov-cat">Categoría</Label>
              <Input
                id="prov-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
            Crear proveedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
