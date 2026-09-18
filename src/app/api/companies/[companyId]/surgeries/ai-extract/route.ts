import { ZodError } from "zod";

import { badRequest, internalError } from "../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import { extractAutorizacion } from "../../../../../../lib/services/ai/autorizacion-extractor";
import { assertAiExtractableFileSpec } from "../../../../../../lib/services/ai/file-validation";
import { AutorizacionAIResponseSchema } from "../../../../../../lib/validators/autorizacion-ai";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

const SURGERY_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

function assertValidFile(file: File): void {
  assertAiExtractableFileSpec({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  })
}

function getMode(formData: FormData): string | undefined {
  const modeEntry = formData.get("mode");

  if (modeEntry === null) {
    return undefined;
  }

  if (typeof modeEntry !== "string") {
    throw badRequest('Field "mode" must be a string', "invalid_mode_field");
  }

  return modeEntry.trim() || undefined;
}

export async function POST(request: Request, { params }: RouteContext) {
  const startedAt = Date.now();

  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, SURGERY_MUTATION_ROLES);

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      throw badRequest("No file provided", "missing_file");
    }

    const mode = getMode(formData);

    assertValidFile(fileEntry);

    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    const result = await extractAutorizacion({
      buffer,
      mimeType: fileEntry.type,
      fileName: fileEntry.name,
      mode,
    });

    const validated = AutorizacionAIResponseSchema.parse(result);

    const durationMs = Date.now() - startedAt;
    void durationMs;
    // Optional safe technical metadata only:
    // mimeType, fileSize, provider, durationMs, warningsCount
    // Do not log extracted data, raw_text_preview, DNI or patient names.

    return ok(validated);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        internalError("Invalid AI provider response schema", "invalid_ai_response_schema")
      );
    }

    return errorResponse(error);
  }
}
