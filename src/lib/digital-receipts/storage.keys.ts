import path from "node:path"

import type { DigitalReceiptArtifactStorageKeyInput } from "./storage.types"

export const DIGITAL_RECEIPT_R2_KEY_PREFIX = "digital-receipts"

function sanitizeSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function normalizeExtension(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return undefined
  }

  const ext = trimmed.startsWith(".") ? trimmed : `.${trimmed}`
  return /^[.][a-z0-9]+$/.test(ext) ? ext : undefined
}

function resolveExtension(input: DigitalReceiptArtifactStorageKeyInput) {
  const fromInput = normalizeExtension(input.extension)
  if (fromInput) {
    return fromInput
  }

  const fromFileName = normalizeExtension(path.extname(input.fileName ?? ""))
  return fromFileName
}

function resolveArtifactLeafName(input: DigitalReceiptArtifactStorageKeyInput) {
  const extension = resolveExtension(input)
  const artifactId = sanitizeSegment(input.artifactId ?? "artifact") || "artifact"
  const fileBaseName = sanitizeSegment(path.basename(input.fileName ?? "", path.extname(input.fileName ?? "")))
  const suffix = fileBaseName && fileBaseName !== artifactId ? `-${fileBaseName}` : ""

  return `${artifactId}${suffix}${extension ?? ""}`
}

export function buildDigitalReceiptArtifactObjectKey(input: DigitalReceiptArtifactStorageKeyInput) {
  const segments = [
    DIGITAL_RECEIPT_R2_KEY_PREFIX,
    sanitizeSegment(input.companyId) || "company",
    sanitizeSegment(input.surgeryId) || "surgery",
    sanitizeSegment(input.receiptId) || "receipt",
    sanitizeSegment(input.artifactType) || "artifact",
  ]

  const snapshotId = sanitizeSegment(input.snapshotId ?? "")
  const accessId = sanitizeSegment(input.accessId ?? "")

  if (snapshotId) {
    segments.push(`snapshot-${snapshotId}`)
  }

  if (accessId) {
    segments.push(`access-${accessId}`)
  }

  segments.push(resolveArtifactLeafName(input))

  return segments.join("/")
}
