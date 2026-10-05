import { apiFetch } from "@/lib/api/client";
import type {
  ArticleStockAvailability,
  StockSummaryKPIs,
  StockFacets,
  LotAvailability,
  StockMovementLedgerItem,
} from "@/lib/services/stock-ledger.service";
import type {
  StockAdjustmentCreateInput,
  StockAvailabilityQuery,
} from "@/lib/validators/stock";

export type { StockFacets };

export interface StockAvailabilityResponse {
  data: ArticleStockAvailability[];
  summary: StockSummaryKPIs;
  facets: StockFacets;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ArticleStockDetailResponse {
  article: {
    id: string;
    code: string;
    name: string;
    family: string | null;
    category?: string | null;
    pmAnmat?: string | null;
    isSterile?: boolean;
    brand: string | null;
    articleType: string | null;
    unit: string;
    manufacturer: string | null;
    vatTreatment: string;
    vatRate: number;
    identifiers: Array<{ id: string; type: string; value: string }>;
    suppliers: Array<{ id: string; supplierId: string }>;
    cost?: number;
    price?: number;
    priceListCode?: string | null;
    preferredSupplier?: string | null;
    preferredSupplierId?: string | null;
    leadTimeDays?: number | null;
    minStock?: number | null;
    commercialProfile?: {
      id: string;
      companyId: string;
      articleId: string;
      referenceCost: number;
      referenceSalePrice: number;
      currency: string;
      priceListCode: string | null;
      preferredSupplierId: string | null;
      preferredSupplierName: string | null;
      leadTimeDays: number | null;
      minStock?: number | null;
    } | null;
  };
  summary: {
    physical: number;
    reserved: number;
    inTransit: number;
    available: number;
    minStock: number;
    state: string;
  };
  lots: LotAvailability[];
  movements: StockMovementLedgerItem[];
}

export function fetchStockAvailabilityApi(
  companyId: string,
  query?: Partial<StockAvailabilityQuery>,
) {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.family) params.set("family", query.family);
  if (query?.brand) params.set("brand", query.brand);
  if (query?.articleType) params.set("articleType", query.articleType);
  if (query?.deposit) params.set("deposit", query.deposit);
  if (query?.quickFilter) params.set("quickFilter", query.quickFilter);
  if (query?.page) params.set("page", String(query.page));
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.sortKey) params.set("sortKey", query.sortKey);
  if (query?.sortDir) params.set("sortDir", query.sortDir);

  const qs = params.toString();
  return apiFetch<StockAvailabilityResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/stock${qs ? `?${qs}` : ""}`,
  );
}

export function fetchArticleStockDetailApi(companyId: string, articleId: string) {
  return apiFetch<ArticleStockDetailResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/stock/${encodeURIComponent(articleId)}`,
  );
}

export function createStockAdjustmentApi(
  companyId: string,
  input: StockAdjustmentCreateInput,
) {
  return apiFetch(
    `/api/companies/${encodeURIComponent(companyId)}/stock/adjustments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}
