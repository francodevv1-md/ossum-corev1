import { badRequest } from "../api/errors";

export type CreateSurgeryInput = {
  branchId?: string | null;
  visibleNumber?: string | null;
  patientId: string;
  doctorId?: string | null;
  institutionId?: string | null;
  payerContactId?: string | null;
  classification?: string | null;
  description?: string | null;
  priority?: string | null;
  cxStatus?: string;
  prepStatus?: string | null;
  probableDate?: Date | null;
  scheduledDate?: Date | null;
  surgeryDate?: Date | null;
  performedDate?: Date | null;
  cancelledDate?: Date | null;
  source?: string | null;
  notes?: string | null;
};

export type UpdateSurgeryInput = {
  branchId?: string | null;
  visibleNumber?: string | null;
  patientId?: string;
  doctorId?: string | null;
  institutionId?: string | null;
  payerContactId?: string | null;
  classification?: string | null;
  description?: string | null;
  priority?: string | null;
  cxStatus?: string;
  prepStatus?: string | null;
  probableDate?: Date | null;
  scheduledDate?: Date | null;
  surgeryDate?: Date | null;
  surgeryTimeSpecified?: boolean | null;
  materialShippingDate?: Date | null;
  materialTransport?: string | null;
  performedDate?: Date | null;
  cancelledDate?: Date | null;
  source?: string | null;
  notes?: string | null;
};

export type UpdateSurgeryCxStatusInput = {
  cxStatus: string;
};

export const CX_STATUS = [
  "unauthorized",
  "authorized",
  "pending",
  "scheduled",
  "performed",
  "finalized",
  "suspended",
  "cancelled",
] as const;

export const PREP_STATUS = [
  "preparing",
  "frozen",
  "frozen_with_missing",
  "shipped",
  "delivered",
  "returned",
] as const;

export const SURGERY_PRIORITY = ["normal", "urgent", "scheduled"] as const;

export const SURGERY_CONTACT_ROLE = [
  "coordinator",
  "salesperson",
  "instrumentator",
  "transporter",
  "assistant",
  "observer",
  "other",
] as const;

export type CxStatus = (typeof CX_STATUS)[number];
export type PrepStatus = (typeof PREP_STATUS)[number];
export type SurgeryPriority = (typeof SURGERY_PRIORITY)[number];
export type SurgeryContactRole = (typeof SURGERY_CONTACT_ROLE)[number];

