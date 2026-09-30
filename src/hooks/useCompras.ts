"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fetchNecesidadesCompra,
  createNecesidadCompraApi,
  cancelNecesidadCompraApi,
  convertNecesidadesToOcApi,
  fetchOrdenesPago,
  createOrdenPagoApi,
  cancelOrdenPagoApi,
  fetchComprasMovimientos,
  fetchComprasForecast,
  fetchReceipts,
  type NecesidadCompraApi,
  type OrdenPagoApi,
  type ComprasMovimientoItem,
  type ComprasForecastSummary,
  type FormattedReceipt,
} from "@/lib/api/compras";

export function useNecesidadesCompra(params?: {
  state?: string;
  origin?: string;
  surgeryId?: string;
  suggestedSupplierId?: string;
}) {
  const { activeCompany } = useAuth();
  const companyId = activeCompany?.id;

  const [data, setData] = useState<NecesidadCompraApi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNecesidadesCompra(companyId, params);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Error al cargar necesidades de compra");
    } finally {
      setLoading(false);
    }
  }, [companyId, params?.state, params?.origin, params?.surgeryId, params?.suggestedSupplierId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createNecesidad = async (payload: Parameters<typeof createNecesidadCompraApi>[1]) => {
    if (!companyId) throw new Error("No hay empresa activa");
    const created = await createNecesidadCompraApi(companyId, payload);
    await refresh();
    return created;
  };

  const cancelNecesidad = async (necesidadId: string, motivo?: string) => {
    if (!companyId) throw new Error("No hay empresa activa");
    const res = await cancelNecesidadCompraApi(companyId, necesidadId, motivo);
    await refresh();
    return res;
  };

  const convertToOc = async (payload: {
    necesidadIds: string[];
    proveedorId: string;
    proveedorName: string;
    observaciones?: string | null;
  }) => {
    if (!companyId) throw new Error("No hay empresa activa");
    const res = await convertNecesidadesToOcApi(companyId, payload);
    await refresh();
    return res;
  };

  return {
    data,
    loading,
    error,
    refresh,
    createNecesidad,
    cancelNecesidad,
    convertToOc,
  };
}

export function useOrdenesPago(params?: {
  state?: string;
  proveedorId?: string;
}) {
  const { activeCompany } = useAuth();
  const companyId = activeCompany?.id;

  const [data, setData] = useState<OrdenPagoApi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrdenesPago(companyId, params);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Error al cargar órdenes de pago");
    } finally {
      setLoading(false);
    }
  }, [companyId, params?.state, params?.proveedorId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createOrdenPago = async (payload: Parameters<typeof createOrdenPagoApi>[1]) => {
    if (!companyId) throw new Error("No hay empresa activa");
    const created = await createOrdenPagoApi(companyId, payload);
    await refresh();
    return created;
  };

  const cancelOrdenPago = async (ordenPagoId: string, motivo?: string) => {
    if (!companyId) throw new Error("No hay empresa activa");
    const res = await cancelOrdenPagoApi(companyId, ordenPagoId, motivo);
    await refresh();
    return res;
  };

  return {
    data,
    loading,
    error,
    refresh,
    createOrdenPago,
    cancelOrdenPago,
  };
}

export function useComprasMovimientos(params?: {
  articleId?: string;
  supplierId?: string;
  receiptId?: string;
  ordenCompraId?: string;
}) {
  const { activeCompany } = useAuth();
  const companyId = activeCompany?.id;

  const [data, setData] = useState<ComprasMovimientoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchComprasMovimientos(companyId, params);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Error al cargar movimientos de compra");
    } finally {
      setLoading(false);
    }
  }, [companyId, params?.articleId, params?.supplierId, params?.receiptId, params?.ordenCompraId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}

export function useReceiptsList(params?: { take?: number; skip?: number }) {
  const { activeCompany } = useAuth();
  const companyId = activeCompany?.id;

  const [data, setData] = useState<FormattedReceipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReceipts(companyId, params);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Error al cargar remitos/recepciones");
    } finally {
      setLoading(false);
    }
  }, [companyId, params?.take, params?.skip]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}

export function useComprasForecast() {
  const { activeCompany } = useAuth();
  const companyId = activeCompany?.id;

  const [data, setData] = useState<ComprasForecastSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchComprasForecast(companyId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Error al calcular el forecast de compras");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
