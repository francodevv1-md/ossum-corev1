"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/AuthProvider"
import { SalesPresupuestoFormDialog } from "@/components/presupuestos/SalesPresupuestoFormDialog"
import { FilterSelect, SearchInput } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { fetchPresupuesto, type PresupuestoApiRow, type PresupuestoDraftPayload } from "@/lib/api/presupuestos"
import { canMutatePresupuesto } from "@/lib/permissions/financial-document-email"

const STATES = ["Borrador", "Emitido", "Aprobado", "Rechazado", "Vencido", "Reemplazado", "Anulado"]
const STATE_OPTIONS = [{ value: "", label: "Todos los estados" }, ...STATES.map((state) => ({ value: state, label: state }))]
function snapshotLabel(value: unknown, key: "branch" | "client" | "payer") {
  if (!value || typeof value !== "object") return "—"
  const entry = (value as Record<string, unknown>)[key]
  if (!entry || typeof entry !== "object") return "—"
  const record = entry as Record<string, unknown>
  return [record.name, record.legalName, [record.firstName, record.lastName].filter(Boolean).join(" ")]
    .find((item) => typeof item === "string" && item.trim()) as string || "—"
}
const numberLabel = (item: PresupuestoApiRow) => item.visibleNumber == null ? "Borrador" : `P-${String(item.visibleNumber).padStart(4, "0")}`
const money = (value: string, currency: string) => `${currency} ${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`

export default function PresupuestosPage() {
  const { activeCompany } = useAuth()
  // Remount all ephemeral selection/form/detail state; old completions cannot affect a new tenant.
  return activeCompany?.id ? <SalesPresupuestos key={activeCompany.id} companyId={activeCompany.id} /> : <p>Seleccioná una empresa.</p>
}

