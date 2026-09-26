import { apiFetch } from "@/lib/api/client";

export type RemitoScanItem = {
  sku: string | null;
  description: string;
  quantity: string;
  unit: string | null;
  returnedQuantity: string;
  lotNumber: string | null;
  serialNumber: string | null;
  expirationDate: string | null;
};

export type RemitoScanProjection = {
  remitoShortCode: string;
  documentType: string;
  state: string;
  issuedAt: string;
  items: RemitoScanItem[];
  surgery?: { recordNumber: string | null };
  cajas?: Array<{ identifiedCode: string; dispatchedAt: string }>;
  capabilities: { canDeliver: false; canReturn: false };
};

export function resolveRemitoScan(locator: string, selectedCompanyId?: string) {
  return apiFetch<RemitoScanProjection>("/api/remitos/scan/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locator, selectedCompanyId }),
  });
}
