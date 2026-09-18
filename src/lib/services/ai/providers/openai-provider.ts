import { ApiError } from "@/lib/api/errors";

import { aiConfig } from "../config";
import type {
  AIExtractionProvider,
  AIProviderRequest,
  AIProviderResponse,
} from "../types";

/**
 * OpenAI provider for autorización extraction.
 *
 * A-Q1 compliance:
 * - ZDR: `store: false` in every request prevents OpenAI from retaining the call
 *   (reinforces the "API call logging: Disabled" org setting).
 * - DPA: relies on the org-level Data Processing Agreement accepted by the account
 *   owner. The provider does NOT send data if the API key is missing.
 *
 * No SDK dependency — uses fetch directly to https://api.openai.com/v1/chat/completions,
 * same pattern as openrouter-provider (no new deps, AGENTS.md §11 compliant).
 *
 * Supports:
 * - Images (JPEG/PNG/WebP/BMP) via `image_url` content part (GPT-4o Vision).
 * - PDF via `file` content part with base64 `file_data` (official OpenAI doc,
 *   https://developers.openai.com/api/docs/guides/pdf-files).
 * - Structured JSON via `response_format: { type: "json_object" }` — guarantees
 *   valid JSON, eliminates the "No valid JSON object found" parse error.
 */

type OpenAIMessageContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string };
    }
  | {
      type: "file";
      file: { filename: string; file_data: string };
    };

type OpenAIChoiceContentPart = string | { type?: string; text?: string };

type OpenAIResponseShape = {
  choices?: Array<{
    message?: {
      content?: string | OpenAIChoiceContentPart[];
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

const OPENAI_DEFAULT_MODEL = "gpt-4o";
const OPENAI_BASE_URL = "https://api.openai.com/v1/chat/completions";
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"] as const;

function getOpenAIConfig() {
  const config = aiConfig.providers.openai;

  if (!config.apiKey) {
    throw new ApiError(
      501,
      "openai_api_key_missing",
      "OpenAI API key is not configured. Set OPENAI_API_KEY in your environment."
    );
  }

  const model = aiConfig.model || config.model || OPENAI_DEFAULT_MODEL;
  return { apiKey: config.apiKey, model };
}

function buildDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function buildFilePart(request: AIProviderRequest): {
  part: OpenAIMessageContentPart;
  warning?: string;
} {
  const { buffer, mimeType, fileName } = request.file;

  if (mimeType === "application/pdf") {
    return {
      part: {
        type: "file",
        file: {
          filename: fileName?.trim() || "autorizacion.pdf",
          file_data: buildDataUrl(buffer, mimeType),
        },
      },
    };
  }

  if (IMAGE_MIME_TYPES.includes(mimeType as (typeof IMAGE_MIME_TYPES)[number])) {
    return {
      part: {
        type: "image_url",
        image_url: {
          url: buildDataUrl(buffer, mimeType),
        },
      },
      warning:
        mimeType === "image/bmp"
          ? "BMP support may vary by OpenAI model; consider converting to PNG."
          : undefined,
    };
  }

  throw new ApiError(
    400,
    "openai_unsupported_file_type",
    `OpenAI provider does not support mime type: ${mimeType}`
  );
}

function extractContentFromArray(parts: OpenAIChoiceContentPart[]): string {
  const text = parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      return "";
    })
    .join("\n")
    .trim();

  if (!text) {
    throw new ApiError(
      502,
      "openai_missing_content",
      "OpenAI response did not include readable message content."
    );
  }

  return text;
}

function extractRawText(responseBody: OpenAIResponseShape): string {
  const choice = responseBody.choices?.[0];

  if (!choice) {
    throw new ApiError(
      502,
      "openai_missing_choices",
      "OpenAI response did not include choices."
    );
  }

  const content = choice.message?.content;

  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new ApiError(
        502,
        "openai_empty_content",
        "OpenAI response content was empty."
      );
    }
    return trimmed;
  }

  if (Array.isArray(content)) {
    return extractContentFromArray(content);
  }

  throw new ApiError(
    502,
    "openai_missing_content",
    "OpenAI response did not include message content."
  );
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as OpenAIResponseShape;
    const message = body.error?.message?.trim();
    if (message) return message;
  } catch {
    // ignore parse errors, fall back to status text
  }
  return response.statusText || "OpenAI request failed";
}

export const openaiProvider: AIExtractionProvider = {
  name: "openai",
  capability: {
    vision: true,
    pdfDirect: true,
    jsonMode: true,
    maxFileSizeMb: 20,
  },

  async extract(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startedAt = Date.now();
    const { apiKey, model } = getOpenAIConfig();
    const { part, warning } = buildFilePart(request);

    const content: OpenAIMessageContentPart[] = [
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
      // JSON guaranteed: OpenAI will always return a valid JSON object.
      // This eliminates the "No valid JSON object found" parse error.
      response_format: { type: "json_object" },
      // A-Q1 / ZDR: do not retain this call on OpenAI's side.
      // Reinforces the org-level "API call logging: Disabled" setting.
      store: false,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const response = await fetch(OPENAI_BASE_URL, {
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
          "openai_http_error",
          `OpenAI request failed: ${message}`
        );
      }

      const responseBody = (await response.json()) as OpenAIResponseShape;
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
      if (error instanceof ApiError) throw error;

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(504, "openai_timeout", "OpenAI request timed out.");
      }

      throw new ApiError(
        502,
        "openai_request_failed",
        error instanceof Error
          ? `OpenAI request failed: ${error.message}`
          : "OpenAI request failed"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
