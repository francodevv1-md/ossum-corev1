"use client"

import React from "react"
import type { ConsumoItem } from "@/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Trash2, Plus } from "lucide-react"
import type { ValidationIssue } from "@/types"

interface ConsumoItemsTableProps {
  items: ConsumoItem[]
  onChange: (items: ConsumoItem[]) => void
  isEditing: boolean
  showSent?: boolean
  sentMap?: Map<string, number>
  validationIssues?: ValidationIssue[]
  origen?: "remito" | "manual"
}

export function ConsumoItemsTable({
  items,
  onChange,
  isEditing,
  showSent = false,
  sentMap,
  validationIssues = [],
  origen = "remito",
}: ConsumoItemsTableProps) {
  const updateItem = (idx: number, field: keyof ConsumoItem, value: string | number) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  const addItem = () => {
    onChange([
      ...items,
      {
        stockItemId: `STK-NEW-${Date.now()}`,
        name: "",
        code: "",
        lot: "",
        department: "",
        rubro: "",
        brand: "",
        consumed: 0,
        returned: 0,
      },
    ])
  }

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx))
  }

  const getIssue = (itemId: string, fieldName: string) =>
    validationIssues.find((i) => i.itemId === itemId && i.fieldName === fieldName)

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-[11px]">Artículo</TableHead>
            <TableHead className="text-[11px]">Código</TableHead>
            <TableHead className="text-[11px]">Lote</TableHead>
            <TableHead className="text-[11px]">Depto.</TableHead>
            <TableHead className="text-[11px]">Rubro</TableHead>
            <TableHead className="text-[11px]">Marca</TableHead>
            {showSent && <TableHead className="text-[11px] text-center">Enviado</TableHead>}
            <TableHead className="text-[11px] text-center">Consumido</TableHead>
            <TableHead className="text-[11px] text-center">Devuelto</TableHead>
            {showSent && <TableHead className="text-[11px] text-center">Dif.</TableHead>}
            {isEditing && <TableHead className="text-[11px] w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => {
            const sent = sentMap?.get(item.stockItemId) ?? 0
            const diff = sent - item.consumed - item.returned
            const lotIssue = getIssue(item.stockItemId, "lot")
            const deptIssue = getIssue(item.stockItemId, "department")
            const rubroIssue = getIssue(item.stockItemId, "rubro")
            const brandIssue = getIssue(item.stockItemId, "brand")

            return (
              <TableRow key={item.stockItemId + idx}>
                <TableCell className="text-xs">
                  {isEditing ? (
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Nombre"
                    />
                  ) : (
                    <span className="font-medium truncate max-w-[160px] block" title={item.name}>{item.name}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {isEditing ? (
                    <Input value={item.code} onChange={(e) => updateItem(idx, "code", e.target.value)} className="h-7 text-xs font-mono w-24" placeholder="Código" />
                  ) : (
                    <span className="font-mono text-muted-foreground">{item.code}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {isEditing ? (
                    <div className="relative">
                      <Input value={item.lot} onChange={(e) => updateItem(idx, "lot", e.target.value)} className={cn("h-7 text-xs font-mono w-24", lotIssue && "border-amber-400")} placeholder="Lote" />
                      {lotIssue && <span className="absolute -bottom-4 left-0 text-[9px] text-amber-600 whitespace-nowrap">{lotIssue.message}</span>}
                    </div>
                  ) : (
                    <span className={cn("font-mono", !item.lot && "text-amber-600 italic")}>{item.lot || "Sin lote"}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {isEditing ? (
                    <Input value={item.department} onChange={(e) => updateItem(idx, "department", e.target.value)} className={cn("h-7 text-xs w-24", deptIssue && "border-red-400")} placeholder="Depto." />
                  ) : (
                    <span className={cn(!item.department && "text-red-500 italic")}>{item.department || "Sin depto."}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {isEditing ? (
                    <Input value={item.rubro} onChange={(e) => updateItem(idx, "rubro", e.target.value)} className={cn("h-7 text-xs w-20", rubroIssue && "border-red-400")} placeholder="Rubro" />
                  ) : (
                    <span className={cn(!item.rubro && "text-red-500 italic")}>{item.rubro || "Sin rubro"}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {isEditing ? (
                    <Input value={item.brand} onChange={(e) => updateItem(idx, "brand", e.target.value)} className={cn("h-7 text-xs w-24", brandIssue && "border-red-400")} placeholder="Marca" />
                  ) : (
                    <span className={cn(!item.brand && "text-red-500 italic")}>{item.brand || "Sin marca"}</span>
                  )}
                </TableCell>
                {showSent && (
                  <TableCell className="text-xs text-center">{sent}</TableCell>
                )}
                <TableCell className="text-xs text-center">
                  {isEditing ? (
                    <Input type="number" min={0} value={item.consumed} onChange={(e) => updateItem(idx, "consumed", Number(e.target.value))} className="h-7 text-xs w-14 text-center" />
                  ) : (
                    <span className={cn(item.consumed > 0 && "font-semibold")}>{item.consumed}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-center">
                  {isEditing ? (
                    <Input type="number" min={0} value={item.returned} onChange={(e) => updateItem(idx, "returned", Number(e.target.value))} className="h-7 text-xs w-14 text-center" />
                  ) : (
                    item.returned
                  )}
                </TableCell>
                {showSent && (
                  <TableCell className="text-xs text-center">
                    {diff === 0 ? (
                      <span className="text-muted-foreground">0</span>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {diff > 0 ? `−${diff}` : `+${Math.abs(diff)}`}
                      </Badge>
                    )}
                  </TableCell>
                )}
                {isEditing && (
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {isEditing && (
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="text-xs" onClick={addItem}>
            <Plus className="size-3" /> Agregar ítem
          </Button>
        </div>
      )}
    </div>
  )
}
