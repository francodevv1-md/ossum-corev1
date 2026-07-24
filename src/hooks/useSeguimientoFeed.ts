"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import type { SeguimientoEntryApiRow, SeguimientoEntryView, SeguimientoFeedApiResponse, SeguimientoNotePriority, SeguimientoNoteType } from "@/lib/api/seguimiento-adapter";
import { mapSeguimientoFeedResponse } from "@/lib/api/seguimiento-adapter";
import { MAIL_STAGE1_PROVIDER, type MailLinkedConversationView } from "@/lib/mail-stage1/types";
import type { MentionRef } from "@/lib/mentions/types";

export type SeguimientoFeedFilters = {
  entryType?: string;
};

const DEFAULT_TAKE = 50;
const LOAD_MORE_STEP = 50;

export type { SeguimientoNotePriority, SeguimientoNoteType } from "@/lib/api/seguimiento-adapter";

type AddNoteInput = {
  content: string;
  summary?: string;
  priority?: SeguimientoNotePriority;
  highlighted?: boolean;
  noteType?: SeguimientoNoteType;
  mentions?: MentionRef[];
};

export type SeguimientoPhotoEvidenceFileInput = {
  name?: string;
  mimeType: string;
  sizeBytes: number;
  previewDataUrl: string;
  width?: number;
  height?: number;
};

type AddPhotoEvidenceInput = {
  content: string;
  summary?: string;
  files: SeguimientoPhotoEvidenceFileInput[];
  noteType?: SeguimientoNoteType;
  priority?: SeguimientoNotePriority;
  highlighted?: boolean;
  mentions?: MentionRef[];
};

export type SeguimientoEventEditInput = {
  content?: string;
  summary?: string;
  noteType?: SeguimientoNoteType;
  priority?: SeguimientoNotePriority;
  highlighted?: boolean;
  mentions?: MentionRef[];
  imageEvidence?: { files: SeguimientoPhotoEvidenceFileInput[] };
};

export type CreateAuthorizationEvidenceInput = {
  content: string;
  summary?: string;
  imageEvidence?: { files: SeguimientoPhotoEvidenceFileInput[] };
};

function normalizeMentions(mentions?: MentionRef[]) {
  if (!mentions) return undefined;

  const unique = new Map<string, MentionRef>();
  mentions.forEach((mention) => {
    if (!mention?.userId || !mention?.displayName || !mention?.companyId) return;
    unique.set(mention.userId, mention);
  });

  return Array.from(unique.values());
}

function buildMailEvidencePayload(conversation: MailLinkedConversationView) {
  return {
    entryType: "mail_evidence",
    summary: conversation.subject,
    content: "Conversación destacada manualmente desde Correo del caso.",
    evidenceRef: {
      source: "mail_stage1",
      highlighted: true,
      provider: MAIL_STAGE1_PROVIDER,
      linkId: conversation.linkId,
      conversationKey: conversation.conversationKey,
      externalConversationId: conversation.externalConversationId,
      subject: conversation.subject,
      participantsSummary: conversation.participantsSummary,
      latestMessageAt: conversation.latestMessageAt,
      importedAt: conversation.importedAt,
      refreshedAt: conversation.refreshedAt,
      messageCount: conversation.messageCount,
      attachmentCount: conversation.attachmentCount,
    },
  };
}

