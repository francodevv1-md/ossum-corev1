import { apiFetch } from "@/lib/api/client";
import type { NecesidadCompraApi } from "@/lib/services/necesidad-compra.service";
import type { OrdenPagoApi } from "@/lib/services/orden-pago.service";
import type { ComprasMovimientoItem } from "@/lib/services/compras-movimientos.service";
import type { ComprasForecastSummary, ComprasForecastItem } from "@/lib/services/compras-forecast.service";
import type { FormattedReceipt } from "@/lib/services/receipt.service";

export type {
  NecesidadCompraApi,
  OrdenPagoApi,
  ComprasMovimientoItem,
  ComprasForecastSummary,
  ComprasForecastItem,
  FormattedReceipt,
};

// ─── Necesidades de Compra ──────────────────────────────────────────────────

export async function fetchNecesidadesCompra(
  companyId: string,
  params?: {
    state?: string;
    origin?: string;
    surgeryId?: string;
    suggestedSupplierId?: string;
    take?: number;
    skip?: number;
  }
): Promise<NecesidadCompraApi[]> {
  const query = new URLSearchParams();
  if (params?.state) query.set("state", params.state);
  if (params?.origin) query.set("origin", params.origin);
  if (params?.surgeryId) query.set("surgeryId", params.surgeryId);
  if (params?.suggestedSupplierId) query.set("suggestedSupplierId", params.suggestedSupplierId);
  if (params?.take) query.set("take", String(params.take));
  if (params?.skip) query.set("skip", String(params.skip));

  const qs = query.toString();
  return apiFetch<NecesidadCompraApi[]>(
    `/api/companies/${companyId}/compras/necesidades${qs ? `?${qs}` : ""}`
  );
}

export async function createNecesidadCompraApi(
  companyId: string,
  payload: {
    articleId?: string | null;
    isArticuloZ?: boolean;
    descripcionLibre?: string | null;
    code?: string | null;
    name: string;
    quantity: number | string;
    priority?: string;
    origin?: string;
    originReference?: string | null;
    suggestedSupplierId?: string | null;
    suggestedSupplierName?: string | null;
    surgeryId?: string | null;
    observaciones?: string | null;
    idempotencyKey?: string | null;
  }
): Promise<NecesidadCompraApi> {
  return apiFetch<NecesidadCompraApi>(
    `/api/companies/${companyId}/compras/necesidades`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function cancelNecesidadCompraApi(
  companyId: string,
  necesidadId: string,
  motivo?: string
): Promise<NecesidadCompraApi> {
  const query = motivo ? `?motivo=${encodeURIComponent(motivo)}` : "";
  return apiFetch<NecesidadCompraApi>(
    `/api/companies/${companyId}/compras/necesidades/${necesidadId}${query}`,
    {
      method: "DELETE",
    }
  );
}

export async function convertNecesidadesToOcApi(
  companyId: string,
  payload: {
    necesidadIds: string[];
    proveedorId: string;
    proveedorName: string;
    observaciones?: string | null;
  }
): Promise<{ ordenCompra: any; convertedNecesidadIds: string[] }> {
  return apiFetch<{ ordenCompra: any; convertedNecesidadIds: string[] }>(
    `/api/companies/${companyId}/compras/necesidades/convert-to-oc`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

// ─── Órdenes de Pago ────────────────────────────────────────────────────────

export async function fetchOrdenesPago(
  companyId: string,
  params?: {
    state?: string;
    proveedorId?: string;
    take?: number;
    skip?: number;
  }
): Promise<OrdenPagoApi[]> {
  const query = new URLSearchParams();
  if (params?.state) query.set("state", params.state);
  if (params?.proveedorId) query.set("proveedorId", params.proveedorId);
  if (params?.take) query.set("take", String(params.take));
  if (params?.skip) query.set("skip", String(params.skip));

  const qs = query.toString();
  return apiFetch<OrdenPagoApi[]>(
    `/api/companies/${companyId}/compras/ordenes-pago${qs ? `?${qs}` : ""}`
  );
}

export async function createOrdenPagoApi(
  companyId: string,
  payload: {
    proveedorId: string;
    proveedorName: string;
    total: number | string;
    method?: string;
    paymentDate?: string;
    observaciones?: string | null;
    imputaciones?: { facturaCompraId: string; amount: number | string }[];
  }
): Promise<OrdenPagoApi> {
  return apiFetch<OrdenPagoApi>(
    `/api/companies/${companyId}/compras/ordenes-pago`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function cancelOrdenPagoApi(
  companyId: string,
  ordenPagoId: string,
  motivo?: string
): Promise<OrdenPagoApi> {
  return apiFetch<OrdenPagoApi>(
    `/api/companies/${companyId}/compras/ordenes-pago/${ordenPagoId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ motivo }),
    }
  );
}

// ─── Movimientos de Compra ──────────────────────────────────────────────────

export async function fetchComprasMovimientos(
  companyId: string,
  params?: {
    articleId?: string;
    supplierId?: string;
    receiptId?: string;
    ordenCompraId?: string;
    take?: number;
    skip?: number;
  }
): Promise<ComprasMovimientoItem[]> {
  const query = new URLSearchParams();
  if (params?.articleId) query.set("articleId", params.articleId);
  if (params?.supplierId) query.set("supplierId", params.supplierId);
  if (params?.receiptId) query.set("receiptId", params.receiptId);
  if (params?.ordenCompraId) query.set("ordenCompraId", params.ordenCompraId);
  if (params?.take) query.set("take", String(params.take));
  if (params?.skip) query.set("skip", String(params.skip));

  const qs = query.toString();
  return apiFetch<ComprasMovimientoItem[]>(
    `/api/companies/${companyId}/compras/movimientos${qs ? `?${qs}` : ""}`
  );
}

// ─── Receipts / Remitos Proveedor ───────────────────────────────────────────

export async function fetchReceipts(
  companyId: string,
  params?: {
    take?: number;
    skip?: number;
  }
): Promise<FormattedReceipt[]> {
  const query = new URLSearchParams();
  if (params?.take) query.set("take", String(params.take));
  if (params?.skip) query.set("skip", String(params.skip));

  const qs = query.toString();
  return apiFetch<FormattedReceipt[]>(
    `/api/companies/${companyId}/receipts${qs ? `?${qs}` : ""}`
  );
}

// ─── Forecast de Compras ────────────────────────────────────────────────────

export async function fetchComprasForecast(
  companyId: string
): Promise<ComprasForecastSummary> {
  return apiFetch<ComprasForecastSummary>(
    `/api/companies/${companyId}/compras/forecast`
  );
}
