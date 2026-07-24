import { badRequest } from "../errors";
import { validatePrepStatus, type PrepStatus } from "../../validators/surgery.validator";

export type SurgeryPreparationPatchBody = {
  prepStatus: PrepStatus;
  source?: string;
};

const ALLOWED_FIELDS = new Set(["prepStatus", "source"]);
const FORBIDDEN_BODY_FIELDS = new Set([
  "companyId",
  "actorUserId",
  "cxStatus",
  "status",
  "metadata",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateSurgeryPreparationPatchBody(body: unknown): SurgeryPreparationPatchBody {
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

  if (!("prepStatus" in body) || typeof body.prepStatus !== "string" || body.prepStatus.trim().length === 0) {
    throw badRequest("prepStatus is required", "missing_prep_status");
  }

  if (body.source !== undefined && typeof body.source !== "string") {
    throw badRequest("source must be a string when provided", "invalid_source");
  }

  return { prepStatus: validatePrepStatus(body.prepStatus), source: body.source };
}
