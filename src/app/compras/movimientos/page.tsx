"use client";

import React, { useState, useMemo } from "react";
import { formatDate } from "@/lib/formatters";
import {
  StatsCard,
  SearchInput,
  FilterSelect,
} from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRightLeft,
  Package,
  MoreHorizontal,
  Eye,
  RefreshCw,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { useComprasMovimientos } from "@/hooks/useCompras";
import { useProveedores } from "@/hooks/useProveedores";
import type { ComprasMovimientoItem } from "@/lib/api/compras";

export default function MovimientosPage() {
  const { proveedores } = useProveedores();
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const {
    data: movimientos,
    loading,
    error,
    refresh,
  } = useComprasMovimientos({
    supplierId: selectedSupplierId || undefined,
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<ComprasMovimientoItem | null>(null);

  const filtered = useMemo(() => {
    let data = movimientos.slice();
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (m) =>
          m.articleName.toLowerCase().includes(q) ||
          m.articleCode.toLowerCase().includes(q) ||
          (m.supplierName && m.supplierName.toLowerCase().includes(q)) ||
          (m.lotCode && m.lotCode.toLowerCase().includes(q)) ||
          (m.receiptNumber && m.receiptNumber.toLowerCase().includes(q)) ||
          (m.supplierRemitoNumber && m.supplierRemitoNumber.toLowerCase().includes(q)) ||
          (m.ordenCompraNumber && m.ordenCompraNumber.toLowerCase().includes(q))
      );
    }
    if (typeFilter) data = data.filter((m) => m.movementType === typeFilter);
    return data;
  }, [movimientos, search, typeFilter]);

  const stats = useMemo(() => {
    const totalMovements = movimientos.length;
    const totalQty = movimientos.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity)), 0);
    const uniqueArticles = new Set(movimientos.map((m) => m.articleId)).size;
    const uniqueReceipts = new Set(movimientos.map((m) => m.receiptId).filter(Boolean)).size;
    return { totalMovements, totalQty, uniqueArticles, uniqueReceipts };
  }, [movimientos]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Movimientos de Compras y Recepción</h1>
          <p className="text-sm text-muted-foreground">
            Auditoría read-only del Stock Ledger correspondiente a recepciones físicas e ingresos de proveedores
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar Movimientos
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Movimientos" value={stats.totalMovements} icon={ArrowRightLeft} />
        <StatsCard title="Unidades Ingresadas" value={stats.totalQty} icon={Package} />
        <StatsCard title="Artículos Distintos" value={stats.uniqueArticles} icon={Truck} />
        <StatsCard title="Recepciones Vinculadas" value={stats.uniqueReceipts} icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Buscar por artículo, lote, remito, OC, proveedor..."
          value={search}
          onChange={setSearch}
          className="sm:w-80"
        />
        <FilterSelect
          options={[
            { value: "", label: "Todos los proveedores" },
            ...proveedores.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={selectedSupplierId}
          onChange={setSelectedSupplierId}
        />
        <FilterSelect
          options={[
            { value: "", label: "Todos los tipos" },
            { value: "RECEIPT_IN", label: "Ingreso por Recepción" },
            { value: "SUPPLIER_RETURN", label: "Devolución a Proveedor" },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Artículo</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3">Lote / Serie</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Recepción</th>
                  <th className="px-4 py-3">Remito Proveedor</th>
                  <th className="px-4 py-3">Orden Compra</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      {loading
                        ? "Cargando movimientos de compras..."
                        : "No se registraron movimientos en el stock ledger para este criterio"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(m.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{m.articleName}</div>
                        <div className="text-xs text-muted-foreground">{m.articleCode}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{m.supplierName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        +{m.quantity}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {m.lotCode || m.serialNumber || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {m.expirationDate ? formatDate(m.expirationDate) : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {m.receiptNumber || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {m.supplierRemitoNumber || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {m.ordenCompraNumber || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setSelectedDetail(m);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Detail View */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Movimiento de Stock</DialogTitle>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Tipo de Movimiento:</span>
                <Badge variant="outline">{selectedDetail.type}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Artículo:</span>
                <span className="font-medium">{selectedDetail.articleName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Código:</span>
                <span className="font-mono">{selectedDetail.articleCode}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Cantidad Ingresada:</span>
                <span className="font-bold text-emerald-600">+{selectedDetail.quantity}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Proveedor:</span>
                <span>{selectedDetail.supplierName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Lote:</span>
                <span className="font-mono">{selectedDetail.lotCode || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Número de Serie:</span>
                <span className="font-mono">{selectedDetail.serialNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Fecha Vencimiento:</span>
                <span>{selectedDetail.expirationDate ? formatDate(selectedDetail.expirationDate) : "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Ubicación Física:</span>
                <span>{selectedDetail.location || "Depósito Central"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Comprobante Recepción:</span>
                <span className="font-mono">{selectedDetail.receiptNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Remito Proveedor:</span>
                <span className="font-mono">{selectedDetail.supplierRemitoNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Orden de Compra:</span>
                <span className="font-mono">{selectedDetail.ordenCompraNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Registrado por:</span>
                <span>{selectedDetail.userName}</span>
              </div>
              {selectedDetail.notes && (
                <div className="pt-1">
                  <span className="text-xs text-muted-foreground block mb-1">Notas:</span>
                  <p className="text-xs bg-muted p-2 rounded">{selectedDetail.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
