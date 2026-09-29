"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProveedorRow } from "@/lib/api/proveedores";
import type { CreateOrdenCompraPayload } from "@/lib/api/ordenes-compra";

type CatalogItem = { id: string; code: string; name: string };
export function CreateOrdenCompraDialog({ open, onOpenChange, proveedores, catalog, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; proveedores: ProveedorRow[]; catalog: CatalogItem[]; onSubmit: (payload: CreateOrdenCompraPayload) => Promise<void> }) {
  const [proveedorId, setProveedorId] = React.useState(""); const [articleId, setArticleId] = React.useState(""); const [quantity, setQuantity] = React.useState("1"); const [unitPrice, setUnitPrice] = React.useState("0"); const [error, setError] = React.useState<string | null>(null);
  const submit = async () => { const proveedor = proveedores.find(value => value.id === proveedorId); const article = catalog.find(value => value.id === articleId); if (!proveedor || !article || Number(quantity) <= 0 || Number(unitPrice) < 0) return setError("Seleccioná proveedor, artículo, cantidad y precio válidos."); try { await onSubmit({ proveedorId, proveedorName: proveedor.name, items: [{ stockItemId: article.id, code: article.code, name: article.name, quantity, unitPrice }] }); onOpenChange(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la OC."); } };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle></DialogHeader><div className="grid gap-3"><Label>Proveedor</Label><Select value={proveedorId} onValueChange={setProveedorId}><SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger><SelectContent>{proveedores.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><Label>Artículo</Label><Select value={articleId} onValueChange={setArticleId}><SelectTrigger><SelectValue placeholder="Seleccionar artículo" /></SelectTrigger><SelectContent>{catalog.map(a=><SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent></Select><Label>Cantidad</Label><Input type="number" min="0.0001" value={quantity} onChange={e=>setQuantity(e.target.value)} /><Label>Precio unitario</Label><Input type="number" min="0" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} />{error&&<p className="text-sm text-destructive">{error}</p>}</div><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button><Button onClick={()=>void submit()}>Crear OC</Button></DialogFooter></DialogContent></Dialog>;
}
