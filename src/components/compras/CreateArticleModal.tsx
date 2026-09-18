"use client"

import * as React from "react"
import { PackagePlus } from "lucide-react"
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
import type { StockItem } from "@/types"

export type CreateArticleModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Datos pre-cargados desde el OCR. */
  prefill?: {
    code?: string
    name?: string
    supplier?: string
    lot?: string
    expiry?: string
    unitPrice?: number
  }
  /** Callback cuando se crea el artículo. */
  onCreated?: (stockItem: StockItem) => void
}

export function CreateArticleModal({
  open,
  onOpenChange,
  prefill,
  onCreated,
}: CreateArticleModalProps) {
  const store = useOrtoTrackStore()

  // Initialize from prefill — remounted via key when prefill changes.
  const [code, setCode] = React.useState(prefill?.code ?? "")
  const [name, setName] = React.useState(prefill?.name ?? "")
  const [supplier, setSupplier] = React.useState(prefill?.supplier ?? "")
  const [category, setCategory] = React.useState("")
  const [brand, setBrand] = React.useState("")
  const [lot, setLot] = React.useState(prefill?.lot ?? "")
  const [expiry, setExpiry] = React.useState(prefill?.expiry ?? "")
  const [unitPrice, setUnitPrice] = React.useState(
    prefill?.unitPrice ? String(prefill.unitPrice) : ""
  )

  const handleCreate = React.useCallback(() => {
    if (!name.trim()) {
      toast.error("El nombre del artículo es obligatorio.")
      return
    }

    const item = store.createStockItem({
      code: code.trim(),
      name: name.trim(),
      description: name.trim(),
      category: category.trim() || "General",
      section: "",
      rubro: "",
      department: "",
      brand: brand.trim(),
      supplier: supplier.trim(),
      lot: lot.trim(),
      expiry: expiry || "",
      quantity: 0,
      minStock: 0,
      location: "",
      deposit: "",
      sterilized: false,
      unitPrice: Number(unitPrice) || 0,
      ivaKey: "21",
    })

    toast.success(`Artículo "${item.name}" creado en el catálogo.`)
    onCreated?.(item)
    onOpenChange(false)
  }, [code, name, category, brand, supplier, lot, expiry, unitPrice, store, onCreated, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PackagePlus className="size-4" />
            <DialogTitle>Crear artículo en catálogo</DialogTitle>
          </div>
          <DialogDescription>
            Dalos de alta con los datos detectados por el OCR. Podés completar el resto después.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="art-name">Nombre *</Label>
            <Input
              id="art-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Descripción del artículo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="art-code">Código</Label>
              <Input
                id="art-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código del proveedor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="art-supplier">Proveedor</Label>
              <Input
                id="art-supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nombre del proveedor"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="art-brand">Marca</Label>
              <Input
                id="art-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Marca"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="art-category">Categoría</Label>
              <Input
                id="art-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="art-lot">Lote</Label>
              <Input
                id="art-lot"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                placeholder="Lote"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="art-expiry">Vencimiento</Label>
              <Input
                id="art-expiry"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="art-price">Precio unitario</Label>
            <Input
              id="art-price"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="$0,00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
            Crear artículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
