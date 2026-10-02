import { apiFetch } from "./client";

export interface StockPhysicalUnit {
  id: string;
  companyId: string;
  articleId: string;
  unitCode: string;
  serialNumber: string | null;
  location: string | null;
  status: "ACTIVE" | "RETIRED";
}

export function listStockPhysicalUnitsApi(companyId: string, articleId: string) {
  const params = new URLSearchParams({ articleId });
  return apiFetch<StockPhysicalUnit[]>(`/api/companies/${encodeURIComponent(companyId)}/stock/physical-units?${params}`);
}

export function createStockPhysicalUnitApi(companyId: string, input: { articleId: string; unitCode: string; serialNumber?: string; location?: string }) {
  return apiFetch<StockPhysicalUnit>(`/api/companies/${encodeURIComponent(companyId)}/stock/physical-units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
