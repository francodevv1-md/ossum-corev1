"use client";

import React, { useState, useMemo } from "react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BarChart3,
  AlertTriangle,
  Package,
  Clock,
  ShoppingCart,
  RefreshCw,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useComprasForecast, useNecesidadesCompra } from "@/hooks/useCompras";
import type { ComprasForecastItem } from "@/lib/api/compras";

function ForecastPriorityBadge({ urgency }: { urgency: string }) {
  const config: Record<string, { className: string; label: string }> = {
    critica: { className: "bg-red-600 text-white border-transparent", label: "Crítica" },
    alta: { className: "bg-orange-500 text-white border-transparent", label: "Alta" },
    media: { className: "bg-yellow-500 text-white border-transparent", label: "Media" },
    normal: { className: "bg-emerald-600 text-white border-transparent", label: "Normal" },
  };
  const c = config[urgency] || config.normal;
  return <Badge className={c.className}>{c.label}</Badge>;
}

function StockIndicator({ actual, min }: { actual: number; min: number }) {
  const ratio = min > 0 ? actual / min : 1;
  const isBelow = ratio < 1;
  const isClose = ratio >= 1 && ratio <= 1.5;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[60px]">
        <div
          className={`h-full rounded-full transition-all ${
            isBelow ? "bg-red-500" : isClose ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
      <span
        className={`text-xs font-medium ${
          isBelow ? "text-red-600" : isClose ? "text-amber-600" : "text-emerald-600"
        }`}
      >
        {actual}/{min}
      </span>
    </div>
  );
}

const URGENCY_OPTIONS = [
  { value: "", label: "Todas las urgencias" },
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
];

export default function ComprasForecastPage() {
  const { data: forecast, loading, error, refresh } = useComprasForecast();
  const { createNecesidad } = useNecesidadesCompra();

  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [generateTarget, setGenerateTarget] = useState<ComprasForecastItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const items = forecast?.items ?? [];

  const filtered = useMemo(() => {
    let data = items.slice();
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (it) =>
          it.articleName.toLowerCase().includes(q) ||
          it.articleCode.toLowerCase().includes(q) ||
          (it.suggestedSupplierName && it.suggestedSupplierName.toLowerCase().includes(q)) ||
          it.category.toLowerCase().includes(q)
      );
    }
    if (urgencyFilter) data = data.filter((it) => it.urgency === urgencyFilter);
    return data;
  }, [items, search, urgencyFilter]);

  const handleGenerateNecesidad = async () => {
    if (!generateTarget) return;
    setIsGenerating(true);
    try {
      await createNecesidad({
        articleId: generateTarget.articleId,
        code: generateTarget.articleCode,
        name: generateTarget.articleName,
        quantity: generateTarget.suggestedOrderQty,
        priority: generateTarget.urgency === "critica" ? "critica" : generateTarget.urgency === "alta" ? "alta" : "media",
        origin: generateTarget.currentStock === 0 ? "stock_bajo" : "manual",
        suggestedSupplierId: generateTarget.suggestedSupplierId,
        suggestedSupplierName: generateTarget.suggestedSupplierName,
        observaciones: `Generado automáticamente desde Forecast: ${generateTarget.rationale.join("; ")}`,
      });

      toast.success(
        `Necesidad de compra creada para ${generateTarget.articleName} (${generateTarget.suggestedOrderQty} u.)`
      );
      setGenerateTarget(null);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Error al crear la necesidad de compra");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Forecast y Sugerencias de Compra</h1>
          <p className="text-sm text-muted-foreground">
            Cálculo determinístico basado en stock disponible, mínimos de seguridad, vencimientos próximos y pedidos en tránsito
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Recalcular Forecast
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Artículos Evaluados"
          value={forecast?.totalArticlesEvaluated ?? 0}
          icon={BarChart3}
        />
        <StatsCard
          title="Urgencia Crítica"
          value={forecast?.criticalCount ?? 0}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Urgencia Alta"
          value={forecast?.highCount ?? 0}
          icon={Clock}
        />
        <StatsCard
          title="Unidades Sugeridas"
          value={forecast?.totalSuggestedOrderQty ?? 0}
          icon={ShoppingCart}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Buscar artículo, código, categoría o proveedor..."
          value={search}
          onChange={setSearch}
          className="sm:w-80"
        />
        <FilterSelect
          options={URGENCY_OPTIONS}
          value={urgencyFilter}
          onChange={setUrgencyFilter}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Artículo</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Stock / Mínimo</th>
                  <th className="px-4 py-3 text-center">Vence &lt;60d</th>
                  <th className="px-4 py-3 text-center">En OC (Tránsito)</th>
                  <th className="px-4 py-3 text-center">Necesidades Abiertas</th>
                  <th className="px-4 py-3 text-right">Cantidad Sugerida</th>
                  <th className="px-4 py-3">Urgencia</th>
                  <th className="px-4 py-3">Criterio / Motivo</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      {loading
                        ? "Calculando forecast de compras..."
                        : "No hay artículos que requieran reposición o sugerencia de compra en este momento"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <tr key={it.articleId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{it.articleName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {it.articleCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                        {it.category}
                      </td>
                      <td className="px-4 py-3">
                        <StockIndicator actual={it.currentStock} min={it.minStock} />
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {it.expiringIn60Days > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {it.expiringIn60Days} u.
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {it.incomingOcQty > 0 ? (
                          <span className="font-semibold text-indigo-600">
                            +{it.incomingOcQty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {it.openNeedsQty > 0 ? (
                          <span className="font-semibold text-amber-600">
                            {it.openNeedsQty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {it.suggestedOrderQty > 0 ? `${it.suggestedOrderQty} u.` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <ForecastPriorityBadge urgency={it.urgency} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                        {it.rationale.length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5">
                            {it.rationale.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        ) : (
                          <span>Stock balanceado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {it.suggestedOrderQty > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200"
                            onClick={() => setGenerateTarget(it)}
                          >
                            <Plus className="size-3.5" />
                            Pedir
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Confirm Generate Necesidad */}
      <Dialog open={!!generateTarget} onOpenChange={(open) => !open && setGenerateTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Necesidad de Compra</DialogTitle>
            <DialogDescription>
              ¿Desea crear una necesidad de compra en estado Pendiente para {generateTarget?.articleName}?
            </DialogDescription>
          </DialogHeader>
          {generateTarget && (
            <div className="space-y-2 py-3 text-sm border-y my-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Artículo:</span>
                <span className="font-medium">{generateTarget.articleName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cantidad Sugerida:</span>
                <span className="font-bold text-indigo-600">{generateTarget.suggestedOrderQty} unidades</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedor Asignado:</span>
                <span>{generateTarget.suggestedSupplierName || "Sin asignar"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prioridad Resultante:</span>
                <ForecastPriorityBadge urgency={generateTarget.urgency} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateTarget(null)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateNecesidad}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isGenerating ? "Generando..." : "Confirmar Necesidad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
