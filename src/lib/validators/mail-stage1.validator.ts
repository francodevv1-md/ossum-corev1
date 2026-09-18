import { z } from "zod"
import { badRequest } from "@/lib/api/errors"
import { MAIL_STAGE1_MAILBOX } from "@/lib/mail-stage1/types"

const SURGERY_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

const browseQuerySchema = z.object({
  query: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const externalConversationIdSchema = z.string().trim().min(1).max(200)
const attachmentIdSchema = z.string().trim().min(1).max(200)

const attachSchema = z.object({
  externalConversationId: z.string().trim().min(1),
  surgeryLabel: z.string().trim().min(1).max(120),
  warningAcknowledged: z.boolean().optional(),
  crossLinkReason: z.string().trim().max(500).optional(),
  criticalAttachmentIds: z.array(z.string().trim().min(1)).max(10).optional(),
  mailbox: z.literal(MAIL_STAGE1_MAILBOX).optional(),
})

const refreshSchema = z.object({
  mailbox: z.literal(MAIL_STAGE1_MAILBOX).optional(),
})

const persistSchema = z.object({
  attachmentIds: z.array(z.string().trim().min(1)).min(1).max(10),
})

const authorizationImportSchema = z.object({
  content: z.string().trim().min(1),
  summary: z.string().optional(),
  attachmentIds: z.array(z.string().trim().min(1)).max(10).optional(),
}).strict()

const surgeryIdSchema = z.string().trim().min(1).regex(
  SURGERY_ID_PATTERN,
  "surgeryId contains invalid characters"
)

function parseWithSchema<T>(schema: z.ZodSchema<T>, input: unknown, fallbackCode: string): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message ?? "Invalid mail payload", fallbackCode)
  }

  return result.data
}

export function validateSurgeryId(surgeryId: unknown): string {
  return parseWithSchema(surgeryIdSchema, surgeryId, "mail_invalid_surgery_id")
}

export function validateListMailboxConversationsQuery(input: unknown) {
  return parseWithSchema(browseQuerySchema, input, "mail_invalid_browse_query")
}

export function validateExternalConversationId(value: unknown) {
  return parseWithSchema(externalConversationIdSchema, value, "mail_invalid_external_conversation_id")
}

export function validateAttachmentId(value: unknown) {
  return parseWithSchema(attachmentIdSchema, value, "mail_invalid_attachment_id")
}

export function validateAttachConversationInput(input: unknown) {
  const value = parseWithSchema(attachSchema, input, "mail_invalid_attach_payload")

  // Enforce: if warningAcknowledged is true, crossLinkReason must not be empty/whitespace
  const reason = value.crossLinkReason?.trim() || undefined
  if (value.warningAcknowledged === true && !reason) {
    throw badRequest(
      "Debe informar el motivo del multivínculo al confirmar la advertencia",
      "mail_cross_link_reason_required"
    )
  }

  return {
    ...value,
    criticalAttachmentIds: Array.from(new Set(value.criticalAttachmentIds ?? [])),
    crossLinkReason: reason,
  }
}

export function validateRefreshConversationInput(input: unknown) {
  return parseWithSchema(refreshSchema, input ?? {}, "mail_invalid_refresh_payload")
}

export function validatePersistCriticalAttachmentsInput(input: unknown) {
  const value = parseWithSchema(persistSchema, input, "mail_invalid_persist_payload")
  return {
    attachmentIds: Array.from(new Set(value.attachmentIds)),
  }
}

/**
 * Validates the closed client shape for Mail authorization imports. Mail
 * provenance is deliberately resolved server-side from the stored snapshot.
 */
export function validateMailAuthorizationImportInput(input: unknown) {
  const value = parseWithSchema(
    authorizationImportSchema,
    input,
    "mail_invalid_authorization_import_payload"
  )

  if (value.attachmentIds && new Set(value.attachmentIds).size !== value.attachmentIds.length) {
    throw badRequest(
      "Mail attachment IDs must be unique",
      "mail_attachment_not_found"
    )
  }

  return value
}
