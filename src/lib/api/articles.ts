import { apiFetch } from "@/lib/api/client"

export interface ArticleCommercialProfileData {
  id: string
  companyId: string
  organizationId: string
  articleId: string
  referenceCost: number
  referenceSalePrice: number
  currency: string
  priceListCode?: string | null
  preferredSupplierId?: string | null
  preferredSupplierName?: string | null
  leadTimeDays?: number | null
  minStock?: number
}

export interface ArticleApiRow {
  id: string
  sku: string
  description: string
  unit: string
  articleType?: string | null
  brand?: string | null
  manufacturer?: string | null
  family?: string | null
  modelVariant?: string | null
  measure?: string | null
  category?: string | null
  pmAnmat?: string | null
  isSterile?: boolean
  unitPrice?: number
  vatTreatment?: string
  vatRate?: number
  ivaKey?: string
  stock?: number
  commercialProfile?: ArticleCommercialProfileData | null
}

export function searchArticlesApi(companyId: string, query: string, take = 25) {
  const params = new URLSearchParams()
  if (query.trim()) params.set("q", query.trim())
  params.set("take", String(take))
  return apiFetch<ArticleApiRow[]>(`/api/companies/${encodeURIComponent(companyId)}/articles?${params.toString()}`)
}

export function getArticleApi(companyId: string, articleId: string) {
  return apiFetch<ArticleApiRow>(`/api/companies/${encodeURIComponent(companyId)}/articles/${encodeURIComponent(articleId)}`)
}

export interface ArticleCommercialProfilePayload {
  referenceCost?: number
  referenceSalePrice?: number
  currency?: "ARS"
  priceListCode?: string | null
  preferredSupplierId?: string | null
  leadTimeDays?: number | null
  minStock?: number
}

export function updateArticleVatApi(
  companyId: string,
  articleId: string,
  payload: { vatTreatment: string; vatRate?: number }
) {
  return apiFetch<ArticleApiRow>(
    `/api/companies/${encodeURIComponent(companyId)}/articles/${encodeURIComponent(articleId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
}

export function updateArticleCommercialProfileApi(
  companyId: string,
  articleId: string,
  commercialProfile: ArticleCommercialProfilePayload
) {
  return apiFetch<ArticleApiRow>(
    `/api/companies/${encodeURIComponent(companyId)}/articles/${encodeURIComponent(articleId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commercialProfile }),
    }
  )
}
