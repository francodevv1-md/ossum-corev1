import { ApiError } from "@/lib/api/errors";

import { mockProvider } from "../providers/mock-provider";
import { openaiProvider } from "../providers/openai-provider";
import { openrouterProvider } from "../providers/openrouter-provider";
import type { AIExtractionProvider, AIProviderName } from "../types";

const REGISTERED_AI_PROVIDERS: Partial<Record<AIProviderName, AIExtractionProvider>> = {
  mock: mockProvider,
  openai: openaiProvider,
  openrouter: openrouterProvider,
};

export function getAIProvider(name: AIProviderName): AIExtractionProvider {
  const provider = REGISTERED_AI_PROVIDERS[name];

  if (!provider) {
    throw new ApiError(
      501,
      "ai_provider_not_implemented",
      `AI provider "${name}" is not implemented yet.`
    );
  }

  return provider;
}

export function listRegisteredAIProviders(): AIProviderName[] {
  return Object.keys(REGISTERED_AI_PROVIDERS) as AIProviderName[];
}
