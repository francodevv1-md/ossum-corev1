"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchComprasForecast,
  acceptReplenishmentSuggestionApi,
  type ComprasForecastSummary,
  type ComprasForecastItem,
} from "@/lib/api/compras";
import { useAuth } from "@/components/auth/AuthProvider";

export function ReplenishmentSuggestionsSection({
  onNeedCreated,
}: {
  onNeedCreated?: () => void;
}) {
  const { activeCompany } = useAuth();
  const companyId = activeCompany?.id || "";

  const [forecast, setForecast] = useState<ComprasForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingArticleId, setAcceptingArticleId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadForecast = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchComprasForecast(companyId);
      setForecast(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las sugerencias de reposición");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  const handleAcceptSuggestion = async (item: ComprasForecastItem) => {
    if (!companyId) return;
    setAcceptingArticleId(item.articleId);
    try {
      await acceptReplenishmentSuggestionApi(companyId, {
        articleId: item.articleId,
        quantity: item.suggestedOrderQty > 0 ? item.suggestedOrderQty : 5,
        priority:
          item.urgency === "critica"
            ? "critica"
            : item.urgency === "alta"
            ? "alta"
            : "media",
        suggestedSupplierId: item.suggestedSupplierId,
        suggestedSupplierName: item.suggestedSupplierName,
        observaciones: `Sugerencia de reposición aceptada: ${item.rationale.join(". ")}`,
      });

      toast.success(`Necesidad de compra registrada para ${item.articleName}`);
      await loadForecast();
      onNeedCreated?.();
    } catch (err: any) {
      toast.error(err?.message || "Error al crear la necesidad desde la sugerencia");
    } finally {
      setAcceptingArticleId(null);
    }
  };

  const getUrgencyBadge = (urgency: ComprasForecastItem["urgency"]) => {
    switch (urgency) {
      case "critica":
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Crítica</Badge>;
      case "alta":
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Alta</Badge>;
      case "media":
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Media</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const items = forecast?.items || [];
  const hasSuggestions = items.length > 0;

  return (
    <Card className="border-indigo-100 dark:border-indigo-950/50 bg-gradient-to-br from-indigo-50/30 via-white to-white dark:from-indigo-950/10 dark:via-background dark:to-background">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-indigo-600 text-white">
            <Sparkles className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Sugerencias de Reposición por Stock Mínimo
              {hasSuggestions && (
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                  {items.length} sugerencia{items.length === 1 ? "" : "s"}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Detección automática de faltantes basada en stock disponible real y mínimos configurados.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => void loadForecast()}
            disabled={loading}
          >
            <RefreshCw className={`mr-1 size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Plegar" : "Desplegar"}
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {loading && !forecast ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin text-indigo-600" />
              Calculando disponibilidad real y evaluando necesidades de compra...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-red-600">
              <AlertTriangle className="mb-1 size-5 text-red-500" />
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={() => void loadForecast()}
              >
                Reintentar
              </Button>
            </div>
          ) : !hasSuggestions ? (
            <div className="flex items-center justify-center gap-2 py-6 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Stock saludable. Todos los artículos habilitados cubren sus mínimos de seguridad.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Artículo</th>
                    <th className="px-3 py-2 text-center">Físico / Reservado</th>
                    <th className="px-3 py-2 text-center">Disponible</th>
                    <th className="px-3 py-2 text-center">Mínimo</th>
                    <th className="px-3 py-2 text-center">En Tránsito / Necesidades</th>
                    <th className="px-3 py-2 text-center font-bold text-indigo-900 dark:text-indigo-200">
                      Sugerido
                    </th>
                    <th className="px-3 py-2">Proveedor Preferido</th>
                    <th className="px-3 py-2">Urgencia / Explicación</th>
                    <th className="px-3 py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item) => {
                    const isAccepting = acceptingArticleId === item.articleId;
                    return (
                      <tr key={item.articleId} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-foreground">{item.articleName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {item.articleCode || "S/C"} • {item.category}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          <span>{item.currentStock}</span>
                          {item.reservedStock > 0 && (
                            <span className="text-[10px] text-amber-600 ml-1 font-sans">
                              (res: {item.reservedStock})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-medium">
                          <span
                            className={
                              item.availableStock === 0
                                ? "text-red-600 font-bold"
                                : item.availableStock < item.minStock
                                ? "text-amber-600"
                                : "text-foreground"
                            }
                          >
                            {item.availableStock}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">
                          {item.minStock}
                        </td>
                        <td className="px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                          {item.incomingOcQty > 0 || item.openNeedsQty > 0 ? (
                            <div className="space-y-0.5">
                              {item.openNeedsQty > 0 && (
                                <span className="block text-indigo-600">
                                  {item.openNeedsQty} en necesidad
                                </span>
                              )}
                              {item.incomingOcQty > 0 && (
                                <span className="block text-emerald-600">
                                  {item.incomingOcQty} en OC
                                </span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                          {item.suggestedOrderQty > 0 ? `+${item.suggestedOrderQty}` : "0"}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {item.suggestedSupplierName ? (
                            <div>
                              <span className="font-medium text-foreground">
                                {item.suggestedSupplierName}
                              </span>
                              {item.leadTimeDays && (
                                <span className="block text-[10px] text-muted-foreground">
                                  Plazo: {item.leadTimeDays} días
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Sin proveedor</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            <div>{getUrgencyBadge(item.urgency)}</div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2" title={item.rationale.join(" • ")}>
                              {item.rationale[0]}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={isAccepting}
                            onClick={() => handleAcceptSuggestion(item)}
                          >
                            {isAccepting ? (
                              <Loader2 className="mr-1 size-3 animate-spin" />
                            ) : (
                              <Plus className="mr-1 size-3" />
                            )}
                            {isAccepting ? "Creando..." : "Crear Necesidad"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
