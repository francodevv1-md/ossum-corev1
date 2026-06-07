import { badRequest } from "../errors";

export type SurgeryStatusPatchBody = {
  status: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

const ALLOWED_FIELDS = new Set(["status", "source", "metadata"]);
const FORBIDDEN_BODY_FIELDS = new Set(["companyId", "actorUserId"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateSurgeryStatusPatchBody(body: unknown): SurgeryStatusPatchBody {
  if (!isPlainObject(body)) {
    throw badRequest("Body must be a JSON object", "invalid_body");
  }

  for (const field of Object.keys(body)) {
    if (FORBIDDEN_BODY_FIELDS.has(field)) {
      throw badRequest(`${field} is not accepted in body`, "forbidden_body_field");
    }

    if (!ALLOWED_FIELDS.has(field)) {
      throw badRequest(`Unexpected field: ${field}`, "unexpected_body_field");
    }
  }

  if (!("status" in body) || typeof body.status !== "string" || body.status.trim().length === 0) {
    throw badRequest("status is required", "missing_status");
  }

  if (body.source !== undefined && typeof body.source !== "string") {
    throw badRequest("source must be a string when provided", "invalid_source");
  }

  if (body.metadata !== undefined && !isPlainObject(body.metadata)) {
    throw badRequest("metadata must be an object when provided", "invalid_metadata");
  }

  return {
    status: body.status,
    source: body.source,
    metadata: body.metadata,
  };
}
