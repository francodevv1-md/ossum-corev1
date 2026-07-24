import {
  AI_PROVIDER_NAMES,
  type AIProviderConfig,
  type AIProviderName,
} from "./types";

const DEFAULT_PROVIDER: AIProviderName = "mock";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_FILE_SIZE_MB = 20;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_PDF_ENGINE = "cloudflare-ai";

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeFloat(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveProvider(value: string | undefined): AIProviderName {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized &&
    AI_PROVIDER_NAMES.includes(normalized as AIProviderName)
  ) {
    return normalized as AIProviderName;
  }

  return DEFAULT_PROVIDER;
}

export const AI_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
] as const;

export const AI_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
] as const;

export const aiConfig: AIProviderConfig = {
  provider: resolveProvider(process.env.AI_PROVIDER),
  model: process.env.AI_MODEL?.trim() || undefined,
  timeoutMs: parsePositiveInteger(process.env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  maxFileSizeBytes:
    parsePositiveInteger(process.env.AI_MAX_FILE_SIZE_MB, DEFAULT_MAX_FILE_SIZE_MB) * 1024 * 1024,
  confidenceThreshold: parseNonNegativeFloat(
    process.env.AI_CONFIDENCE_THRESHOLD,
    DEFAULT_CONFIDENCE_THRESHOLD
  ),
  providers: {
    mock: {
      model: "mock-authorizations-v1",
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY?.trim() || undefined,
      model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
      baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
      pdfEngine: process.env.OPENROUTER_PDF_ENGINE?.trim() || DEFAULT_OPENROUTER_PDF_ENGINE,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
      model: process.env.OPENAI_MODEL?.trim() || undefined,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
      model: process.env.GEMINI_MODEL?.trim() || undefined,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
      model: process.env.ANTHROPIC_MODEL?.trim() || undefined,
    },
    local: {
      model: process.env.LOCAL_AI_MODEL?.trim() || undefined,
    },
  },
};
