import { ApiError } from "@/lib/api/errors"

const AZURE_MAX_FILE_BYTES = 4_000_000
const AZURE_SUPPORTED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/bmp"])
const MAX_OCR_TEXT_CHARS = 100_000
const MAX_TABLES = 20
const MAX_CELLS_PER_TABLE = 2_000
const AZURE_FETCH_TIMEOUT_MS = 15_000
const AZURE_OPERATION_TIMEOUT_MS = 90_000

function signatureMatches(bytes: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-"
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  if (mimeType === "image/bmp") return bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d
  return false
}

type AzureOperation = {
  status?: "notStarted" | "running" | "succeeded" | "failed" | "skipped"
  error?: { code?: string }
  analyzeResult?: unknown
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new ApiError(501, "azure_document_intelligence_not_configured", `Missing Azure Document Intelligence configuration: ${name}`)
  return value
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function fetchAzure(input: string, init: RequestInit = {}, timeoutMs = AZURE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, redirect: "manual", signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "azure_request_timeout", "Azure request timed out")
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function assertTrustedOperationLocation(endpoint: string, operationLocation: string) {
  const endpointUrl = new URL(endpoint)
  const operationUrl = new URL(operationLocation)
  if (operationUrl.protocol !== "https:" || operationUrl.origin !== endpointUrl.origin) {
    throw new ApiError(502, "azure_untrusted_operation_location", "Azure returned an invalid operation location")
  }
  return operationUrl.toString()
}

function serializeTables(analyzeResult: Record<string, unknown>) {
  const tables = Array.isArray(analyzeResult.tables) ? analyzeResult.tables.slice(0, MAX_TABLES) : []
  return tables.map((rawTable, tableIndex) => {
    const table = asRecord(rawTable)
    const cells = Array.isArray(table?.cells) ? table.cells.slice(0, MAX_CELLS_PER_TABLE) : []
    const rows = new Map<number, Map<number, string>>()
    for (const rawCell of cells) {
      const cell = asRecord(rawCell)
      if (typeof cell?.rowIndex !== "number" || typeof cell.columnIndex !== "number" || typeof cell.content !== "string") continue
      const row = rows.get(cell.rowIndex) ?? new Map<number, string>()
      row.set(cell.columnIndex, cell.content.trim())
      rows.set(cell.rowIndex, row)
    }
    const lines = [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, row]) => [...row.entries()].sort(([a], [b]) => a - b).map(([, value]) => value).join(" | "))
    return lines.length > 0 ? `TABLE ${tableIndex + 1}:\n${lines.join("\n")}` : ""
  }).filter(Boolean).join("\n\n")
}

function toNormalizationText(operation: AzureOperation) {
  const analyzeResult = asRecord(operation.analyzeResult)
  if (!analyzeResult) throw new ApiError(502, "azure_missing_analyze_result", "Azure response omitted analyzeResult")
  const content = typeof analyzeResult.content === "string" ? analyzeResult.content.trim() : ""
  const tables = serializeTables(analyzeResult)
  const text = [content, tables].filter(Boolean).join("\n\n").slice(0, MAX_OCR_TEXT_CHARS)
  if (!text) throw new ApiError(422, "azure_no_text_detected", "Azure did not detect readable text")
  return text
}

export async function readAuthorizationWithAzure(input: { buffer: Buffer; mimeType: string }) {
  if (input.buffer.byteLength <= 0) throw new ApiError(400, "empty_document", "The document is empty")
  if (input.buffer.byteLength > AZURE_MAX_FILE_BYTES) throw new ApiError(400, "azure_document_too_large", "Azure accepts documents up to 4 MB in this DEV flow")
  if (!AZURE_SUPPORTED_MIME_TYPES.has(input.mimeType)) throw new ApiError(400, "azure_unsupported_file_type", "Azure accepts PDF, JPEG, PNG, or BMP in this flow")
  if (!signatureMatches(input.buffer, input.mimeType)) throw new ApiError(400, "azure_invalid_document_signature", "The document content does not match its declared type")

  const endpoint = required("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT").replace(/\/$/, "")
  const endpointUrl = new URL(endpoint)
  if (endpointUrl.protocol !== "https:") {
    throw new ApiError(500, "azure_insecure_endpoint", "Azure Document Intelligence endpoint must use HTTPS")
  }
  const apiKey = required("AZURE_DOCUMENT_INTELLIGENCE_API_KEY")
  const apiVersion = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION?.trim() || "2024-11-30"
  const deadline = Date.now() + AZURE_OPERATION_TIMEOUT_MS
  const remainingFetchTime = () => Math.max(1, Math.min(AZURE_FETCH_TIMEOUT_MS, deadline - Date.now()))
  const response = await fetchAzure(`${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${apiVersion}`, {
    method: "POST",
    headers: { "Content-Type": input.mimeType, "Ocp-Apim-Subscription-Key": apiKey },
    body: new Uint8Array(input.buffer) as BodyInit,
  }, remainingFetchTime())
  if (response.status !== 202) throw new ApiError(502, "azure_analysis_failed", `Azure analysis request failed with status ${response.status}`)
  const location = response.headers.get("operation-location")
  if (!location) throw new ApiError(502, "azure_missing_operation_location", "Azure response omitted operation-location")
  const operationLocation = assertTrustedOperationLocation(endpoint, location)

  while (Date.now() < deadline) {
    const remainingDelay = deadline - Date.now()
    if (remainingDelay <= 0) break
    await delay(Math.min(1_500, remainingDelay))
    if (Date.now() >= deadline) break
    let poll: Response
    try {
      poll = await fetchAzure(
        operationLocation,
        { headers: { "Ocp-Apim-Subscription-Key": apiKey } },
        remainingFetchTime()
      )
    } catch (error) {
      if (error instanceof ApiError && error.code === "azure_request_timeout" && Date.now() >= deadline) break
      throw error
    }
    if (poll.status === 429 || poll.status >= 500) continue
    if (!poll.ok) throw new ApiError(502, "azure_polling_failed", `Azure polling failed with status ${poll.status}`)
    const operation = await poll.json() as AzureOperation
    if (operation.status === "succeeded") return toNormalizationText(operation)
    if (operation.status === "failed") throw new ApiError(422, "azure_document_rejected", `Azure analysis failed (${operation.error?.code ?? "unknown"})`)
  }
  throw new ApiError(504, "azure_analysis_timeout", "Azure analysis timed out")
}
