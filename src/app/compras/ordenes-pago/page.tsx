"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  StatsCard,
  StateBadge,
  SearchInput,
  FilterSelect,
} from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Banknote,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  Eye,
  MoreHorizontal,
  CreditCard,
  RefreshCw,
  XCircle,
  FileText,
} from "lucide-react";
import { useOrdenesPago } from "@/hooks/useCompras";
import { useProveedores } from "@/hooks/useProveedores";
import { useFacturasCompra } from "@/hooks/useFacturasCompra";
import type { OrdenPagoApi } from "@/lib/api/compras";

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Emitida", label: "Emitida" },
  { value: "Anulada", label: "Anulada" },
];

const MEDIO_PAGO_OPTIONS = [
  { value: "transfer", label: "Transferencia bancaria" },
  { value: "check", label: "Cheque" },
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta de crédito" },
  { value: "other", label: "Otro medio" },
];

export default function OrdenesPagoPage() {
  const {
    data: ordenesPago,
    loading,
    error,
    refresh,
    createOrdenPago,
    cancelOrdenPago,
  } = useOrdenesPago();

  const { proveedores } = useProveedores();
  const { facturas: allFacturas } = useFacturasCompra();

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [provFilter, setProvFilter] = useState("");

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<OrdenPagoApi | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formProveedorId, setFormProveedorId] = useState("");
  const [formTotal, setFormTotal] = useState<number>(0);
  const [formMethod, setFormMethod] = useState("transfer");
  const [formPaymentDate, setFormPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formObservaciones, setFormObservaciones] = useState("");
  const [formImputations, setFormImputations] = useState<Record<string, number>>({});

  // Filter invoices for selected supplier
  const supplierPendingFacturas = useMemo(() => {
    if (!formProveedorId) return [];
    return allFacturas.filter(
      (f) => f.proveedorId === formProveedorId && f.state === "Pendiente"
    );
  }, [allFacturas, formProveedorId]);

  const totalImputadoCalc = useMemo(() => {
    return Object.values(formImputations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [formImputations]);

  const saldoSinAplicarCalc = useMemo(() => {
    return Math.max(0, (Number(formTotal) || 0) - totalImputadoCalc);
  }, [formTotal, totalImputadoCalc]);

  const filtered = useMemo(() => {
    let data = ordenesPago.slice();
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (op) =>
          op.id.toLowerCase().includes(q) ||
          op.proveedorName.toLowerCase().includes(q) ||
          (op.visibleNumber && String(op.visibleNumber).includes(q)) ||
          (op.observaciones && op.observaciones.toLowerCase().includes(q))
      );
    }
    if (stateFilter) data = data.filter((op) => op.state === stateFilter);
    if (provFilter) data = data.filter((op) => op.proveedorId === provFilter);
    return data;
  }, [ordenesPago, search, stateFilter, provFilter]);

  const stats = useMemo(() => {
    const totalCount = ordenesPago.length;
    const emitidas = ordenesPago.filter((op) => op.state === "Emitida");
    const totalPagado = emitidas.reduce((sum, op) => sum + parseFloat(op.total), 0);
    const totalImputado = emitidas.reduce(
      (sum, op) => sum + parseFloat(op.totalImputado),
      0
    );
    const totalSinAplicar = emitidas.reduce(
      (sum, op) => sum + parseFloat(op.saldoSinAplicar),
      0
    );
    return { totalCount, totalPagado, totalImputado, totalSinAplicar };
  }, [ordenesPago]);

  const handleOpenCreate = () => {
    setFormProveedorId("");
    setFormTotal(0);
    setFormMethod("transfer");
    setFormPaymentDate(new Date().toISOString().split("T")[0]);
    setFormObservaciones("");
    setFormImputations({});
    setCreateDialogOpen(true);
  };

  const handleImputationChange = (facturaId: string, value: number, maxBalance: number) => {
    const safeVal = Math.min(Math.max(0, value), maxBalance);
    setFormImputations((prev) => ({
      ...prev,
      [facturaId]: safeVal,
    }));
  };

  const handleAutoFillImputation = (facturaId: string, maxBalance: number) => {
    const currentSumOther = Object.entries(formImputations)
      .filter(([id]) => id !== facturaId)
      .reduce((sum, [, val]) => sum + val, 0);

    const availableFromTotal = Math.max(0, formTotal - currentSumOther);
    const toApply = Math.min(maxBalance, availableFromTotal > 0 ? availableFromTotal : maxBalance);

    if (formTotal < currentSumOther + toApply) {
      setFormTotal(currentSumOther + toApply);
    }

    setFormImputations((prev) => ({
      ...prev,
      [facturaId]: toApply,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProveedorId) {
      toast.error("Seleccione un proveedor");
      return;
    }
    if (formTotal <= 0) {
      toast.error("El monto total debe ser mayor a 0");
      return;
    }
    if (totalImputadoCalc > formTotal) {
      toast.error("El total imputado supera el monto total de la orden de pago");
      return;
    }

    const prov = proveedores.find((p) => p.id === formProveedorId);
    if (!prov) {
      toast.error("Proveedor inválido");
      return;
    }

    const imputacionesPayload = Object.entries(formImputations)
      .filter(([, amount]) => amount > 0)
      .map(([facturaCompraId, amount]) => ({
        facturaCompraId,
        amount,
      }));

    setIsSubmitting(true);
    try {
      const created = await createOrdenPago({
        proveedorId: prov.id,
        proveedorName: prov.name,
        total: formTotal,
        method: formMethod,
        paymentDate: formPaymentDate,
        observaciones: formObservaciones.trim() || null,
        imputaciones: imputacionesPayload,
      });

      toast.success(
        `Orden de Pago #${created.visibleNumber || created.id.slice(-6).toUpperCase()} registrada exitosamente`
      );
      setCreateDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Error al registrar la orden de pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTargetId) return;
    setIsSubmitting(true);
    try {
      await cancelOrdenPago(cancelTargetId, cancelMotivo.trim() || undefined);
      toast.success("Orden de pago anulada y saldos revertidos");
      setCancelDialogOpen(false);
      setCancelTargetId(null);
      setCancelMotivo("");
    } catch (err: any) {
      toast.error(err?.message || "Error al anular la orden de pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Órdenes de Pago</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de pagos a proveedores y cuentas a pagar con multi-imputación a Facturas de Compra
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="size-4" />
          Nueva Orden de Pago
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Emitidas" value={stats.totalCount} icon={Banknote} />
        <StatsCard
          title="Total Pagado"
          value={formatCurrency(stats.totalPagado)}
          icon={DollarSign}
        />
        <StatsCard
          title="Total Imputado"
          value={formatCurrency(stats.totalImputado)}
          icon={CheckCircle2}
        />
        <StatsCard
          title="Saldo sin Aplicar"
          value={formatCurrency(stats.totalSinAplicar)}
          icon={Clock}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Buscar por número, proveedor, notas..."
          value={search}
          onChange={setSearch}
          className="sm:w-80"
        />
        <FilterSelect
          options={STATE_OPTIONS}
          value={stateFilter}
          onChange={setStateFilter}
        />
        <FilterSelect
          options={[
            { value: "", label: "Todos los proveedores" },
            ...proveedores.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={provFilter}
          onChange={setProvFilter}
        />
        <Button variant="ghost" size="icon" onClick={() => refresh()} title="Actualizar">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3">Fecha de Pago</th>
                  <th className="px-4 py-3 text-right">Total Pago</th>
                  <th className="px-4 py-3 text-right">Imputado</th>
                  <th className="px-4 py-3 text-right">Sin Aplicar</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      {loading
                        ? "Cargando órdenes de pago..."
                        : "No se encontraron órdenes de pago registradas"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((op) => {
                    const isEmitida = op.state === "Emitida";
                    return (
                      <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          OP-{op.visibleNumber ? String(op.visibleNumber).padStart(6, "0") : op.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 font-medium">{op.proveedorName}</td>
                        <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                          {op.method || "Transferencia"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(op.paymentDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(parseFloat(op.total))}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {formatCurrency(parseFloat(op.totalImputado))}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-600 font-medium">
                          {parseFloat(op.saldoSinAplicar) > 0
                            ? formatCurrency(parseFloat(op.saldoSinAplicar))
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isEmitida ? "default" : "destructive"}>
                            {op.state}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDetail(op);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="mr-2 size-4" />
                                Ver Detalle / Imputaciones
                              </DropdownMenuItem>
                              {isEmitida && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setCancelTargetId(op.id);
                                      setCancelDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="mr-2 size-4" />
                                    Anular Orden de Pago
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Create Orden de Pago with Multi-Imputation */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Nueva Orden de Pago a Proveedor</DialogTitle>
              <DialogDescription>
                Registre un pago e impútelo a una o más facturas de compra pendientes del proveedor.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="opProveedor" className="text-xs font-medium">
                    Proveedor *
                  </Label>
                  <Select
                    value={formProveedorId}
                    onValueChange={(val) => {
                      setFormProveedorId(val);
                      setFormImputations({});
                    }}
                  >
                    <SelectTrigger id="opProveedor">
                      <SelectValue placeholder="Seleccione el proveedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="opTotal" className="text-xs font-medium">
                    Monto Total del Pago *
                  </Label>
                  <Input
                    id="opTotal"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formTotal || ""}
                    onChange={(e) => setFormTotal(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="opMethod" className="text-xs font-medium">
                    Medio de Pago
                  </Label>
                  <Select value={formMethod} onValueChange={setFormMethod}>
                    <SelectTrigger id="opMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIO_PAGO_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="opDate" className="text-xs font-medium">
                    Fecha de Pago
                  </Label>
                  <Input
                    id="opDate"
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Multi-Imputation Table */}
              <div className="border rounded-md p-3 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Imputación a Facturas de Compra
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {supplierPendingFacturas.length} factura(s) pendiente(s)
                  </span>
                </div>

                {!formProveedorId ? (
                  <p className="text-xs text-muted-foreground py-4 text-center italic">
                    Seleccione un proveedor para visualizar sus facturas pendientes.
                  </p>
                ) : supplierPendingFacturas.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center italic">
                    El proveedor no tiene facturas de compra pendientes. El pago se guardará como saldo sin aplicar.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="p-2">Factura</th>
                          <th className="p-2">Fecha</th>
                          <th className="p-2 text-right">Total Factura</th>
                          <th className="p-2 text-right">Importe a Imputar</th>
                          <th className="p-2 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {supplierPendingFacturas.map((f) => {
                          const total = parseFloat(f.total);
                          const currentVal = formImputations[f.id] || 0;
                          return (
                            <tr key={f.id} className="hover:bg-muted/40">
                              <td className="p-2 font-medium">{f.number}</td>
                              <td className="p-2 text-muted-foreground">{formatDate(f.date)}</td>
                              <td className="p-2 text-right font-semibold">
                                {formatCurrency(total)}
                              </td>
                              <td className="p-2 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  max={total}
                                  step="0.01"
                                  value={currentVal || ""}
                                  onChange={(e) =>
                                    handleImputationChange(
                                      f.id,
                                      parseFloat(e.target.value) || 0,
                                      total
                                    )
                                  }
                                  className="h-7 w-28 text-right ml-auto text-xs"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => handleAutoFillImputation(f.id, total)}
                                >
                                  Total
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Imputation Summary */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-2 border-t text-xs gap-2 font-medium">
                  <div className="flex gap-4">
                    <span>
                      Total Imputado:{" "}
                      <strong className="text-emerald-600">
                        {formatCurrency(totalImputadoCalc)}
                      </strong>
                    </span>
                    <span>
                      Saldo sin Aplicar:{" "}
                      <strong className="text-amber-600">
                        {formatCurrency(saldoSinAplicarCalc)}
                      </strong>
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    Total Pago: {formatCurrency(formTotal)}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="opObs" className="text-xs font-medium">
                  Observaciones
                </Label>
                <Textarea
                  id="opObs"
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Detalles sobre la transferencia, retenciones o comprobante..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formProveedorId || formTotal <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? "Registrando..." : "Confirmar Orden de Pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detail View */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Orden de Pago</DialogTitle>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Número:</span>
                <span className="font-mono font-semibold">
                  OP-{selectedDetail.visibleNumber ? String(selectedDetail.visibleNumber).padStart(6, "0") : selectedDetail.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Proveedor:</span>
                <span className="font-medium">{selectedDetail.proveedorName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Fecha:</span>
                <span>{formatDate(selectedDetail.paymentDate)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Medio:</span>
                <span className="capitalize">{selectedDetail.method || "Transferencia"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Total Pago:</span>
                <span className="font-semibold">{formatCurrency(parseFloat(selectedDetail.total))}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Total Imputado:</span>
                <span className="text-emerald-600 font-semibold">
                  {formatCurrency(parseFloat(selectedDetail.totalImputado))}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Saldo sin Aplicar:</span>
                <span className="text-amber-600 font-semibold">
                  {formatCurrency(parseFloat(selectedDetail.saldoSinAplicar))}
                </span>
              </div>

              {/* Imputations breakdown */}
              <div className="pt-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground block mb-2">
                  Facturas Imputadas ({selectedDetail.imputaciones.length})
                </span>
                {selectedDetail.imputaciones.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Sin facturas imputadas (pago a cuenta / saldo a favor).
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedDetail.imputaciones.map((imp) => (
                      <div
                        key={imp.id}
                        className="flex justify-between items-center text-xs p-2 bg-muted/40 rounded"
                      >
                        <div>
                          <span className="font-medium">Factura #{imp.facturaCompra.number}</span>
                          <span className="text-muted-foreground block text-[10px]">
                            {formatDate(imp.facturaCompra.date)} • Total: {formatCurrency(parseFloat(imp.facturaCompra.total))}
                          </span>
                        </div>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(parseFloat(imp.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedDetail.observaciones && (
                <div className="pt-1">
                  <span className="text-xs text-muted-foreground block mb-1">Observaciones:</span>
                  <p className="text-xs bg-muted p-2 rounded">{selectedDetail.observaciones}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancel OP */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Anular Orden de Pago</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea anular esta orden de pago? Las imputaciones serán revertidas y las facturas volverán al estado pendiente si corresponde.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="cancelMotivo" className="text-xs">
              Motivo de anulación (opcional)
            </Label>
            <Input
              id="cancelMotivo"
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              placeholder="Ej: Error en el comprobante..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isSubmitting}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Anulando..." : "Confirmar Anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
