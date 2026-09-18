export function getMailStage1Provider(): string {
  return process.env.MAIL_PROVIDER === "gmail" ? "gmail" : "mock-mailbox"
}
export const MAIL_STAGE1_PROVIDER = getMailStage1Provider()
export const MAIL_STAGE1_MAILBOX = "sistemas@districorr.com.ar"

export type MailStage1ConversationState =
  | "idle"
  | "attaching"
  | "attach_success"
  | "attach_failure"
  | "refreshing"
  | "refresh_success"
  | "refresh_failure"

export type MailStage1AttachmentState =
  | "metadata_only"
  | "selected"
  | "persisting"
  | "stored"
  | "persist_failed"

export type MailStage1RefreshStatus = "idle" | "success" | "failed"

export type MailStage1LinkEventType =
  | "linked"
  | "unlinked"
  | "refresh_requested"
  | "refresh_succeeded"
  | "refresh_failed"
  | "attachment_persisted"
  | "attachment_persist_failed"

export type MailStage1Actor = {
  actorUserId: string
  role: string
}

export type MailAttachmentRecord = {
  attachmentId: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  providerAttachmentRef: string
  contentDisposition?: string
  contentId?: string
  persistenceState: MailStage1AttachmentState
  isCriticalSelected: boolean
  storedFileRef?: string
  lastPersistenceError?: string
}

export type MailAttachmentDisplayKind = "case_document" | "embedded_asset"

export function isMailAttachmentEvidence(
  attachment: Pick<MailAttachmentRecord, "isCriticalSelected" | "persistenceState">
) {
  return attachment.isCriticalSelected || attachment.persistenceState === "stored"
}

export function classifyMailAttachment(
  attachment: Pick<MailAttachmentRecord, "fileName" | "mimeType" | "isCriticalSelected" | "persistenceState">
  & Partial<Pick<MailAttachmentRecord, "contentDisposition" | "contentId">>
  & { totalAttachments?: number }
): MailAttachmentDisplayKind {
  const normalizedName = attachment.fileName.trim().toLowerCase()
  const normalizedMimeType = attachment.mimeType.trim().toLowerCase()
  const normalizedDisposition = attachment.contentDisposition?.trim().toLowerCase() ?? ""
  const hasContentId = Boolean(attachment.contentId?.trim())

  if (attachment.totalAttachments === 1 || isMailAttachmentEvidence(attachment)) {
    return "case_document"
  }

  if (normalizedDisposition.includes("inline") || hasContentId) {
    return "embedded_asset"
  }

  if (/^image00\d+\.(png|jpg|jpeg|gif|webp)$/.test(normalizedName)) {
    return "embedded_asset"
  }

  const genericImageName = /^(image|logo|firma|signature)(?:[\s._-]?\d+)?(?:\.[a-z0-9]+)?$/

  if (normalizedMimeType.startsWith("image/") && genericImageName.test(normalizedName)) {
    return "embedded_asset"
  }

  return "case_document"
}

export type MailConversationSnapshotRecord = {
  conversationKey: string
  provider: string
  mailbox: string
  externalConversationId: string
  externalThreadId?: string
  subject: string
  participants: Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }>
  messageCount: number
  latestMessageAt: string
  importedAt: string
  refreshedAt?: string
  refreshStatus: MailStage1RefreshStatus
  messages: Array<{
    id: string
    sentAt: string
    from: string
    to: string[]
    cc: string[]
    snippet: string
    bodyText?: string
    bodyHtml?: string
  }>
  attachments: MailAttachmentRecord[]
}

export type MailConversationLinkEvent = {
  type: MailStage1LinkEventType
  at: string
  actorUserId: string
  actorRole?: string
  detail?: string
}

export type MailConversationLinkRecord = {
  linkId: string
  companyId: string
  surgeryId: string
  surgeryLabel: string
  conversationKey: string
  linkedAt: string
  linkedByUserId: string
  linkStatus: "active" | "unlinked"
  warningAcknowledged: boolean
  crossLinkReason?: string
  knownLinkedSurgeryIdsAtLinkTime: string[]
  eventLog: MailConversationLinkEvent[]
  eventCount: number
}

export type MailStage1CompanyDocument = {
  version: 1
  companyId: string
  conversations: Record<string, MailConversationSnapshotRecord>
  links: Record<string, MailConversationLinkRecord>
}

export type MailStage1Permissions = {
  role: string
  canView: boolean
  canAttach: boolean
  canRefresh: boolean
  canPersistAttachments: boolean
  canUnlink: boolean
  viewAudienceLabels: string[]
  mutationAudienceLabels: string[]
}

export type MailLinkedSurgerySummary = {
  surgeryId: string
  surgeryLabel: string
  linkedAt: string
  crossLinkReason?: string
}

export type MailLinkedConversationView = {
  linkId: string
  conversationKey: string
  externalConversationId: string
  subject: string
  participants: Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }>
  participantsSummary: string
  messageCount: number
  latestMessageAt: string
  importedAt: string
  refreshedAt?: string
  refreshStatus: MailStage1RefreshStatus
  conversationState: MailStage1ConversationState
  lastOperationMessage?: string
  linkedSurgeries: MailLinkedSurgerySummary[]
  messages: MailConversationSnapshotRecord["messages"]
  attachments: MailAttachmentRecord[]
  attachmentCount: number
  storedAttachmentCount: number
  selectedAttachmentCount: number
  eventLog: MailConversationLinkEvent[]
  eventCount: number
}

export type MailStage1ListResponse = {
  mailbox: string
  surgeryId: string
  permissions: MailStage1Permissions
  conversations: MailLinkedConversationView[]
}

export type MailboxConversationBrowseItem = {
  conversationKey: string
  externalConversationId: string
  subject: string
  participantsSummary: string
  participants: Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }>
  latestMessageAt: string
  messageCount: number
  previewSnippet: string
  latestMessageBodyText?: string
  attachments: MailAttachmentRecord[]
  linkedSurgeries: MailLinkedSurgerySummary[]
  alreadyLinkedToCurrentSurgery: boolean
  /** Whether a local snapshot already exists for this conversation. */
  hasLocalSnapshot: boolean
}

export type MailStage1BrowseResponse = {
  mailbox: string
  permissions: MailStage1Permissions
  conversations: MailboxConversationBrowseItem[]
}

export type MailAttachmentTextExtractionResult = {
  attachmentId: string
  fileName: string
  mimeType: string
  text: string
  provider: string
  confidence: number
  looksLikeAuthorization: boolean
  warnings: string[]
}

export type AttachConversationInput = {
  externalConversationId: string
  surgeryLabel: string
  warningAcknowledged?: boolean
  crossLinkReason?: string
  criticalAttachmentIds?: string[]
}

export type PersistCriticalAttachmentsInput = {
  attachmentIds: string[]
}

export function buildConversationKey(externalConversationId: string) {
  return `${getMailStage1Provider()}::${MAIL_STAGE1_MAILBOX}::${externalConversationId}`
}

export function formatParticipantsSummary(
  participants: Array<{ name?: string; email: string; role?: "from" | "to" | "cc" }>
) {
  const unique = participants.map((participant) => participant.name?.trim() || participant.email)
  return unique.join(" · ")
}
