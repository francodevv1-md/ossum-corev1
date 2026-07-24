import { prisma as defaultPrisma } from "@/lib/prisma"

import { consumeDigitalReceiptAccess, hashDigitalReceiptAccessToken, shouldExpireDigitalReceiptAccess } from "./access-service"
import { createDigitalReceiptTechnicalAuditRecorder } from "./audit"
import { createDigitalReceiptDomainError } from "./errors"
import { createDigitalReceiptTimelineRecorder } from "./events"
import { createDigitalReceiptRepositories } from "./repository"
import type { DigitalReceiptPrismaSource } from "./repositories/shared"
import type { DigitalReceiptAccess, DigitalReceiptAggregate } from "./types"
import { mapDigitalReceiptToViewModel, type DigitalReceiptViewModel } from "./ui"

export type PublicDigitalReceiptViewModel = DigitalReceiptViewModel & {
  token: string
}

type PublicDigitalReceiptServiceDependencies = {
  prisma?: DigitalReceiptPrismaSource
  now?: () => Date
}

type GetPublicDigitalReceiptByTokenOptions = {
  markOpened?: boolean
}

export type SignPublicDigitalReceiptByTokenInput = {
  signerDocument: string
  signature: string
  signerName?: string
  signatureDataUrl?: string
  accepted?: boolean
  metadata?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeRequiredString(value: string, field: string) {
  const normalized = value.trim()

  if (!normalized) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_event_invalid",
      `Digital receipt public signature requires ${field}`,
      { field }
    )
  }

  return normalized
}

function normalizeOptionalString(value: string | undefined) {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function normalizeSignatureDataUrl(value: string | undefined) {
  const normalized = normalizeOptionalString(value)

  if (!normalized) {
    return undefined
  }

  if (!normalized.startsWith("data:image/png;base64,")) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_event_invalid",
      "Digital receipt handwritten signature image must be a PNG data URL",
      { field: "signatureDataUrl" }
    )
  }

  if (normalized.length > 2_000_000) {
    throw createDigitalReceiptDomainError(
      "digital_receipt_event_invalid",
      "Digital receipt handwritten signature image is too large",
      { field: "signatureDataUrl" }
    )
  }

  return normalized
}

function mergeRecord(
  base: Record<string, unknown> | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(base ?? {}),
    ...patch,
  }
}

function getCurrentIso(now: () => Date): string {
  return now().toISOString()
}

function buildAccessOpenedDetail(receiptNumber: string, accessId: string) {
  return `Public digital receipt ${receiptNumber} opened via access ${accessId}`
}

function buildAccessExpiredDetail(receiptNumber: string, accessId: string) {
  return `Digital receipt access ${accessId} for ${receiptNumber} expired`
}

function buildAccessConsumedDetail(receiptNumber: string, accessId: string) {
  return `Digital receipt access ${accessId} for ${receiptNumber} consumed by public signature`
}

function buildReceiptSignedDetail(receiptNumber: string) {
  return `Digital receipt ${receiptNumber} signed from public token boundary`
}

function isTerminalBlockedPublicAccessStatus(status: DigitalReceiptAccess["status"]) {
  return status === "expired" || status === "revoked"
}

function mapPublicReceiptViewModel(
  aggregate: DigitalReceiptAggregate,
  access: DigitalReceiptAccess,
  token: string
): PublicDigitalReceiptViewModel {
  const viewModel = mapDigitalReceiptToViewModel(aggregate)

  if (isTerminalBlockedPublicAccessStatus(access.status)) {
    viewModel.status = access.status
  }

  return {
    ...viewModel,
    activeAccessId: access.accessId,
    activeAccessStatus: access.status,
    activeAccessTokenLastFour: access.tokenLastFour,
    token,
  }
}

