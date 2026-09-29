"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, FileWarning, Loader2, ShieldAlert } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api/client"
import type { Surgery } from "@/types"
import { toast } from "sonner"

type SurgeryDeletionPreview = {
  surgery: {
    id: string
    visibleNumber: string | null
    patientName: string | null
    institutionName: string | null
  }
  dependencies: {
    presupuestos: number
    remitos: number
    consumos: number
    devoluciones: number
    invoices: number
    payments: number
    digitalReceipts: number
    seguimientoEntries: number
    internalNotifications: number
  }
  policy: {
    recommendedAction: "delete" | "archive" | "blocked"
    canDelete: boolean
    canArchive: boolean
    blockedReasons: string[]
    requiresHighPrivilege: boolean
    hasFiscalDocuments: boolean
    hasOperationalDocuments: boolean
    confirmationText: "confirmo eliminar"
  }
}

interface DeleteSurgeryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surgery: Surgery | null
  onArchived?: () => Promise<void> | void
}

const DEPENDENCY_LABELS: Array<[keyof SurgeryDeletionPreview["dependencies"], string]> = [
  ["presupuestos", "Presupuestos"],
  ["remitos", "Remitos"],
  ["consumos", "Consumos"],
  ["devoluciones", "Devoluciones"],
  ["invoices", "Facturas"],
  ["payments", "Cobros"],
  ["digitalReceipts", "Recibos digitales"],
  ["seguimientoEntries", "Seguimiento"],
  ["internalNotifications", "Notificaciones"],
]

const CONFIRMATION_TEXT = "confirmo eliminar"

function resolvePolicyMessage(preview: SurgeryDeletionPreview | null) {
  if (!preview) return null

  if (preview.policy.recommendedAction === "blocked") {
    return {
      title: "Eliminación bloqueada",
      description: "La cirugía tiene factura o cobro vinculado. No se permite eliminar ni archivar desde esta pantalla.",
      variant: "destructive" as const,
    }
  }

  if (preview.policy.recommendedAction === "archive") {
    return {
      title: "Archivo recomendado",
      description: "Existen documentos operativos vinculados. La política recomienda archivar en lugar de borrar definitivamente.",
      variant: "default" as const,
    }
  }

  return {
    title: "Eliminación permitida por política",
    description: "No hay documentos vinculados. La acción ejecutará un archivo seguro; no se realizará borrado físico.",
    variant: "default" as const,
  }
}

export function DeleteSurgeryDialog({ open, onOpenChange, surgery, onArchived }: DeleteSurgeryDialogProps) {
  const { activeCompany } = useAuth()
  const [preview, setPreview] = useState<SurgeryDeletionPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [confirmation, setConfirmation] = useState("")

  useEffect(() => {
    if (!open) {
      setPreview(null)
      setError(null)
      setReason("")
      setConfirmation("")
      setExecuting(false)
      return
    }

    const targetSurgeryId = surgery?.backendId?.trim() || surgery?.id
    if (!activeCompany?.id || !targetSurgeryId) {
      setPreview(null)
      setError("No hay empresa activa o cirugía seleccionada para consultar la previsualización.")
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPreview(null)

    apiFetch<SurgeryDeletionPreview>(
      `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(targetSurgeryId)}/delete-preview`
    )
      .then((data) => {
        if (!cancelled) setPreview(data)
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la previsualización de eliminación.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeCompany?.id, open, surgery?.backendId, surgery?.id])

  const policyMessage = resolvePolicyMessage(preview)
  const policyAllowsNextStep = !!preview && (preview.policy.canDelete || preview.policy.canArchive)
  const confirmationMatches = confirmation === (preview?.policy.confirmationText ?? CONFIRMATION_TEXT)
  const reasonIsValid = reason.trim().length > 0
  const canExecuteArchive = policyAllowsNextStep && confirmationMatches && reasonIsValid && !executing

  const actionBadge = useMemo(() => {
    if (!preview) return null
    if (preview.policy.recommendedAction === "blocked") return <Badge variant="destructive">Bloqueada</Badge>
    if (preview.policy.recommendedAction === "archive") return <Badge variant="warning">Archivar recomendado</Badge>
    return <Badge variant="success">Eliminar permitido</Badge>
  }, [preview])

  const displayNumber = preview?.surgery.visibleNumber || surgery?.expedienteNumber || surgery?.id || "—"
  const patientName = preview?.surgery.patientName || surgery?.patient || "Paciente sin identificar"
  const institutionName = preview?.surgery.institutionName || surgery?.institution || "Institución sin identificar"
  const executeLabel = preview?.policy.recommendedAction === "archive" ? "Archivar cirugía" : "Eliminar cirugía"

  async function handleArchive() {
    const targetSurgeryId = surgery?.backendId?.trim() || surgery?.id
    if (!activeCompany?.id || !targetSurgeryId || !canExecuteArchive) return

    setExecuting(true)
    setError(null)

    try {
      await apiFetch(
        `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(targetSurgeryId)}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationText: confirmation, reason }),
        }
      )

      toast.success("Cirugía archivada correctamente")
      onOpenChange(false)
      await onArchived?.()
    } catch (archiveError) {
      const message = archiveError instanceof Error ? archiveError.message : "No se pudo archivar la cirugía."
      setError(message)
      toast.error(message)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <ShieldAlert className="size-5" /> Eliminar cirugía
          </DialogTitle>
          <DialogDescription>
            Ejecución segura. Esta acción archiva la cirugía y preserva trazabilidad; no realiza borrado físico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Cirugía</p>
                <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{displayNumber}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{patientName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{institutionName}</p>
              </div>
              {actionBadge}
            </div>
          </section>

          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <Loader2 className="size-4 animate-spin" /> Cargando política y dependencias…
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Error al cargar la previsualización</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {policyMessage && (
            <Alert variant={policyMessage.variant} className={policyMessage.variant === "default" ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100" : undefined}>
              <FileWarning className="size-4" />
              <AlertTitle>{policyMessage.title}</AlertTitle>
              <AlertDescription>
                <p>{policyMessage.description}</p>
                {preview?.policy.blockedReasons.length ? (
                  <ul className="mt-2 list-disc pl-4">
                    {preview.policy.blockedReasons.map((blockedReason) => (
                      <li key={blockedReason}>{blockedReason}</li>
                    ))}
                  </ul>
                ) : null}
              </AlertDescription>
            </Alert>
          )}

          {preview && (
            <section>
              <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Dependencias detectadas</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DEPENDENCY_LABELS.map(([key, label]) => (
                  <div key={key} className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{preview.dependencies[key]}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3 rounded-lg border border-red-200 bg-red-50/70 p-3 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="space-y-2">
              <Label htmlFor="delete-surgery-reason">Motivo obligatorio</Label>
              <Textarea
                id="delete-surgery-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explicá por qué se solicita eliminar o archivar esta cirugía…"
                disabled={!preview || preview.policy.recommendedAction === "blocked"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-surgery-confirmation">Confirmación exacta</Label>
              <Input
                id="delete-surgery-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={CONFIRMATION_TEXT}
                disabled={!preview || preview.policy.recommendedAction === "blocked"}
              />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Escribí exactamente <span className="font-mono font-semibold">{CONFIRMATION_TEXT}</span> para habilitar la acción.
              </p>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button
            variant="destructive"
            disabled={!canExecuteArchive}
            onClick={() => void handleArchive()}
          >
            {executing && <Loader2 className="mr-2 size-4 animate-spin" />}
            {preview?.policy.recommendedAction === "blocked" ? "Bloqueado por política" : executeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
