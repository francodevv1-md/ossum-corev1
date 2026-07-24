"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Download,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Search,
  ShieldCheck,
  MessageSquare,
  ImageIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch, ApiClientError } from "@/lib/api/client"
import type {
  AttachConversationInput,
  MailLinkedConversationView,
  MailboxConversationBrowseItem,
  MailStage1BrowseResponse,
} from "@/lib/mail-stage1/types"
import { CorreoAttachmentList } from "./CorreoAttachmentList"
import { toast } from "sonner"

// ── Types ──

type ImportEvidenceFromMailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  surgeryId: string
  surgeryLabel: string
  canAttach: boolean
  onImported: () => Promise<void> | void
}

type EvidenceSaveMode = "note" | "authorization_evidence" | "file_photo_evidence"

const SAVE_MODE_OPTIONS: Array<{
  value: EvidenceSaveMode
  label: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
}> = [
  {
    value: "note",
    label: "Como nota de seguimiento",
    description: "El texto o resumen se guarda como actualización visible en el feed.",
    Icon: MessageSquare,
  },
  {
    value: "authorization_evidence",
    label: "Como evidencia autorizada",
    description: "Queda registrada como confirmación formal dentro del expediente.",
    Icon: ShieldCheck,
  },
  {
    value: "file_photo_evidence",
    label: "Como respaldo visual",
    description: "Los archivos seleccionados se muestran como evidencia visual del caso.",
    Icon: ImageIcon,
  },
]

// ── Step indicator ──

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-sm mb-4">
      {Array.from({ length: total }, (_, i) => i + 1).map((s, idx) => (
        <span key={s} className="flex items-center gap-1">
          <span
            className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </span>
          <span
            className={s === step ? "font-medium text-foreground" : "text-muted-foreground"}
          >
            {s === 1 ? "Buscar" : "Importar"}
          </span>
          {idx < total - 1 && <span className="text-muted-foreground mx-1">→</span>}
        </span>
      ))}
    </div>
  )
}

// ── Main component ──