export function useSeguimientoFeed(surgeryId: string | undefined) {
  const { activeCompany } = useAuth();
  const [entries, setEntries] = useState<SeguimientoEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [addingPhotoEvidence, setAddingPhotoEvidence] = useState(false);
  const [addingAuthorizationEvidence, setAddingAuthorizationEvidence] = useState(false);
  const [importingFromMail, setImportingFromMail] = useState(false);
  const [highlightingMailLinkId, setHighlightingMailLinkId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [take, setTake] = useState(DEFAULT_TAKE);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const companyId = activeCompany?.id;

  const fetchEntries = useCallback(async (
    filters?: SeguimientoFeedFilters,
    options?: { take?: number; keepVisible?: boolean }
  ) => {
    if (!companyId || !surgeryId) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (options?.keepVisible) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.entryType) params.set("entryType", filters.entryType);
      params.set("take", String(options?.take ?? take));
      params.set("diag", "1");

      const requestedTake = options?.take ?? take;
      const data = await apiFetch<SeguimientoFeedApiResponse | SeguimientoEntryApiRow[]>(
        `/api/companies/${companyId}/surgeries/${surgeryId}/seguimiento?${params.toString()}`
      );

      const feed = mapSeguimientoFeedResponse(data, requestedTake);

      setEntries(feed.entries);
      setTotal(feed.meta.total);
      setHasMore(feed.meta.hasMore);
      setTake(feed.meta.take);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Error al cargar el seguimiento";
      setError(message);
      setEntries([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      if (options?.keepVisible) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [companyId, surgeryId, take]);

  // Fetch on mount and when companyId/surgeryId change
  useEffect(() => {
    void Promise.resolve().then(() => fetchEntries());
  }, [fetchEntries]);

  const addNote = useCallback(async (input: string | AddNoteInput, summary?: string) => {
    if (!companyId || !surgeryId) {
      throw new Error("Missing company or surgery context");
    }

    const payload: AddNoteInput = typeof input === "string"
      ? { content: input, summary }
      : input;
    const mentions = normalizeMentions(payload.mentions);

    setAddingNote(true);

    try {
      const entry = await apiFetch<SeguimientoEntryApiRow>(
        `/api/companies/${companyId}/surgeries/${surgeryId}/seguimiento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: "note",
            content: payload.content,
            summary: payload.summary || undefined,
            mentions,
            evidenceRef: {
              priority: payload.priority ?? "media",
              highlighted: payload.highlighted === true,
              noteType: payload.noteType ?? "general",
            },
          }),
        }
      );

      // Refetch to get the updated list
      await fetchEntries();
      return entry;
    } finally {
      setAddingNote(false);
    }
  }, [companyId, surgeryId, fetchEntries]);

  const addMailEvidence = useCallback(async (conversation: MailLinkedConversationView) => {
    if (!companyId || !surgeryId) {
      throw new Error("Missing company or surgery context");
    }

    setHighlightingMailLinkId(conversation.linkId);

    try {
      await apiFetch<SeguimientoEntryApiRow>(
        `/api/companies/${companyId}/surgeries/${surgeryId}/seguimiento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildMailEvidencePayload(conversation)),
        }
      );

      await fetchEntries();
    } finally {
      setHighlightingMailLinkId(null);
    }
  }, [companyId, surgeryId, fetchEntries]);

  const addPhotoEvidence = useCallback(async (input: AddPhotoEvidenceInput) => {
    if (!companyId || !surgeryId) {
      throw new Error("Missing company or surgery context");
    }

    setAddingPhotoEvidence(true);
    const mentions = normalizeMentions(input.mentions);

    try {
      await apiFetch<SeguimientoEntryApiRow>(
        `/api/companies/${companyId}/surgeries/${surgeryId}/seguimiento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: "file_photo_evidence",
            content: input.content,
            summary: input.summary || undefined,
            mentions,
            evidenceRef: {
              source: "manual_upload",
              fileCount: input.files.length,
              files: input.files,
              noteType: input.noteType ?? "general",
              priority: input.priority ?? "media",
              highlighted: input.highlighted === true,
            },
          }),
        }
      );

      await fetchEntries();
    } finally {
      setAddingPhotoEvidence(false);
    }
  }, [companyId, surgeryId, fetchEntries]);

  const createAuthorizationEvidence = useCallback(async (sourceEntryId: string, input: CreateAuthorizationEvidenceInput) => {
    if (!companyId || !surgeryId) {
      throw new Error("Missing company or surgery context");
    }

    setAddingAuthorizationEvidence(true);
    try {
      await apiFetch<SeguimientoEntryApiRow>(
        `/api/companies/${companyId}/surgeries/${surgeryId}/seguimiento/${sourceEntryId}/authorization-evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: input.content,
            summary: input.summary || undefined,
            ...(input.imageEvidence ? { imageEvidence: input.imageEvidence } : {}),
          }),
        }
      );

      await fetchEntries();
    } finally {
      setAddingAuthorizationEvidence(false);
    }
  }, [companyId, surgeryId, fetchEntries]);

  const importFromMail = useCallback(async (input: {
    entryType: "note" | "authorization_evidence" | "file_photo_evidence";
    content: string;
    summary?: string;
    evidenceRef?: Record<string, unknown>;
    externalConversationId: string;
    surgeryLabel: string;
  }) => {
    if (!companyId || !surgeryId) {
      throw new Error("Missing company or surgery context");
    }

    setImportingFromMail(true);

    try {
      // 1. Link the conversation
      await apiFetch(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            externalConversationId: input.externalConversationId,
            surgeryLabel: input.surgeryLabel,
          }),
        }
      );

      // 2. Create the seguimiento entry
      await apiFetch<SeguimientoEntryApiRow>(
        `/api/companies/${companyId}/surgeries/${surgeryId}/seguimiento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: input.entryType,
            content: input.content,
            summary: input.summary || undefined,
            evidenceRef: input.evidenceRef || undefined,
          }),
        }
      );

      // 3. Refetch
      await fetchEntries();
    } finally {
      setImportingFromMail(false);
    }
  }, [companyId, surgeryId, fetchEntries]);

  const editEntry = useCallback(async (entryId: string, edits: SeguimientoEventEditInput) => {
    if (!companyId || !surgeryId) throw new Error("Missing context");

    setEditingEntryId(entryId);
    try {
      const mentions = normalizeMentions(edits.mentions);
      await apiFetch<SeguimientoEntryApiRow>(
        `/api/companies/${companyId}/surgeries/${surgeryId}/seguimiento/${entryId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(edits.content !== undefined ? { content: edits.content } : {}),
            ...(edits.summary !== undefined ? { summary: edits.summary } : {}),
            ...(edits.noteType !== undefined ? { noteType: edits.noteType } : {}),
            ...(edits.priority !== undefined ? { priority: edits.priority } : {}),
            ...(edits.highlighted !== undefined ? { highlighted: edits.highlighted } : {}),
            ...(edits.mentions !== undefined ? { mentions } : {}),
            ...(edits.imageEvidence !== undefined ? { imageEvidence: edits.imageEvidence } : {}),
          }),
        }
      );
      await fetchEntries();
    } finally {
      setEditingEntryId(null);
    }
  }, [companyId, surgeryId, fetchEntries]);

  const highlightedEntries = useMemo(
    () => entries.filter((entry) => entry.isHighlighted),
    [entries]
  );

  const loadMore = useCallback(async () => {
    const nextTake = take + LOAD_MORE_STEP;
    await fetchEntries(undefined, { take: nextTake, keepVisible: true });
  }, [fetchEntries, take]);

  const canLoadMore = hasMore;

  const refetch = useCallback(async () => {
    await fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    loadingMore,
    error,
    addNote,
    addMailEvidence,
    addPhotoEvidence,
    createAuthorizationEvidence,
    importFromMail,
    addingNote,
    addingPhotoEvidence,
    addingAuthorizationEvidence,
    importingFromMail,
    highlightingMailLinkId,
    highlightedEntries,
    editEntry,
    editingEntryId,
    take,
    total,
    canLoadMore,
    loadMore,
    refetch,
  };
}
