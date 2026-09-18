import { useMemo, useState } from "react"
import { ChevronDown, Mail, Maximize2, Paperclip, RefreshCw, Unlink, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { MailLinkedConversationView } from "@/lib/mail-stage1/types"
import { CorreoAttachmentList } from "./CorreoAttachmentList"

function sanitizeMailHtml(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
}

function renderMessageBody(message: MailLinkedConversationView["messages"][number]) {
  if (message.bodyHtml?.trim()) {
    return (
      <div className="overflow-x-auto">
        <div
          className="prose prose-slate max-w-none break-words text-sm leading-7 prose-p:my-2 prose-br:leading-7 prose-table:block prose-table:w-full prose-table:overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeMailHtml(message.bodyHtml) }}
        />
      </div>
    )
  }

  return (
    <div className="text-sm leading-7 whitespace-pre-wrap break-words text-slate-900">
      {message.bodyText?.trim() || message.snippet || "Sin vista previa disponible del contenido."}
    </div>
  )
}

type CorreoConversationDetailProps = {
  conversation: MailLinkedConversationView
  canMutate: boolean
  canUnlink: boolean
  persistSelection: string[]
  onPersistSelectionChange: (ids: string[]) => void
  onPersistSelected: () => void
  persistLoading: boolean
  refreshLoading: boolean
  unlinkLoading: boolean
  onRefresh: () => void
  onUnlink: () => void
  companyId: string
  surgeryId: string
}

function summarizeMessage(message: MailLinkedConversationView["messages"][number]) {
  const text = message.bodyText?.trim() || message.snippet || "Sin resumen disponible."
  return text.length > 220 ? `${text.slice(0, 220)}…` : text
}

function roleLabel(role?: "from" | "to" | "cc") {
  switch (role) {
    case "from":
      return "De"
    case "to":
      return "Para"
    case "cc":
      return "CC"
    default:
      return "Participante"
  }
}

function CompactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 py-1.5 last:border-b-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  )
}

