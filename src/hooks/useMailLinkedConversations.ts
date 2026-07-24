"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import type { MailLinkedConversationView, MailStage1ListResponse } from "@/lib/mail-stage1/types"

export function useMailLinkedConversations(surgeryId: string | undefined) {
  const { activeCompany, currentAccess, currentUserLoading } = useAuth()
  const [data, setData] = useState<MailStage1ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingLinkId, setRefreshingLinkId] = useState<string | null>(null)
  const [persistingLinkId, setPersistingLinkId] = useState<string | null>(null)
  const [unlinkingLinkId, setUnlinkingLinkId] = useState<string | null>(null)

  const companyId = activeCompany?.id ?? process.env.NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID ?? ""

  const loadConversations = useCallback(async () => {
    if (!companyId) {
      setError("No hay companyId disponible para Correo Stage 1.")
      setLoading(false)
      return
    }

    if (!surgeryId) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiFetch<MailStage1ListResponse>(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links`
      )
      setData(response)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo cargar Correo")
    } finally {
      setLoading(false)
    }
  }, [companyId, surgeryId])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  const canMutate = useMemo(() => {
    if (data?.permissions) return data.permissions.canAttach
    if (!currentAccess?.role) return false
    return ["admin", "manager", "coordinator", "owner", "super_admin"].includes(currentAccess.role)
  }, [currentAccess?.role, data?.permissions])

  const canUnlink = useMemo(() => {
    if (data?.permissions) return data.permissions.canUnlink
    if (!currentAccess?.role) return false
    return ["admin", "manager", "owner", "super_admin"].includes(currentAccess.role)
  }, [currentAccess?.role, data?.permissions])

  const refreshConversation = useCallback(async (linkId: string) => {
    if (!companyId || !surgeryId) return null

    setRefreshingLinkId(linkId)
    try {
      const updated = await apiFetch<MailLinkedConversationView>(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links/${encodeURIComponent(linkId)}/refresh`,
        { method: "POST" }
      )

      setData((previous) =>
        previous
          ? {
              ...previous,
              conversations: previous.conversations.map((conversation) =>
                conversation.linkId === linkId ? updated : conversation
              ),
            }
          : previous
      )

      return updated
    } finally {
      setRefreshingLinkId(null)
    }
  }, [companyId, surgeryId])

  const persistSelectedAttachments = useCallback(async (linkId: string, attachmentIds: string[]) => {
    if (!companyId || !surgeryId || attachmentIds.length === 0) return null

    setPersistingLinkId(linkId)
    try {
      const updated = await apiFetch<MailLinkedConversationView>(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links/${encodeURIComponent(linkId)}/attachments/persist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachmentIds }),
        }
      )

      setData((previous) =>
        previous
          ? {
              ...previous,
              conversations: previous.conversations.map((conversation) =>
                conversation.linkId === linkId ? updated : conversation
              ),
            }
          : previous
      )

      return updated
    } finally {
      setPersistingLinkId(null)
    }
  }, [companyId, surgeryId])

  const unlinkConversation = useCallback(async (linkId: string) => {
    if (!companyId || !surgeryId) return false

    setUnlinkingLinkId(linkId)
    try {
      await apiFetch(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links/${encodeURIComponent(linkId)}`,
        { method: "DELETE" }
      )

      setData((previous) =>
        previous
          ? {
              ...previous,
              conversations: previous.conversations.filter((conversation) => conversation.linkId !== linkId),
            }
          : previous
      )

      return true
    } finally {
      setUnlinkingLinkId(null)
    }
  }, [companyId, surgeryId])

  return {
    companyId,
    currentUserLoading,
    data,
    loading,
    error,
    canMutate,
    canUnlink,
    refreshingLinkId,
    persistingLinkId,
    unlinkingLinkId,
    loadConversations,
    refreshConversation,
    persistSelectedAttachments,
    unlinkConversation,
  }
}
