import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Mail, Paperclip, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { MailAttachmentRecord, MailLinkedConversationView } from "@/lib/mail-stage1/types"
import { classifyMailAttachment } from "@/lib/mail-stage1/types"
import { cn } from "@/lib/utils"
import { CorreoConversationDetail } from "./CorreoConversationDetail"

type CorreoConversationListProps = {
  conversations: MailLinkedConversationView[]
  mailbox: string
  provider: string
  canMutate: boolean
  canUnlink: boolean
  refreshingLinkId?: string | null
  persistingLinkId?: string | null
  unlinkingLinkId?: string | null
  onRefresh: (linkId: string) => void
  onPersistSelected: (linkId: string, attachmentIds: string[]) => void
  onUnlink: (linkId: string) => void
  companyId: string
  surgeryId: string
}

export function CorreoConversationList({
  conversations,
  mailbox,
  provider,
  canMutate,
  canUnlink,
  refreshingLinkId,
  persistingLinkId,
  unlinkingLinkId,
  onRefresh,
  onPersistSelected,
  onUnlink,
  companyId,
  surgeryId,
}: CorreoConversationListProps) {
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(conversations[0]?.linkId ?? null)
  const [persistSelections, setPersistSelections] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedLinkId(null)
      return
    }

    setSelectedLinkId((current) =>
      current && conversations.some((conversation) => conversation.linkId === current)
        ? current
        : conversations[0].linkId
    )
  }, [conversations])

  useEffect(() => {
    setPersistSelections((current) => {
      const next: Record<string, string[]> = {}

      for (const conversation of conversations) {
        next[conversation.linkId] =
          current[conversation.linkId] ??
          conversation.attachments
            .filter(
              (attachment) =>
                attachment.isCriticalSelected &&
                (attachment.persistenceState === "metadata_only" || attachment.persistenceState === "persist_failed")
            )
            .map((attachment) => attachment.attachmentId)
      }

      return next
    })
  }, [conversations])

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.linkId === selectedLinkId) ?? conversations[0],
    [conversations, selectedLinkId]
  )

  function countCaseDocuments(attachments: MailAttachmentRecord[]) {
    return attachments.filter((attachment) => classifyMailAttachment({ ...attachment, totalAttachments: attachments.length }) === "case_document").length
  }

  return (
    <div className="grid min-w-0 gap-3.5 xl:grid-cols-[minmax(0,1fr)_290px] 2xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="order-2 space-y-3 xl:order-2 xl:sticky xl:top-3 xl:self-start">
        <section className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          <div className="space-y-3 px-4 py-3 text-sm">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">Buzón vinculado</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="h-5 rounded-md bg-slate-100 px-2 text-[10px] capitalize text-slate-700">{provider}</Badge>
                <Badge variant="outline" className="h-5 max-w-[180px] rounded-md border-slate-300 px-2 text-[10px] text-slate-700">{mailbox}</Badge>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 text-xs last:border-b-0">
                <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">Conversaciones</span>
                <span className="font-semibold text-slate-900">{conversations.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">Adjuntos</span>
                <span className="font-semibold text-slate-900">
                  {conversations.reduce((total, conversation) => total + conversation.attachmentCount, 0)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">Conversaciones</div>
          <div className="divide-y divide-slate-200">
            {conversations.map((conversation) => {
              const caseDocumentCount = countCaseDocuments(conversation.attachments)
              const isSelected = conversation.linkId === selectedConversation?.linkId

              return (
                <button
                  key={conversation.linkId}
                  type="button"
                  onClick={() => setSelectedLinkId(conversation.linkId)}
                  className={cn(
                    "w-full border-l-2 border-l-transparent px-4 py-3 text-left transition hover:bg-slate-50",
                    isSelected && "border-l-[#0f4a93] bg-slate-50"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-[13px] font-semibold leading-5 text-slate-900">{conversation.subject}</div>
                        <div className="truncate text-[11px] text-slate-500">{conversation.participantsSummary}</div>
                      </div>
                      <div className="shrink-0 text-[10px] font-medium text-slate-500">
                        {new Date(conversation.latestMessageAt).toLocaleDateString("es-AR", { dateStyle: "short" })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <Badge variant="outline" className="h-5 gap-1 rounded-md border-slate-300 px-2 text-[10px] text-slate-700">
                        <Mail className="size-3" />
                        {conversation.messageCount}
                      </Badge>
                      {caseDocumentCount > 0 ? (
                        <Badge variant="outline" className="h-5 gap-1 rounded-md border-slate-300 px-2 text-[10px] text-slate-700">
                          <Paperclip className="size-3" />
                          {caseDocumentCount} doc.
                        </Badge>
                      ) : null}
                      <Badge variant={conversation.refreshedAt ? "secondary" : "outline"} className={cn(
                        "h-5 gap-1 rounded-md px-2 text-[10px]",
                        conversation.refreshedAt ? "bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700"
                      )}>
                        {conversation.refreshedAt ? <RefreshCw className="size-3" /> : <CheckCircle2 className="size-3" />}
                        {conversation.refreshedAt ? "Sync" : "Import."}
                      </Badge>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="order-1 min-w-0 xl:order-1">
      {selectedConversation ? (
        <CorreoConversationDetail
          conversation={selectedConversation}
          canMutate={canMutate}
          canUnlink={canUnlink}
          persistSelection={persistSelections[selectedConversation.linkId] ?? []}
          onPersistSelectionChange={(ids) =>
            setPersistSelections((current) => ({
              ...current,
              [selectedConversation.linkId]: ids,
            }))
          }
          onPersistSelected={() =>
            onPersistSelected(selectedConversation.linkId, persistSelections[selectedConversation.linkId] ?? [])
          }
          persistLoading={persistingLinkId === selectedConversation.linkId}
          refreshLoading={refreshingLinkId === selectedConversation.linkId}
          unlinkLoading={unlinkingLinkId === selectedConversation.linkId}
          onRefresh={() => onRefresh(selectedConversation.linkId)}
          onUnlink={() => onUnlink(selectedConversation.linkId)}
          companyId={companyId}
          surgeryId={surgeryId}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-muted-foreground">
            Seleccioná una conversación para ver el contenido del correo y sus adjuntos.
        </div>
      )}
      </div>
    </div>
  )
}
