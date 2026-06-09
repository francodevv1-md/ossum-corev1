import { badRequest } from "../api/errors";

export type CreateSurgeryInput = {
  branchId?: string | null;
  patientId: string;
  doctorId?: string | null;
  institutionId?: string | null;
  surgeryDate: Date;
  status?: string;
  notes?: string | null;
};

export type UpdateSurgeryInput = {
  branchId?: string | null;
  patientId?: string;
  doctorId?: string | null;
  institutionId?: string | null;
  surgeryDate?: Date;
  status?: string;
  notes?: string | null;
};

export type UpdateSurgeryStatusInput = {
  status: string;
};

export const SURGERY_STATUSES = [
  "unauthorized",
  "authorized",
  "pending",
  "preparing",
  "in_transit",
  "performed",
  "no_consumption",
  "finalized",
  "suspended",
  "cancelled",
] as const;

export type SurgeryStatus = (typeof SURGERY_STATUSES)[number];

export const SURGERY_STATUS_LABELS: Record<SurgeryStatus, string> = {
  unauthorized: "No autorizada",
  authorized: "Autorizada",
  pending: "Pendiente",
  preparing: "En preparación",
  in_transit: "En tránsito",
  performed: "Realizada",
  no_consumption: "Sin consumo",
  finalized: "Finalizada",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

export const SURGERY_INITIAL_STATUS: SurgeryStatus = "pending";

export const SURGERY_TERMINAL_STATUSES = [
  "finalized",
  "cancelled",
  "suspended",
] as const satisfies readonly SurgeryStatus[];

export const SURGERY_STATUS_TRANSITIONS: Partial<
  Record<SurgeryStatus, readonly SurgeryStatus[]>
> = {
  unauthorized: ["authorized", "pending", "suspended", "cancelled"],
  authorized: ["pending", "preparing", "suspended", "cancelled"],
  pending: ["authorized", "preparing", "suspended", "cancelled"],
  preparing: ["in_transit", "suspended", "cancelled"],
  in_transit: ["performed", "suspended", "cancelled"],
  performed: ["no_consumption", "finalized"],
  no_consumption: ["finalized"],
};

function isSurgeryStatus(value: string): value is SurgeryStatus {
  return SURGERY_STATUSES.includes(value as SurgeryStatus);
}

export function validateSurgeryStatus(status: string): SurgeryStatus {
  if (typeof status !== "string" || status.trim().length === 0) {
    throw badRequest("status is required", "missing_status");
  }

  if (!isSurgeryStatus(status)) {
    throw badRequest(`Invalid surgery status: ${status}`, "invalid_surgery_status");
  }

  return status;
}

export function validateSurgeryStatusTransition(
  currentStatus: string,
  nextStatus: string
): SurgeryStatus {
  const current = validateSurgeryStatus(currentStatus);
  const next = validateSurgeryStatus(nextStatus);

  if (current === next) {
    throw badRequest(`Surgery status is already ${next}`, "status_unchanged");
  }

  if (SURGERY_TERMINAL_STATUSES.includes(current as never)) {
    throw badRequest(`Cannot change terminal surgery status ${current}`, "terminal_status_immutable");
  }

  const allowedNextStatuses = SURGERY_STATUS_TRANSITIONS[current];
  if (!allowedNextStatuses?.includes(next)) {
    throw badRequest(`Invalid surgery status transition: ${current} -> ${next}`, "invalid_status_transition");
  }

  return next;
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function validateOptionalNullableString(
  value: unknown,
  fieldName: string
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`${fieldName} must be a non-empty string when provided`, "invalid_field");
  }

  return value;
}

function validateOptionalString(
  value: unknown,
  fieldName: string
): string | undefined {
  if (value === undefined) {
    return value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`${fieldName} must be a non-empty string when provided`, "invalid_field");
  }

  return value;
}

export function validateCreateSurgeryInput(
  data: CreateSurgeryInput
): CreateSurgeryInput {
  if (typeof data.patientId !== "string" || data.patientId.trim().length === 0) {
    throw badRequest("patientId is required", "missing_patient_id");
  }

  if (!isValidDate(data.surgeryDate)) {
    throw badRequest("surgeryDate must be a valid Date", "invalid_surgery_date");
  }

  validateOptionalNullableString(data.branchId, "branchId");
  validateOptionalNullableString(data.doctorId, "doctorId");
  validateOptionalNullableString(data.institutionId, "institutionId");
  if (data.status !== undefined) {
    const status = validateSurgeryStatus(data.status);
    if (status !== SURGERY_INITIAL_STATUS) {
      throw badRequest(`Initial surgery status must be ${SURGERY_INITIAL_STATUS}`, "invalid_initial_status");
    }
  }

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    throw badRequest("notes must be a string when provided", "invalid_notes");
  }

  return { ...data, status: SURGERY_INITIAL_STATUS };
}

export function validateUpdateSurgeryInput(
  data: UpdateSurgeryInput
): UpdateSurgeryInput {
  validateOptionalNullableString(data.branchId, "branchId");
  validateOptionalString(data.patientId, "patientId");
  validateOptionalNullableString(data.doctorId, "doctorId");
  validateOptionalNullableString(data.institutionId, "institutionId");
  if (data.status !== undefined) {
    validateSurgeryStatus(data.status);
  }

  if (data.surgeryDate !== undefined && !isValidDate(data.surgeryDate)) {
    throw badRequest("surgeryDate must be a valid Date when provided", "invalid_surgery_date");
  }

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    throw badRequest("notes must be a string when provided", "invalid_notes");
  }

  return data;
}

export function validateUpdateSurgeryStatusInput(
  data: UpdateSurgeryStatusInput
): UpdateSurgeryStatusInput {
  return { status: validateSurgeryStatus(data.status) };
}