export const CX_STATUS_LABELS: Record<CxStatus, string> = {
  unauthorized: "No autorizada",
  authorized: "Autorizada",
  pending: "Pendiente",
  scheduled: "Programada",
  performed: "Realizada",
  finalized: "Finalizada",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

export const PREP_STATUS_LABELS: Record<PrepStatus, string> = {
  preparing: "En preparación",
  frozen: "Congelada",
  frozen_with_missing: "Congelada con faltantes",
  shipped: "Despachada",
  delivered: "Entregada",
  returned: "Retirada / devuelta",
};

export const CX_INITIAL_STATUS: CxStatus = "pending";

export const CX_TERMINAL_STATUSES = ["finalized", "cancelled"] as const satisfies readonly CxStatus[];

export const CX_STATUS_TRANSITIONS: Partial<Record<CxStatus, readonly CxStatus[]>> = {
  unauthorized: ["authorized", "pending", "scheduled", "suspended", "cancelled"],
  authorized: ["pending", "scheduled", "suspended", "cancelled"],
  pending: ["authorized", "scheduled", "suspended", "cancelled"],
  scheduled: ["performed", "suspended", "cancelled"],
  performed: ["finalized", "suspended"],
  suspended: ["authorized", "pending", "scheduled", "cancelled"],
};

function isCxStatus(value: string): value is CxStatus {
  return CX_STATUS.includes(value as CxStatus);
}

function isPrepStatus(value: string): value is PrepStatus {
  return PREP_STATUS.includes(value as PrepStatus);
}

function isSurgeryPriority(value: string): value is SurgeryPriority {
  return SURGERY_PRIORITY.includes(value as SurgeryPriority);
}

export function validateCxStatus(status: string): CxStatus {
  if (typeof status !== "string" || status.trim().length === 0) {
    throw badRequest("cxStatus is required", "missing_cx_status");
  }

  if (!isCxStatus(status)) {
    throw badRequest(`Invalid surgery cxStatus: ${status}`, "invalid_surgery_cx_status");
  }

  return status;
}

export function validatePrepStatus(status: string): PrepStatus {
  if (typeof status !== "string" || status.trim().length === 0) {
    throw badRequest("prepStatus is required", "missing_prep_status");
  }

  if (!isPrepStatus(status)) {
    throw badRequest(`Invalid surgery prepStatus: ${status}`, "invalid_surgery_prep_status");
  }

  return status;
}

export function validateCxStatusTransition(
  currentStatus: string,
  nextStatus: string
): CxStatus {
  const current = validateCxStatus(currentStatus);
  const next = validateCxStatus(nextStatus);

  if (current === next) {
    throw badRequest(`Surgery cxStatus is already ${next}`, "cx_status_unchanged");
  }

  if (CX_TERMINAL_STATUSES.includes(current as never)) {
    throw badRequest(`Cannot change terminal surgery cxStatus ${current}`, "terminal_cx_status_immutable");
  }

  const allowedNextStatuses = CX_STATUS_TRANSITIONS[current];
  if (!allowedNextStatuses?.includes(next)) {
    throw badRequest(
      `Invalid surgery cxStatus transition: ${current} -> ${next}`,
      "invalid_cx_status_transition"
    );
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

function validateOptionalNullableDate(
  value: unknown,
  fieldName: string
): Date | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (!isValidDate(value)) {
    throw badRequest(`${fieldName} must be a valid Date when provided`, "invalid_date_field");
  }

  return value;
}

function validateOptionalPriority(
  value: unknown
): SurgeryPriority | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string" || !isSurgeryPriority(value)) {
    throw badRequest(`Invalid surgery priority: ${String(value)}`, "invalid_surgery_priority");
  }

  return value;
}

function validateOptionalMaterialTransport(
  value: unknown
): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") {
    throw badRequest("materialTransport must be a string when provided", "invalid_material_transport");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 200) {
    throw badRequest("materialTransport must contain at most 200 characters", "invalid_material_transport");
  }
  return trimmed;
}

export function parseIsoTimestamp(value: unknown, fieldName: string): Date {
  if (typeof value !== "string") {
    throw badRequest(`${fieldName} must be an ISO timestamp with an explicit offset`, "invalid_date_field");
  }
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) {
    throw badRequest(`${fieldName} must be an ISO timestamp with an explicit offset`, "invalid_date_field");
  }
  const parsed = new Date(value);
  const calendar = new Date(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== match[1] ||
    Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59 || Number(match[6] ?? 0) > 23 || Number(match[7] ?? 0) > 59) {
    throw badRequest(`${fieldName} must be a valid ISO timestamp`, "invalid_date_field");
  }
  return parsed;
}

