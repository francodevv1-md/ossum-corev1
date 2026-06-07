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
    throw new Error("status is required");
  }

  if (!isSurgeryStatus(status)) {
    throw new Error(`Invalid surgery status: ${status}`);
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
    throw new Error(`Surgery status is already ${next}`);
  }

  if (SURGERY_TERMINAL_STATUSES.includes(current as never)) {
    throw new Error(`Cannot change terminal surgery status ${current}`);
  }

  const allowedNextStatuses = SURGERY_STATUS_TRANSITIONS[current];
  if (!allowedNextStatuses?.includes(next)) {
    throw new Error(`Invalid surgery status transition: ${current} -> ${next}`);
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
    throw new Error(`${fieldName} must be a non-empty string when provided`);
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
    throw new Error(`${fieldName} must be a non-empty string when provided`);
  }

  return value;
}

export function validateCreateSurgeryInput(
  data: CreateSurgeryInput
): CreateSurgeryInput {
  if (typeof data.patientId !== "string" || data.patientId.trim().length === 0) {
    throw new Error("patientId is required");
  }

  if (!isValidDate(data.surgeryDate)) {
    throw new Error("surgeryDate must be a valid Date");
  }

  validateOptionalNullableString(data.branchId, "branchId");
  validateOptionalNullableString(data.doctorId, "doctorId");
  validateOptionalNullableString(data.institutionId, "institutionId");
  if (data.status !== undefined) {
    const status = validateSurgeryStatus(data.status);
    if (status !== SURGERY_INITIAL_STATUS) {
      throw new Error(`Initial surgery status must be ${SURGERY_INITIAL_STATUS}`);
    }
  }

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    throw new Error("notes must be a string when provided");
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
    throw new Error("surgeryDate must be a valid Date when provided");
  }

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    throw new Error("notes must be a string when provided");
  }

  return data;
}

export function validateUpdateSurgeryStatusInput(
  data: UpdateSurgeryStatusInput
): UpdateSurgeryStatusInput {
  return { status: validateSurgeryStatus(data.status) };
}
