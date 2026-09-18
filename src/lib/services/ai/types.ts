export const AI_PROVIDER_NAMES = [
  "mock",
  "openrouter",
  "openai",
  "gemini",
  "anthropic",
  "local",
] as const;

export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number];

export interface ExtractAutorizacionInput {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  mode?: string;
  metadata?: {
    companyId?: string;
    actorUserId?: string;
    source?: string;
  };
}

export interface AIProviderCapability {
  vision: boolean;
  pdfDirect: boolean;
  jsonMode: boolean;
  maxFileSizeMb?: number;
}

export interface AIProviderRequest {
  file: {
    buffer: Buffer;
    mimeType: string;
    fileName?: string;
  };
  prompt: string;
  timeoutMs: number;
  model?: string;
  metadata?: {
    companyId?: string;
    actorUserId?: string;
    source?: string;
  };
}

export interface AIProviderUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIProviderResponse {
  provider: string;
  rawText: string;
  durationMs?: number;
  warnings?: string[];
  usage?: AIProviderUsage;
}

export interface AIProviderRuntimeConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  pdfEngine?: string;
}

export interface AIProviderConfig {
  provider: AIProviderName;
  model?: string;
  timeoutMs: number;
  maxFileSizeBytes: number;
  confidenceThreshold: number;
  providers: Record<AIProviderName, AIProviderRuntimeConfig>;
}

export interface AIExtractionProvider {
  readonly name: AIProviderName;
  readonly capability: AIProviderCapability;
  extract(request: AIProviderRequest): Promise<AIProviderResponse>;
}
