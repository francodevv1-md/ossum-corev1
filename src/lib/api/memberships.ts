// OSSUM COR — Client API for Company Memberships & Roles.

import { apiFetch } from "./client";
import type { CanonicalRole } from "../permissions/canonical-roles";

export interface ManagedMembershipItem {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  phone: string | null;
  role: string;
  canonicalRole: CanonicalRole;
  isActive: boolean;
  userIsActive: boolean;
  createdAt: string;
  updatedAt: string;
  isSelf: boolean;
  isLastAdmin: boolean;
}

export interface ListMembershipsResponse {
  items: ManagedMembershipItem[];
  totalAdmins: number;
  canManage: boolean;
}

export interface CreateMembershipPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
}

export interface UpdateMembershipPayload {
  role?: string;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  tempPassword?: string;
  userEmail: string;
  userName: string;
}

export async function getCompanyMembershipsApi(
  companyId: string
): Promise<ListMembershipsResponse> {
  return apiFetch<ListMembershipsResponse>(`/api/companies/${companyId}/memberships`);
}

export async function createCompanyMembershipApi(
  companyId: string,
  payload: CreateMembershipPayload
): Promise<ManagedMembershipItem> {
  return apiFetch<ManagedMembershipItem>(`/api/companies/${companyId}/memberships`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompanyMembershipApi(
  companyId: string,
  membershipId: string,
  payload: UpdateMembershipPayload
): Promise<ManagedMembershipItem> {
  return apiFetch<ManagedMembershipItem>(
    `/api/companies/${companyId}/memberships/${membershipId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteCompanyMembershipApi(
  companyId: string,
  membershipId: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/companies/${companyId}/memberships/${membershipId}`,
    {
      method: "DELETE",
    }
  );
}

export async function resetMembershipPasswordApi(
  companyId: string,
  membershipId: string
): Promise<ResetPasswordResponse> {
  return apiFetch<ResetPasswordResponse>(
    `/api/companies/${companyId}/memberships/${membershipId}/reset-password`,
    {
      method: "POST",
    }
  );
}
