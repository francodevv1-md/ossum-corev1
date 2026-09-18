import { z } from "zod";

import { badRequest } from "../api/errors";

export const DOCUMENTATION_TEMPLATE_VERSION = "documentation-v0.1" as const;

export const DOCUMENTATION_TEMPLATE = [
  { type: "medical_order", label: "Orden médica", required: true, sortOrder: 10 },
  { type: "authorization", label: "Autorización", required: true, sortOrder: 20 },
  { type: "signed_delivery_note", label: "Remito firmado", required: true, sortOrder: 30 },
  { type: "signed_consumption", label: "Consumo firmado", required: true, sortOrder: 40 },
  { type: "implant_documentation", label: "Documentación de implante", required: false, sortOrder: 50 },
  { type: "technical_sheet", label: "Ficha técnica", required: false, sortOrder: 60 },
  { type: "box_photos", label: "Fotos de cajas/material", required: false, sortOrder: 70 },
  { type: "surgical_report", label: "Informe quirúrgico", required: false, sortOrder: 80 },
  { type: "billing_support", label: "Respaldo de facturación", required: false, sortOrder: 90 },
] as const;

export const DOCUMENTATION_STATES = ["pending", "received", "observed", "approved"] as const;
export type DocumentationState = (typeof DOCUMENTATION_STATES)[number];
export type DocumentationAggregateStatus = "not_required" | "observed" | "ready" | "incomplete";

const utcIsoInstantSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 19) === value.slice(0, 19);
}, "expectedUpdatedAt must be a valid UTC ISO timestamp");

const patchSchema = z.strictObject({
  state: z.enum(DOCUMENTATION_STATES),
  expectedUpdatedAt: utcIsoInstantSchema,
  observation: z.string().trim().min(1, "observation must not be blank").optional(),
}).superRefine((value, ctx) => {
  if (value.state === "observed" && value.observation === undefined) {
    ctx.addIssue({ code: "custom", path: ["observation"], message: "observation is required for observed state" });
  }
  if (value.state !== "observed" && value.observation !== undefined) {
    ctx.addIssue({ code: "custom", path: ["observation"], message: "observation is only allowed for observed state" });
  }
});

export type DocumentationStatePatch = z.infer<typeof patchSchema>;

const documentationIdSchema = z.string().trim().min(1, "ID is required").max(200, "ID is too long");
const documentationReadQuerySchema = z.strictObject({});

export function validateDocumentationStatePatch(input: unknown): DocumentationStatePatch {
  const parsed = patchSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid documentation state body", "documentation_invalid_state_body");
  }
  return parsed.data;
}

export function validateDocumentationId(input: unknown): string {
  const parsed = documentationIdSchema.safeParse(input);
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid documentation ID", "documentation_invalid_id");
  return parsed.data;
}

export function validateDocumentationReadQuery(input: unknown): void {
  const parsed = documentationReadQuerySchema.safeParse(input);
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid documentation query", "documentation_invalid_query");
}

const TRANSITIONS: Readonly<Record<DocumentationState, readonly DocumentationState[]>> = {
  pending: ["received"],
  received: ["approved", "observed", "pending"],
  observed: ["received", "pending"],
  approved: ["observed", "pending"],
};

export function isDocumentationTransitionAllowed(from: DocumentationState, to: DocumentationState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function deriveDocumentationAggregate(items: ReadonlyArray<{ required: boolean; state: string }>): {
  status: DocumentationAggregateStatus;
  approved: number;
  total: number;
} {
  const required = items.filter((item) => item.required);
  const approved = required.filter((item) => item.state === "approved").length;
  if (required.length === 0) return { status: "not_required", approved: 0, total: 0 };
  if (required.some((item) => item.state === "observed")) return { status: "observed", approved, total: required.length };
  if (approved === required.length) return { status: "ready", approved, total: required.length };
  return { status: "incomplete", approved, total: required.length };
}
