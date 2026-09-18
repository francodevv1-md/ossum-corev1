import type {
  DigitalReceiptAccess,
  DigitalReceiptAccessStatus,
  DigitalReceiptActorRef,
  DigitalReceiptAggregate,
  DigitalReceiptDeliveryChannel,
  DigitalReceiptSignerRole,
  DigitalReceiptStatus,
} from "./types"

export type DigitalReceiptDraftSignerInput = {
  signerId: string
  role: DigitalReceiptSignerRole
  displayName: string
  documentNumber?: string
  email?: string
  relationshipLabel?: string
}

export type CreateDigitalReceiptDraftInput = {
  companyId: string
  surgeryId: string
  concept: string
  amount: number
  currentSignerRole: DigitalReceiptSignerRole
  signers: DigitalReceiptDraftSignerInput[]
  expiresAt?: string
  metadata?: Record<string, unknown>
}

export type IssueDigitalReceiptInput = {
  companyId: string
  receiptId: string
  signerRole?: DigitalReceiptSignerRole
  signerId?: string
  expiresAt?: string
  channel?: DigitalReceiptDeliveryChannel
  recipientEmail?: string
  recipientPhone?: string
  actor?: DigitalReceiptActorRef
  metadata?: Record<string, unknown>
}

export type RevokeDigitalReceiptInput = {
  companyId: string
  receiptId: string
  reason?: string
  actor?: DigitalReceiptActorRef
  metadata?: Record<string, unknown>
}

export type RevokeDigitalReceiptAccessInput = {
  companyId: string
  receiptId: string
  accessId: string
  reason?: string
  actor?: DigitalReceiptActorRef
  metadata?: Record<string, unknown>
}

export type ReissueDigitalReceiptAccessInput = {
  companyId: string
  receiptId: string
  signerRole: DigitalReceiptSignerRole
  signerId?: string
  expiresAt?: string
  channel?: DigitalReceiptDeliveryChannel
  recipientEmail?: string
  recipientPhone?: string
  actor?: DigitalReceiptActorRef
  metadata?: Record<string, unknown>
}

export type ListDigitalReceiptsFilters = {
  companyId: string
  surgeryId?: string
  receiptId?: string
  status?: DigitalReceiptStatus
  accessStatus?: DigitalReceiptAccessStatus
  signerRole?: DigitalReceiptSignerRole
  activeOnly?: boolean
  query?: string
  issuedFrom?: string
  issuedTo?: string
}

export type DigitalReceiptDetailResponseBase = DigitalReceiptAggregate

export type DigitalReceiptAccessContext = Pick<
  DigitalReceiptAccess,
  "accessId" | "receiptId" | "status" | "signerRole" | "signerId" | "issuedAt" | "expiredAt" | "revokedAt"
>
