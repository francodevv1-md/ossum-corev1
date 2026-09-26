"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Clock, DollarSign, Mail, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { SendExistingFinancialDocumentDialog } from "@/components/email/SendExistingFinancialDocumentDialog"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { PresupuestoFormDialog } from "@/components/presupuestos/PresupuestoFormDialog"
import { FilterSelect, SearchInput, StatsCard } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { formatCurrency, formatDate } from "@/lib/formatters"
import type { PresupuestoApiRow } from "@/lib/api/presupuestos"
import { canMutatePresupuesto, canSendFinancialDocumentEmail } from "@/lib/permissions/financial-document-email"

const STATES = ["Borrador", "Emitido", "Aprobado", "Rechazado", "Vencido", "Reemplazado", "Anulado"] as const
const STATE_OPTIONS = [{ value: "", label: "Todos los estados" }, ...STATES.map((state) => ({ value: state, label: state }))]

function snapshotLabel(value: unknown, key: "branch" | "client" | "payer") {
  if (!value || typeof value !== "object") return "—"
  const entry = (value as Record<string, unknown>)[key]
  if (!entry || typeof entry !== "object") return "—"
  const record = entry as Record<string, unknown>
  return [record.name, record.legalName, [record.firstName, record.lastName].filter(Boolean).join(" ")]
    .find((item) => typeof item === "string" && item.trim()) as string || "—"
}

export default function PresupuestosPage() {
  const { currentAccess } = useAuth()
  const { openExpediente } = useExpedienteDrawer()
  const api = usePresupuestos({ take: 100 })
  const [search, setSearch] = useState("")
  const [state, setState] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PresupuestoApiRow | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const canMutate = canMutatePresupuesto(currentAccess?.role)

  const rows = useMemo(() => api.presupuestos.filter((item) => {
    if (state && item.state !== state) return false
    const query = search.trim().toLowerCase()
    if (!query) return true
    return [item.id, item.visibleNumber?.toString(), item.title, snapshotLabel(item.commercialSnapshot, "client"), snapshotLabel(item.commercialSnapshot, "payer")]
      .some((value) => value?.toLowerCase().includes(query))
  }), [api.presupuestos, search, state])

  const stats = useMemo(() => ({
    total: rows.length,
    approved: rows.filter((item) => item.state === "Aprobado").length,
    pending: rows.filter((item) => item.state === "Borrador" || item.state === "Emitido").length,
    amount: rows.reduce((sum, item) => sum + Number(item.total), 0),
  }), [rows])

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      toast.success(success)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar el presupuesto")
    }
  }

  const transition = (item: PresupuestoApiRow, command: "approve" | "reject" | "expire" | "annul") =>
    void run(() => api.transition(item.id, command, item.revision), "Presupuesto actualizado")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-bold">Presupuestos</h1><p className="text-sm text-muted-foreground">Autoridad comercial persistida</p></div>
        <div className="flex gap-2">
          {canSendFinancialDocumentEmail(currentAccess?.role) && <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}><Mail className="mr-1.5 size-4" />Enviar existente</Button>}
          {canMutate && <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="mr-1.5 size-4" />Nuevo presupuesto</Button>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={RefreshCw} />
        <StatsCard title="Aprobados" value={stats.approved} icon={CheckCircle2} />
        <StatsCard title="Pendientes" value={stats.pending} icon={Clock} />
        <StatsCard title="Monto total" value={formatCurrency(stats.amount)} icon={DollarSign} />
      </div>

      <Card><CardContent className="flex flex-wrap gap-2 py-4"><SearchInput value={search} onChange={setSearch} placeholder="Número, cliente o pagador" className="w-full sm:w-72" /><FilterSelect value={state} onChange={setState} options={STATE_OPTIONS} /><Button variant="outline" size="sm" onClick={() => void api.refresh()} disabled={api.loading}><RefreshCw className="mr-1.5 size-4" />Actualizar</Button></CardContent></Card>

      {api.error && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{api.error}</div>}
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Presupuesto</th><th className="p-3">Cliente / pagador</th><th className="p-3">Estado</th><th className="p-3">Fecha</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Acciones</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id} className="border-b last:border-0">
              <td className="p-3 font-mono">{item.visibleNumber == null ? "Borrador" : `P-${String(item.visibleNumber).padStart(4, "0")}`}<div className="text-xs text-muted-foreground">v{item.versionNumber}</div></td>
              <td className="p-3">{snapshotLabel(item.commercialSnapshot, "client")}<div className="text-xs text-muted-foreground">{snapshotLabel(item.commercialSnapshot, "payer")} · {snapshotLabel(item.commercialSnapshot, "branch")}</div></td>
              <td className="p-3">{item.state}</td><td className="p-3">{formatDate(item.documentDate ?? item.createdAt)}</td><td className="p-3 text-right font-semibold">{formatCurrency(Number(item.total))}</td>
              <td className="p-3"><div className="flex flex-wrap justify-end gap-1">
                 {canMutate && item.actions.includes("edit") && <Button size="sm" variant="outline" onClick={() => { setEditing(item); setFormOpen(true) }}>Editar</Button>}
                 {canMutate && item.actions.includes("emit") && <Button size="sm" onClick={() => void run(() => api.emit(item.id, item.revision), "Presupuesto emitido")}>Emitir</Button>}
                 {canMutate && item.actions.includes("approve") && <Button size="sm" variant="outline" onClick={() => transition(item, "approve")}>Aprobar</Button>}
                 {canMutate && item.actions.includes("reject") && <Button size="sm" variant="outline" onClick={() => transition(item, "reject")}>Rechazar</Button>}
                 {canMutate && item.actions.includes("revise") && <Button size="sm" variant="outline" onClick={() => void run(() => api.revise(item.id, item.revision), "Revisión creada")}>Revisar</Button>}
                 {canMutate && item.actions.includes("annul") && <Button size="sm" variant="outline" onClick={() => transition(item, "annul")}>Anular</Button>}
                 {canMutate && item.actions.includes("delete") && <Button size="sm" variant="destructive" onClick={() => void run(() => api.deleteDraft(item.id, item.revision), "Borrador eliminado")}>Eliminar</Button>}
                {item.surgeryId && <Button size="sm" variant="ghost" onClick={() => openExpediente(item.surgeryId!)}>Expediente</Button>}
              </div></td>
            </tr>)}</tbody>
          </table>
          {!api.loading && rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No hay presupuestos para mostrar.</p>}
        </div>
      </CardContent></Card>

      {canMutate && <PresupuestoFormDialog key={editing?.id ?? "new"} mode="dialog" context="independent" presupuesto={editing ?? undefined} presupuestoId={editing?.id} open={formOpen} onOpenChange={setFormOpen} onSubmit={() => { setFormOpen(false); setEditing(null); void api.refresh() }} />}
      {emailOpen && <SendExistingFinancialDocumentDialog kind="presupuesto" onOpenChange={setEmailOpen} />}
    </div>
  )
}
