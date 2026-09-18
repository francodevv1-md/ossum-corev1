import { randomUUID } from "node:crypto"
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors"
import { resolveMailStage1Permissions } from "./permissions"
import { getMailProvider } from "./provider/provider-factory"
import { mailStage1Repository } from "./repository"
import type { ProviderConversationSnapshot } from "./provider/types"
import type {
  AttachConversationInput,
  MailAttachmentRecord,
  MailConversationLinkEvent,
  MailConversationLinkRecord,
  MailConversationSnapshotRecord,
  MailLinkedConversationView,
  MailLinkedSurgerySummary,
  MailStage1Actor,
  MailStage1BrowseResponse,
  MailStage1CompanyDocument,
  MailStage1ConversationState,
  MailStage1ListResponse,
  PersistCriticalAttachmentsInput,
} from "./types"
import {
  MAIL_STAGE1_MAILBOX,
  buildConversationKey,
  formatParticipantsSummary,
} from "./types"

export type TrustedMailAuthorizationImportProvenance = {
  linkId: string
  conversationKey: string
  externalConversationId: string
  provider: string
  mailbox: string
  subject: string
  participantsSummary: string
  latestMessageAt: string
  messageCount: number
  attachmentCount: number
  importedAttachments: Array<{
    attachmentId: string
    fileName: string
    mimeType: string
    sizeBytes?: number
    persistenceState: MailAttachmentRecord["persistenceState"]
    storedFileRef?: string
  }>
}

function cloneCompanyDocument(document: MailStage1CompanyDocument): MailStage1CompanyDocument {
  return JSON.parse(JSON.stringify(document)) as MailStage1CompanyDocument
}

function ensureConversationSnapshot(
  existing: MailConversationSnapshotRecord | undefined,
  providerSnapshot: ProviderConversationSnapshot,
  mode: "attach" | "refresh"
): MailConversationSnapshotRecord {
  const preservedAttachments = new Map(
    (existing?.attachments ?? []).map((attachment) => [attachment.attachmentId, attachment])
  )

  const attachments: MailAttachmentRecord[] = providerSnapshot.attachments.map((attachment) => {
    const preserved = preservedAttachments.get(attachment.attachmentId)

    return {
      attachmentId: attachment.attachmentId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      providerAttachmentRef: attachment.providerAttachmentRef,
      contentDisposition: attachment.contentDisposition,
      contentId: attachment.contentId,
      persistenceState: preserved?.persistenceState ?? "metadata_only",
      isCriticalSelected: preserved?.isCriticalSelected ?? false,
      storedFileRef: preserved?.storedFileRef,
      lastPersistenceError: preserved?.lastPersistenceError,
    }
  })

  return {
    conversationKey: buildConversationKey(providerSnapshot.externalConversationId),
    provider: providerSnapshot.provider,
    mailbox: providerSnapshot.mailbox,
    externalConversationId: providerSnapshot.externalConversationId,
    externalThreadId: providerSnapshot.externalThreadId,
    subject: providerSnapshot.subject,
    participants: providerSnapshot.participants,
    messageCount: providerSnapshot.messages.length,
    latestMessageAt: providerSnapshot.latestMessageAt,
    importedAt: existing?.importedAt ?? new Date().toISOString(),
    refreshedAt: mode === "refresh" ? new Date().toISOString() : existing?.refreshedAt,
    refreshStatus: mode === "refresh" ? "success" : existing?.refreshStatus ?? "idle",
    messages: providerSnapshot.messages,
    attachments,
  }
}

function appendEvent(
  link: MailConversationLinkRecord,
  event: MailConversationLinkEvent
): MailConversationLinkRecord {
  return {
    ...link,
    eventLog: [...link.eventLog, event],
    eventCount: (link.eventCount ?? 0) + 1,
  }
}

