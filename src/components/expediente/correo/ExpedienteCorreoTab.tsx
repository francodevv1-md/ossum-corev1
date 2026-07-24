"use client"

import { useState } from "react"
import { AlertCircle, Loader2, Lock, MailPlus, MessagesSquare, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApiClientError } from "@/lib/api/client"
import { useMailLinkedConversations } from "@/hooks/useMailLinkedConversations"
import { MAIL_STAGE1_PROVIDER } from "@/lib/mail-stage1/types"
import type { Surgery } from "@/types"
import { AttachConversationModal } from "./AttachConversationModal"
import { CorreoConversationList } from "./CorreoConversationList"
import { CorreoEmptyState } from "./CorreoEmptyState"

type ExpedienteCorreoTabProps = {
  surgery: Surgery
}

function surgeryLabel(surgery: Surgery) {
  return surgery.expedienteNumber || surgery.prNumber || surgery.id
}

export function ExpedienteCorreoTab({ surgery }: ExpedienteCorreoTabProps) {
  const [attachOpen, setAttachOpen] = useState(false)
  const {
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
  } = useMailLinkedConversations(surgery.id)

  async function handleRefresh(linkId: string) {
    try {
      await refreshConversation(linkId)
      toast.success("Snapshot de correo actualizado")
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Falló el refresh manual")
      await loadConversations()
    }
  }

  async function handlePersistSelected(linkId: string, attachmentIds: string[]) {
    try {
      const updated = await persistSelectedAttachments(linkId, attachmentIds)
      const failed = updated?.attachments.filter((attachment) => attachment.persistenceState === "persist_failed") ?? []
      if (failed.length > 0) {
        toast.warning("Algunas evidencias fallaron; quedó la metadata y podés reintentar.")
      } else if (updated) {
        toast.success("Evidencia guardada en el caso")
      }
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Falló el guardado de evidencia")
      await loadConversations()
    }
  }

  async function handleUnlink(linkId: string) {
    try {
      const removed = await unlinkConversation(linkId)
      if (removed) {
        toast.success("Conversación desvinculada del expediente")
      }
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Falló la desvinculación")
      await loadConversations()
    }
  }

  if (loading || currentUserLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Cargando Correo...
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>No se pudo cargar Correo</AlertTitle>
        <AlertDescription className="space-y-3">
          <div>{error}</div>
          <Button variant="outline" size="sm" onClick={() => void loadConversations()}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-3.5 lg:space-y-4">
      <section className="overflow-hidden rounded-lg border border-slate-300 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2 xl:max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="h-5 rounded-md border-slate-300 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Correo del caso
                </Badge>
                <Badge variant="secondary" className="h-5 rounded-md bg-slate-100 px-2 text-[10px] font-medium text-slate-700">
                  {data.conversations.length} conversación{data.conversations.length !== 1 ? "es" : ""}
                </Badge>
                {!canMutate ? (
                  <Badge variant="secondary" className="h-5 gap-1 rounded-md bg-amber-50 px-2 text-[10px] text-amber-800">
                    <Lock className="size-3" />
                    Solo lectura
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Bandeja vinculada al expediente</h2>
                <p className="max-w-3xl text-sm leading-5 text-slate-600">
                  {data.conversations.length === 0
                    ? "No hay correos vinculados a esta cirugía."
                    : `${data.conversations.length} conversación${data.conversations.length !== 1 ? "es" : ""} disponible${data.conversations.length !== 1 ? "s" : ""} para revisión operativa, descarga y guardado de evidencia.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button onClick={() => setAttachOpen(true)} disabled={!canMutate} className="h-8 rounded-md bg-[#0a4d96] px-3 text-sm font-medium hover:bg-[#083f7b]">
                <MailPlus className="mr-2 size-4" />
                Adjuntar correo
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-0 text-xs sm:grid-cols-3">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 text-slate-600 sm:border-b-0 sm:border-r sm:px-5">
            <MessagesSquare className="size-3.5 text-[#0f4a93]" />
            <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">Proveedor</span>
            <span className="text-slate-800">{MAIL_STAGE1_PROVIDER}</span>
          </div>
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 text-slate-600 sm:border-b-0 sm:border-r sm:px-5">
            <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">Buzón</span>
            <span className="truncate text-slate-800">{data.mailbox}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 text-slate-600 sm:px-5">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Lectura OSSUM + acciones sobre copia local</span>
          </div>
        </div>
      </section>

      {data.conversations.length === 0 ? (
        <CorreoEmptyState canAttach={canMutate} onAttach={() => setAttachOpen(true)} />
      ) : (
        <CorreoConversationList
          conversations={data.conversations}
          mailbox={data.mailbox}
          provider={MAIL_STAGE1_PROVIDER}
          canMutate={canMutate}
          canUnlink={canUnlink}
          refreshingLinkId={refreshingLinkId}
          persistingLinkId={persistingLinkId}
          unlinkingLinkId={unlinkingLinkId}
          onRefresh={(linkId) => void handleRefresh(linkId)}
          onPersistSelected={(linkId, attachmentIds) => void handlePersistSelected(linkId, attachmentIds)}
          onUnlink={(linkId) => void handleUnlink(linkId)}
          companyId={companyId}
          surgeryId={surgery.id}
        />
      )}

      <AttachConversationModal
        open={attachOpen}
        onOpenChange={setAttachOpen}
        companyId={companyId}
        surgeryId={surgery.id}
        surgeryLabel={surgeryLabel(surgery)}
        canAttach={canMutate}
        onAttached={async () => {
          try {
            await loadConversations()
            toast.success("Conversación vinculada al expediente")
          } catch (nextError) {
            if (nextError instanceof ApiClientError) {
              toast.error(nextError.message)
            }
          }
        }}
      />
    </div>
  )
}
