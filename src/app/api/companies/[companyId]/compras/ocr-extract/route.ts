import { ZodError } from "zod";

import { badRequest, internalError } from "../../../../../../lib/api/errors";
import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import {
  extractComprasDocument,
  type ComprasDocumentTipo,
} from "../../../../../../lib/services/ai/compras-document-extractor";
import { assertAiExtractableFileSpec } from "../../../../../../lib/services/ai/file-validation";
import {
  RemitoProveedorAIResponseSchema,
  FacturaCompraAIResponseSchema,
} from "../../../../../../lib/validators/compras-document-ai";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

const COMPRAS_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

const SUPPORTED_TIPOS = new Set<ComprasDocumentTipo>(["remito-proveedor", "factura-compra"]);

function assertValidFile(file: File): void {
  assertAiExtractableFileSpec({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
}

function getTipo(formData: FormData): ComprasDocumentTipo {
  const tipoEntry = formData.get("tipo");
  if (typeof tipoEntry !== "string" || !SUPPORTED_TIPOS.has(tipoEntry.trim() as ComprasDocumentTipo)) {
    throw badRequest(
      'Field "tipo" must be "remito-proveedor" or "factura-compra"',
      "invalid_tipo_field"
    );
  }
  return tipoEntry.trim() as ComprasDocumentTipo;
}

export async function POST(request: Request, { params }: RouteContext) {
  const startedAt = Date.now();

  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, COMPRAS_MUTATION_ROLES);

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      throw badRequest("No file provided", "missing_file");
    }

    const tipo = getTipo(formData);

    assertValidFile(fileEntry);

    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    const result = await extractComprasDocument({
      tipo,
      buffer,
      mimeType: fileEntry.type,
      fileName: fileEntry.name,
      metadata: {
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        source: `compras-ocr-${tipo}`,
      },
    });

    const validated =
      tipo === "remito-proveedor"
        ? RemitoProveedorAIResponseSchema.parse(result)
        : FacturaCompraAIResponseSchema.parse(result);

    const durationMs = Date.now() - startedAt;
    void durationMs;
    // No log extracted data, raw_text_preview, CUIT or provider names.

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