export function ImportEvidenceFromMailModal({
  open,
  onOpenChange,
  companyId,
  surgeryId,
  surgeryLabel,
  canAttach,
  onImported,
}: ImportEvidenceFromMailModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<MailboxConversationBrowseItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [evidenceTab, setEvidenceTab] = useState<"text" | "files">("text")
  const [saveMode, setSaveMode] = useState<EvidenceSaveMode>("note")
  const [editedText, setEditedText] = useState("")

  // ── Reset on open/close ──

  useEffect(() => {
    if (!open) {
      setStep(1)
      setQuery("")
      setSelectedId(null)
      setSelectedAttachments([])
      setEvidenceTab("text")
      setSaveMode("note")
      setEditedText("")
      setError(null)
    }
  }, [open])

  // ── Step 1: Load conversations ──

  useEffect(() => {
    if (!open || !companyId || !surgeryId) return
    if (step !== 1) return

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
  }, [companyId, open, query, surgeryId, step])

  // ── Derived state ──

  const selectedConversation = useMemo(
    () => items.find((item) => item.externalConversationId === selectedId) ?? null,
    [items, selectedId]
  )

  const canGoToStep2 =
    selectedConversation !== null && !selectedConversation.alreadyLinkedToCurrentSurgery

  const hasFiles = selectedAttachments.length > 0

  const canConfirm = Boolean(
    canAttach &&
      selectedConversation &&
      (saveMode === "file_photo_evidence" ? hasFiles : editedText.trim().length > 0)
  )

  // ── Prefill text when conversation changes ──

  useEffect(() => {
    if (selectedConversation?.latestMessageBodyText) {
      setEditedText(selectedConversation.latestMessageBodyText)
    } else {
      setEditedText("")
    }
  }, [selectedConversation])

  // ── Handlers ──

  function handleSelectItem(item: MailboxConversationBrowseItem) {
    setSelectedId(item.externalConversationId)
    setSelectedAttachments([])
    setStep(1)
  }

  function handleGoToStep2() {
    if (!canGoToStep2) return
    setStep(2)

    // Default to files tab if there are attachments and no text
    if (selectedConversation) {
      const hasAttachments = selectedConversation.attachments.length > 0
      const hasText = Boolean(selectedConversation.latestMessageBodyText?.trim())
      if (hasAttachments && !hasText) {
        setEvidenceTab("files")
        setSaveMode("file_photo_evidence")
      } else {
        setEvidenceTab("text")
        setSaveMode("note")
      }
    }
  }

  function buildContentDescription(): string {
    if (saveMode === "file_photo_evidence") {
      const fileCount = selectedAttachments.length
      const selectedFiles = selectedConversation?.attachments.filter(
        (a) => selectedAttachments.includes(a.attachmentId)
      ) ?? []
      const firstName = selectedFiles[0]?.fileName || "Archivo"
      return fileCount === 1
        ? `Se importó el archivo "${firstName}" desde correo como respaldo visual.`
        : `Se importaron ${fileCount} archivos desde correo como respaldo visual (${firstName} + ${fileCount - 1} más).`
    }

    return editedText.trim()
  }

  function buildSummary(): string {
    if (saveMode === "file_photo_evidence") {
      const selectedFiles = selectedConversation?.attachments.filter(
        (a) => selectedAttachments.includes(a.attachmentId)
      ) ?? []
      const firstName = selectedFiles[0]?.fileName || "Archivo"
      return selectedFiles.length === 1
        ? firstName
        : `${firstName} + ${selectedFiles.length - 1} archivo${selectedFiles.length - 1 === 1 ? "" : "s"}`
    }

    const text = editedText.trim()
    if (text.length <= 80) return text
    return text.slice(0, 80).replace(/\n/g, " ") + "…"
  }

  async function handleConfirm() {
    if (!selectedConversation || !canConfirm) return

    setSubmitting(true)
    setError(null)

    try {
      // Step 1: Link the conversation (no criticalAttachmentIds — this modal creates Seguimiento entries, not mail snapshot persistence)
      const linkPayload: AttachConversationInput = {
        externalConversationId: selectedConversation.externalConversationId,
        surgeryLabel,
      }

      const linkedConversation = await apiFetch<MailLinkedConversationView>(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(linkPayload),
        }
      )

      // Step 2: Create the seguimiento entry
      const content = buildContentDescription()
      const summary = buildSummary()

      if (saveMode === "authorization_evidence") {
        await apiFetch(
          `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/mail-links/${encodeURIComponent(linkedConversation.linkId)}/authorization-evidence`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              summary,
              ...(selectedAttachments.length > 0 ? { attachmentIds: selectedAttachments } : {}),
            }),
          }
        )
      } else {
        const evidenceRef: Record<string, unknown> = {
        source: "mail_import",
        externalConversationId: selectedConversation.externalConversationId,
        subject: selectedConversation.subject,
        participantsSummary: selectedConversation.participantsSummary,
        latestMessageAt: selectedConversation.latestMessageAt,
        messageCount: selectedConversation.messageCount,
        attachmentCount: selectedConversation.attachments.length,
        importedAttachments: selectedAttachments,
      }

        await apiFetch(
        `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/seguimiento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: saveMode,
            content,
            summary,
            evidenceRef,
          }),
        }
        )
      }

      toast.success("Evidencia importada al seguimiento")
      await onImported()
      onOpenChange(false)
    } catch (nextError) {
      if (saveMode === "authorization_evidence") {
        setError(nextError instanceof Error ? nextError.message : "No se pudo registrar la autorización desde correo")
        return
      }
      // Link failed for any reason (already linked, network error, etc.) —
      // still try to create the seguimiento entry so evidence is not lost.
      const linkWarning =
        nextError instanceof ApiClientError
          ? nextError.code === "mail_conversation_already_linked"
            ? "La conversación ya estaba vinculada."
            : `No se pudo vincular la conversación (${nextError.message}).`
          : "No se pudo vincular la conversación."

      try {
        const content = buildContentDescription()
        const summary = buildSummary()

        const evidenceRef: Record<string, unknown> = {
          source: "mail_import",
          externalConversationId: selectedConversation.externalConversationId,
          subject: selectedConversation.subject,
          participantsSummary: selectedConversation.participantsSummary,
          latestMessageAt: selectedConversation.latestMessageAt,
          messageCount: selectedConversation.messageCount,
          attachmentCount: selectedConversation.attachments.length,
          importedAttachments: selectedAttachments,
        }

        await apiFetch(
          `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/seguimiento`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entryType: saveMode,
              content,
              summary,
              evidenceRef,
            }),
          }
        )

        toast.success("Evidencia importada al seguimiento", {
          description: linkWarning,
        })
        await onImported()
        onOpenChange(false)
      } catch (fallbackError) {
        setError(
          fallbackError instanceof Error ? fallbackError.message : "No se pudo crear la entrada de seguimiento"
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ──

  const isSaveModeAvailable = (mode: EvidenceSaveMode): boolean => {
    if (mode === "file_photo_evidence" && !hasFiles) return false
    return true
  }

  // ── Render ──

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto dark:border-slate-800 dark:bg-slate-950 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Traer evidencia desde correo</DialogTitle>
          <DialogDescription>
            Importá texto o archivos útiles desde una conversación de correo al seguimiento del expediente.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} total={2} />

        {/* ── Step 1: Search conversations ── */}
        {step === 1 && (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            {/* Left: Search + List */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar conversación"
                  className="pl-9"
                />
              </div>

              <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-lg border p-2 dark:border-slate-800 dark:bg-slate-900/60">
                {loading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Cargando...
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No hay conversaciones para mostrar.
                  </div>
                ) : (
                  items.map((item) => (
                    <button
                      type="button"
                      key={item.externalConversationId}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        selectedId === item.externalConversationId
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/40"
                      }`}
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
                            <Mail className="size-3" />
                            En mailbox
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {item.participantsSummary}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.messageCount} mensajes
                        </Badge>
                        {item.attachments.length > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            {item.attachments.length} adjuntos
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right: Preview */}
            <div className="rounded-lg border p-4 dark:border-slate-800 dark:bg-slate-900/60">
              {selectedConversation ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold">{selectedConversation.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.participantsSummary}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(selectedConversation.latestMessageAt).toLocaleString("es-AR", {
                          dateStyle: "short",
                        })}
                      </span>
                      <span>· {selectedConversation.messageCount} mensajes</span>
                    </div>
                    <p className="text-sm">{selectedConversation.previewSnippet}</p>
                  </div>

                  {selectedConversation.alreadyLinkedToCurrentSurgery ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      Esta conversación ya está vinculada al expediente. Podés importar evidencia igual.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Seleccioná una conversación de la lista.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Choose evidence ── */}
        {step === 2 && selectedConversation && (
          <div className="space-y-5">
            {/* Conversation summary */}
            <div className="rounded-lg border p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{selectedConversation.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.participantsSummary}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Paperclip className="size-3" />
                  {selectedConversation.attachments.length} adjunto
                  {selectedConversation.attachments.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Último mensaje:{" "}
                {new Date(selectedConversation.latestMessageAt).toLocaleString("es-AR")}
              </div>
            </div>

            {/* Evidence tabs */}
            <Tabs value={evidenceTab} onValueChange={(v) => setEvidenceTab(v as "text" | "files")}>
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1 gap-1.5">
                  <FileText className="size-3.5" />
                  Texto del correo
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1 gap-1.5">
                  <Paperclip className="size-3.5" />
                  Archivos adjuntos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3 mt-3">
                <div>
                  <Label className="text-sm font-medium">
                    Texto a importar
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    El texto se guardará como nota de seguimiento. Si es muy largo, se mostrará un extracto y un botón &ldquo;Ver texto completo&rdquo;.
                  </p>
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder="El texto del correo aparecerá aquí. Podés editarlo antes de importar."
                    className="mt-2 min-h-[160px]"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {editedText.length} caracteres
                  {editedText.length > 200
                    ? " — en el feed se mostrarán los primeros ~200 caracteres."
                    : ""}
                </p>
              </TabsContent>

              <TabsContent value="files" className="mt-3">
                {selectedConversation.attachments.length > 0 ? (
                  <CorreoAttachmentList
                    attachments={selectedConversation.attachments}
                    canPersist={canAttach}
                    selectedIds={selectedAttachments}
                    onSelectedIdsChange={setSelectedAttachments}
                  />
                ) : (
                  <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                    Esta conversación no tiene archivos adjuntos.
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Save mode selector */}
            <div className="rounded-lg border bg-slate-50/60 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <Label className="text-sm font-semibold">Guardar como</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Elegí cómo querés que aparezca esta evidencia en el seguimiento del expediente.
                </p>
              </div>

              <Select
                value={saveMode}
                onValueChange={(v) => setSaveMode(v as EvidenceSaveMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVE_MODE_OPTIONS.map((option) => {
                    const Icon = option.Icon
                    const disabled = !isSaveModeAvailable(option.value)
                    return (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={disabled}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{option.label}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {disabled
                                ? "Seleccioná al menos un archivo para usar esta opción"
                                : option.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              {/* Preview of what will be saved */}
              <div className="rounded-md border bg-white p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-100">Resumen en el feed:</span>{" "}
                {saveMode === "file_photo_evidence"
                  ? hasFiles
                    ? `${selectedAttachments.length} archivo${selectedAttachments.length !== 1 ? "s" : ""} como respaldo visual`
                    : "Seleccioná archivos en la pestaña Archivos adjuntos"
                  : editedText.trim()
                    ? `"${buildSummary()}"`
                    : "Escribí o editá el texto en la pestaña Texto del correo"}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(1)}>
                Atrás
              </Button>
            )}

            {step === 1 ? (
              <Button disabled={!canGoToStep2} onClick={handleGoToStep2}>
                Siguiente
              </Button>
            ) : (
              <Button disabled={!canConfirm || submitting} onClick={handleConfirm}>
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                Importar evidencia
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
