import { apiFetch } from "./client";
export type ProveedorRow = { id: string; name: string; code: string; active: boolean };
type ContactRow = { id: string; code?: string | null; tradeName?: string | null; legalName?: string | null; firstName?: string | null; lastName?: string | null; isActive?: boolean | null };
export function listProveedores(companyId: string) { return apiFetch<ContactRow[]>(`/api/companies/${encodeURIComponent(companyId)}/contacts?role=proveedor&isActive=true&take=200`).then(rows => rows.map(row => ({ id: row.id, code: row.code ?? row.id, name: row.tradeName?.trim() || row.legalName?.trim() || `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || row.id, active: row.isActive !== false }))); }
