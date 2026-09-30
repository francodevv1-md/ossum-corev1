"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Sparkles,
  Truck,
  Clock,
  CheckCircle2,
  Package,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useReceiptsList } from "@/hooks/useCompras";
import { useProveedores } from "@/hooks/useProveedores";

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador" },
  { value: "CONFIRMED", label: "Confirmado / Recibido" },
  { value: "CANCELLED", label: "Anulado" },
];

export default function RemitosProveedorPage() {
  const router = useRouter();
  const { data: receipts, loading, error, refresh } = useReceiptsList();
  const { proveedores } = useProveedores();

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [provFilter, setProvFilter] = useState("");

  const provFilterOptions = useMemo(
    () => [
      { value: "", label: "Todos los proveedores" },
      ...proveedores.map((p) => ({ value: p.id, label: p.name })),
    ],
    [proveedores]
  );

  const filtered = useMemo(() => {
    let data = receipts.slice();
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          (r.documentReference && r.documentReference.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    if (stateFilter) data = data.filter((r) => r.status === stateFilter);
    if (provFilter) data = data.filter((r) => r.supplierId === provFilter);
    return data;
  }, [receipts, search, stateFilter, provFilter]);

  const stats = useMemo(() => {
    const total = receipts.length;
    const pendientes = receipts.filter((r) => r.status === "DRAFT").length;
    const recibidos = receipts.filter((r) => r.status === "CONFIRMED").length;
    const unidades = receipts.reduce(
      (sum, r) =>
        sum +
        r.lines.reduce(
          (s, it) => s + (parseFloat(it.receivedQuantity) || parseFloat(it.requestedQuantity) || 0),
          0
        ),
      0
    );
    return { total, pendientes, recibidos, unidades };
  }, [receipts]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Remitos de Proveedor y Recepción Física</h1>
          <p className="text-sm text-muted-foreground">
            Ingreso físico de mercadería, control documental de remitos y vinculación con Stock Ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refresh()}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => router.push("/compras/remitos-proveedor/nuevo")}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Sparkles className="size-4" />
            Cargar Comprobante / OCR
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Recepciones" value={stats.total} icon={Truck} />
        <StatsCard title="En Borrador" value={stats.pendientes} icon={Clock} />
        <StatsCard title="Confirmadas en Stock" value={stats.recibidos} icon={CheckCircle2} />
        <StatsCard title="Unidades Totales" value={stats.unidades} icon={Package} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por número, remito o notas..."
          className="w-full sm:w-80"
        />
        <FilterSelect
          value={stateFilter}
          onChange={setStateFilter}
          options={STATE_OPTIONS}
        />
        <FilterSelect
          value={provFilter}
          onChange={setProvFilter}
          options={provFilterOptions}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Comprobante Interno</th>
                  <th className="px-4 py-3">Remito Proveedor</th>
                  <th className="px-4 py-3 text-right">Líneas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {loading
                        ? "Cargando recepciones y remitos..."
                        : "No se encontraron comprobantes de recepción de proveedor"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isConfirmed = r.status === "CONFIRMED";
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          REC-{r.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {r.documentReference || (
                            <span className="text-muted-foreground italic">Sin número informado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{r.lines.length}</td>
                        <td className="px-4 py-3">
                          <Badge variant={isConfirmed ? "default" : "outline"}>
                            {isConfirmed ? "Confirmado" : r.status === "DRAFT" ? "Borrador" : r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(r.confirmedAt || r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/stock")}
                            className="gap-1.5 text-xs"
                          >
                            <Eye className="size-3.5" />
                            Ver en Stock
                          </Button>
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
    </div>
  );
}