function getLinkedSurgeries(
  document: MailStage1CompanyDocument,
  conversationKey: string
): MailLinkedSurgerySummary[] {
  return Object.values(document.links)
    .filter((link) => link.conversationKey === conversationKey && link.linkStatus === "active")
    .map((link) => ({
      surgeryId: link.surgeryId,
      surgeryLabel: link.surgeryLabel,
      linkedAt: link.linkedAt,
      crossLinkReason: link.crossLinkReason,
    }))
    .sort((a, b) => a.linkedAt.localeCompare(b.linkedAt))
}

function resolveConversationState(link: MailConversationLinkRecord): {
  state: MailStage1ConversationState
  message?: string
} {
  if (link.linkStatus === "unlinked") {
    return { state: "idle", message: "Conversación desvinculada" }
  }

  const lastEvent = [...link.eventLog].reverse()[0]

  switch (lastEvent?.type) {
    case "linked":
      return { state: "attach_success", message: "Conversación vinculada" }
    case "unlinked":
      return { state: "idle", message: lastEvent.detail ?? "Conversación desvinculada" }
    case "refresh_requested":
      return { state: "refreshing", message: "Actualizando snapshot" }
    case "refresh_succeeded":
      return { state: "refresh_success", message: lastEvent.detail ?? "Snapshot actualizado" }
    case "refresh_failed":
      return { state: "refresh_failure", message: lastEvent.detail ?? "Falló la actualización" }
    case "attachment_persisted":
      return { state: "idle", message: lastEvent.detail ?? "Evidencia guardada" }
    case "attachment_persist_failed":
      return { state: "idle", message: lastEvent.detail ?? "Falló el guardado de evidencia" }
    default:
      return { state: "idle" }
  }
}

function toLinkedConversationView(
  document: MailStage1CompanyDocument,
  link: MailConversationLinkRecord
): MailLinkedConversationView {
  const snapshot = document.conversations[link.conversationKey]

  if (!snapshot) {
    throw notFound("Stored mail snapshot not found", "mail_provider_snapshot_unavailable")
  }

  const resolvedState = resolveConversationState(link)

  return {
    linkId: link.linkId,
    conversationKey: snapshot.conversationKey,
    externalConversationId: snapshot.externalConversationId,
    subject: snapshot.subject,
    participants: snapshot.participants,
    participantsSummary: formatParticipantsSummary(snapshot.participants),
    messageCount: snapshot.messageCount,
    latestMessageAt: snapshot.latestMessageAt,
    importedAt: snapshot.importedAt,
    refreshedAt: snapshot.refreshedAt,
    refreshStatus: snapshot.refreshStatus,
    conversationState: resolvedState.state,
    lastOperationMessage: resolvedState.message,
    linkedSurgeries: getLinkedSurgeries(document, snapshot.conversationKey),
    messages: snapshot.messages,
    attachments: snapshot.attachments,
    attachmentCount: snapshot.attachments.length,
    storedAttachmentCount: snapshot.attachments.filter((attachment) => attachment.persistenceState === "stored").length,
    selectedAttachmentCount: snapshot.attachments.filter((attachment) => attachment.isCriticalSelected).length,
    eventLog: link.eventLog,
    eventCount: link.eventCount,
  }
}

function findLinkOrThrow(
  document: MailStage1CompanyDocument,
  surgeryId: string,
  linkId: string
): MailConversationLinkRecord {
  const link = document.links[linkId]

  if (!link || link.surgeryId !== surgeryId || link.linkStatus !== "active") {
    throw notFound("Mail link not found", "mail_link_not_found")
  }

  return link
}

function getPermissions(actor: MailStage1Actor) {
  return resolveMailStage1Permissions(actor.role)
}

function getCurrentSurgeryLinks(document: MailStage1CompanyDocument, surgeryId: string) {
  return Object.values(document.links)
    .filter((link) => link.surgeryId === surgeryId && link.linkStatus === "active")
    .sort((a, b) => b.linkedAt.localeCompare(a.linkedAt))
}

