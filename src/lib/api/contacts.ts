import { apiFetch } from "./client";
import type { GeoCandidate, GeorefAddressLookup } from "@/lib/georef/georef-address.adapter";

export type ApiContact = Record<string, unknown>;

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

export type ContactGeorefLookupResponse = { candidates: GeoCandidate[] };
export function lookupContactAddressGeoref(companyId: string, payload: GeorefAddressLookup, signal?: AbortSignal) {
  return apiFetch<ContactGeorefLookupResponse>(`${basePath(companyId)}/georef/lookup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
}