function SalesPresupuestos({ companyId }: { companyId: string }) {
  const { currentAccess } = useAuth()
  const api = usePresupuestos({ take: 100 })
  const [search, setSearch] = useState("")
  const [state, setState] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PresupuestoApiRow | undefined>()
  const [detail, setDetail] = useState<PresupuestoApiRow | null>(null)
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState("")
  const mounted = useRef(true)
  const readRequest = useRef(0)
  const canMutate = canMutatePresupuesto(currentAccess?.role)
  const detailCommercial = detail?.commercialSnapshot as PresupuestoDraftPayload["commercial"] | undefined
  const busy = Boolean(api.mutatingId) || reading || api.loading
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; readRequest.current += 1 }
  }, [])

  const rows = useMemo(() => api.presupuestos.filter((item) => {
    if (state && item.state !== state) return false
    const query = search.trim().toLowerCase()
    return !query || [item.id, item.visibleNumber?.toString(), item.title, snapshotLabel(item.commercialSnapshot, "client"), snapshotLabel(item.commercialSnapshot, "payer")].some((value) => value?.toLowerCase().includes(query))
  }), [api.presupuestos, search, state])

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      if (mounted.current) { setDetail(null); toast.success(success) }
    } catch (cause) {
      if (mounted.current) toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar el presupuesto")
    }
  }
  const read = async (id: string, edit: boolean) => {
    const request = ++readRequest.current
    setReading(true)
    setReadError("")
    try {
      const row = await fetchPresupuesto(companyId, id)
      if (!mounted.current || request !== readRequest.current) return
      if (edit && !row.actions.includes("edit")) throw new Error("El presupuesto ya no permite edición. Actualizá la lista.")
      if (edit) { setEditing(row); setFormOpen(true) } else setDetail(row)
    } catch (cause) {
      if (mounted.current && request === readRequest.current) setReadError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle")
    } finally {
      if (mounted.current && request === readRequest.current) setReading(false)
    }
  }
  const transition = (item: PresupuestoApiRow, command: "approve" | "reject" | "expire" | "annul") => void run(() => api.transition(item.id, command, item.revision), "Presupuesto actualizado")

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h1 className="text-xl font-bold">Presupuestos</h1><p className="text-sm text-muted-foreground">Autoridad comercial persistida</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/ventas/pendientes-facturar">Pendientes de facturar</Link></Button>
        {canMutate && <Button disabled={busy || Boolean(api.error)} onClick={() => { setEditing(undefined); setFormOpen(true) }}>Nuevo presupuesto</Button>}</div>
    </div>
    <Card><CardContent className="flex flex-wrap gap-2 py-4"><SearchInput value={search} onChange={setSearch} placeholder="Número, cliente o pagador" className="w-full sm:w-72" /><FilterSelect value={state} onChange={setState} options={STATE_OPTIONS} /><Button variant="outline" onClick={() => { setDetail(null); void api.refresh() }} disabled={busy}>Actualizar</Button></CardContent></Card>
    {api.refreshWarning && <p role="status">{api.refreshWarning}</p>}
    {(api.error || readError) && <p role="alert" className="text-destructive">{api.error || readError}</p>}
    {(api.loading || reading) && <p role="status">Cargando presupuestos…</p>}
    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
      <caption className="sr-only">Versiones de presupuestos persistidas</caption>
      <thead className="border-b bg-muted/40 text-left"><tr>{["Presupuesto", "Cliente / pagador", "Estado / versión", "Fecha", "Total", "Acciones"].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
      <tbody>{rows.map((item) => <tr key={item.id} className="border-b last:border-0">
        <td className="p-3">{numberLabel(item)}<div className="text-xs text-muted-foreground">{item.title}</div></td>
        <td className="p-3">{snapshotLabel(item.commercialSnapshot, "client")}<div className="text-xs text-muted-foreground">{snapshotLabel(item.commercialSnapshot, "payer")} · {snapshotLabel(item.commercialSnapshot, "branch")}</div></td>
        <td className="p-3">{item.state}<div className="text-xs">v{item.versionNumber} · {item.slot} · r{item.revision}</div></td>
        <td className="p-3">{item.documentDate?.slice(0, 10) ?? "—"}</td><td className="p-3 whitespace-nowrap">{money(item.total, item.currency)}</td>
        <td className="p-3"><div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void read(item.id, false)}>Detalle</Button>
          {canMutate && item.actions.includes("edit") && <Button size="sm" variant="outline" disabled={busy} onClick={() => void read(item.id, true)}>Editar</Button>}
          {canMutate && item.actions.includes("emit") && <Button size="sm" disabled={busy} onClick={() => void run(() => api.emit(item.id, item.revision), "Presupuesto emitido")}>Emitir</Button>}
          {canMutate && item.actions.includes("approve") && <Button size="sm" variant="outline" disabled={busy} onClick={() => transition(item, "approve")}>Aprobar</Button>}
          {canMutate && item.actions.includes("reject") && <Button size="sm" variant="outline" disabled={busy} onClick={() => transition(item, "reject")}>Rechazar</Button>}
          {canMutate && item.actions.includes("expire") && <Button size="sm" variant="outline" disabled={busy} onClick={() => transition(item, "expire")}>Vencer</Button>}
          {canMutate && item.actions.includes("revise") && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => api.revise(item.id, item.revision), "Revisión creada")}>Revisar</Button>}
          {canMutate && item.actions.includes("annul") && <Button size="sm" variant="outline" disabled={busy} onClick={() => transition(item, "annul")}>Anular</Button>}
          {canMutate && item.actions.includes("delete") && <Button size="sm" variant="destructive" disabled={busy} onClick={() => void run(() => api.deleteDraft(item.id, item.revision), "Borrador eliminado")}>Eliminar</Button>}
        </div></td>
      </tr>)}</tbody>
    </table>{!api.loading && !api.error && rows.length === 0 && <p className="p-8 text-center">No hay presupuestos para mostrar.</p>}</div></CardContent></Card>
    {canMutate && formOpen && <SalesPresupuestoFormDialog companyId={companyId} presupuesto={editing} linkedSurgeryIds={api.presupuestos.flatMap((item) => item.surgeryId ? [item.surgeryId] : [])} onClose={() => { setFormOpen(false); setEditing(undefined) }} onSave={async (payload) => {
      if (!canMutatePresupuesto(currentAccess?.role)) throw new Error("No tenés permiso para modificar presupuestos")
      if (editing) return api.replaceDraft(editing.id, { ...payload, expectedRevision: editing.revision })
      return api.create(payload)
    }} />}
    {detail && <Dialog open onOpenChange={(open) => { if (!open) setDetail(null) }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>Detalle {numberLabel(detail)}</DialogTitle><DialogDescription>v{detail.versionNumber} · {detail.state} · {detail.slot} · revisión {detail.revision}</DialogDescription></DialogHeader>
      <dl className="grid gap-2 sm:grid-cols-2">{[
        ["Cliente", snapshotLabel(detail.commercialSnapshot, "client")], ["Pagador", snapshotLabel(detail.commercialSnapshot, "payer")],
        ["Sucursal", snapshotLabel(detail.commercialSnapshot, "branch")], ["Modalidad", detailCommercial?.pricingMode],
        ["Familia", detail.familyId], ["Origen", detail.sourcePresupuestoId], ["Cirugía", detail.surgeryId], ["Moneda", detail.currency],
        ["Fecha", detail.documentDate], ["Validez", detail.validUntil], ["Condición de pago", detail.paymentTerms], ["Lista", detail.priceListCode],
        ["Subtotal", money(detail.subtotal, detail.currency)], ["Descuentos", money(detail.discountTotal, detail.currency)],
        ["IVA", money(detail.taxTotal, detail.currency)], ["Total", money(detail.total, detail.currency)],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>
      {detailCommercial?.pricingMode === "FIRM" && <dl className="grid gap-2 sm:grid-cols-2">{([
        ["coordinator", "Coordinador"], ["quotationContact", "Contacto de cotización"], ["includedMaterials", "Materiales incluidos"],
        ["excludedMaterials", "Materiales excluidos"], ["availability", "Disponibilidad"], ["operationalClarifications", "Aclaraciones operativas"], ["surgicalAssumptions", "Supuestos quirúrgicos"],
      ] as const).map(([key, label]) => <div key={key}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap">{Array.isArray(detailCommercial.firmPrice[key]) ? detailCommercial.firmPrice[key].join("\n") : detailCommercial.firmPrice[key]}</dd></div>)}</dl>}
      <p className="whitespace-pre-wrap">{detail.legend}</p><p className="whitespace-pre-wrap">{detail.notes}</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption>Ítems persistidos</caption><thead><tr>{["Descripción", "Unidad", "Cantidad", "Precio", "Desc. %", "IVA %", "Total"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{detail.items.map((line) => <tr key={line.id}><td>{line.description}</td><td>{line.unit}</td><td>{line.quantity}</td><td>{money(line.unitPrice, detail.currency)}</td><td>{line.discountRate}</td><td>{line.taxRate}</td><td>{money(line.total, detail.currency)}</td></tr>)}</tbody></table></div>
      <h2 className="font-semibold">Versiones de la familia</h2>
      <ul>{api.presupuestos.filter((row) => row.familyId === detail.familyId).map((row) => <li key={row.id}><Button variant="link" disabled={busy} onClick={() => void read(row.id, false)}>v{row.versionNumber} · {row.state} · {row.slot}</Button></li>)}</ul>
    </DialogContent></Dialog>}
  </div>
}
