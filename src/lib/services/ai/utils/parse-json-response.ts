const MARKDOWN_JSON_BLOCK_REGEX = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

function stripMarkdownFence(rawText: string): string {
  const trimmed = rawText.trim();
  const match = trimmed.match(MARKDOWN_JSON_BLOCK_REGEX);
  if (match?.[1]) {
    return match[1].trim();
  }

  return trimmed;
}

function extractFirstJsonObject(rawText: string): string {
  const text = rawText.trim();

  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (start === -1) {
      if (char === "{") {
        start = i;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new Error("No valid JSON object found in AI provider response");
}

export function parseJsonResponse(rawText: string): unknown {
  const withoutFence = stripMarkdownFence(rawText);

  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const jsonObject = extractFirstJsonObject(withoutFence);
    return JSON.parse(jsonObject) as unknown;
  }
}

export function toRawTextPreview(rawText: string, maxLength = 500): string {
  const trimmed = rawText.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}…`;
}