async function saveDocument(companyId: string, document: MailStage1CompanyDocument) {
  // Cross-company segregation: reject if document companyId doesn't match request companyId
  if (document.companyId !== companyId) {
    throw forbidden("Company document mismatch — cross-company access rejected", "mail_company_mismatch")
  }

  await mailStage1Repository.saveCompanyDocument(companyId, document)
  return document
}

export async function listLinkedConversations(
  companyId: string,
  surgeryId: string,
  actor: MailStage1Actor
): Promise<MailStage1ListResponse> {
  const document = await mailStage1Repository.getCompanyDocument(companyId)

  return {
    mailbox: MAIL_STAGE1_MAILBOX,
    surgeryId,
    permissions: getPermissions(actor),
    conversations: getCurrentSurgeryLinks(document, surgeryId).map((link) => toLinkedConversationView(document, link)),
  }
}

export async function browseMailboxConversations(
  companyId: string,
  surgeryId: string,
  actor: MailStage1Actor,
  query?: string,
  limit?: number
): Promise<MailStage1BrowseResponse> {
  const [document, conversations] = await Promise.all([
    mailStage1Repository.getCompanyDocument(companyId),
    getMailProvider().listMailboxConversations({ mailbox: MAIL_STAGE1_MAILBOX, query, limit, companyId }),
  ])

  return {
    mailbox: MAIL_STAGE1_MAILBOX,
    permissions: getPermissions(actor),
    conversations: conversations.map((conversation) => {
      const conversationKey = buildConversationKey(conversation.externalConversationId)
      const linkedSurgeries = getLinkedSurgeries(document, conversationKey)
      const hasLocalSnapshot = Boolean(document.conversations[conversationKey])

      return {
        conversationKey,
        externalConversationId: conversation.externalConversationId,
        subject: conversation.subject,
        participantsSummary: formatParticipantsSummary(conversation.participants),
        participants: conversation.participants,
        latestMessageAt: conversation.latestMessageAt,
        messageCount: conversation.messageCount,
        previewSnippet: conversation.previewSnippet,
        latestMessageBodyText: conversation.latestMessageBodyText,
        attachments: conversation.attachments.map((attachment) => ({
          attachmentId: attachment.attachmentId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          providerAttachmentRef: attachment.providerAttachmentRef,
          contentDisposition: attachment.contentDisposition,
          contentId: attachment.contentId,
          persistenceState: "metadata_only",
          isCriticalSelected: false,
        })),
        linkedSurgeries,
        alreadyLinkedToCurrentSurgery: linkedSurgeries.some((link) => link.surgeryId === surgeryId),
        hasLocalSnapshot,
      }
    }),
  }
}

/**
 * Resolves the only provenance that may be persisted by the Mail authorization
 * importer. This is intentionally read-only: it uses a company document,
 * active link, and stored snapshot only; it never calls the provider or saves.
 */
