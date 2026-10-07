// OSSUM COR — Seguimiento service
// Provides listing and creation of seguimiento entries for surgery tracking.
// Services receive prisma as dependency injection.

import { Prisma, PrismaClient } from "@prisma/client";
import type { MentionLookupUser, MentionRef } from "@/lib/mentions/types";
import { resolveRawMentionFallbacks } from "@/lib/mentions/utils";
import { badRequest, conflict, notFound } from "@/lib/api/errors";
import { createAuditEvent } from "@/lib/audit";
import { emitSeguimientoMentionNotifications } from "@/lib/services/internal-notifications.service";
import type {
  SeguimientoAuthorizationCreateBody,
  SeguimientoEditBody,
} from "@/lib/validators/seguimiento.validator";
import type { TrustedMailAuthorizationImportProvenance } from "@/lib/mail-stage1/service";

export type SeguimientoEntryRow = {
  id: string;
  surgeryId: string;
  companyId: string;
  entryType: string;
  content: string;
  summary: string | null;
  authorId: string;
  authorName: string;
  evidenceRef: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface ListSeguimientoFilters {
  entryType?: string;
  take?: number;
}

export interface ListSeguimientoEntriesResult {
  entries: SeguimientoEntryRow[];
  total: number;
  hasMore: boolean;
  take: number;
}

function publicSeguimientoEvidenceRef(entryType: string, value: Prisma.JsonValue | null) {
  if (entryType !== "document_evidence" || !value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const evidenceRef = value as Record<string, unknown>;
  const file = evidenceRef.file;
  if (!file || typeof file !== "object" || Array.isArray(file)) return value;
  const { objectKey: _objectKey, etag: _etag, ...publicFile } = file as Record<string, unknown>;
  void _objectKey;
  void _etag;
  return { ...evidenceRef, file: publicFile } as Prisma.JsonValue;
}

export async function listSeguimientoEntries(
  prisma: PrismaClient,
  surgeryId: string,
  companyId: string,
  filters?: ListSeguimientoFilters
): Promise<ListSeguimientoEntriesResult> {
  const { entryType, take = 50 } = filters ?? {};
  const normalizedTake = Math.min(take, 100);
  const where = {
    surgeryId,
    companyId,
    ...(entryType ? { entryType } : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.seguimientoEntry.count({ where }),
    prisma.seguimientoEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: normalizedTake,
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      surgeryId: e.surgeryId,
      companyId: e.companyId,
      entryType: e.entryType,
      content: e.content,
      summary: e.summary,
      authorId: e.authorId,
      authorName:
        [e.author.firstName, e.author.lastName].filter(Boolean).join(" ") ||
        "Usuario",
      evidenceRef: publicSeguimientoEvidenceRef(e.entryType, e.evidenceRef),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    total,
    hasMore: total > entries.length,
    take: normalizedTake,
  };
}

export interface CreateSeguimientoEntryInput {
  surgeryId: string;
  companyId: string;
  entryType: string;
  content: string;
  summary?: string;
  authorId: string;
  evidenceRef?: Record<string, unknown>;
  mentions?: MentionRef[];
}

export type AvailabilitySeguimientoEvent =
  | "requested"
  | "completed"
  | "corrected"
  | "pivot_transferred";

export interface CreateAvailabilitySeguimientoEventInput {
  tx: Prisma.TransactionClient;
  companyId: string;
  surgeryId: string;
  requestId?: string;
  actorUserId: string;
  correlationId: string;
  auditEventId: string;
  event: AvailabilitySeguimientoEvent;
  content?: string;
  oldDate?: string | null;
  newDate?: string | null;
}

export interface EditSeguimientoEntryInput {
  surgeryId: string;
  actor: SeguimientoEventActor;
  edits: SeguimientoEditBody;
}

/**
 * Temporary compatibility shape for the pre-T4 route. It deliberately cannot
 * mutate: T4 must provide the resolved surgery and server-derived actor.
 */
interface LegacyEditSeguimientoEntryInput {
  content?: string;
  summary?: string;
  editedBy: string;
  actorUserId: string;
  mentions?: MentionRef[];
}

export interface SeguimientoEventActor {
  userId: string;
  displayName: string;
}

export interface CreateAuthorizationEvidenceInput {
  sourceEntryId: string;
  surgeryId: string;
  companyId: string;
  actor: SeguimientoEventActor;
  input: SeguimientoAuthorizationCreateBody;
}

/** Server-only input. Its provenance must come from the Mail Stage 1 service. */
export interface CreateMailAuthorizationEvidenceInput {
  surgeryId: string;
  companyId: string;
  actor: SeguimientoEventActor;
  content: string;
  summary?: string;
  provenance: TrustedMailAuthorizationImportProvenance;
}

type SeguimientoDbClient = PrismaClient | Prisma.TransactionClient;

function buildMentionDisplayName(firstName: string, lastName: string, email: string) {
  return `${firstName} ${lastName}`.trim() || email;
}

function asPlainEvidenceRef(
  evidenceRef: Prisma.JsonValue | Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!evidenceRef || typeof evidenceRef !== "object" || Array.isArray(evidenceRef)) {
    return {};
  }

  return { ...(evidenceRef as Record<string, unknown>) };
}

function applyMentionsToEvidenceRef(
  evidenceRef: Record<string, unknown>,
  mentions: MentionRef[] | undefined,
  mode: "preserve" | "replace"
): Record<string, unknown> {
  if (mentions === undefined && mode === "preserve") {
    return evidenceRef;
  }

  const next = { ...evidenceRef };
  delete next.mentions;

  if (mentions && mentions.length > 0) {
    next.mentions = mentions;
  }

  return next;
}

function getMentionUserIds(mentions: MentionRef[] | undefined) {
  return new Set((mentions ?? []).map((mention) => mention.userId));
}

function extractMentionsFromEvidenceRef(evidenceRef: Prisma.JsonValue | null | undefined): MentionRef[] {
  const plain = asPlainEvidenceRef(evidenceRef);
  if (!Array.isArray(plain.mentions)) {
    return [];
  }

  return plain.mentions
    .filter((mention): mention is MentionRef => {
      if (typeof mention !== "object" || mention === null || Array.isArray(mention)) {
        return false;
      }

      const record = mention as Record<string, unknown>;
      return (
        typeof record.userId === "string" &&
        typeof record.displayName === "string" &&
        typeof record.companyId === "string"
      );
    })
    .map((mention) => ({
      userId: mention.userId,
      displayName: mention.displayName,
      companyId: mention.companyId,
    }));
}

function getAddedMentions(previousMentions: MentionRef[], nextMentions: MentionRef[] | undefined) {
  if (nextMentions === undefined) {
    return [];
  }

  const previousIds = getMentionUserIds(previousMentions);
  return nextMentions.filter((mention) => !previousIds.has(mention.userId));
}

function jsonEquals(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getEditablePriority(evidenceRef: Record<string, unknown>) {
  return evidenceRef.priority === "alta" || evidenceRef.priority === "media" || evidenceRef.priority === "baja"
    ? evidenceRef.priority
    : undefined;
}

function getEditableNoteType(evidenceRef: Record<string, unknown>) {
  return evidenceRef.noteType === "general" ||
    evidenceRef.noteType === "urgente" ||
    evidenceRef.noteType === "facturacion" ||
    evidenceRef.noteType === "logistica" ||
    evidenceRef.noteType === "coordinacion"
    ? evidenceRef.noteType
    : undefined;
}

function getEditableHighlighted(evidenceRef: Record<string, unknown>) {
  return evidenceRef.highlighted === true;
}

function getEditableImageEvidence(evidenceRef: Record<string, unknown>) {
  return evidenceRef.imageEvidence && typeof evidenceRef.imageEvidence === "object" && !Array.isArray(evidenceRef.imageEvidence)
    ? evidenceRef.imageEvidence
    : undefined;
}

function mapSeguimientoEntry(entry: {
  id: string;
  surgeryId: string;
  companyId: string;
  entryType: string;
  content: string;
  summary: string | null;
  authorId: string;
  evidenceRef: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  author: { firstName: string; lastName: string };
}): SeguimientoEntryRow {
  return {
    id: entry.id,
    surgeryId: entry.surgeryId,
    companyId: entry.companyId,
    entryType: entry.entryType,
    content: entry.content,
    summary: entry.summary,
    authorId: entry.authorId,
    authorName:
      [entry.author.firstName, entry.author.lastName].filter(Boolean).join(" ") ||
      "Usuario",
    evidenceRef: publicSeguimientoEvidenceRef(entry.entryType, entry.evidenceRef),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function mergeMentions(baseMentions: MentionRef[] | undefined, fallbackMentions: MentionRef[]) {
  if ((baseMentions?.length ?? 0) === 0 && fallbackMentions.length === 0) {
    return baseMentions;
  }

  const next = new Map<string, MentionRef>();

  (baseMentions ?? []).forEach((mention) => {
    next.set(mention.userId, mention);
  });

  fallbackMentions.forEach((mention) => {
    if (!next.has(mention.userId)) {
      next.set(mention.userId, mention);
    }
  });

  return Array.from(next.values());
}

async function getActiveMentionDirectory(
  prisma: SeguimientoDbClient,
  companyId: string
): Promise<MentionLookupUser[]> {
  const accesses = await prisma.userCompanyAccess.findMany({
    where: {
      companyId,
      isActive: true,
      user: { isActive: true },
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return accesses.map(({ role, user }) => ({
    userId: user.id,
    displayName: buildMentionDisplayName(user.firstName, user.lastName, user.email),
    companyId,
    email: user.email,
    role,
  }));
}

async function resolveEntryMentions(
  prisma: SeguimientoDbClient,
  companyId: string,
  content: string,
  mentions: MentionRef[] | undefined
) {
  if (!content.includes("@")) {
    return mentions;
  }

  const directory = await getActiveMentionDirectory(prisma, companyId);
  const fallbackMentions = resolveRawMentionFallbacks(content, mentions ?? [], directory);
  return mergeMentions(mentions, fallbackMentions);
}

async function runInSeguimientoTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: SeguimientoDbClient) => Promise<T>
): Promise<T> {
  if (typeof prisma.$transaction === "function") {
    return prisma.$transaction((tx) => callback(tx));
  }

  return callback(prisma);
}

export async function editSeguimientoEntry(
  prisma: PrismaClient,
  entryId: string,
  companyId: string,
  input: EditSeguimientoEntryInput | LegacyEditSeguimientoEntryInput
): Promise<SeguimientoEntryRow> {
  if (!("surgeryId" in input)) {
    throw badRequest(
      "Seguimiento edits require a resolved surgery scope",
      "invalid_seguimiento_edit_scope"
    );
  }

  return runInSeguimientoTransaction(prisma, async (tx) => {
    const existing = await tx.seguimientoEntry.findFirst({
      where: { id: entryId, companyId, surgeryId: input.surgeryId },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });

    if (!existing) {
      throw notFound("Seguimiento entry not found", "seguimiento_entry_not_found");
    }

    if (existing.entryType === "availability_event") {
      throw conflict(
        "Availability workflow events are immutable",
        "availability_event_immutable"
      );
    }

    if (existing.entryType === "authorization_evidence") {
      throw conflict("Authorization evidence is immutable", "authorization_evidence_immutable");
    }

    if (existing.entryType !== "note") {
      throw conflict("Seguimiento entry is not editable", "seguimiento_entry_not_editable");
    }

    const edits = input.edits;
    const evidenceRef = asPlainEvidenceRef(existing.evidenceRef);
    const previousMentions = extractMentionsFromEvidenceRef(existing.evidenceRef);
    const resolvedMentions =
      edits.mentions === undefined
        ? undefined
        : await resolveEntryMentions(tx, companyId, edits.content ?? existing.content, edits.mentions);
    const previousPriority = getEditablePriority(evidenceRef);
    const previousNoteType = getEditableNoteType(evidenceRef);
    const previousHighlighted = getEditableHighlighted(evidenceRef);
    const previousImageEvidence = getEditableImageEvidence(evidenceRef);
    const nextImageEvidence = edits.imageEvidence?.files.length
      ? {
          source: "manual_event_edit",
          fileCount: edits.imageEvidence.files.length,
          files: edits.imageEvidence.files,
        }
      : undefined;

    const contentChanged = edits.content !== undefined && edits.content !== existing.content;
    const summaryChanged = edits.summary !== undefined && edits.summary !== existing.summary;
    const priorityChanged = edits.priority !== undefined && edits.priority !== previousPriority;
    const noteTypeChanged = edits.noteType !== undefined && edits.noteType !== previousNoteType;
    const highlightedChanged = edits.highlighted !== undefined && edits.highlighted !== previousHighlighted;
    const mentionsChanged = resolvedMentions !== undefined && !jsonEquals(resolvedMentions, previousMentions);
    const imageChanged =
      edits.imageEvidence !== undefined && !jsonEquals(nextImageEvidence ?? null, previousImageEvidence ?? null);

    if (!contentChanged && !summaryChanged && !noteTypeChanged && !priorityChanged && !highlightedChanged && !mentionsChanged && !imageChanged) {
      throw badRequest("The supplied fields do not change this entry", "no_changes");
    }

    const previous: Record<string, unknown> = {};
    if (contentChanged) previous.content = existing.content;
    if (summaryChanged) previous.summary = existing.summary;
    if (noteTypeChanged) previous.noteType = previousNoteType ?? null;
    if (priorityChanged) previous.priority = previousPriority ?? null;
    if (highlightedChanged) previous.highlighted = previousHighlighted;
    if (mentionsChanged) previous.mentions = cloneJson(previousMentions);
    if (imageChanged) previous.imageEvidence = previousImageEvidence ? cloneJson(previousImageEvidence) : null;

    const editHistoryEntry = {
      action: "event_edited",
      editedAt: new Date().toISOString(),
      actor: { userId: input.actor.userId, displayName: input.actor.displayName },
      previous,
    };

    const editHistory = Array.isArray(evidenceRef.editHistory)
      ? [...(evidenceRef.editHistory as unknown[]), editHistoryEntry]
      : [editHistoryEntry];

    const updatedEvidenceRef: Record<string, unknown> = { ...evidenceRef, editHistory };
    if (priorityChanged) updatedEvidenceRef.priority = edits.priority;
    if (noteTypeChanged) updatedEvidenceRef.noteType = edits.noteType;
    if (highlightedChanged) updatedEvidenceRef.highlighted = edits.highlighted;
    if (mentionsChanged) {
      if ((resolvedMentions?.length ?? 0) > 0) updatedEvidenceRef.mentions = resolvedMentions;
      else delete updatedEvidenceRef.mentions;
    }
    if (imageChanged) {
      if (nextImageEvidence) updatedEvidenceRef.imageEvidence = nextImageEvidence;
      else delete updatedEvidenceRef.imageEvidence;
    }

    const updateData: Prisma.SeguimientoEntryUpdateInput = {
      evidenceRef: updatedEvidenceRef as Prisma.InputJsonValue,
      ...(contentChanged ? { content: edits.content } : {}),
      ...(summaryChanged ? { summary: edits.summary } : {}),
    };

    const entry = await tx.seguimientoEntry.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });

    const addedMentions = getAddedMentions(previousMentions, resolvedMentions);

    if (addedMentions.length > 0) {
      await emitSeguimientoMentionNotifications(tx, {
        companyId: entry.companyId,
        surgeryId: entry.surgeryId,
        sourceEntityId: entry.id,
        actorUserId: input.actor.userId,
        actorDisplayName: input.actor.displayName,
        entryType: entry.entryType,
        content: entry.content,
        mentions: addedMentions,
        trigger: "patch_added",
      });
    }

    return mapSeguimientoEntry(entry);
  });
}

export async function createAuthorizationEvidence(
  prisma: PrismaClient,
  input: CreateAuthorizationEvidenceInput
): Promise<SeguimientoEntryRow> {
  return runInSeguimientoTransaction(prisma, async (tx) => {
    const source = await tx.seguimientoEntry.findFirst({
      where: {
        id: input.sourceEntryId,
        companyId: input.companyId,
        surgeryId: input.surgeryId,
      },
    });

    if (!source) {
      throw notFound("Seguimiento entry not found", "seguimiento_entry_not_found");
    }

    if (source.entryType === "authorization_evidence") {
      throw conflict("Authorization evidence cannot be its own source", "authorization_evidence_invalid_source");
    }

    const evidenceRef: Record<string, unknown> = {
      action: "authorization_recorded",
      sourceEntryId: source.id,
    };

    if ((input.input.imageEvidence?.files.length ?? 0) > 0) {
      evidenceRef.imageEvidence = {
        source: "authorization_recorded",
        fileCount: input.input.imageEvidence!.files.length,
        files: input.input.imageEvidence!.files,
      };
    }

    const entry = await tx.seguimientoEntry.create({
      data: {
        surgeryId: input.surgeryId,
        companyId: input.companyId,
        entryType: "authorization_evidence",
        content: input.input.content,
        summary: input.input.summary ?? null,
        authorId: input.actor.userId,
        evidenceRef: evidenceRef as Prisma.InputJsonValue,
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });

    return mapSeguimientoEntry(entry);
  });
}

/**
 * Creates immutable, non-material authorization evidence from trusted Mail
 * provenance. It intentionally has no source entry and no circuit side effect.
 */
export async function createMailAuthorizationEvidence(
  prisma: PrismaClient,
  input: CreateMailAuthorizationEvidenceInput
): Promise<SeguimientoEntryRow> {
  return runInSeguimientoTransaction(prisma, async (tx) => {
    const evidenceRef: Record<string, unknown> = {
      action: "authorization_recorded",
      source: "mail_import",
      mailImport: {
        linkId: input.provenance.linkId,
        conversationKey: input.provenance.conversationKey,
        externalConversationId: input.provenance.externalConversationId,
        provider: input.provenance.provider,
        mailbox: input.provenance.mailbox,
        subject: input.provenance.subject,
        participantsSummary: input.provenance.participantsSummary,
        latestMessageAt: input.provenance.latestMessageAt,
        messageCount: input.provenance.messageCount,
        attachmentCount: input.provenance.attachmentCount,
        importedAttachments: input.provenance.importedAttachments.map((attachment) => ({ ...attachment })),
      },
    };

    const entry = await tx.seguimientoEntry.create({
      data: {
        surgeryId: input.surgeryId,
        companyId: input.companyId,
        entryType: "authorization_evidence",
        content: input.content,
        summary: input.summary ?? null,
        authorId: input.actor.userId,
        evidenceRef: evidenceRef as Prisma.InputJsonValue,
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });

    return mapSeguimientoEntry(entry);
  });
}

export async function createSeguimientoEntry(
  prisma: PrismaClient,
  input: CreateSeguimientoEntryInput
): Promise<SeguimientoEntryRow> {
  if (input.entryType === "availability_event") {
    throw conflict(
      "Availability workflow events are server-only",
      "availability_event_server_only"
    );
  }

  return runInSeguimientoTransaction(prisma, async (tx) => {
    const resolvedMentions = await resolveEntryMentions(tx, input.companyId, input.content, input.mentions);
    const evidenceRef = applyMentionsToEvidenceRef(
      asPlainEvidenceRef(input.evidenceRef),
      resolvedMentions,
      "replace"
    );

    // Si es una confirmación de entrega logística con remitoId, sincronizar el remito atómicamente
    if (
      input.entryType === "logistics_delivery" &&
      evidenceRef.remitoId &&
      typeof evidenceRef.remitoId === "string"
    ) {
      const remito = await tx.remito.findFirst({
        where: {
          id: evidenceRef.remitoId,
          companyId: input.companyId,
          surgeryId: input.surgeryId,
        },
        select: {
          id: true,
          state: true,
          visibleNumber: true,
          deliveredAt: true,
          updatedAt: true,
        },
      });

      if (remito && (remito.state === "Emitido" || remito.state === "En_transito")) {
        const deliveredAt =
          evidenceRef.actualDate && typeof evidenceRef.actualDate === "string"
            ? new Date(evidenceRef.actualDate)
            : new Date();

        await tx.remito.update({
          where: {
            id: remito.id,
            companyId: input.companyId,
            surgeryId: input.surgeryId,
            state: remito.state,
            updatedAt: remito.updatedAt,
          },
          data: {
            state: "Entregado",
            deliveredAt: remito.deliveredAt ?? deliveredAt,
            updatedById: input.authorId,
          },
        }).catch((error: unknown) => {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            throw conflict("Remito changed. Reload before confirming delivery.", "remito_state_conflict");
          }
          throw error;
        });

        await createAuditEvent({
          prisma: tx as unknown as PrismaClient,
          companyId: input.companyId,
          userId: input.authorId,
          entityType: "Remito",
          entityId: remito.id,
          action: "remito.state_changed",
          module: "remito",
          oldValue: { state: remito.state },
          newValue: { state: "Entregado" },
          detail: "Entrega confirmada vía Panel de Seguimiento",
        });
      }
    }

    const entry = await tx.seguimientoEntry.create({
      data: {
        surgeryId: input.surgeryId,
        companyId: input.companyId,
        entryType: input.entryType,
        content: input.content,
        summary: input.summary ?? null,
        authorId: input.authorId,
        evidenceRef: Object.keys(evidenceRef).length > 0
          ? (evidenceRef as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });

    const authorName =
      [entry.author.firstName, entry.author.lastName].filter(Boolean).join(" ") ||
      "Usuario";

    if ((resolvedMentions?.length ?? 0) > 0) {
      await emitSeguimientoMentionNotifications(tx, {
        companyId: entry.companyId,
        surgeryId: entry.surgeryId,
        sourceEntityId: entry.id,
        actorUserId: entry.authorId,
        actorDisplayName: authorName,
        entryType: entry.entryType,
        content: entry.content,
        mentions: resolvedMentions,
        trigger: "create",
      });
    }

    return {
      id: entry.id,
      surgeryId: entry.surgeryId,
      companyId: entry.companyId,
      entryType: entry.entryType,
      content: entry.content,
      summary: entry.summary,
      authorId: entry.authorId,
      authorName,
      evidenceRef: entry.evidenceRef,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  });
}

function availabilityEventContent(
  event: AvailabilitySeguimientoEvent,
  suppliedContent: string | undefined
): string {
  if (suppliedContent?.trim()) return suppliedContent.trim();
  if (event === "requested") {
    return "Se solicitó fecha de disponibilidad del material";
  }
  if (event === "pivot_transferred") {
    return "Se reasignó el PÍVOT de la solicitud de disponibilidad";
  }
  throw badRequest(
    "Availability event content is required",
    "availability_event_content_required"
  );
}

/** Server-only helper. The caller must pass its current domain transaction. */
export async function createAvailabilitySeguimientoEvent(
  input: CreateAvailabilitySeguimientoEventInput
): Promise<void> {
  const evidenceRef = {
    source: "availability_request",
    event: input.event,
    ...(input.requestId ? { requestId: input.requestId } : {}),
    auditEventId: input.auditEventId,
    correlationId: input.correlationId,
    ...(input.oldDate !== undefined ? { oldDate: input.oldDate } : {}),
    ...(input.newDate !== undefined ? { newDate: input.newDate } : {}),
  } satisfies Record<string, unknown>;

  await input.tx.seguimientoEntry.create({
    data: {
      surgeryId: input.surgeryId,
      companyId: input.companyId,
      entryType: "availability_event",
      content: availabilityEventContent(input.event, input.content),
      summary: null,
      authorId: input.actorUserId,
      evidenceRef: evidenceRef as Prisma.InputJsonValue,
    },
  });
}
