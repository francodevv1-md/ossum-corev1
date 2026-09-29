import { apiFetch } from "@/lib/api/client";
import type {
  CreateAdjustmentDocumentInput,
  AdjustmentDocumentFilterInput,
  AdjustmentTypeEnum,
  AdjustmentStateEnum,
  AdjustmentOriginTypeEnum,
  AdjustmentModalityEnum,
} from "@/lib/validators/adjustment-document";

export type AdjustmentDocumentItemApiRow = {
  id: string;
  adjustmentDocumentId: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  vatTreatment: string;
  vatRate: string | number;
  originalQuantity?: string | number | null;
  sourceItemId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdjustmentDocumentApiRow = {
  id: string;
  visibleNumber: number | null;
  companyId: string;
  type: AdjustmentTypeEnum;
  state: AdjustmentStateEnum;
  originType: AdjustmentOriginTypeEnum;
  internalInvoiceId: string | null;

  // Snapshot comprobante externo
  externalDocType: string | null;
  externalPtoVta: number | null;
  externalNumber: number | null;
  externalIssueDate: string | null;
  externalIssuerCuit: string | null;
  externalCae: string | null;

  // Snapshot período
  periodFrom: string | null;
  periodTo: string | null;

  surgeryId: string | null;
  clientName: string | null;
  clientDocumentType: string | null;
  clientDocumentNumber: string | null;
  clientVatCondition: string | null;

  modalidad: AdjustmentModalityEnum;
  motivo: string;
  observaciones: string | null;

  currency: string;
  subtotal: string | number;
  taxTotal: string | number;
  total: string | number;

  issuedAt: string | null;
  cancelledAt: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;

  items: AdjustmentDocumentItemApiRow[];
  internalInvoice?: {
    id: string;
    visibleNumber: number | null;
    state: string;
    total: string | number;
    balance: string | number;
    issuedAt: string | null;
  } | null;
  fiscalDocument?: {
    id: string;
    state: string;
    externalReference: string | null;
  } | null;
};

export type ListAdjustmentDocumentsResponse = {
  data: AdjustmentDocumentApiRow[];
  kpis: {
    creditCount: number;
    creditTotal: string;
    debitCount: number;
    debitTotal: string;
    netImpact: string;
    totalCount: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function listAdjustmentDocumentsApi(
  companyId: string,
  filters?: AdjustmentDocumentFilterInput,
): Promise<ListAdjustmentDocumentsResponse> {
  const query = new URLSearchParams();
  if (filters?.type) query.set("type", filters.type);
  if (filters?.state) query.set("state", filters.state);
  if (filters?.originType) query.set("originType", filters.originType);
  if (filters?.search) query.set("search", filters.search);
  if (filters?.issuedFrom) query.set("issuedFrom", filters.issuedFrom);
  if (filters?.issuedTo) query.set("issuedTo", filters.issuedTo);
  if (filters?.internalInvoiceId) query.set("internalInvoiceId", filters.internalInvoiceId);
  if (filters?.page) query.set("page", String(filters.page));
  if (filters?.limit) query.set("limit", String(filters.limit));

  const qs = query.toString();
  const endpoint = `/api/companies/${companyId}/adjustment-documents${qs ? `?${qs}` : ""}`;
  return apiFetch<ListAdjustmentDocumentsResponse>(endpoint);
}

export async function getAdjustmentDocumentByIdApi(
  companyId: string,
  id: string,
): Promise<AdjustmentDocumentApiRow> {
  return apiFetch<AdjustmentDocumentApiRow>(`/api/companies/${companyId}/adjustment-documents/${id}`);
}

export async function createAdjustmentDocumentApi(
  companyId: string,
  payload: CreateAdjustmentDocumentInput,
): Promise<AdjustmentDocumentApiRow> {
  return apiFetch<AdjustmentDocumentApiRow>(`/api/companies/${companyId}/adjustment-documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function emitAdjustmentDocumentApi(
  companyId: string,
  id: string,
): Promise<AdjustmentDocumentApiRow> {
  return apiFetch<AdjustmentDocumentApiRow>(`/api/companies/${companyId}/adjustment-documents/${id}/emit`, {
    method: "POST",
  });
}

export async function voidAdjustmentDocumentApi(
  companyId: string,
  id: string,
): Promise<AdjustmentDocumentApiRow> {
  return apiFetch<AdjustmentDocumentApiRow>(`/api/companies/${companyId}/adjustment-documents/${id}/void`, {
    method: "POST",
  });
}
