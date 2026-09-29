/**
 * seguimiento-adapter — OSSUM COR
 *
 * Maps raw Seguimiento API payloads into a minimal UI-friendly view shape.
 * Adds a timestamp field for sorting and filtering in the frontend.
 */

import type { MentionRef } from "@/lib/mentions/types"

export type SeguimientoEditHistoryEntry = {
  editedAt: string;
  editedBy: string;
  previous: Partial<{
    content: string;
    summary: string | null;
    noteType: SeguimientoNoteType | null;
    priority: SeguimientoNotePriority | null;
    highlighted: boolean;
    mentions: MentionRef[];
    imageEvidence: SeguimientoPhotoMeta | null;
  }>;
};

export type SeguimientoNoteType = "urgente" | "facturacion" | "logistica" | "general" | "coordinacion";

export type SeguimientoNotePriority = "alta" | "media" | "baja";

export type SeguimientoEntryView = {
  id: string;
  entryType: string;
  content: string;
  summary: string | null;
  authorId: string;
  authorName: string;
  evidenceRef: Record<string, unknown> | null;
  createdAt: string; // ISO string
  timestamp: number; // milliseconds since epoch — for sorting/filtering
  isHighlighted: boolean;
  notePriority: SeguimientoNotePriority | null;
  noteType: SeguimientoNoteType | null;
  mailMeta: SeguimientoMailMeta | null;
  photoMeta: SeguimientoPhotoMeta | null;
  imageEvidenceMeta: SeguimientoPhotoMeta | null;
  documentMeta: SeguimientoDocumentMeta | null;
  logisticsMeta: SeguimientoLogisticsMeta | null;
  editHistory: SeguimientoEditHistoryEntry[] | null;
  mentions: MentionRef[];
};

export type SeguimientoLogisticsMeta = {
  remitoId?: string;
  remitoVisibleNumber?: number | string;
  receivedBy?: string;
  actualDate?: string;
  notes?: string;
  sourceSurgeryId?: string;
  sourceRemitoId?: string;
};

