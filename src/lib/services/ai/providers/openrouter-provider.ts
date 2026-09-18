import { ApiError } from "@/lib/api/errors";

import { aiConfig } from "../config";
import type {
  AIExtractionProvider,
  AIProviderRequest,
  AIProviderResponse,
} from "../types";

type OpenRouterMessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    }
  | {
      type: "file";
      file: {
        filename: string;
        file_data: string;
      };
    };

type OpenRouterChoiceContentPart =
  | string
  | {
      type?: string;
      text?: string;
    };

type OpenRouterResponseShape = {
  choices?: Array<{
    message?: {
      content?: string | OpenRouterChoiceContentPart[];
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

function getOpenRouterConfig() {
  const config = aiConfig.providers.openrouter;

  if (!config.apiKey) {
    throw new ApiError(
      501,
      "openrouter_api_key_missing",
      "OpenRouter API key is not configured."
    );
  }

  const model = aiConfig.model || config.model;
  if (!model) {
    throw new ApiError(
      501,
      "openrouter_model_missing",
      "OpenRouter model is not configured."
    );
  }

  if (!config.baseUrl) {
    throw new ApiError(
      500,
      "openrouter_base_url_missing",
      "OpenRouter base URL is not configured."
    );
  }

  return {
    apiKey: config.apiKey,
    model,
    baseUrl: config.baseUrl,
    pdfEngine: config.pdfEngine || "cloudflare-ai",
  };
}

function buildDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function buildFilePart(request: AIProviderRequest): {
  part: OpenRouterMessageContentPart;
  warning?: string;
  plugins?: Array<{
    id: string;
    pdf: { engine: string };
  }>;
} {
  const { buffer, mimeType, fileName } = request.file;

  if (mimeType === "application/pdf") {
    const { pdfEngine } = getOpenRouterConfig();
    return {
      part: {
        type: "file",
        file: {
          filename: fileName?.trim() || "autorizacion.pdf",
          file_data: buildDataUrl(buffer, mimeType),
        },
      },
      plugins: [
        {
          id: "file-parser",
          pdf: { engine: pdfEngine },
        },
      ],
    };
  }

  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "image/bmp"
  ) {
    return {
      part: {
        type: "image_url",
        image_url: {
          url: buildDataUrl(buffer, mimeType),
        },
      },
      warning:
        mimeType === "image/bmp"
          ? "BMP support may vary by model/provider on OpenRouter."
          : undefined,
    };
  }

  throw new ApiError(
    400,
    "openrouter_unsupported_file_type",
    `OpenRouter provider does not support mime type: ${mimeType}`
  );
}

function extractContentFromArray(parts: OpenRouterChoiceContentPart[]): string {
  const text = parts
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("\n")
    .trim();

  if (!text) {
    throw new ApiError(
      502,
      "openrouter_missing_content",
      "OpenRouter response did not include readable message content."
    );
  }

  return text;
}

function extractRawText(responseBody: OpenRouterResponseShape): string {
  const choice = responseBody.choices?.[0];

  if (!choice) {
    throw new ApiError(
      502,
      "openrouter_missing_choices",
      "OpenRouter response did not include choices."
    );
  }

  const content = choice.message?.content;

  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new ApiError(
        502,
        "openrouter_empty_content",
        "OpenRouter response content was empty."
      );
    }

    return trimmed;
  }

  if (Array.isArray(content)) {
    return extractContentFromArray(content);
  }

  throw new ApiError(
    502,
    "openrouter_missing_content",
    "OpenRouter response did not include message content."
  );
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as OpenRouterResponseShape;
    const message = body.error?.message?.trim();
    if (message) {
      return message;
    }
  } catch {
    // ignore parse errors, use status text fallback below
  }

  return response.statusText || "OpenRouter request failed";
}

export const openrouterProvider: AIExtractionProvider = {
  name: "openrouter",
  capability: {
    vision: true,
    pdfDirect: true,
    jsonMode: false,
    maxFileSizeMb: 20,
  },
  async extract(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startedAt = Date.now();
    const { apiKey, baseUrl, model } = getOpenRouterConfig();
    const { part, warning, plugins } = buildFilePart(request);

    const content: OpenRouterMessageContentPart[] = [
      {
        type: "text",
        text: request.prompt,
      },
      part,
    ];

    const payload: Record<string, unknown> = {
      model: request.model || model,
      messages: [
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.1,
      stream: false,
    };

    if (plugins && plugins.length > 0) {
      payload.plugins = plugins;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new ApiError(
          response.status,
          "openrouter_http_error",
          `OpenRouter request failed: ${message}`
        );
      }

      const responseBody = (await response.json()) as OpenRouterResponseShape;
      const rawText = extractRawText(responseBody);
      const durationMs = Date.now() - startedAt;

      return {
        provider: this.name,
        rawText,
        durationMs,
        warnings: warning ? [warning] : [],
        usage: {
          promptTokens: responseBody.usage?.prompt_tokens,
          completionTokens: responseBody.usage?.completion_tokens,
          totalTokens: responseBody.usage?.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(
          504,
          "openrouter_timeout",
          "OpenRouter request timed out."
        );
      }

      throw new ApiError(
        502,
        "openrouter_request_failed",
        error instanceof Error
          ? `OpenRouter request failed: ${error.message}`
          : "OpenRouter request failed"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