export async function resolveMailAuthorizationImportProvenance(
  companyId: string,
  surgeryId: string,
  linkId: string,
  attachmentIds: readonly string[] = []
): Promise<TrustedMailAuthorizationImportProvenance> {
  if (new Set(attachmentIds).size !== attachmentIds.length) {
    throw badRequest("Mail attachment IDs must be unique", "mail_attachment_not_found")
  }

  const document = await mailStage1Repository.getCompanyDocument(companyId)
  const link = document.links[linkId]

  if (
    !link ||
    link.companyId !== companyId ||
    link.surgeryId !== surgeryId ||
    link.linkStatus !== "active"
  ) {
    throw notFound("Mail link not found", "mail_link_not_found")
  }

  const snapshot = document.conversations[link.conversationKey]
  if (!snapshot) {
    throw notFound("Stored mail snapshot not found", "mail_provider_snapshot_unavailable")
  }

  const selectedAttachments = attachmentIds.map((attachmentId) => {
    const attachment = snapshot.attachments.find((item) => item.attachmentId === attachmentId)
    if (!attachment) {
      throw badRequest("Attachment not found in stored snapshot", "mail_attachment_not_found")
    }

    return {
      attachmentId: attachment.attachmentId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      ...(attachment.sizeBytes === undefined ? {} : { sizeBytes: attachment.sizeBytes }),
      persistenceState: attachment.persistenceState,
      ...(attachment.storedFileRef ? { storedFileRef: attachment.storedFileRef } : {}),
    }
  })

  return {
    linkId: link.linkId,
    conversationKey: snapshot.conversationKey,
    externalConversationId: snapshot.externalConversationId,
    provider: snapshot.provider,
    mailbox: snapshot.mailbox,
    subject: snapshot.subject,
    participantsSummary: formatParticipantsSummary(snapshot.participants),
    latestMessageAt: snapshot.latestMessageAt,
    messageCount: snapshot.messageCount,
    attachmentCount: snapshot.attachments.length,
    importedAttachments: selectedAttachments,
  }
}

export async function downloadMailboxAttachment(
  companyId: string,
  externalConversationId: string,
  attachmentId: string
): Promise<{ attachmentId: string; fileName: string; mimeType: string; sizeBytes?: number; buffer: Buffer }> {
  const provider = getMailProvider()
  const snapshot = await provider.getConversationSnapshot({
    mailbox: MAIL_STAGE1_MAILBOX,
    externalConversationId,
    companyId,
  })

  const attachment = snapshot.attachments.find((item) => item.attachmentId === attachmentId)

  if (!attachment) {
    throw notFound("Attachment not found in mailbox conversation", "mail_attachment_not_found")
  }

  const downloaded = await provider.downloadAttachment({
    mailbox: MAIL_STAGE1_MAILBOX,
    externalConversationId,
    providerAttachmentRef: attachment.providerAttachmentRef,
    companyId,
  })

  return {
    attachmentId: attachment.attachmentId,
    fileName: downloaded.fileName || attachment.fileName,
    mimeType: downloaded.mimeType || attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    buffer: downloaded.buffer,
  }
}

export async function attachConversationToSurgery(
  companyId: string,
  surgeryId: string,
  actor: MailStage1Actor,
  input: AttachConversationInput
): Promise<MailLinkedConversationView> {
  const document = cloneCompanyDocument(await mailStage1Repository.getCompanyDocument(companyId))
  const conversationKey = buildConversationKey(input.externalConversationId)
  const existingLinks = Object.values(document.links).filter(
    (link) => link.conversationKey === conversationKey && link.linkStatus === "active"
  )

  if (existingLinks.some((link) => link.surgeryId === surgeryId)) {
    throw conflict("La conversación ya está vinculada a esta cirugía", "mail_conversation_already_linked")
  }

  const linkedElsewhere = existingLinks.filter((link) => link.surgeryId !== surgeryId)
  if (linkedElsewhere.length > 0) {
    if (!input.warningAcknowledged) {
      throw conflict("Debe confirmar la advertencia de multivínculo", "mail_cross_link_ack_required")
    }

    if (!input.crossLinkReason?.trim()) {
      throw conflict("Debe informar el motivo del multivínculo", "mail_cross_link_reason_required")
    }
  }

  const providerSnapshot = await getMailProvider().getConversationSnapshot({
    mailbox: MAIL_STAGE1_MAILBOX,
    externalConversationId: input.externalConversationId,
    companyId,
  })

  const normalizedSnapshot = ensureConversationSnapshot(
    document.conversations[conversationKey],
    providerSnapshot,
    "attach"
  )

  if (input.criticalAttachmentIds?.length) {
    normalizedSnapshot.attachments = normalizedSnapshot.attachments.map((attachment) =>
      input.criticalAttachmentIds?.includes(attachment.attachmentId)
        ? {
            ...attachment,
            isCriticalSelected: true,
            persistenceState: attachment.persistenceState === "stored" ? "stored" : "selected",
          }
        : attachment
    )
  }

  document.conversations[conversationKey] = normalizedSnapshot

  const linkId = randomUUID()
  document.links[linkId] = {
    linkId,
    companyId,
    surgeryId,
    surgeryLabel: input.surgeryLabel.trim(),
    conversationKey,
    linkedAt: new Date().toISOString(),
    linkedByUserId: actor.actorUserId,
    linkStatus: "active",
    warningAcknowledged: Boolean(input.warningAcknowledged),
    crossLinkReason: input.crossLinkReason?.trim() || undefined,
    knownLinkedSurgeryIdsAtLinkTime: linkedElsewhere.map((link) => link.surgeryId),
    eventCount: 1,
    eventLog: [
      {
        type: "linked",
        at: new Date().toISOString(),
        actorUserId: actor.actorUserId,
        actorRole: actor.role,
        detail:
          linkedElsewhere.length > 0
            ? `Multivínculo confirmado: ${input.crossLinkReason?.trim()}`
            : "Conversación vinculada a cirugía",
      },
    ],
  }

  await saveDocument(companyId, document)

  if (input.criticalAttachmentIds?.length) {
    return persistCriticalAttachments(companyId, surgeryId, linkId, actor, {
      attachmentIds: input.criticalAttachmentIds,
    })
  }

  return toLinkedConversationView(document, document.links[linkId])
}

