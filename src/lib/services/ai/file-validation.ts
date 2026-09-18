import { badRequest } from "@/lib/api/errors"
import { AI_ALLOWED_EXTENSIONS, AI_ALLOWED_MIME_TYPES, aiConfig } from "./config"

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".")
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : ""
}

export function assertAiExtractableFileSpec(input: {
  fileName: string
  mimeType: string
  sizeBytes?: number
}) {
  if (!input.fileName || input.fileName.trim().length === 0) {
    throw badRequest("File name is required", "missing_file_name")
  }

  if (!AI_ALLOWED_MIME_TYPES.includes(input.mimeType as (typeof AI_ALLOWED_MIME_TYPES)[number])) {
    throw badRequest(
      `Unsupported file type: ${input.mimeType || "unknown"}`,
      "unsupported_file_type"
    )
  }

  const extension = getFileExtension(input.fileName)
  if (!AI_ALLOWED_EXTENSIONS.includes(extension as (typeof AI_ALLOWED_EXTENSIONS)[number])) {
    throw badRequest(
      `Unsupported file extension: ${extension || "none"}`,
      "unsupported_file_extension"
    )
  }

  if (typeof input.sizeBytes === "number" && input.sizeBytes > aiConfig.maxFileSizeBytes) {
    throw badRequest(
      `File exceeds maximum size of ${Math.floor(aiConfig.maxFileSizeBytes / (1024 * 1024))}MB`,
      "file_too_large"
    )
  }
}
