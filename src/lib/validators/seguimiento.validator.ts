import type { MentionRef } from "@/lib/mentions/types";
import { badRequest } from "../api/errors";

const MAX_PHOTO_EVIDENCE_FILES = 4;
const MAX_PHOTO_PREVIEW_DATA_URL_LENGTH = 400_000;
const MAX_PHOTO_PREVIEW_TOTAL_LENGTH = 1_000_000;

export interface SeguimientoPhotoEvidenceFileInput {
  mimeType: string;
  previewDataUrl: string;
  name?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface SeguimientoImageEvidenceInput {
  files: SeguimientoPhotoEvidenceFileInput[];
}

function validateBoundedPhotoEvidenceFiles(
  files: unknown[],
  options: { fieldLabel: string; validateMetadata?: boolean }
): SeguimientoPhotoEvidenceFileInput[] {
  if (files.length > MAX_PHOTO_EVIDENCE_FILES) {
    throw badRequest(
      `${options.fieldLabel} supports up to ${MAX_PHOTO_EVIDENCE_FILES} images per entry`,
      "photo_evidence_limit_exceeded"
    );
  }

  let totalPreviewLength = 0;
  const normalizedFiles = files.map((file, index) => {
    if (typeof file !== "object" || file === null || Array.isArray(file)) {
      throw badRequest(
        `${options.fieldLabel} files[${index}] must be an object`,
        "invalid_photo_evidence_file"
      );
    }

    const fileRecord = file as Record<string, unknown>;
    const mimeType = fileRecord.mimeType;
    const previewDataUrl = fileRecord.previewDataUrl;

    if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
      throw badRequest(
        `${options.fieldLabel} files[${index}].mimeType must be image/*`,
        "invalid_photo_evidence_mime"
      );
    }

    if (
      typeof previewDataUrl !== "string" ||
      !previewDataUrl.startsWith("data:image/")
    ) {
      throw badRequest(
        `${options.fieldLabel} files[${index}].previewDataUrl must be a data:image/* URL`,
        "invalid_photo_evidence_preview"
      );
    }

    if (previewDataUrl.length > MAX_PHOTO_PREVIEW_DATA_URL_LENGTH) {
      throw badRequest(
        `${options.fieldLabel} files[${index}] preview exceeds per-file limit`,
        "photo_evidence_preview_too_large"
      );
    }

    if (options.validateMetadata) {
      const metadataKeys = ["name", "sizeBytes", "width", "height"] as const;
      for (const key of metadataKeys) {
        const value = fileRecord[key];
        const valid =
          value === undefined ||
          (key === "name"
            ? typeof value === "string"
            : typeof value === "number" && Number.isFinite(value));

        if (!valid) {
          throw badRequest(
            `${options.fieldLabel} files[${index}].${key} must be JSON-safe`,
            "invalid_photo_evidence_file"
          );
        }
      }
    }

    totalPreviewLength += previewDataUrl.length;

    return {
      mimeType,
      previewDataUrl,
      ...(typeof fileRecord.name === "string" ? { name: fileRecord.name } : {}),
      ...(typeof fileRecord.sizeBytes === "number"
        ? { sizeBytes: fileRecord.sizeBytes }
        : {}),
      ...(typeof fileRecord.width === "number" ? { width: fileRecord.width } : {}),
      ...(typeof fileRecord.height === "number" ? { height: fileRecord.height } : {}),
    };
  });

  if (totalPreviewLength > MAX_PHOTO_PREVIEW_TOTAL_LENGTH) {
    throw badRequest(
      `${options.fieldLabel} previews exceed total payload limit`,
      "photo_evidence_payload_too_large"
    );
  }

  return normalizedFiles;
}

function validatePhotoEvidenceRef(evidenceRef: Record<string, unknown>) {
  const { files, fileCount } = evidenceRef;

  if (!Array.isArray(files) || files.length === 0) {
    throw badRequest(
      "file_photo_evidence requires a non-empty files array in evidenceRef",
      "invalid_photo_evidence_ref"
    );
  }

  if (files.length > MAX_PHOTO_EVIDENCE_FILES) {
    throw badRequest(
      `file_photo_evidence supports up to ${MAX_PHOTO_EVIDENCE_FILES} images per entry`,
      "photo_evidence_limit_exceeded"
    );
  }

  if (typeof fileCount !== "number" || fileCount !== files.length) {
    throw badRequest(
      "file_photo_evidence evidenceRef.fileCount must match files.length",
      "invalid_photo_evidence_count"
    );
  }

  validateBoundedPhotoEvidenceFiles(files, { fieldLabel: "file_photo_evidence" });
}

