"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fetchStockAvailabilityApi,
  fetchArticleStockDetailApi,
  createStockAdjustmentApi,
  type StockAvailabilityResponse,
  type ArticleStockDetailResponse,
} from "@/lib/api/stock";
import type {
  ArticleStockAvailability,
  StockSummaryKPIs,
} from "@/lib/services/stock-ledger.service";
import type {
  StockAdjustmentCreateInput,
  StockAvailabilityQuery,
} from "@/lib/validators/stock";

export function useStock(query?: Partial<StockAvailabilityQuery>) {
  const { activeCompany, currentUserLoading, isAuthenticated, isLoading } = useAuth();
  const [items, setItems] = useState<ArticleStockAvailability[]>([]);
  const [summary, setSummary] = useState<StockSummaryKPIs>({
    total: 0,
    bajo: 0,
    sinstock: 0,
    transito: 0,
    totalPhysical: 0,
    totalAvailable: 0,
    totalReserved: 0,
    expiringCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = activeCompany?.id;
  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

  const refresh = useCallback(async () => {
    if (isLoading || (isAuthenticated && currentUserLoading)) {
      setLoading(false);
      setReady(false);
      setError(null);
      return;
    }

    if (!companyId) {
      setLoading(false);
      setReady(true);
      setItems([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchStockAvailabilityApi(companyId, query);
      setItems(res.data);
      setSummary(res.summary);
      setPagination(res.pagination);
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar stock");
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentUserLoading, isAuthenticated, isLoading, query]);

  useEffect(() => {
    void refresh();
  }, [refresh, queryKey]);

  return {
    items,
    summary,
    pagination,
    loading,
    ready,
    error,
    refresh,
  };
}

export function useArticleStockDetail(articleId?: string | null) {
  const { activeCompany } = useAuth();
  const [data, setData] = useState<ArticleStockDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = activeCompany?.id;

  const refresh = useCallback(async () => {
    if (!companyId || !articleId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchArticleStockDetailApi(companyId, articleId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar detalle de stock");
    } finally {
      setLoading(false);
    }
  }, [companyId, articleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordAdjustment = useCallback(
    async (input: Omit<StockAdjustmentCreateInput, "articleId">) => {
      if (!companyId || !articleId) throw new Error("No hay empresa o artículo activo");
      await createStockAdjustmentApi(companyId, {
        ...input,
        articleId,
      });
      await refresh();
    },
    [companyId, articleId, refresh],
  );

  return {
    data,
    loading,
    error,
    refresh,
    recordAdjustment,
  };
}
