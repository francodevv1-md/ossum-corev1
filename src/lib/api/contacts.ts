import { apiFetch } from "./client";

export type ApiContact = Record<string, unknown>;

export type CuitLookupResult = {
  source: "stub" | "tusfacturas";
  found: boolean;
  legalName?: string | null;
  vatCondition?: "Responsable Inscripto" | "Monotributo" | "Exento" | "Consumidor Final";
  mainAddress?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    country?: string | null;
  } | null;
  estado?: string;
  extra?: Record<string, unknown>;
};

export type ContactListParams = {
  search?: string;
  role?: string;
  contactType?: string;
  isActive?: boolean;
  includeInactive?: boolean;
  take?: number;
  skip?: number;
};

function basePath(companyId: string) {
  return `/api/companies/${encodeURIComponent(companyId)}/contacts`;
}

export function listContacts(companyId: string, params: ContactListParams = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const suffix = query.size ? `?${query}` : "";
  return apiFetch<ApiContact[]>(`${basePath(companyId)}${suffix}`);
}

export function createContactApi(companyId: string, payload: Record<string, unknown>) {
  return apiFetch<ApiContact>(basePath(companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateContactApi(companyId: string, contactId: string, payload: Record<string, unknown>) {
  return apiFetch<ApiContact>(`${basePath(companyId)}/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function cuitLookupApi(companyId: string, cuit: string) {
  return apiFetch<CuitLookupResult>(`${basePath(companyId)}/cuit-lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cuit }),
  });
}

export function getContactCodePreviewApi(companyId: string) {
  return apiFetch<{ lastCode: string | null; nextCode: string }>(`${basePath(companyId)}/code-preview`);
}
