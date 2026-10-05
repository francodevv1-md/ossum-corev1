import { apiFetch } from "@/lib/api/client";
import type {
  ArticlePriceVersionCreateInput,
  PriceListCreateInput,
  PriceListUpdateInput,
} from "@/lib/validators/price-list";

export interface PriceListRow {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArticlePriceVersionRow {
  id: string;
  companyId: string;
  organizationId: string;
  articleId: string;
  priceListId: string;
  priceListCode: string;
  priceListName: string;
  priceListActive?: boolean;
  price: number;
  currency: string;
  effectiveAt: string;
  notes?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export function listPriceListsApi(companyId: string, includeInactive = false) {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  return apiFetch<PriceListRow[]>(
    `/api/companies/${encodeURIComponent(companyId)}/price-lists?${params.toString()}`,
  );
}

export function createPriceListApi(companyId: string, payload: PriceListCreateInput) {
  return apiFetch<PriceListRow>(
    `/api/companies/${encodeURIComponent(companyId)}/price-lists`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function updatePriceListApi(companyId: string, priceListId: string, payload: PriceListUpdateInput) {
  return apiFetch<PriceListRow>(
    `/api/companies/${encodeURIComponent(companyId)}/price-lists/${encodeURIComponent(priceListId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function getArticlePriceHistoryApi(companyId: string, articleId: string, priceListId?: string) {
  const params = new URLSearchParams();
  if (priceListId) params.set("priceListId", priceListId);
  return apiFetch<ArticlePriceVersionRow[]>(
    `/api/companies/${encodeURIComponent(companyId)}/articles/${encodeURIComponent(articleId)}/prices?${params.toString()}`,
  );
}

export function addArticlePriceVersionApi(
  companyId: string,
  articleId: string,
  payload: ArticlePriceVersionCreateInput,
) {
  return apiFetch<ArticlePriceVersionRow>(
    `/api/companies/${encodeURIComponent(companyId)}/articles/${encodeURIComponent(articleId)}/prices`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