export function createPublicDigitalReceiptService(
  dependencies: PublicDigitalReceiptServiceDependencies = {}
) {
  const prismaClient = dependencies.prisma ?? defaultPrisma
  const now = dependencies.now ?? (() => new Date())

  async function requireCommittedAggregateById(receiptId: string, message: string) {
    const repositories = createDigitalReceiptRepositories(prismaClient)
    const aggregate = await repositories.receipts.getAggregateById(receiptId)

    if (!aggregate) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_not_found",
        message,
        { receiptId }
      )
    }

    return aggregate
  }

  async function getPublicDigitalReceiptByToken(
    token: string,
    options: GetPublicDigitalReceiptByTokenOptions = {}
  ): Promise<PublicDigitalReceiptViewModel> {
    const repositories = createDigitalReceiptRepositories(prismaClient)
    const tokenHash = hashDigitalReceiptAccessToken(token)
    const access = await repositories.accesses.findByTokenHash(tokenHash)

    if (!access) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_access_token_invalid",
        "Digital receipt public token is invalid"
      )
    }

    const aggregate = await repositories.receipts.getAggregateById(access.receiptId)

    if (!aggregate) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_not_found",
        "Digital receipt was not found for the provided token",
        { accessId: access.accessId, receiptId: access.receiptId }
      )
    }

    const nowIso = getCurrentIso(now)

    if (access.status === "revoked") {
      return mapPublicReceiptViewModel(aggregate, access, token)
    }

    if (access.status === "consumed" && aggregate.receipt.status !== "signed") {
      throw createDigitalReceiptDomainError(
        "digital_receipt_access_consumed",
        "Digital receipt public access was already consumed",
        { accessId: access.accessId, receiptId: access.receiptId }
      )
    }

    if (access.status === "active" && shouldExpireDigitalReceiptAccess(access, nowIso)) {
      const expiredReceiptId = await prismaClient.$transaction(async (tx) => {
        const txRepositories = createDigitalReceiptRepositories(tx)

        await txRepositories.accesses.update(access.accessId, {
          status: "expired",
          expiredAt: access.expiredAt ?? nowIso,
          metadata: {
            ...(access.metadata ?? {}),
            lifecycle: "auto_expired_on_public_read",
          },
        })

        await txRepositories.events.create({
          receiptId: access.receiptId,
          accessId: access.accessId,
          type: "expired",
          happenedAt: access.expiredAt ?? nowIso,
          detail: buildAccessExpiredDetail(aggregate.receipt.receiptNumber, access.accessId),
          metadata: {
            lifecycle: "auto_expired_on_public_read",
            source: "public_boundary",
          },
        })

        await txRepositories.receipts.update(access.receiptId, {
          ...(aggregate.receipt.status === "issued"
            ? {
                status: "expired",
                expiredAt: access.expiredAt ?? nowIso,
              }
            : {}),
          activeAccessId: null,
        })

        return access.receiptId
      })

      const expiredAggregate = await requireCommittedAggregateById(
        expiredReceiptId,
        "Digital receipt could not be reloaded after public expiry"
      )

      const expiredAccess = { ...access, status: "expired" as const, expiredAt: access.expiredAt ?? nowIso }

      return mapPublicReceiptViewModel(expiredAggregate, expiredAccess, token)
    }

    const shouldMarkOpened = options.markOpened !== false && access.status === "active"

    if (shouldMarkOpened) {
      const openedReceiptId = await prismaClient.$transaction(async (tx) => {
        const txRepositories = createDigitalReceiptRepositories(tx)
        const currentAccess = await txRepositories.accesses.findByTokenHash(tokenHash)

        if (!currentAccess) {
          throw createDigitalReceiptDomainError(
            "digital_receipt_access_token_invalid",
            "Digital receipt public token is invalid"
          )
        }

        if (currentAccess.status === "active") {
          await txRepositories.accesses.update(currentAccess.accessId, {
            firstOpenedAt: currentAccess.firstOpenedAt ?? nowIso,
            lastOpenedAt: nowIso,
            metadata: {
              ...(currentAccess.metadata ?? {}),
              source: "public_boundary",
            },
          })

          if (!currentAccess.firstOpenedAt) {
            await txRepositories.events.create({
              receiptId: currentAccess.receiptId,
              accessId: currentAccess.accessId,
              type: "access_opened",
              happenedAt: nowIso,
              detail: buildAccessOpenedDetail(aggregate.receipt.receiptNumber, currentAccess.accessId),
              metadata: {
                source: "public_boundary",
                accessVersion: currentAccess.version,
              },
            })
          }
        }

        return currentAccess.receiptId
      })

      const openedAggregate = await requireCommittedAggregateById(
        openedReceiptId,
        "Digital receipt could not be reloaded after public open"
      )

      const openedAccess =
        openedAggregate.accesses.find((candidate) => candidate.accessId === access.accessId) ?? {
          ...access,
          firstOpenedAt: access.firstOpenedAt ?? nowIso,
          lastOpenedAt: nowIso,
        }

      return mapPublicReceiptViewModel(openedAggregate, openedAccess, token)
    }

    return mapPublicReceiptViewModel(aggregate, access, token)
  }

  async function signPublicDigitalReceiptByToken(
    token: string,
    input: SignPublicDigitalReceiptByTokenInput
  ): Promise<PublicDigitalReceiptViewModel> {
    const repositories = createDigitalReceiptRepositories(prismaClient)
    const tokenHash = hashDigitalReceiptAccessToken(token)
    const access = await repositories.accesses.findByTokenHash(tokenHash)

    if (!access) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_access_token_invalid",
        "Digital receipt public token is invalid"
      )
    }

    const aggregate = await repositories.receipts.getAggregateById(access.receiptId)

    if (!aggregate) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_not_found",
        "Digital receipt was not found for the provided token",
        { accessId: access.accessId, receiptId: access.receiptId }
      )
    }

    const nowIso = getCurrentIso(now)

    if (access.status === "revoked") {
      throw createDigitalReceiptDomainError(
        "digital_receipt_access_revoked",
        "Digital receipt public access was revoked",
        { accessId: access.accessId, receiptId: access.receiptId }
      )
    }

    if (access.status === "expired") {
      throw createDigitalReceiptDomainError(
        "digital_receipt_access_expired",
        "Digital receipt public access expired",
        { accessId: access.accessId, receiptId: access.receiptId }
      )
    }

    if (access.status === "consumed") {
      if (aggregate.receipt.status === "signed") {
        return mapPublicReceiptViewModel(aggregate, access, token)
      }

      throw createDigitalReceiptDomainError(
        "digital_receipt_access_consumed",
        "Digital receipt public access was already consumed",
        { accessId: access.accessId, receiptId: access.receiptId }
      )
    }

    if (shouldExpireDigitalReceiptAccess(access, nowIso)) {
      await prismaClient.$transaction(async (tx) => {
        const txRepositories = createDigitalReceiptRepositories(tx)

        await txRepositories.accesses.update(access.accessId, {
          status: "expired",
          expiredAt: access.expiredAt ?? nowIso,
          metadata: mergeRecord(isRecord(access.metadata) ? access.metadata : undefined, {
            lifecycle: "auto_expired_on_public_sign",
            source: "public_boundary",
          }),
        })

        await txRepositories.events.create({
          receiptId: access.receiptId,
          accessId: access.accessId,
          type: "expired",
          happenedAt: access.expiredAt ?? nowIso,
          detail: buildAccessExpiredDetail(aggregate.receipt.receiptNumber, access.accessId),
          metadata: {
            lifecycle: "auto_expired_on_public_sign",
            source: "public_boundary",
          },
        })

        await txRepositories.receipts.update(access.receiptId, {
          ...(aggregate.receipt.status === "issued"
            ? {
                status: "expired",
                expiredAt: access.expiredAt ?? nowIso,
              }
            : {}),
          activeAccessId: null,
        })
      })

      throw createDigitalReceiptDomainError(
        "digital_receipt_access_expired",
        "Digital receipt public access expired",
        { accessId: access.accessId, receiptId: access.receiptId }
      )
    }

    const signerDocument = normalizeRequiredString(input.signerDocument, "signerDocument")
    const signature = normalizeRequiredString(input.signature, "signature")
    const signerName = normalizeOptionalString(input.signerName) ?? signature
    const signatureDataUrl = normalizeSignatureDataUrl(input.signatureDataUrl)

    if (!input.accepted) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_event_invalid",
        "Digital receipt public signature requires explicit acceptance",
        { field: "accepted" }
      )
    }

    const currentView = mapPublicReceiptViewModel(aggregate, access, token)

    if (signerDocument !== currentView.signer.document) {
      throw createDigitalReceiptDomainError(
        "digital_receipt_signer_mismatch",
        "Digital receipt signer document does not match the expected signer",
        {
          accessId: access.accessId,
          receiptId: access.receiptId,
          expectedSignerDocument: currentView.signer.document,
        }
      )
    }

    const signedResult = await prismaClient.$transaction(async (tx) => {
      const txRepositories = createDigitalReceiptRepositories(tx)
      const timeline = createDigitalReceiptTimelineRecorder(txRepositories.events)
      const audit = createDigitalReceiptTechnicalAuditRecorder(tx)
      const currentAccess = await txRepositories.accesses.findByTokenHash(tokenHash)

      if (!currentAccess) {
        throw createDigitalReceiptDomainError(
          "digital_receipt_access_token_invalid",
          "Digital receipt public token is invalid"
        )
      }

      const currentReceipt = await tx.digitalReceipt.findUnique({
        where: { id: currentAccess.receiptId },
        select: {
          id: true,
          companyId: true,
          surgeryId: true,
          receiptNumber: true,
          status: true,
          currentSignerRole: true,
          metadata: true,
        },
      })

      if (!currentReceipt) {
        throw createDigitalReceiptDomainError(
          "digital_receipt_not_found",
          "Digital receipt was not found for the provided token",
          { accessId: currentAccess.accessId, receiptId: currentAccess.receiptId }
        )
      }

      if (currentReceipt.status === "signed" || currentAccess.status === "consumed") {
        return {
          receiptId: currentAccess.receiptId,
          accessId: currentAccess.accessId,
        }
      }

      if (currentAccess.status !== "active") {
        throw createDigitalReceiptDomainError(
          currentAccess.status === "expired"
            ? "digital_receipt_access_expired"
            : currentAccess.status === "revoked"
              ? "digital_receipt_access_revoked"
              : "digital_receipt_access_consumed",
          `Digital receipt public access is ${currentAccess.status}`,
          { accessId: currentAccess.accessId, receiptId: currentAccess.receiptId }
        )
      }

      if (shouldExpireDigitalReceiptAccess(currentAccess, nowIso)) {
        throw createDigitalReceiptDomainError(
          "digital_receipt_access_expired",
          "Digital receipt public access expired",
          { accessId: currentAccess.accessId, receiptId: currentAccess.receiptId }
        )
      }

      if (signerDocument !== currentView.signer.document) {
        throw createDigitalReceiptDomainError(
          "digital_receipt_signer_mismatch",
          "Digital receipt signer document does not match the expected signer",
          {
            accessId: currentAccess.accessId,
            receiptId: currentAccess.receiptId,
            expectedSignerDocument: currentView.signer.document,
          }
        )
      }

      const accessTransition = consumeDigitalReceiptAccess({
        access: currentAccess,
        nowIso,
        metadata: {
          source: "public_boundary",
          lifecycle: "signed",
        },
      })

      const existingReceiptMetadata = isRecord(currentReceipt.metadata)
        ? currentReceipt.metadata
        : undefined
      const existingPublicSignature = isRecord(existingReceiptMetadata?.publicSignature)
        ? existingReceiptMetadata.publicSignature
        : undefined
      const requestMetadata = isRecord(input.metadata) ? input.metadata : undefined
      const signatureEvidence = {
        ...(existingPublicSignature ?? {}),
        source: "public_boundary",
        accessId: currentAccess.accessId,
        signerRole: currentReceipt.currentSignerRole,
        signerDocument,
        signerName,
        signature,
        signatureKind: signatureDataUrl ? "handwritten_canvas" : "typed_text",
        signatureImageDataUrl: signatureDataUrl,
        signedAt: nowIso,
        tokenLastFour: currentAccess.tokenLastFour,
        ...(requestMetadata ? { request: requestMetadata } : {}),
      } satisfies Record<string, unknown>

      await txRepositories.accesses.update(currentAccess.accessId, {
        status: accessTransition.patch.status,
        consumedAt: accessTransition.patch.consumedAt,
        metadata: mergeRecord(isRecord(currentAccess.metadata) ? currentAccess.metadata : undefined, {
          source: "public_boundary",
          lifecycle: "signed",
          signerDocument,
          signerName,
          signature,
          signatureKind: signatureDataUrl ? "handwritten_canvas" : "typed_text",
          signatureImageDataUrl: signatureDataUrl,
          signedAt: nowIso,
        }),
      })

      await txRepositories.receipts.update(currentAccess.receiptId, {
        status: "signed",
        signedAt: nowIso,
        activeAccessId: accessTransition.receiptPatch.activeAccessId ?? null,
        latestAccessVersion: accessTransition.receiptPatch.latestAccessVersion,
        metadata: mergeRecord(existingReceiptMetadata, {
          publicSignature: signatureEvidence,
        }),
      })

      const artifact = await txRepositories.artifacts.create({
        receiptId: currentAccess.receiptId,
        accessId: currentAccess.accessId,
        type: "signature_evidence",
        fileName: `${currentReceipt.receiptNumber}-signature-evidence.json`,
        mimeType: "application/json",
        metadata: signatureEvidence,
      })

      await txRepositories.events.create({
        receiptId: currentAccess.receiptId,
        accessId: currentAccess.accessId,
        artifactId: artifact.artifactId,
        type: "access_consumed",
        happenedAt: nowIso,
        detail: buildAccessConsumedDetail(currentReceipt.receiptNumber, currentAccess.accessId),
        metadata: {
          source: "public_boundary",
          signerDocument,
          tokenLastFour: currentAccess.tokenLastFour,
        },
      })

      await txRepositories.events.create({
        receiptId: currentAccess.receiptId,
        accessId: currentAccess.accessId,
        artifactId: artifact.artifactId,
        type: "signed",
        happenedAt: nowIso,
        detail: buildReceiptSignedDetail(currentReceipt.receiptNumber),
        metadata: {
          source: "public_boundary",
          signerRole: currentReceipt.currentSignerRole,
          signerDocument,
          tokenLastFour: currentAccess.tokenLastFour,
        },
      })

      await timeline.recordArtifactRegistered({
        receiptId: currentAccess.receiptId,
        companyId: currentReceipt.companyId,
        surgeryId: currentReceipt.surgeryId,
        receiptNumber: currentReceipt.receiptNumber,
        accessId: currentAccess.accessId,
        artifactId: artifact.artifactId,
        artifactType: artifact.type,
        happenedAt: artifact.createdAt,
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
        checksum: artifact.checksum,
        storageKey: artifact.storageKey,
        metadata: {
          source: "public_boundary",
          signerDocument,
          tokenLastFour: currentAccess.tokenLastFour,
        },
      })

      await audit.recordArtifactRegistered({
        companyId: currentReceipt.companyId,
        surgeryId: currentReceipt.surgeryId,
        receiptId: currentAccess.receiptId,
        receiptNumber: currentReceipt.receiptNumber,
        artifactId: artifact.artifactId,
        artifactType: artifact.type,
        accessId: currentAccess.accessId,
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
        checksum: artifact.checksum,
        storageKey: artifact.storageKey,
        metadata: {
          source: "public_boundary",
          signerDocument,
          tokenLastFour: currentAccess.tokenLastFour,
        },
      })

      return {
        receiptId: currentAccess.receiptId,
        accessId: currentAccess.accessId,
      }
    })

    const refreshedAggregate = await requireCommittedAggregateById(
      signedResult.receiptId,
      "Digital receipt could not be reloaded after public signature"
    )
    const refreshedAccess =
      refreshedAggregate.accesses.find((candidate) => candidate.accessId === signedResult.accessId) ?? {
        ...access,
        status: "consumed" as const,
        consumedAt: nowIso,
      }

    return mapPublicReceiptViewModel(refreshedAggregate, refreshedAccess, token)
  }

  return {
    getPublicDigitalReceiptByToken,
    signPublicDigitalReceiptByToken,
  }
}

export const publicDigitalReceiptService = createPublicDigitalReceiptService()
