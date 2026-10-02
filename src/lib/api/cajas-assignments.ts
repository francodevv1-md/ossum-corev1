import { apiFetch } from "./client";

export interface SurgeryBoxAssignmentRow {
  id: string;
  companyId: string;
  surgeryId: string;
  boxStockScopeReferenceId: string;
  physicalUnitId: string;
  unitCode: string | null;
  serialNumber: string | null;
  boxArticleId: string;
  boxSku: string | null;
  boxDescription: string | null;
  isActive: boolean;
  assignedAt: string;
  assignedById: string;
  assignedByName: string | null;
  endedAt: string | null;
  endedById: string | null;
  endedByName: string | null;
  endCause: string | null;
  preparation: {
    id: string;
    version: number;
    formulaVersionId: string;
    formulaVersionNumber: number;
    formulaCause: string | null;
    lineCount: number;
    requiresRecontrol: boolean;
  } | null;
}

export interface BoxAssignmentDetail {
  id: string;
  companyId: string;
  surgeryId: string;
  surgeryVisibleNumber: string | null;
  surgeryPatientName: string | null;
  surgeryInstitutionName: string | null;
  physicalUnitId: string;
  unitCode: string | null;
  serialNumber: string | null;
  boxArticleId: string;
  boxSku: string | null;
  boxDescription: string | null;
  isActive: boolean;
  assignedAt: string;
  assignedById: string;
  assignedByName: string | null;
  endedAt: string | null;
  endedById: string | null;
  endedByName: string | null;
  endCause: string | null;
  differences?: Array<{
    id: string;
    kind: string;
    observedFacts: string;
    openedAt: string;
    closedAt: string | null;
    resolutions?: Array<{
      id: string;
      sequence: number;
      closesDifference: boolean;
      explanation: string;
      supportingReference: string;
      acceptedAt: string;
    }>;
  }>;
  controls?: Array<{
    id: string;
    kind: string;
    sequence: number;
    result: string;
    acceptedAt: string;
    cause: string | null;
  }>;
  reservations?: Array<{
    id: string;
    status: string;
    quantity: number | string;
    dispatchedQuantity: number | string;
  }>;
  dispatches?: Array<{
    id: string;
    remitoId: string;
    sequence: number;
    dispatchedAt?: string;
    lines?: Array<{
      id: string;
      remitoItemId: string;
      sourcePreparationLineId?: string;
      quantity: number | string;
      unit: string;
      accounting?: {
        pendingQuantity: number | string;
        disposedQuantity: number | string;
      } | null;
    }>;
  }>;
  preparation: {
    id: string;
    version: number;
    formulaVersionId: string;
    formulaVersionNumber: number;
    formulaCause: string | null;
    formulaAcceptedAt: string;
    requiresRecontrol: boolean;
    lines: Array<{
      id: string;
      lineKey: string;
      role: string;
      articleId: string;
      sku: string | null;
      description: string | null;
      quantity: number;
      unit: string;
      isActive: boolean;
      dispatchedQuantity?: number;
      stockScopeReferenceId?: string | null;
      lotNumberSnapshot?: string | null;
      serialNumberSnapshot?: string | null;
      articleReference?: { sourceArticleId: string } | null;
    }>;
  } | null;
  createdAt: string;
}

export interface AssignBoxToSurgeryInput {
  physicalUnitId: string;
  notes?: string | null;
}

export interface EndBoxAssignmentInput {
  cause: string;
}

export async function listSurgeryBoxAssignmentsApi(
  companyId: string,
  surgeryId: string,
): Promise<SurgeryBoxAssignmentRow[]> {
  return apiFetch<SurgeryBoxAssignmentRow[]>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/cajas/assignments`,
  );
}

export async function assignBoxToSurgeryApi(
  companyId: string,
  surgeryId: string,
  payload: AssignBoxToSurgeryInput,
): Promise<BoxAssignmentDetail> {
  return apiFetch<BoxAssignmentDetail>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/cajas/assignments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function getBoxAssignmentApi(
  companyId: string,
  assignmentId: string,
): Promise<BoxAssignmentDetail> {
  return apiFetch<BoxAssignmentDetail>(
    `/api/companies/${encodeURIComponent(companyId)}/cajas/assignments/${encodeURIComponent(assignmentId)}`,
  );
}

export async function endBoxAssignmentApi(
  companyId: string,
  assignmentId: string,
  payload: EndBoxAssignmentInput,
): Promise<BoxAssignmentDetail> {
  return apiFetch<BoxAssignmentDetail>(
    `/api/companies/${encodeURIComponent(companyId)}/cajas/assignments/${encodeURIComponent(assignmentId)}/end`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function reserveBoxAssignmentApi(companyId: string, assignmentId: string) {
  return apiFetch(`/api/companies/${encodeURIComponent(companyId)}/cajas/assignments/${encodeURIComponent(assignmentId)}/reservation`, { method: "POST" });
}

export function selectPreparationLinePhysicalUnitApi(companyId: string, lineId: string, physicalUnitId: string) {
  return apiFetch(`/api/companies/${encodeURIComponent(companyId)}/cajas/preparation-lines/${encodeURIComponent(lineId)}/physical-unit`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ physicalUnitId }),
  });
}

export interface PhysicalUnitAssignmentRow {
  id: string;
  companyId: string;
  surgeryId: string;
  surgeryVisibleNumber: string | null;
  surgeryPatientName: string | null;
  surgeryInstitutionName: string | null;
  isActive: boolean;
  assignedAt: string;
  assignedByName: string | null;
  endedAt: string | null;
  endCause: string | null;
  formulaVersionNumber: number | null;
  lineCount: number;
}

export async function listPhysicalUnitAssignmentsApi(
  companyId: string,
  unitId: string,
): Promise<PhysicalUnitAssignmentRow[]> {
  return apiFetch<PhysicalUnitAssignmentRow[]>(
    `/api/companies/${encodeURIComponent(companyId)}/stock/physical-units/${encodeURIComponent(unitId)}/assignments`,
  );
}

export interface ResolveCajasDifferenceInput {
  idempotencyKey: string;
  closesDifference: boolean;
  explanation: string;
  supportingReference: string;
  cause: string;
}

export async function resolveCajasDifferenceApi(
  companyId: string,
  assignmentId: string,
  differenceId: string,
  payload: ResolveCajasDifferenceInput,
) {
  return apiFetch(
    `/api/companies/${encodeURIComponent(companyId)}/cajas/assignments/${encodeURIComponent(assignmentId)}/differences/${encodeURIComponent(differenceId)}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function controlBoxAssignmentApi(
  companyId: string,
  assignmentId: string,
  cause?: string,
  kind: "control" | "recontrol" = "control",
) {
  return apiFetch(
    `/api/companies/${encodeURIComponent(companyId)}/cajas/assignments/${encodeURIComponent(assignmentId)}/control`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cause, kind }),
    },
  );
}