function validateImageEvidence(
  imageEvidence: unknown
): SeguimientoImageEvidenceInput {
  if (
    typeof imageEvidence !== "object" ||
    imageEvidence === null ||
    Array.isArray(imageEvidence)
  ) {
    throw badRequest(
      "imageEvidence must be an object with a files array",
      "invalid_image_evidence"
    );
  }

  const files = (imageEvidence as Record<string, unknown>).files;
  if (!Array.isArray(files)) {
    throw badRequest(
      "imageEvidence.files must be an array",
      "invalid_image_evidence"
    );
  }

  return {
    files: validateBoundedPhotoEvidenceFiles(files, {
      fieldLabel: "imageEvidence",
      validateMetadata: true,
    }),
  };
}

export const SEGUIMIENTO_ENTRY_TYPES = [
  "note",
  "authorization_evidence",
  "file_photo_evidence",
  "mail_evidence",
] as const;

export type SeguimientoEntryType = (typeof SEGUIMIENTO_ENTRY_TYPES)[number];

export interface SeguimientoCreateBody {
  entryType: SeguimientoEntryType;
  content: string;
  summary?: string;
  evidenceRef?: Record<string, unknown>;
  mentions?: MentionRef[];
}

export interface SeguimientoEditBody {
  content?: string;
  summary?: string;
  noteType?: "general" | "urgente" | "facturacion" | "logistica" | "coordinacion";
  priority?: "alta" | "media" | "baja";
  highlighted?: boolean;
  mentions?: MentionRef[];
  imageEvidence?: SeguimientoImageEvidenceInput;
}

export interface SeguimientoAuthorizationCreateBody {
  content: string;
  summary?: string;
  imageEvidence?: SeguimientoImageEvidenceInput;
}

function normalizeMentionRecord(
  mention: unknown,
  index: number,
  companyId?: string
): MentionRef {
  if (typeof mention !== "object" || mention === null || Array.isArray(mention)) {
    throw badRequest(
      `mentions[${index}] must be an object`,
      "invalid_mention"
    );
  }

  const record = mention as Record<string, unknown>;
  const userId = typeof record.userId === "string" ? record.userId.trim() : "";
  const displayName =
    typeof record.displayName === "string" ? record.displayName.trim() : "";
  const mentionCompanyId =
    typeof record.companyId === "string" ? record.companyId.trim() : "";

  if (!userId) {
    throw badRequest(
      `mentions[${index}].userId is required`,
      "invalid_mention_user_id"
    );
  }

  if (!displayName) {
    throw badRequest(
      `mentions[${index}].displayName is required`,
      "invalid_mention_display_name"
    );
  }

  if (!mentionCompanyId) {
    throw badRequest(
      `mentions[${index}].companyId is required`,
      "invalid_mention_company_id"
    );
  }

  if (companyId && mentionCompanyId !== companyId) {
    throw badRequest(
      `mentions[${index}].companyId must match the entry company`,
      "invalid_mention_company_context"
    );
  }

  return { userId, displayName, companyId: mentionCompanyId };
}

function normalizeMentions(
  mentions: unknown,
  companyId?: string
): MentionRef[] {
  if (!Array.isArray(mentions)) {
    throw badRequest("mentions must be an array", "invalid_mentions");
  }

  const unique = new Map<string, MentionRef>();
  mentions.forEach((mention, index) => {
    const normalized = normalizeMentionRecord(mention, index, companyId);
    unique.set(normalized.userId, normalized);
  });

  return Array.from(unique.values());
}

function extractMentions(
  data: Record<string, unknown>,
  companyId?: string
): MentionRef[] | undefined {
  if (data.mentions !== undefined) {
    return normalizeMentions(data.mentions, companyId);
  }

  if (
    data.evidenceRef &&
    typeof data.evidenceRef === "object" &&
    !Array.isArray(data.evidenceRef)
  ) {
    const evidenceRef = data.evidenceRef as Record<string, unknown>;
    if (evidenceRef.mentions !== undefined) {
      return normalizeMentions(evidenceRef.mentions, companyId);
    }
  }

  return undefined;
}