export type SeguimientoDocumentMeta = {
  status: "uploading" | "queued" | "upload_failed";
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type SeguimientoMailMeta = {
  source?: string;
  provider?: string;
  mailbox?: string;
  linkId?: string;
  conversationKey?: string;
  externalConversationId?: string;
  subject?: string;
  participantsSummary?: string;
  latestMessageAt?: string;
  importedAt?: string;
  refreshedAt?: string;
  messageCount?: number;
  attachmentCount?: number;
};

export type SeguimientoPhotoFileMeta = {
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  previewDataUrl?: string;
  width?: number;
  height?: number;
};

export type SeguimientoPhotoMeta = {
  source?: string;
  fileCount: number;
  files: SeguimientoPhotoFileMeta[];
};

export type SeguimientoEntryApiRow = {
  id: string;
  surgeryId: string;
  companyId: string;
  entryType: string;
  content: string;
  summary: string | null;
  authorId: string;
  authorName: string;
  evidenceRef: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SeguimientoFeedApiMeta = {
  total: number;
  hasMore: boolean;
  take: number;
};

export type SeguimientoFeedApiResponse = {
  entries: SeguimientoEntryApiRow[];
  meta: SeguimientoFeedApiMeta;
};

export type SeguimientoFeedView = {
  entries: SeguimientoEntryView[];
  meta: SeguimientoFeedApiMeta;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizePriority(value: unknown): SeguimientoNotePriority | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  // Backward-compat: old values "high"/"normal" map to "alta"/"media"
  if (["high", "alta", "urgent", "urgente"].includes(normalized)) return "alta";
  if (["low", "baja"].includes(normalized)) return "baja";
  if (["normal", "media", "medium", "default"].includes(normalized)) return "media";

  return null;
}

const VALID_NOTE_TYPES: SeguimientoNoteType[] = ["urgente", "facturacion", "logistica", "general", "coordinacion"];

function normalizeNoteType(value: unknown): SeguimientoNoteType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return (VALID_NOTE_TYPES as string[]).includes(normalized) ? (normalized as SeguimientoNoteType) : null;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isPreviewDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

function mapMailMeta(evidenceRef: Record<string, unknown> | null): SeguimientoMailMeta | null {
  if (!evidenceRef) return null;

  return {
    source: toOptionalString(evidenceRef.source),
    provider: toOptionalString(evidenceRef.provider),
    mailbox: toOptionalString(evidenceRef.mailbox),
    linkId: toOptionalString(evidenceRef.linkId),
    conversationKey: toOptionalString(evidenceRef.conversationKey),
    externalConversationId: toOptionalString(evidenceRef.externalConversationId),
    subject: toOptionalString(evidenceRef.subject),
    participantsSummary: toOptionalString(evidenceRef.participantsSummary),
    latestMessageAt: toOptionalString(evidenceRef.latestMessageAt),
    importedAt: toOptionalString(evidenceRef.importedAt),
    refreshedAt: toOptionalString(evidenceRef.refreshedAt),
    messageCount: toOptionalNumber(evidenceRef.messageCount),
    attachmentCount: toOptionalNumber(evidenceRef.attachmentCount),
  };
}

function mapPhotoMetaValue(value: unknown): SeguimientoPhotoMeta | null {
  const evidenceRef = asRecord(value);
  if (!evidenceRef) return null;

  const rawFiles = Array.isArray(evidenceRef.files) ? evidenceRef.files : [];
  const files = rawFiles
    .map((file) => asRecord(file))
    .filter((file): file is Record<string, unknown> => Boolean(file))
    .map((file) => ({
      name: toOptionalString(file.name),
      mimeType: toOptionalString(file.mimeType),
      sizeBytes: toOptionalNumber(file.sizeBytes),
      previewDataUrl: isPreviewDataUrl(file.previewDataUrl) ? file.previewDataUrl : undefined,
      width: toOptionalNumber(file.width),
      height: toOptionalNumber(file.height),
    }));

  return {
    source: toOptionalString(evidenceRef.source),
    fileCount: toOptionalNumber(evidenceRef.fileCount) ?? files.length,
    files,
  };
}

function mapPhotoMeta(evidenceRef: Record<string, unknown> | null): SeguimientoPhotoMeta | null {
  return mapPhotoMetaValue(evidenceRef);
}

function mapDocumentMeta(evidenceRef: Record<string, unknown> | null): SeguimientoDocumentMeta | null {
  if (!evidenceRef || evidenceRef.source !== "r2_document_pipeline") return null;
  const file = asRecord(evidenceRef.file);
  const fileName = toOptionalString(file?.name);
  if (!fileName) return null;
  const status = evidenceRef.status === "uploading" || evidenceRef.status === "upload_failed"
    ? evidenceRef.status
    : "queued";
  return {
    status,
    fileName,
    mimeType: toOptionalString(file?.mimeType),
    sizeBytes: toOptionalNumber(file?.sizeBytes),
  };
}

function sanitizeDocumentEvidenceRef(evidenceRef: Record<string, unknown> | null) {
  if (!evidenceRef || evidenceRef.source !== "r2_document_pipeline") return evidenceRef;
  const file = asRecord(evidenceRef.file);
  return {
    source: evidenceRef.source,
    status: evidenceRef.status,
    file: file
      ? {
          name: toOptionalString(file.name),
          mimeType: toOptionalString(file.mimeType),
          sizeBytes: toOptionalNumber(file.sizeBytes),
        }
      : undefined,
  };
}

function mapEditHistory(evidenceRef: Record<string, unknown> | null): SeguimientoEditHistoryEntry[] | null {
  if (!evidenceRef) return null;

  const raw = evidenceRef.editHistory;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const mapped = raw
    .map((item): SeguimientoEditHistoryEntry | null => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
      const rec = item as Record<string, unknown>;
      const actor = asRecord(rec.actor);
      const previous = asRecord(rec.previous);
      const legacyPrevious: SeguimientoEditHistoryEntry["previous"] = {};

      if (typeof rec.previousContent === "string") legacyPrevious.content = rec.previousContent;
      if (typeof rec.previousSummary === "string" || rec.previousSummary === null) legacyPrevious.summary = rec.previousSummary;

      if (previous) {
        if (typeof previous.content === "string") legacyPrevious.content = previous.content;
        if (typeof previous.summary === "string" || previous.summary === null) legacyPrevious.summary = previous.summary;
        if (Object.prototype.hasOwnProperty.call(previous, "noteType")) {
          legacyPrevious.noteType = normalizeNoteType(previous.noteType);
        }
        if (Object.prototype.hasOwnProperty.call(previous, "priority")) {
          legacyPrevious.priority = normalizePriority(previous.priority);
        }
        if (typeof previous.highlighted === "boolean") legacyPrevious.highlighted = previous.highlighted;
        const previousMentions = mapMentions({ mentions: previous.mentions });
        if (previousMentions.length > 0) legacyPrevious.mentions = previousMentions;
        if (previous.imageEvidence === null) legacyPrevious.imageEvidence = null;
        else {
          const imageEvidence = mapPhotoMetaValue(previous.imageEvidence);
          if (imageEvidence) legacyPrevious.imageEvidence = imageEvidence;
        }
      }

      return {
        editedAt: typeof rec.editedAt === "string" ? rec.editedAt : "",
        editedBy: toOptionalString(actor?.displayName) ?? toOptionalString(rec.editedBy) ?? "",
        previous: legacyPrevious,
      };
    })
    .filter((entry): entry is SeguimientoEditHistoryEntry => entry !== null);

  return mapped.length > 0 ? mapped : null;
}

function mapMentions(evidenceRef: Record<string, unknown> | null): MentionRef[] {
  if (!evidenceRef || !Array.isArray(evidenceRef.mentions)) return []

  const unique = new Map<string, MentionRef>()

  evidenceRef.mentions
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      userId: toOptionalString(item.userId) ?? "",
      displayName: toOptionalString(item.displayName) ?? "",
      companyId: toOptionalString(item.companyId) ?? "",
    }))
    .filter((item) => item.userId && item.displayName && item.companyId)
    .forEach((item) => {
      unique.set(item.userId, item)
    })

  return Array.from(unique.values())
}

