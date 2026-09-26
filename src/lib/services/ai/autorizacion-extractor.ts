import { ApiError, badRequest, internalError } from "@/lib/api/errors";
import {
  AutorizacionAIResponseSchema,
  type AutorizacionAIResponse,
} from "@/lib/validators/autorizacion-ai";

import { aiConfig } from "./config";
import { readAuthorizationWithAzure } from "./azure-document-intelligence";
import { buildAutorizacionPrompt } from "./prompts/autorizacion-prompt";
import { getAIProvider } from "./utils/provider-factory";
import { parseJsonResponse, toRawTextPreview } from "./utils/parse-json-response";
import type {
  AIProviderName,
  AIProviderResponse,
  ExtractAutorizacionInput,
} from "./types";

function resolveProviderName(mode?: string): AIProviderName {
  if (!mode || mode.trim().length === 0) {
    return aiConfig.provider;
  }

  const normalized = mode.trim().toLowerCase();

  if (normalized === "mock") {
    return "mock";
  }

  if (normalized === "vlm") {
    if (aiConfig.provider === "mock") {
      throw new ApiError(
        501,
        "ai_provider_not_implemented",
        'AI provider mode "vlm" is not implemented yet. Use mode="mock" in this phase.'
      );
    }

    return aiConfig.provider;
  }

  if (
    normalized === "openrouter" ||
    normalized === "openai" ||
    normalized === "gemini" ||
    normalized === "anthropic" ||
    normalized === "local"
  ) {
    return normalized;
  }

  throw badRequest(`Unsupported AI extraction mode: ${mode}`, "unsupported_ai_mode");
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

function buildDomainResponse(
  providerResponse: AIProviderResponse,
  parsedPayload: unknown
): AutorizacionAIResponse {
  const rawPayload =
    parsedPayload && typeof parsedPayload === "object"
      ? (parsedPayload as Record<string, unknown>)
      : {};

  const extracted =
    rawPayload.extracted && typeof rawPayload.extracted === "object"
      ? rawPayload.extracted
      : rawPayload;

  const candidate = {
    provider:
      typeof rawPayload.provider === "string" && rawPayload.provider.trim().length > 0
        ? rawPayload.provider.trim()
        : providerResponse.provider,
    confidence:
      typeof rawPayload.confidence === "number" ? rawPayload.confidence : 0,
    looks_like_authorization:
      typeof rawPayload.looks_like_authorization === "boolean"
        ? rawPayload.looks_like_authorization
        : false,
    warnings: normalizeWarnings(providerResponse.warnings, rawPayload.warnings),
    extracted,
    raw_text_preview:
      typeof rawPayload.raw_text_preview === "string" && rawPayload.raw_text_preview.trim().length > 0
        ? rawPayload.raw_text_preview.trim()
        : toRawTextPreview(providerResponse.rawText),
  };

  return AutorizacionAIResponseSchema.parse(candidate);
}

export async function extractAutorizacion(
  input: ExtractAutorizacionInput
): Promise<AutorizacionAIResponse> {
  if (input.mode?.trim().toLowerCase() === "azure") {
    const azureText = await readAuthorizationWithAzure({ buffer: input.buffer, mimeType: input.mimeType });
    const provider = getAIProvider("openai");
    const providerResponse = await provider.extract({
      file: {
        buffer: Buffer.from(`AZURE DOCUMENT INTELLIGENCE OCR OUTPUT:\n\n${azureText}`, "utf8"),
        mimeType: "text/plain",
        fileName: "azure-ocr.txt",
      },
      prompt: buildAutorizacionPrompt(),
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
      return {
        ...buildDomainResponse(providerResponse, parseJsonResponse(providerResponse.rawText)),
        provider: "azure-document-intelligence+openai",
      };
    } catch (error) {
      throw internalError(
        error instanceof Error ? `Failed to parse Azure-normalized response: ${error.message}` : "Failed to parse Azure-normalized response",
        "invalid_ai_provider_payload"
      );
    }
  }

  const providerName = resolveProviderName(input.mode);
  const provider = getAIProvider(providerName);
  const prompt = buildAutorizacionPrompt();
  const model = aiConfig.model || aiConfig.providers[providerName]?.model;

  const providerResponse = await provider.extract({
    file: {
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
    },
    prompt,
    timeoutMs: aiConfig.timeoutMs,
    model,
    metadata: input.metadata,
  });

  try {
    const parsedPayload = parseJsonResponse(providerResponse.rawText);
    return buildDomainResponse(providerResponse, parsedPayload);
  } catch (error) {
    throw internalError(
      error instanceof Error
        ? `Failed to parse AI provider response: ${error.message}`
        : "Failed to parse AI provider response",
      "invalid_ai_provider_payload"
    );
  }
}
