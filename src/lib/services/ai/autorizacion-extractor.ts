import { ApiError, badRequest, internalError } from "@/lib/api/errors";
import {
  AutorizacionAIResponseSchema,
  type AutorizacionAIResponse,
} from "@/lib/validators/autorizacion-ai";

import { aiConfig } from "./config";
import { buildAutorizacionPrompt } from "./prompts/autorizacion-prompt";
import { getAIProvider } from "./utils/provider-factory";
import { parseJsonResponse, toRawTextPreview } from "./utils/parse-json-response";
import type {
  AIProviderName,
  AIProviderResponse,
  ExtractAutorizacionInput,
} from "./types";

function resolveProviderName(mode?: string): AIProviderName {
  if (!mode || mode.trim().length === 0 || mode.trim().toLowerCase() === "default") {
    return aiConfig.provider;
  }

  const normalized = mode.trim().toLowerCase();

  if (normalized === "mock") {
    return "mock";
  }

  if (normalized === "vlm" || normalized === "azure") {
    // If azure or vlm is requested, fallback to configured AI provider
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

  return aiConfig.provider;
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