export function mapApiEntryToView(row: SeguimientoEntryApiRow): SeguimientoEntryView {
  const evidenceRef = asRecord(row.evidenceRef);

  return {
    id: row.id,
    entryType: row.entryType,
    content: row.content,
    summary: row.summary,
    authorId: row.authorId,
    authorName: row.authorName,
    evidenceRef: row.entryType === "document_evidence" ? sanitizeDocumentEvidenceRef(evidenceRef) : evidenceRef,
    createdAt: row.createdAt,
    timestamp: new Date(row.createdAt).getTime(),
    isHighlighted: row.entryType === "note" && evidenceRef?.highlighted === true,
    notePriority: row.entryType === "note" ? normalizePriority(evidenceRef?.priority) : null,
    noteType: row.entryType === "note" ? normalizeNoteType(evidenceRef?.noteType) : null,
    mailMeta: row.entryType === "mail_evidence" ? mapMailMeta(evidenceRef) : null,
    photoMeta: row.entryType === "file_photo_evidence" ? mapPhotoMeta(evidenceRef) : null,
    documentMeta: row.entryType === "document_evidence" ? mapDocumentMeta(evidenceRef) : null,
    logisticsMeta: row.entryType === "logistics_delivery" || row.entryType === "logistics_transfer"
      ? {
          remitoId: toOptionalString(evidenceRef?.remitoId),
          remitoVisibleNumber: evidenceRef?.remitoVisibleNumber !== undefined ? String(evidenceRef.remitoVisibleNumber) : undefined,
          receivedBy: toOptionalString(evidenceRef?.receivedBy),
          actualDate: toOptionalString(evidenceRef?.actualDate),
          notes: toOptionalString(evidenceRef?.notes),
          sourceSurgeryId: toOptionalString(evidenceRef?.sourceSurgeryId),
          sourceRemitoId: toOptionalString(evidenceRef?.sourceRemitoId),
        }
      : null,
    imageEvidenceMeta: row.entryType === "note" || row.entryType === "authorization_evidence"
      ? mapPhotoMetaValue(evidenceRef?.imageEvidence)
      : null,
    editHistory: mapEditHistory(evidenceRef),
    mentions: mapMentions(evidenceRef),
  };
}

export function mapSeguimientoFeedResponse(
  response: SeguimientoFeedApiResponse | SeguimientoEntryApiRow[],
  fallbackTake = 0
): SeguimientoFeedView {
  if (Array.isArray(response)) {
    return {
      entries: response.map(mapApiEntryToView),
      meta: {
        total: response.length,
        hasMore: fallbackTake > 0 ? response.length >= fallbackTake : false,
        take: fallbackTake || response.length,
      },
    };
  }

  return {
    entries: (response.entries ?? []).map(mapApiEntryToView),
    meta: response.meta,
  };
}
