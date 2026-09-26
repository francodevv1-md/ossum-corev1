"use client"

import { useState } from "react"
import { AlertCircle, FileText, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { PresupuestoFormDialog } from "@/components/presupuestos/PresupuestoFormDialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import type { PresupuestoApiRow } from "@/lib/api/presupuestos"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { canMutatePresupuesto } from "@/lib/permissions/financial-document-email"
import type { Surgery } from "@/types"

function label(snapshot: unknown, key: "branch" | "client" | "payer") {
  if (!snapshot || typeof snapshot !== "object") return "—"
  const value = (snapshot as Record<string, unknown>)[key]
  if (!value || typeof value !== "object") return "—"
  const record = value as Record<string, unknown>
  return [record.name, record.legalName, [record.firstName, record.lastName].filter(Boolean).join(" ")]
    .find((candidate) => typeof candidate === "string" && candidate.trim()) as string || "—"
}

export function PresupuestoPanel({ surgery }: { surgery: Surgery }) {
  const { currentAccess } = useAuth()
  const canMutate = canMutatePresupuesto(currentAccess?.role)
  const surgeryId = surgery.backendId ?? surgery.id
  const api = usePresupuestos({ surgeryId, take: 100 })
  const [editing, setEditing] = useState<PresupuestoApiRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const run = async (action: () => Promise<unknown>, success: string) => {
    try { await action(); toast.success(success) }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar el presupuesto") }
  }

  const openForm = (item?: PresupuestoApiRow) => {
    setEditing(item ?? null)
    setFormOpen(true)
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2"><FileText className="size-4 text-sky-700" /><h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-800">Presupuesto</h3></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void api.refresh()}><RefreshCw className="mr-1 size-3.5" />Actualizar</Button>{canMutate && !api.draft && <Button size="sm" onClick={() => openForm()}><Plus className="mr-1 size-3.5" />Nuevo</Button>}</div>
      </div>

      {api.error && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" />{api.error}</div>}
      {!api.loading && !api.error && api.presupuestos.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">La cirugía todavía no tiene presupuesto.</p>}

      {api.presupuestos.map((item) => <article key={item.id} className="rounded-md border p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-mono text-sm font-semibold">{item.visibleNumber == null ? "Borrador" : `P-${String(item.visibleNumber).padStart(4, "0")}`} · v{item.versionNumber}</p><p className="text-xs text-muted-foreground">{item.state} · {formatDate(item.documentDate ?? item.createdAt)}</p></div>
          <p className="font-semibold">{formatCurrency(Number(item.total))}</p>
        </div>
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3"><p><span className="text-muted-foreground">Sucursal:</span> {label(item.commercialSnapshot, "branch")}</p><p><span className="text-muted-foreground">Cliente:</span> {label(item.commercialSnapshot, "client")}</p><p><span className="text-muted-foreground">Pagador:</span> {label(item.commercialSnapshot, "payer")}</p></div>
        <div className="mt-3 flex flex-wrap gap-1">
          {canMutate && item.actions.includes("edit") && <Button size="sm" variant="outline" onClick={() => openForm(item)}>Editar</Button>}
          {canMutate && item.actions.includes("emit") && <Button size="sm" onClick={() => void run(() => api.emit(item.id, item.revision), "Presupuesto emitido")}>Emitir</Button>}
          {canMutate && item.actions.includes("approve") && <Button size="sm" variant="outline" onClick={() => void run(() => api.transition(item.id, "approve", item.revision), "Presupuesto aprobado")}>Aprobar</Button>}
          {canMutate && item.actions.includes("reject") && <Button size="sm" variant="outline" onClick={() => void run(() => api.transition(item.id, "reject", item.revision), "Presupuesto rechazado")}>Rechazar</Button>}
          {canMutate && item.actions.includes("revise") && <Button size="sm" variant="outline" onClick={() => void run(() => api.revise(item.id, item.revision), "Revisión creada")}>Revisar</Button>}
          {canMutate && item.actions.includes("annul") && <Button size="sm" variant="outline" onClick={() => void run(() => api.transition(item.id, "annul", item.revision), "Presupuesto anulado")}>Anular</Button>}
          {canMutate && item.actions.includes("delete") && <Button size="sm" variant="destructive" onClick={() => void run(() => api.deleteDraft(item.id, item.revision), "Borrador eliminado")}>Eliminar</Button>}
        </div>
      </article>)}

      {canMutate && <PresupuestoFormDialog key={editing?.id ?? "new"} mode="dialog" context="surgery" surgeryId={surgeryId} presupuesto={editing ?? undefined} presupuestoId={editing?.id} open={formOpen} onOpenChange={setFormOpen} onSubmit={() => { setFormOpen(false); setEditing(null); void api.refresh() }} />}
    </section>
  )
}
