"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSurgeryDocumentation } from "@/hooks/useSurgeryDocumentation"
import { DOCUMENTATION_STATES, isDocumentationTransitionAllowed, type DocumentationState } from "@/lib/validators/documentation.validator"
import { toast } from "sonner"
import type { Surgery, SurgeryDocumentChecklist } from "@/types"

interface DocumentacionPanelProps {
  surgery: Surgery
  docChecklist?: SurgeryDocumentChecklist
  docStatus: string
}

const states = {
  pending: { label: "Pendiente", color: "border-amber-200 bg-amber-50 text-amber-800" },
  received: { label: "Recibido", color: "border-sky-200 bg-sky-50 text-sky-800" },
  observed: { label: "Observado", color: "border-red-200 bg-red-50 text-red-800" },
  approved: { label: "Aprobado", color: "border-emerald-200 bg-emerald-50 text-emerald-800" },
}
const summary = { not_required: "No requerida", observed: "Observada", ready: "Lista", incomplete: "Incompleta" }

export function DocumentacionPanel({ surgery }: DocumentacionPanelProps) {
  const { activeCompany, currentAccess, currentUser, currentUserLoading, isLoading } = useAuth()
  const backendId = surgery.backendId?.trim()
  if (isLoading || currentUserLoading) return <Panel><p role="status">Cargando contexto de documentación…</p></Panel>
  if (!activeCompany?.id || !backendId) return <Panel><p>Documentación no disponible: se requiere una empresa activa y una cirugía persistida.</p></Panel>
  return <DocumentationScope key={JSON.stringify([activeCompany.id, backendId, currentUser?.id])}
    companyId={activeCompany.id} surgeryId={backendId} role={currentAccess?.role ?? ""} />
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section aria-label="Checklist documental" className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/90">
    <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
      <BookOpen className="size-4" aria-hidden="true" />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em]">Checklist documental</h2>
    </div>
    <div className="space-y-3 px-3 py-3 text-xs">{children}</div>
  </section>
}

function DocumentationScope({ companyId, surgeryId, role }: { companyId: string; surgeryId: string; role: string }) {
  const { documentation, loading, mutating, error, conflict, canMutate, refresh, initialize, transition } = useSurgeryDocumentation(companyId, surgeryId, role)
  const [obsItemId, setObsItemId] = useState<string | null>(null)
  const [obsText, setObsText] = useState("")
  const obsItem = documentation?.items.find((item) => item.id === obsItemId)
  const disabled = loading || mutating || conflict || !canMutate
  const canObserve = obsItem && isDocumentationTransitionAllowed(obsItem.state as DocumentationState, "observed")
  const progress = documentation && documentation.progress.total > 0 ? 100 * documentation.progress.approved / documentation.progress.total : 0

  async function saveObservation() {
    if (!obsItem || disabled || !canObserve) return
    if (await transition(obsItem.id, "observed", obsText)) {
      setObsItemId(null)
      setObsText("")
      toast.success("Observación guardada")
    }
  }

  return <Panel>
    <div className="flex flex-wrap items-center justify-between gap-2">
      {documentation?.checklist && <Badge variant="outline">{summary[documentation.status]}</Badge>}
      <Button size="sm" variant="outline" disabled={loading || mutating} onClick={() => void refresh()}>Actualizar checklist</Button>
    </div>
    {loading && <p role="status">Cargando documentación…</p>}
    {mutating && <p role="status">Guardando documentación…</p>}
    {error && <p role="alert">{error}</p>}
    {!canMutate && <p>Solo lectura: su rol no permite modificar documentación.</p>}
    {documentation && !documentation.checklist && <div className="space-y-2">
      <p>Sin checklist de documentación. No se inicializa automáticamente.</p>
      {canMutate && <Button size="sm" disabled={disabled} onClick={async () => {
        if (await initialize()) toast.success("Checklist inicializado")
      }}>Inicializar checklist</Button>}
    </div>}
    {documentation?.checklist && <>
      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
        <p>{documentation.progress.approved}/{documentation.progress.total} documentos requeridos aprobados</p>
        <Progress aria-label="Progreso de documentos requeridos" aria-valuenow={progress} value={progress} className="h-1.5" />
        <p className="text-muted-foreground">Estado documental informativo; no autoriza ni bloquea facturación.</p>
      </div>
      {documentation.items.length === 0 && <p>Checklist persistido sin ítems.</p>}
      {documentation.items.map((item) => {
        const state = item.state as DocumentationState
        const style = states[state]
        return <div key={item.id} className="space-y-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13px] font-semibold">{item.label}</h3>
            <Badge variant="outline" className={style?.color}>{style?.label ?? "Estado desconocido"}</Badge>
            <span className="text-muted-foreground">{item.required ? "Requerido" : "Opcional"}</span>
          </div>
          {item.observation && <p className="whitespace-pre-wrap break-words text-red-700 dark:text-red-300">Obs: {item.observation}</p>}
          {canMutate && style && <div className="flex flex-wrap gap-1">
            {DOCUMENTATION_STATES.filter((target) => isDocumentationTransitionAllowed(state, target)).map((target) => <Button
              key={target} variant="outline" size="sm" disabled={disabled} aria-label={`${states[target].label}: ${item.label}`}
              onClick={async () => {
                if (target === "observed") { setObsItemId(item.id); setObsText(item.observation ?? ""); return }
                if (await transition(item.id, target)) toast.success("Estado documental guardado")
              }}>{target === "observed" ? "Observar" : states[target].label}</Button>)}
          </div>}
        </div>
      })}
    </>}
    <p className="text-muted-foreground">Solicitud, carga y visualización de archivos no disponibles en este checklist.</p>
    <Dialog open={obsItemId !== null} onOpenChange={(open) => { if (!open && !mutating) setObsItemId(null) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Observar documentación</DialogTitle>
          <DialogDescription>Registre una observación para {obsItem?.label ?? "el documento"}.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="documentation-observation">Observación</Label>
        <Textarea id="documentation-observation" value={obsText} onChange={(event) => setObsText(event.target.value)} disabled={mutating} rows={3} />
        {error && <p role="alert">{error}</p>}
        {conflict && <Button variant="outline" disabled={loading || mutating} onClick={() => void refresh()}>Actualizar checklist</Button>}
        {!canObserve && <p>El estado actual no permite observar. Cierre y revise el documento.</p>}
        <DialogFooter>
          <Button variant="outline" disabled={mutating} onClick={() => setObsItemId(null)}>Cancelar</Button>
          <Button disabled={disabled || !canObserve || !obsText.trim()} onClick={() => void saveObservation()}>Registrar observación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Panel>
}