export function CorreoConversationDetail({
  conversation,
  canMutate,
  canUnlink,
  persistSelection,
  onPersistSelectionChange,
  onPersistSelected,
  persistLoading,
  refreshLoading,
  unlinkLoading,
  onRefresh,
  onUnlink,
  companyId,
  surgeryId,
}: CorreoConversationDetailProps) {
  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [metaOpen, setMetaOpen] = useState(false)
  const [fullMailOpen, setFullMailOpen] = useState(false)

  const sender = conversation.messages[0]?.from || conversation.participants[0]?.email || "Sin remitente"
  const visibleParticipants = useMemo(() => conversation.participants.slice(0, 3), [conversation.participants])
  const hiddenParticipantsCount = Math.max(0, conversation.participants.length - visibleParticipants.length)
  const primaryMessage = conversation.messages[conversation.messages.length - 1] ?? conversation.messages[0]
  const previousMessages = conversation.messages.slice(0, -1).reverse()

  return (
    <div className="min-w-0 space-y-3.5">
      <section className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                Conversación vinculada
              </Badge>
              <Badge variant="secondary" className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-700">
                {conversation.messageCount} mensaje{conversation.messageCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <h3 className="break-words text-lg font-semibold leading-tight text-slate-900 sm:text-xl">{conversation.subject}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Mail className="size-4 text-[#0f4a93]" />
              <span>Último mail: {new Date(conversation.latestMessageAt).toLocaleString("es-AR")}</span>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={!canMutate || refreshLoading} className="h-8 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
              <RefreshCw className={cn("mr-2 size-4", refreshLoading && "animate-spin")} />
              Actualizar
            </Button>
            {canUnlink ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnlink}
                disabled={unlinkLoading}
                className="h-8 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Unlink className={cn("mr-2 size-4", unlinkLoading && "animate-spin")} />
                Desvincular
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">Cabecera del correo</div>
            </div>
            <div className="space-y-3 px-4 py-3 sm:px-5">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                <CompactRow label="De" value={<span className="break-all">{sender}</span>} />
                <CompactRow label="Fecha" value={new Date(conversation.latestMessageAt).toLocaleString("es-AR")} />
                <CompactRow label="Participantes" value={`${conversation.participants.length}`} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {visibleParticipants.map((participant) => (
                  <Badge key={`${participant.role}-${participant.email}`} variant="outline" className="max-w-full rounded-md border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-700">
                    {roleLabel(participant.role)}: {participant.name?.trim() || participant.email}
                  </Badge>
                ))}

                <Badge variant="outline" className="max-w-full rounded-md border-slate-300 px-2.5 py-1 text-[11px] text-slate-600">
                  {conversation.participants.length} participante{conversation.participants.length !== 1 ? "s" : ""}
                </Badge>

                {hiddenParticipantsCount > 0 ? (
                  <Dialog open={participantsOpen} onOpenChange={setParticipantsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 rounded-md px-3 text-xs text-[#0f4a93] hover:bg-slate-100 hover:text-[#0f4a93]">
                        <Users className="mr-1 size-3" />
                        +{hiddenParticipantsCount} más
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Participantes del correo</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {(["from", "to", "cc"] as const).map((role) => {
                          const grouped = conversation.participants.filter((participant) => participant.role === role)

                          return (
                            <div key={role} className="rounded-lg border border-slate-200 p-4">
                              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {role === "from" ? "Remitente" : role === "to" ? "Destinatarios" : "CC"}
                              </div>
                              <div className="space-y-2">
                                {grouped.length > 0 ? (
                                  grouped.map((participant) => (
                                    <div key={`${role}-${participant.email}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                                      <div className="break-words font-medium">{participant.name?.trim() || participant.email}</div>
                                      {participant.name?.trim() ? (
                                        <div className="break-all text-xs text-muted-foreground">{participant.email}</div>
                                      ) : null}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-muted-foreground">Sin registros</div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">Estado local</div>
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              <CompactRow label="Importado" value={new Date(conversation.importedAt).toLocaleDateString("es-AR")} />
              <CompactRow label="Adjuntos" value={conversation.attachmentCount} />
              <CompactRow label="Evidencia" value={conversation.storedAttachmentCount} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">Correo principal</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">Último mensaje disponible en la conversación</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Dialog open={fullMailOpen} onOpenChange={setFullMailOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-md border-slate-300 bg-white hover:bg-slate-50">
                      <Maximize2 className="mr-2 size-4" />
                      Ver hilo completo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>{conversation.subject}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-2">
                      <div className="space-y-6">
                        {conversation.messages.map((message) => (
                          <div key={message.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{message.from}</span>
                              <span>{new Date(message.sentAt).toLocaleString("es-AR")}</span>
                            </div>
                            {renderMessageBody(message)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{primaryMessage?.from || sender}</span>
                {primaryMessage ? <span>{new Date(primaryMessage.sentAt).toLocaleString("es-AR")}</span> : null}
              </div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-900">
                {primaryMessage ? summarizeMessage(primaryMessage) : "Sin resumen disponible."}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
              {primaryMessage ? renderMessageBody(primaryMessage) : <div className="text-sm text-muted-foreground">Sin contenido disponible.</div>}
            </div>

            {previousMessages.length > 0 ? (
              <Collapsible className="rounded-md border border-slate-200 bg-white px-4 py-3">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-slate-800">
                  <span>Historial previo de la conversación ({previousMessages.length})</span>
                  <ChevronDown className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  {previousMessages.map((message) => (
                    <div key={message.id} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-900">{message.from}</span>
                        <span>{new Date(message.sentAt).toLocaleString("es-AR")}</span>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">{summarizeMessage(message)}</div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        </div>

        <CorreoAttachmentList
          attachments={conversation.attachments}
          canPersist={canMutate}
          selectedIds={persistSelection}
          onSelectedIdsChange={onPersistSelectionChange}
          onPersistSelected={onPersistSelected}
          persistLoading={persistLoading}
          companyId={companyId}
          surgeryId={surgeryId}
          linkId={conversation.linkId}
        />

        <Collapsible open={metaOpen} onOpenChange={setMetaOpen} className="rounded-lg border border-slate-300 bg-white px-4 py-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium">
            <span>Detalles técnicos</span>
            <ChevronDown className={cn("size-4 transition-transform", metaOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 text-xs text-muted-foreground">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
              <CompactRow label="Importado" value={new Date(conversation.importedAt).toLocaleString("es-AR")} />
              {conversation.refreshedAt ? <CompactRow label="Actualizado" value={new Date(conversation.refreshedAt).toLocaleString("es-AR")} /> : null}
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Conteo</span>
                <div className="inline-flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 border-slate-300 text-slate-700">
                <Paperclip className="size-3" />
                {conversation.attachmentCount} adjunto{conversation.attachmentCount !== 1 ? "s" : ""}
              </Badge>
                  <span>{conversation.messageCount} mensaje{conversation.messageCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      </section>
    </div>
  )
}