export function validateCreateSurgeryInput(
  data: CreateSurgeryInput
): CreateSurgeryInput {
  if (typeof data.patientId !== "string" || data.patientId.trim().length === 0) {
    throw badRequest("patientId is required", "missing_patient_id");
  }

  validateOptionalNullableString(data.branchId, "branchId");
  validateOptionalNullableString(data.visibleNumber, "visibleNumber");
  validateOptionalNullableString(data.doctorId, "doctorId");
  validateOptionalNullableString(data.institutionId, "institutionId");
  validateOptionalNullableString(data.payerContactId, "payerContactId");
  validateOptionalNullableString(data.classification, "classification");
  validateOptionalNullableString(data.description, "description");
  validateOptionalNullableString(data.source, "source");
  validateOptionalPriority(data.priority);

  const cxStatus =
    data.cxStatus !== undefined ? validateCxStatus(data.cxStatus) : CX_INITIAL_STATUS;

  if (data.cxStatus !== undefined && cxStatus !== CX_INITIAL_STATUS) {
    throw badRequest(`Initial surgery cxStatus must be ${CX_INITIAL_STATUS}`, "invalid_initial_cx_status");
  }

  if (data.prepStatus !== undefined && data.prepStatus !== null) {
    validatePrepStatus(data.prepStatus);
  }

  validateOptionalNullableDate(data.probableDate, "probableDate");
  validateOptionalNullableDate(data.scheduledDate, "scheduledDate");
  validateOptionalNullableDate(data.surgeryDate, "surgeryDate");
  validateOptionalNullableDate(data.performedDate, "performedDate");
  validateOptionalNullableDate(data.cancelledDate, "cancelledDate");

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    throw badRequest("notes must be a string when provided", "invalid_notes");
  }

  return { ...data, cxStatus };
}

export function validateUpdateSurgeryInput(
  data: UpdateSurgeryInput
): UpdateSurgeryInput {
  validateOptionalNullableString(data.branchId, "branchId");
  validateOptionalNullableString(data.visibleNumber, "visibleNumber");
  validateOptionalString(data.patientId, "patientId");
  validateOptionalNullableString(data.doctorId, "doctorId");
  validateOptionalNullableString(data.institutionId, "institutionId");
  validateOptionalNullableString(data.payerContactId, "payerContactId");
  validateOptionalNullableString(data.classification, "classification");
  validateOptionalNullableString(data.description, "description");
  validateOptionalNullableString(data.source, "source");
  validateOptionalPriority(data.priority);

  if (data.cxStatus !== undefined) {
    validateCxStatus(data.cxStatus);
  }

  if (data.prepStatus !== undefined && data.prepStatus !== null) {
    validatePrepStatus(data.prepStatus);
  }

  validateOptionalNullableDate(data.probableDate, "probableDate");
  validateOptionalNullableDate(data.scheduledDate, "scheduledDate");
  validateOptionalNullableDate(data.surgeryDate, "surgeryDate");
  if (data.surgeryTimeSpecified !== undefined && data.surgeryTimeSpecified !== null && typeof data.surgeryTimeSpecified !== "boolean") {
    throw badRequest("surgeryTimeSpecified must be boolean or null", "invalid_surgery_time_specified");
  }
  if (data.surgeryDate === null && data.surgeryTimeSpecified != null) {
    throw badRequest("A cleared date cannot specify time precision", "incompatible_surgery_time_specified");
  }
  if (data.surgeryTimeSpecified === false && data.surgeryDate instanceof Date && !isArgentineMidnightAnchor(data.surgeryDate)) {
    throw badRequest("Date-only surgery must use Argentine midnight", "incompatible_surgery_time_specified");
  }
  validateOptionalNullableDate(data.materialShippingDate, "materialShippingDate");
  validateOptionalNullableDate(data.performedDate, "performedDate");
  validateOptionalNullableDate(data.cancelledDate, "cancelledDate");

  if (
    data.notes !== undefined &&
    data.notes !== null &&
    typeof data.notes !== "string"
  ) {
    throw badRequest("notes must be a string when provided", "invalid_notes");
  }

  if (data.materialTransport === undefined) return data;
  return { ...data, materialTransport: validateOptionalMaterialTransport(data.materialTransport) };
}

export function validateUpdateSurgeryCxStatusInput(
  data: UpdateSurgeryCxStatusInput
): UpdateSurgeryCxStatusInput {
  return { cxStatus: validateCxStatus(data.cxStatus) };
}

export function isArgentineMidnightAnchor(date: Date): boolean {
  return date.getUTCHours() === 3 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}