export function validateSeguimientoEditBody(
  body: unknown,
  options?: { companyId?: string }
): SeguimientoEditBody {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object", "invalid_body");
  }

  const data = body as Record<string, unknown>;

  if (data.content !== undefined) {
    if (typeof data.content !== "string" || data.content.trim().length === 0) {
      throw badRequest(
        "content must be a non-empty string when provided",
        "invalid_content"
      );
    }
  }

  if (data.summary !== undefined && typeof data.summary !== "string") {
    throw badRequest("summary must be a string when provided", "invalid_summary");
  }

  let noteType: SeguimientoEditBody["noteType"];
  if (data.noteType !== undefined) {
    if (
      data.noteType !== "general" &&
      data.noteType !== "urgente" &&
      data.noteType !== "facturacion" &&
      data.noteType !== "logistica" &&
      data.noteType !== "coordinacion"
    ) {
      throw badRequest(
        "noteType must be one of: general, urgente, facturacion, logistica, coordinacion",
        "invalid_note_type"
      );
    }
    noteType = data.noteType;
  }

  let priority: SeguimientoEditBody["priority"];
  if (data.priority !== undefined) {
    if (
      data.priority !== "alta" &&
      data.priority !== "media" &&
      data.priority !== "baja"
    ) {
      throw badRequest(
        "priority must be one of: alta, media, baja",
        "invalid_priority"
      );
    }
    priority = data.priority;
  }

  if (data.highlighted !== undefined && typeof data.highlighted !== "boolean") {
    throw badRequest("highlighted must be a boolean", "invalid_highlighted");
  }

  const mentions = extractMentions(data, options?.companyId);
  const imageEvidence =
    data.imageEvidence !== undefined
      ? validateImageEvidence(data.imageEvidence)
      : undefined;

  if (
    data.content === undefined &&
    data.summary === undefined &&
    noteType === undefined &&
    mentions === undefined &&
    priority === undefined &&
    data.highlighted === undefined &&
    imageEvidence === undefined
  ) {
    throw badRequest(
      "At least one editable field must be provided",
      "missing_edit_fields"
    );
  }

  return {
    content: data.content !== undefined ? data.content.trim() : undefined,
    summary: data.summary !== undefined ? data.summary : undefined,
    noteType,
    priority,
    highlighted: data.highlighted as boolean | undefined,
    mentions,
    imageEvidence,
  };
}

export function validateSeguimientoAuthorizationCreateBody(
  body: unknown
): SeguimientoAuthorizationCreateBody {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object", "invalid_body");
  }

  const data = body as Record<string, unknown>;
  const allowedFields = new Set(["content", "summary", "imageEvidence"]);
  const rejectedField = Object.keys(data).find((key) => !allowedFields.has(key));
  if (rejectedField) {
    throw badRequest(
      `authorization evidence body does not accept ${rejectedField}`,
      "invalid_body"
    );
  }

  if (typeof data.content !== "string" || data.content.trim().length === 0) {
    throw badRequest(
      "authorization evidence content is required and must be a non-empty string",
      "missing_authorization_content"
    );
  }

  if (data.summary !== undefined && typeof data.summary !== "string") {
    throw badRequest("summary must be a string when provided", "invalid_summary");
  }

  return {
    content: data.content.trim(),
    summary: data.summary,
    imageEvidence:
      data.imageEvidence !== undefined
        ? validateImageEvidence(data.imageEvidence)
        : undefined,
  };
}

export function validateSeguimientoCreateBody(
  body: unknown,
  options?: { companyId?: string }
): SeguimientoCreateBody {
  if (typeof body !== "object" || body === null) {
    throw badRequest("Request body must be a JSON object", "invalid_body");
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.entryType !== "string" ||
    !SEGUIMIENTO_ENTRY_TYPES.includes(data.entryType as SeguimientoEntryType)
  ) {
    throw badRequest(
      `entryType must be one of: ${SEGUIMIENTO_ENTRY_TYPES.join(", ")}`,
      "invalid_entry_type"
    );
  }

  if (typeof data.content !== "string" || data.content.trim().length === 0) {
    throw badRequest(
      "content is required and must be a non-empty string",
      "missing_content"
    );
  }

  if (data.summary !== undefined && data.summary !== null) {
    if (typeof data.summary !== "string") {
      throw badRequest("summary must be a string when provided", "invalid_summary");
    }
  }

  if (
    data.entryType === "file_photo_evidence" &&
    (data.evidenceRef === undefined || data.evidenceRef === null)
  ) {
    throw badRequest(
      "file_photo_evidence requires evidenceRef metadata",
      "missing_photo_evidence_ref"
    );
  }

  if (data.evidenceRef !== undefined && data.evidenceRef !== null) {
    if (typeof data.evidenceRef !== "object" || Array.isArray(data.evidenceRef)) {
      throw badRequest(
        "evidenceRef must be a JSON object when provided",
        "invalid_evidence_ref"
      );
    }

    if (data.entryType === "file_photo_evidence") {
      validatePhotoEvidenceRef(data.evidenceRef as Record<string, unknown>);
    }
  }

  const mentions = extractMentions(data, options?.companyId);

  return {
    entryType: data.entryType as SeguimientoEntryType,
    content: data.content.trim(),
    summary: data.summary !== undefined ? String(data.summary) : undefined,
    mentions,
    evidenceRef:
      data.evidenceRef !== undefined
        ? (data.evidenceRef as Record<string, unknown>)
        : undefined,
  };
}
