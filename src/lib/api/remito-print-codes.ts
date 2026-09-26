import { apiFetch } from "@/lib/api/client"

export type RemitoPrintCodesDto = {
  remitoShortCode: string
  internalQrDataUrl: string
  publicQrDataUrl: string
  code128Svg: string
  labels: { internal: "Internal OSSUM access"; public: "Public verification" }
}

export function fetchRemitoPrintCodes(companyId: string, remitoShortCode: string) {
  return apiFetch<RemitoPrintCodesDto>(
    `/api/companies/${encodeURIComponent(companyId)}/remitos/${encodeURIComponent(remitoShortCode)}/print-codes`,
  )
}