export async function refreshLinkedConversation(
  companyId: string,
  surgeryId: string,
  linkId: string,
  actor: MailStage1Actor
): Promise<MailLinkedConversationView> {
  const document = cloneCompanyDocument(await mailStage1Repository.getCompanyDocument(companyId))
  const link = findLinkOrThrow(document, surgeryId, linkId)

  document.links[linkId] = appendEvent(link, {
    type: "refresh_requested",
    at: new Date().toISOString(),
    actorUserId: actor.actorUserId,
    actorRole: actor.role,
    detail: "Actualización manual solicitada",
  })

  await saveDocument(companyId, document)

  try {
    const providerSnapshot = await getMailProvider().getConversationSnapshot({
      mailbox: MAIL_STAGE1_MAILBOX,
      externalConversationId: document.conversations[link.conversationKey]?.externalConversationId ?? "",
      companyId,
    })

    document.conversations[link.conversationKey] = ensureConversationSnapshot(
      document.conversations[link.conversationKey],
      providerSnapshot,
      "refresh"
    )
    document.links[linkId] = appendEvent(document.links[linkId], {
      type: "refresh_succeeded",
      at: new Date().toISOString(),
      actorUserId: actor.actorUserId,
      actorRole: actor.role,
      detail: "Snapshot actualizado manualmente",
    })

    await saveDocument(companyId, document)
    return toLinkedConversationView(document, document.links[linkId])
  } catch (error) {
    const snapshot = document.conversations[link.conversationKey]
    if (snapshot) {
      snapshot.refreshStatus = "failed"
    }
    document.links[linkId] = appendEvent(document.links[linkId], {
      type: "refresh_failed",
      at: new Date().toISOString(),
      actorUserId: actor.actorUserId,
      actorRole: actor.role,
      detail: error instanceof Error ? error.message : "Falló la actualización manual",
    })
    await saveDocument(companyId, document)
    throw error
  }
}

