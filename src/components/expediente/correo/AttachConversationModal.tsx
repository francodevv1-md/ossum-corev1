import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check, Cloud, Download, Loader2, Paperclip, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch, ApiClientError } from "@/lib/api/client"
import type { AttachConversationInput, MailboxConversationBrowseItem, MailStage1BrowseResponse } from "@/lib/mail-stage1/types"
import { CorreoAttachmentList } from "./CorreoAttachmentList"

type AttachConversationModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  surgeryId: string
  surgeryLabel: string
  canAttach: boolean
  onAttached: () => Promise<void> | void
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm mb-4">
      {([1, 2, 3] as const).map((s, i) => (
        <span key={s} className="flex items-center gap-1">
          <span
            className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s < step ? <Check className="size-3" /> : s}
          </span>
          <span className={s === step ? "font-medium text-foreground" : "text-muted-foreground"}>
            {s === 1 ? "Seleccionar" : s === 2 ? "Revisar" : "Confirmar"}
          </span>
          {i < 2 ? <span className="text-muted-foreground mx-1">→</span> : null}
        </span>
      ))}
    </div>
  )
}

export function AttachConversationModal({
  open,
  onOpenChange,
  companyId,
  surgeryId,
  surgeryLabel,
  canAttach,
  onAttached,
}: AttachConversationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<MailboxConversationBrowseItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [warningAcknowledged, setWarningAcknowledged] = useState(false)
  const [crossLinkReason, setCrossLinkReason] = useState("")

  useEffect(() => {
    if (!open || !companyId || !surgeryId) return

    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    setLoading(true)
    setError(null)

    apiFetch<MailStage1BrowseResponse>(
      `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mailbox/conversations?limit=20&query=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    )
      .then((response) => {
        if (cancelled) return
        setItems(response.conversations)
        if (!selectedId && response.conversations[0]) {
          setSelectedId(response.conversations[0].externalConversationId)
        }
      })
      .catch((nextError) => {
        if (cancelled) return
        if (nextError instanceof DOMException && nextError.name === "AbortError") {
          setError("La búsqueda tardó demasiado. Reintentá.")
        } else {
          setError(nextError instanceof Error ? nextError.message : "No se pudo cargar el mailbox")
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [companyId, open, query, surgeryId])

  useEffect(() => {
    if (!open) {
      setStep(1)
      setQuery("")
      setSelectedId(null)
      setSelectedAttachments([])
      setWarningAcknowledged(false)
      setCrossLinkReason("")
      setError(null)
    }
  }, [open])

  const selectedConversation = useMemo(
    () => items.find((item) => item.externalConversationId === selectedId) ?? null,
    [items, selectedId]
  )
  const requiresCrossLinkReason = Boolean(
    selectedConversation?.linkedSurgeries.some((linked) => linked.surgeryId !== surgeryId)
  )

  const canGoToStep2 = Boolean(selectedConversation && !selectedConversation.alreadyLinkedToCurrentSurgery)
  const canConfirm = Boolean(
    canAttach &&
      selectedConversation &&
      !selectedConversation.alreadyLinkedToCurrentSurgery &&
      (!requiresCrossLinkReason || (warningAcknowledged && crossLinkReason.trim().length > 0))
  )

  function handleSelectItem(item: MailboxConversationBrowseItem) {
    setSelectedId(item.externalConversationId)
    setSelectedAttachments([])
    setWarningAcknowledged(false)
    setCrossLinkReason("")
    setStep(1)
  }

  async function handleConfirm() {
    if (!selectedConversation || !canConfirm) return

    setSubmitting(true)
    setError(null)

    try {
      const payload: AttachConversationInput = {
        externalConversationId: selectedConversation.externalConversationId,
        surgeryLabel,
        warningAcknowledged: requiresCrossLinkReason ? warningAcknowledged : undefined,
        crossLinkReason: requiresCrossLinkReason ? crossLinkReason.trim() : undefined,
        criticalAttachmentIds: selectedAttachments,
      }

      await apiFetch(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      await onAttached()
      onOpenChange(false)
    } catch (nextError) {
      if (nextError instanceof ApiClientError && nextError.code === "mail_conversation_already_linked") {
        setError("La conversación ya está vinculada a esta cirugía.")
      } else {
        setError(nextError instanceof Error ? nextError.message : "No se pudo vincular la conversación")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Adjuntar correo</DialogTitle>
          <DialogDescription>
            Vinculá una conversación de correo electrónico a este expediente.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        {/* ── Step 1: Selection ── */}
        {step === 1 ? (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conversación" className="pl-9" />
              </div>

              <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-lg border p-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Cargando...
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No hay conversaciones para mostrar.</div>
                ) : (
                  items.map((item) => (
                    <button
                      type="button"
                      key={item.externalConversationId}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full rounded-md border p-3 text-left transition ${selectedId === item.externalConversationId ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm truncate">{item.subject}</div>
                        {item.hasLocalSnapshot ? (
                          <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                            <Download className="size-3" />
                            Ya importada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                            <Cloud className="size-3" />
                            Solo en Gmail
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">{item.participantsSummary}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">{item.messageCount} mensajes</Badge>
                        {item.attachments.length > 0 ? (
                          <Badge variant="outline" className="text-xs">{item.attachments.length} adjuntos</Badge>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              {selectedConversation ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold">{selectedConversation.subject}</h3>
                    <p className="text-sm text-muted-foreground">{selectedConversation.participantsSummary}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{new Date(selectedConversation.latestMessageAt).toLocaleString("es-AR", { dateStyle: "short" })}</span>
                      <span>· {selectedConversation.messageCount} mensajes</span>
                    </div>
                    <p className="text-sm">{selectedConversation.previewSnippet}</p>
                  </div>

                  {selectedConversation.alreadyLinkedToCurrentSurgery ? (
                    <Alert>
                      <AlertTriangle className="size-4" />
                      <AlertTitle>Ya vinculada a esta cirugía</AlertTitle>
                      <AlertDescription>
                        Esta conversación ya está adjunta a este expediente. No se puede crear un vínculo duplicado.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Seleccioná una conversación de la lista.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── Step 2: Review ── */}
        {step === 2 && selectedConversation ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{selectedConversation.subject}</h3>
                  <p className="text-sm text-muted-foreground">{selectedConversation.participantsSummary}</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Paperclip className="size-3" />
                  {selectedConversation.attachments.length} adjunto{selectedConversation.attachments.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Último mensaje: {new Date(selectedConversation.latestMessageAt).toLocaleString("es-AR")}
              </div>
              <p className="text-sm text-muted-foreground">{selectedConversation.previewSnippet}</p>
            </div>

            {requiresCrossLinkReason ? (
              <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                <AlertTriangle className="size-4" />
                <AlertTitle>Advertencia: conversación vinculada a otras cirugías</AlertTitle>
                <AlertDescription className="space-y-3">
                  <div>
                    Ya está vinculada a: {selectedConversation.linkedSurgeries.map((linked) => linked.surgeryLabel).join(", ")}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={warningAcknowledged} onCheckedChange={(value) => setWarningAcknowledged(Boolean(value))} />
                    Confirmo que el multivínculo es intencional.
                  </label>
                  <Textarea
                    value={crossLinkReason}
                    onChange={(event) => setCrossLinkReason(event.target.value)}
                    placeholder="Motivo obligatorio del multivínculo"
                  />
                </AlertDescription>
              </Alert>
            ) : null}

            <CorreoAttachmentList
              attachments={selectedConversation.attachments}
              canPersist={canAttach}
              selectedIds={selectedAttachments}
              onSelectedIdsChange={setSelectedAttachments}
            />
          </div>
        ) : null}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && selectedConversation ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-base font-semibold">{selectedConversation.subject}</h3>
              <p className="text-sm text-muted-foreground">{selectedConversation.participantsSummary}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{selectedConversation.messageCount} mensajes</Badge>
                {selectedAttachments.length > 0 ? (
                  <Badge variant="secondary">{selectedAttachments.length} adjunto{selectedAttachments.length !== 1 ? "s" : ""} seleccionado{selectedAttachments.length !== 1 ? "s" : ""}</Badge>
                ) : (
                  <Badge variant="outline">Sin adjuntos seleccionados</Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              ¿Confirmás el vínculo de esta conversación al expediente <strong>{surgeryLabel}</strong>?
            </p>

            {error ? <p className="text-sm text-destructive text-center">{error}</p> : null}
          </div>
        ) : null}

        {/* ── Footer ── */}
        <DialogFooter className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <div className="flex gap-2">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)}>
                Atrás
              </Button>
            ) : null}

            {step === 1 ? (
              <Button disabled={!canGoToStep2} onClick={() => setStep(2)}>
                Siguiente
              </Button>
            ) : step === 2 ? (
              <Button disabled={!canConfirm} onClick={() => setStep(3)}>
                Siguiente
              </Button>
            ) : (
              <Button disabled={!canConfirm || submitting} onClick={handleConfirm}>
                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Paperclip className="mr-2 size-4" />}
                Confirmar vínculo
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
