import type { ApiAuthContext } from "@/lib/api/auth-context"
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors"
import { getBooleanParam, getStringParam } from "@/lib/api/query"
import type {
  CreateDigitalReceiptDraftInput,
  IssueDigitalReceiptInput,
  ListDigitalReceiptsFilters,
  ReissueDigitalReceiptAccessInput,
  RevokeDigitalReceiptAccessInput,
  RevokeDigitalReceiptInput,
} from "@/lib/digital-receipts"
import { isDigitalReceiptDomainError } from "@/lib/digital-receipts"

export const DIGITAL_RECEIPT_MUTATION_ROLES = ["admin", "coordinator", "operator"] as const

export function buildDigitalReceiptActor(ctx: ApiAuthContext) {
  return {
    actorUserId: ctx.actorUserId,
    actorRole: ctx.role,
  }
}

export async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const raw = await request.text()
    if (raw.trim().length === 0) {
      return {}
    }

    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body")
  }
}

export function getDigitalReceiptListFilters(request: Request, companyId: string): ListDigitalReceiptsFilters {
  const searchParams = new URL(request.url).searchParams

  return {
    companyId,
    surgeryId: getStringParam(searchParams, "surgeryId"),
    receiptId: getStringParam(searchParams, "receiptId"),
    status: getStringParam(searchParams, "status"),
    accessStatus: getStringParam(searchParams, "accessStatus"),
    signerRole: getStringParam(searchParams, "signerRole"),
    activeOnly: getBooleanParam(searchParams, "activeOnly"),
    query: getStringParam(searchParams, "query"),
    issuedFrom: getStringParam(searchParams, "issuedFrom"),
    issuedTo: getStringParam(searchParams, "issuedTo"),
  } as ListDigitalReceiptsFilters
}

export function buildCreateDraftInput(
  body: Record<string, unknown>,
  companyId: string,
  actor: ReturnType<typeof buildDigitalReceiptActor>
): CreateDigitalReceiptDraftInput {
  return {
    ...(body as unknown as CreateDigitalReceiptDraftInput),
    companyId,
    metadata: {
      ...(typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {}),
      actor,
    },
  }
}

export function buildIssueInput(
  body: Record<string, unknown>,
  companyId: string,
  receiptId: string,
  actor: ReturnType<typeof buildDigitalReceiptActor>
): IssueDigitalReceiptInput {
  return {
    ...(body as unknown as IssueDigitalReceiptInput),
    companyId,
    receiptId,
    actor,
  }
}

export function buildReissueAccessInput(
  body: Record<string, unknown>,
  companyId: string,
  receiptId: string,
  actor: ReturnType<typeof buildDigitalReceiptActor>
): ReissueDigitalReceiptAccessInput {
  return {
    ...(body as unknown as ReissueDigitalReceiptAccessInput),
    companyId,
    receiptId,
    actor,
  }
}

export function buildRevokeReceiptInput(
  body: Record<string, unknown>,
  companyId: string,
  receiptId: string,
  actor: ReturnType<typeof buildDigitalReceiptActor>
): RevokeDigitalReceiptInput {
  return {
    ...(body as unknown as RevokeDigitalReceiptInput),
    companyId,
    receiptId,
    actor,
  }
}

export function buildRevokeAccessInput(
  body: Record<string, unknown>,
  companyId: string,
  receiptId: string,
  accessId: string,
  actor: ReturnType<typeof buildDigitalReceiptActor>
): RevokeDigitalReceiptAccessInput {
  return {
    ...(body as unknown as RevokeDigitalReceiptAccessInput),
    companyId,
    receiptId,
    accessId,
    actor,
  }
}

export function toDigitalReceiptApiError(error: unknown) {
  if (!isDigitalReceiptDomainError(error)) {
    return error
  }

  switch (error.code) {
    case "digital_receipt_not_found":
    case "digital_receipt_surgery_not_found":
    case "digital_receipt_access_not_found":
    case "digital_receipt_snapshot_missing":
    case "digital_receipt_artifact_missing":
      return notFound(error.message, error.code)
    case "digital_receipt_access_denied":
      return forbidden(error.message, error.code)
    case "digital_receipt_invalid_status_transition":
    case "digital_receipt_already_signed":
    case "digital_receipt_already_expired":
    case "digital_receipt_already_revoked":
    case "digital_receipt_access_consumed":
    case "digital_receipt_access_expired":
    case "digital_receipt_access_revoked":
      return conflict(error.message, error.code)
    case "digital_receipt_signer_mismatch":
    case "digital_receipt_signer_missing":
    case "digital_receipt_invalid_signer_role":
    case "digital_receipt_access_token_invalid":
    case "digital_receipt_event_invalid":
      return badRequest(error.message, error.code)
    default:
      return badRequest(error.message, error.code)
  }
}
