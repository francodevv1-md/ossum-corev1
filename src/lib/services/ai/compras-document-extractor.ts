/**
 * compras-document-extractor.ts
 * OSSUM COR — Extractor IA para documentos de compras.
 *
 * Orquesta el mismo pipeline del Azure Authorization Wizard:
 *   Azure Document Intelligence (prebuilt-layout, OCR) → OpenAI normalizer
 *
 * Azure lee el archivo y devuelve texto OCR; OpenAI normaliza ese texto al
 * contrato estructurado (remito de proveedor o factura de compra) según el
 * `tipo` recibido. El archivo original nunca se persiste.
 *
 * Espejo de autorizacion-extractor.ts pero con dos salidas tipadas.
 */

import { ApiError, internalError } from "@/lib/api/errors";
import {
  RemitoProveedorAIResponseSchema,
  FacturaCompraAIResponseSchema,
  type RemitoProveedorAIResponse,
  type FacturaCompraAIResponse,
} from "@/lib/validators/compras-document-ai";

import { aiConfig } from "./config";
import { readAuthorizationWithAzure } from "./azure-document-intelligence";
import {
  buildRemitoProveedorPrompt,
  buildFacturaCompraPrompt,
} from "./prompts/compras-document-prompt";
import { getAIProvider } from "./utils/provider-factory";
import { parseJsonResponse, toRawTextPreview } from "./utils/parse-json-response";

export type ComprasDocumentTipo = "remito-proveedor" | "factura-compra";

export interface ExtractComprasDocumentInput {
  tipo: ComprasDocumentTipo;
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  metadata?: {
    companyId?: string;
    actorUserId?: string;
    source?: string;
  };
}

function normalizeWarnings(
  providerWarnings: string[] | undefined,
  payloadWarnings: unknown
): string[] {
  const normalized = new Set<string>();

  for (const warning of providerWarnings ?? []) {
    if (typeof warning === "string" && warning.trim().length > 0) {
      normalized.add(warning.trim());
    }
  }

  if (Array.isArray(payloadWarnings)) {
    for (const warning of payloadWarnings) {
      if (typeof warning === "string" && warning.trim().length > 0) {
        normalized.add(warning.trim());
      }
    }
  }

  return Array.from(normalized);
}

function resolvePrompt(tipo: ComprasDocumentTipo): string {
  if (tipo === "remito-proveedor") return buildRemitoProveedorPrompt();
  if (tipo === "factura-compra") return buildFacturaCompraPrompt();
  throw new ApiError(400, "unsupported_document_type", `Unsupported document type: ${tipo}`);
}

export async function extractComprasDocument(
  input: ExtractComprasDocumentInput
): Promise<RemitoProveedorAIResponse | FacturaCompraAIResponse> {
  const azureText = await readAuthorizationWithAzure({
    buffer: input.buffer,
    mimeType: input.mimeType,
  });

  const provider = getAIProvider("openai");
  const prompt = resolvePrompt(input.tipo);

  const providerResponse = await provider.extract({
    file: {
      buffer: Buffer.from(`AZURE DOCUMENT INTELLIGENCE OCR OUTPUT:\n\n${azureText}`, "utf8"),
      mimeType: "text/plain",
      fileName: "azure-ocr-compras.txt",
    },
    prompt,
    timeoutMs: aiConfig.timeoutMs,
    model: aiConfig.providers.openai.model,
    metadata: input.metadata,
  });

  providerResponse.provider = "azure-document-intelligence+openai";
  providerResponse.warnings = [
    "Azure Document Intelligence realizó el OCR; OpenAI normalizó el texto detectado.",
    ...(providerResponse.warnings ?? []),
  ];

  try {
    const parsedPayload = parseJsonResponse(providerResponse.rawText);
    const rawPayload =
      parsedPayload && typeof parsedPayload === "object"
        ? (parsedPayload as Record<string, unknown>)
        : {};

    const extracted =
      rawPayload.extracted && typeof rawPayload.extracted === "object"
        ? rawPayload.extracted
        : rawPayload;

    const baseCandidate = {
      provider:
        typeof rawPayload.provider === "string" && rawPayload.provider.trim().length > 0
          ? rawPayload.provider.trim()
          : providerResponse.provider,
      confidence:
        typeof rawPayload.confidence === "number" ? rawPayload.confidence : 0,
      warnings: normalizeWarnings(providerResponse.warnings, rawPayload.warnings),
      extracted,
      raw_text_preview:
        typeof rawPayload.raw_text_preview === "string" && rawPayload.raw_text_preview.trim().length > 0
          ? rawPayload.raw_text_preview.trim()
          : toRawTextPreview(providerResponse.rawText),
    };

    if (input.tipo === "remito-proveedor") {
      return RemitoProveedorAIResponseSchema.parse({
        ...baseCandidate,
        looks_like_remito_proveedor:
          typeof rawPayload.looks_like_remito_proveedor === "boolean"
            ? rawPayload.looks_like_remito_proveedor
            : false,
      });
    }

    return FacturaCompraAIResponseSchema.parse({
      ...baseCandidate,
      looks_like_factura_compra:
        typeof rawPayload.looks_like_factura_compra === "boolean"
          ? rawPayload.looks_like_factura_compra
          : false,
    });
  } catch (error) {
    throw internalError(
      error instanceof Error
        ? `Failed to parse Azure-normalized response: ${error.message}`
        : "Failed to parse Azure-normalized response",
      "invalid_ai_provider_payload"
    );
  }
}