export async function persistCriticalAttachments(
  companyId: string,
  surgeryId: string,
  linkId: string,
  actor: MailStage1Actor,
  input: PersistCriticalAttachmentsInput
): Promise<MailLinkedConversationView> {
  const document = cloneCompanyDocument(await mailStage1Repository.getCompanyDocument(companyId))
  const link = findLinkOrThrow(document, surgeryId, linkId)
  const snapshot = document.conversations[link.conversationKey]

  if (!snapshot) {
    throw notFound("Stored mail snapshot not found", "mail_provider_snapshot_unavailable")
  }

  const unknownAttachmentId = input.attachmentIds.find(
    (attachmentId) => !snapshot.attachments.some((attachment) => attachment.attachmentId === attachmentId)
  )

  if (unknownAttachmentId) {
    throw notFound("Attachment not found in stored snapshot", "mail_attachment_not_found")
  }

  snapshot.attachments = snapshot.attachments.map((attachment) =>
    input.attachmentIds.includes(attachment.attachmentId)
      ? {
          ...attachment,
          isCriticalSelected: true,
          persistenceState: attachment.persistenceState === "stored" ? "stored" : "persisting",
          lastPersistenceError: undefined,
        }
      : attachment
  )

  for (const attachmentId of input.attachmentIds) {
    const attachment = snapshot.attachments.find((item) => item.attachmentId === attachmentId)

    if (!attachment || attachment.persistenceState === "stored") {
      continue
    }

    try {
      const provider = getMailProvider()
      const downloaded = await provider.downloadAttachment({
        mailbox: MAIL_STAGE1_MAILBOX,
        externalConversationId: snapshot.externalConversationId,
        providerAttachmentRef: attachment.providerAttachmentRef,
        companyId,
      })

      // Gmail provider returns empty fileName/mimeType — fill from stored snapshot
      const resolvedFileName = downloaded.fileName || attachment.fileName
      const resolvedMimeType = downloaded.mimeType || attachment.mimeType

      const storedFileRef = await mailStage1Repository.persistAttachmentBinary({
        companyId,
        surgeryId,
        conversationId: snapshot.externalConversationId,
        conversationKey: snapshot.conversationKey,
        attachment: {
          ...attachment,
          fileName: resolvedFileName,
          mimeType: resolvedMimeType,
        },
        buffer: downloaded.buffer,
      })

      attachment.persistenceState = "stored"
      attachment.storedFileRef = storedFileRef
      attachment.lastPersistenceError = undefined

      document.links[linkId] = appendEvent(document.links[linkId], {
        type: "attachment_persisted",
        at: new Date().toISOString(),
        actorUserId: actor.actorUserId,
        actorRole: actor.role,
        detail: `Evidencia guardada: ${attachment.fileName}`,
      })
    } catch (error) {
      attachment.persistenceState = "persist_failed"
      attachment.lastPersistenceError = error instanceof Error ? error.message : "Persistencia fallida"

      document.links[linkId] = appendEvent(document.links[linkId], {
        type: "attachment_persist_failed",
        at: new Date().toISOString(),
        actorUserId: actor.actorUserId,
        actorRole: actor.role,
        detail: `Falló evidencia de ${attachment.fileName}`,
      })
    }
  }

  await saveDocument(companyId, document)
  return toLinkedConversationView(document, document.links[linkId])
}

export async function unlinkConversationFromSurgery(
  companyId: string,
  surgeryId: string,
  linkId: string,
  actor: MailStage1Actor
): Promise<MailLinkedConversationView> {
  const permissions = getPermissions(actor)

  if (!permissions.canUnlink) {
    throw forbidden("Solo administrador o manager puede desvincular conversaciones", "mail_unlink_forbidden")
  }

  const document = cloneCompanyDocument(await mailStage1Repository.getCompanyDocument(companyId))
  const link = findLinkOrThrow(document, surgeryId, linkId)

  if (link.linkStatus !== "active") {
    throw conflict("El link ya está desvinculado", "mail_link_already_unlinked")
  }

  link.linkStatus = "unlinked"

  document.links[linkId] = appendEvent(link, {
    type: "unlinked",
    at: new Date().toISOString(),
    actorUserId: actor.actorUserId,
    actorRole: actor.role,
    detail: `Conversación desvinculada de cirugía ${surgeryId}`,
  })

  await saveDocument(companyId, document)
  return toLinkedConversationView(document, document.links[linkId])
}
