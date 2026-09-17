"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries"
import {
  DISTRICORR_ESTIMATIVE_LEGEND, fetchPresupuestoCatalogs,
  type CreatePresupuestoPayload, type PresupuestoApiRow, type PresupuestoDraftPayload,
} from "@/lib/api/presupuestos"

type Props = {
  companyId: string
  presupuesto?: PresupuestoApiRow
  linkedSurgeryIds: string[]
  onSave: (payload: CreatePresupuestoPayload) => Promise<PresupuestoApiRow>
  onClose: () => void
}
type Catalogs = Awaited<ReturnType<typeof fetchPresupuestoCatalogs>> & {
  surgeries: Awaited<ReturnType<typeof fetchBackendActiveSurgeries>>
}
const emptyLine = () => ({ description: "", quantity: "1", unitPrice: "0", discountRate: "0", taxRate: "0", unit: "", sku: "" })

function initialDraft(row?: PresupuestoApiRow): CreatePresupuestoPayload {
  if (!row) return {
    branchId: "", clientContactId: "", payerContactId: "", title: "", currency: "ARS",
    documentDate: "", validUntil: "", paymentTerms: "", priceListCode: "", notes: "",
    legend: DISTRICORR_ESTIMATIVE_LEGEND, generalDiscountRate: "0", commercial: { pricingMode: "ESTIMATIVE" }, items: [emptyLine()],
  }
  const snapshot = row.commercialSnapshot as PresupuestoDraftPayload["commercial"] | null
  return {
    branchId: row.branchId ?? "", clientContactId: row.clientContactId ?? "", payerContactId: row.payerContactId ?? "",
    title: row.title ?? "", currency: row.currency, documentDate: row.documentDate ?? "", validUntil: row.validUntil ?? "",
    paymentTerms: row.paymentTerms ?? "", priceListCode: row.priceListCode ?? "", legend: row.legend ?? "", notes: row.notes ?? "",
    generalDiscountRate: row.generalDiscountRate,
    // Copy commercial inputs only: never send party/responsible snapshots as authority.
    commercial: snapshot?.pricingMode === "FIRM"
      ? { pricingMode: "FIRM", firmPrice: snapshot.firmPrice }
      : { pricingMode: "ESTIMATIVE" },
    items: row.items.map((line) => ({
      sku: line.sku ?? undefined, description: line.description, quantity: line.quantity, unit: line.unit ?? undefined,
      unitPrice: line.unitPrice, discountRate: line.discountRate, taxRate: line.taxRate,
      metadata: line.metadata && typeof line.metadata === "object" && !Array.isArray(line.metadata) ? line.metadata as Record<string, unknown> : undefined,
    })),
  }
}

/** Isolated Sales editor. Shared Cirugias form/hook and local catalogs remain untouched. */
export function SalesPresupuestoFormDialog(props: Props) {
  return <SalesForm key={`${props.companyId}:${props.presupuesto?.id ?? "new"}`} {...props} />
}

function SalesForm({ companyId, presupuesto, linkedSurgeryIds, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(presupuesto))
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null)
  const [catalogError, setCatalogError] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([fetchPresupuestoCatalogs(companyId), fetchBackendActiveSurgeries(companyId)])
      .then(([commercial, surgeries]) => { if (active) setCatalogs({ ...commercial, surgeries }) })
      .catch((cause) => { if (active) setCatalogError(cause instanceof Error ? cause.message : "No se pudieron cargar los catálogos") })
    return () => { active = false }
  }, [companyId, attempt])

  const retryCatalogs = () => {
    setCatalogs(null)
    setCatalogError("")
    setAttempt((n) => n + 1)
  }

  const update = <K extends keyof CreatePresupuestoPayload>(key: K, value: CreatePresupuestoPayload[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const availableSurgeries = catalogs?.surgeries.filter((s) => s.backendId && !linkedSurgeryIds.includes(s.backendId) && s.state !== "Cancelada" && s.state !== "Suspendida") ?? []
  const referencesValid = Boolean(catalogs?.branches.some((b) => b.id === draft.branchId)
    && catalogs.contacts.some((c) => c.id === draft.clientContactId)
    && catalogs.contacts.some((c) => c.id === draft.payerContactId)
    && (!draft.surgeryId || availableSurgeries.some((s) => s.backendId === draft.surgeryId)))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy.current || !referencesValid) return
    busy.current = true
    setSaving(true)
    setError("")
    try {
      // Normalize only the submitted copy; keep raw multiline edits on failure.
      await onSave(draft.commercial.pricingMode === "FIRM" ? {
        ...draft,
        commercial: {
          ...draft.commercial,
          firmPrice: {
            ...draft.commercial.firmPrice,
            includedMaterials: draft.commercial.firmPrice.includedMaterials.map((line) => line.trim()).filter(Boolean),
            excludedMaterials: draft.commercial.firmPrice.excludedMaterials.map((line) => line.trim()).filter(Boolean),
          },
        },
      } : draft)
      if (mounted.current) onClose()
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "No se pudo guardar el presupuesto")
    } finally {
      busy.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !busy.current) onClose() }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader><DialogTitle>{presupuesto ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
        <DialogDescription>Datos comerciales explícitos. El servidor valida y calcula los importes definitivos.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {catalogError && <div role="alert">{catalogError} <Button type="button" variant="outline" onClick={retryCatalogs}>Reintentar catálogos</Button></div>}
        {!catalogs && !catalogError && <p role="status">Cargando catálogos…</p>}
        {catalogs && (!catalogs.branches.length || !catalogs.contacts.length) && <div role="alert">No hay sucursales o contactos activos. No se puede guardar. <Button type="button" variant="outline" onClick={retryCatalogs}>Reintentar catálogos</Button></div>}
        {error && <p role="alert" className="text-destructive">{error} Los datos ingresados se conservan. No se reintenta automáticamente.</p>}
        <fieldset disabled={saving} className="space-y-4">
          <legend className="sr-only">Datos del presupuesto</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>Sucursal<select aria-label="Sucursal" required className="block w-full rounded-md border p-2" value={draft.branchId} onChange={(e) => update("branchId", e.target.value)}>
              <option value="">Seleccionar sucursal</option>
              {draft.branchId && !catalogs?.branches.some((b) => b.id === draft.branchId) && <option value={draft.branchId}>Sucursal no disponible ({draft.branchId})</option>}
              {catalogs?.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></label>
            {([['clientContactId', 'Cliente'], ['payerContactId', 'Pagador']] as const).map(([key, label]) => <label key={key}>{label}<select aria-label={label} required className="block w-full rounded-md border p-2" value={draft[key]} onChange={(e) => update(key, e.target.value)}>
              <option value="">Seleccionar {label.toLowerCase()}</option>
              {draft[key] && !catalogs?.contacts.some((c) => c.id === draft[key]) && <option value={draft[key]}>Contacto no disponible ({draft[key]})</option>}
              {catalogs?.contacts.map((c) => <option key={c.id} value={c.id}>{c.legalName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.documentNumber || c.id}</option>)}
            </select></label>)}
          </div>
          {presupuesto ? <p>Cirugía vinculada: {presupuesto.surgeryId ?? "Sin cirugía (independiente)"}</p> : <label className="block">Cirugía<select aria-label="Cirugía" className="block w-full rounded-md border p-2" value={draft.surgeryId ?? ""} onChange={(e) => update("surgeryId", e.target.value || undefined)}>
            <option value="">Sin cirugía (independiente)</option>
            {availableSurgeries.map((s) => <option key={s.backendId} value={s.backendId}>{s.id} — {s.patient}</option>)}
          </select></label>}
          {!presupuesto?.surgeryId && !draft.surgeryId && <p className="text-sm text-muted-foreground">Un presupuesto independiente no es fuente del flujo Pendientes de facturar. Para ese flujo, vinculá una cirugía existente.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Concepto<Input value={draft.title ?? ""} onChange={(e) => update("title", e.target.value)} /></label>
            <label>Moneda<Input required value={draft.currency ?? ""} onChange={(e) => update("currency", e.target.value)} /></label>
            <label>Fecha del documento<Input required type="date" value={draft.documentDate.slice(0, 10)} onChange={(e) => update("documentDate", e.target.value)} /></label>
            <label>Válido hasta<Input required type="date" value={draft.validUntil.slice(0, 10)} onChange={(e) => update("validUntil", e.target.value)} /></label>
            <label>Condición de pago<Input required value={draft.paymentTerms} onChange={(e) => update("paymentTerms", e.target.value)} /></label>
            <label>Lista de precios<Input required value={draft.priceListCode} onChange={(e) => update("priceListCode", e.target.value)} /></label>
            <label>Descuento general (%)<Input required type="number" min="0" max="100" step="any" value={draft.generalDiscountRate} onChange={(e) => update("generalDiscountRate", e.target.value)} /></label>
          </div>
          <p>Modalidad: {draft.commercial.pricingMode === "FIRM" ? "Precio firme" : "Estimativo"}</p>
          {draft.commercial.pricingMode === "FIRM" && <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["coordinator", "Coordinador"], ["quotationContact", "Contacto de cotización"], ["availability", "Disponibilidad"],
              ["operationalClarifications", "Aclaraciones operativas"], ["surgicalAssumptions", "Supuestos quirúrgicos"],
              ["includedMaterials", "Materiales incluidos"], ["excludedMaterials", "Materiales excluidos"],
            ] as const).map(([key, label]) => {
              const commercial = draft.commercial as Extract<PresupuestoDraftPayload["commercial"], { pricingMode: "FIRM" }>
              const value = commercial.firmPrice[key]
              return <label key={key}>{label}<Textarea required={!Array.isArray(value)} value={Array.isArray(value) ? value.join("\n") : value} onChange={(e) => update("commercial", { ...commercial, firmPrice: { ...commercial.firmPrice, [key]: Array.isArray(value) ? e.target.value.split("\n") : e.target.value } })} /></label>
            })}
          </div>}
          <label className="block">Leyenda<Textarea required readOnly={draft.commercial.pricingMode === "ESTIMATIVE"} value={draft.legend} onChange={(e) => update("legend", e.target.value)} /></label>
          <h2 className="font-semibold">Ítems de descripción libre</h2>
          {draft.items.map((line, index) => <fieldset key={index} className="rounded-md border p-3">
            <legend>Ítem {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-4">
              {([
                ["description", "Descripción", "text"], ["sku", "Código", "text"], ["unit", "Unidad", "text"],
                ["quantity", "Cantidad", "number"], ["unitPrice", "Precio unitario", "number"], ["discountRate", "Descuento (%)", "number"], ["taxRate", "IVA (%)", "number"],
              ] as const).map(([key, label, type]) => <label key={key}>{label}<Input aria-label={`${label} ${index + 1}`} type={type} required={key !== "sku" && key !== "unit"} step={type === "number" ? "any" : undefined} min={type === "number" ? key === "quantity" ? "0.000001" : "0" : undefined} max={key === "discountRate" || key === "taxRate" ? "100" : undefined} value={line[key] ?? ""} onChange={(e) => update("items", draft.items.map((item, i) => i === index ? { ...item, [key]: e.target.value } : item))} /></label>)}
            </div>
            <Button type="button" variant="ghost" disabled={draft.items.length === 1} onClick={() => update("items", draft.items.filter((_, i) => i !== index))}>Quitar ítem {index + 1}</Button>
          </fieldset>)}
          <Button type="button" variant="outline" onClick={() => update("items", [...draft.items, emptyLine()])}>Agregar ítem</Button>
          <label className="block">Observaciones<Textarea value={draft.notes ?? ""} onChange={(e) => update("notes", e.target.value)} /></label>
          <p className="text-sm text-muted-foreground">Totales y revisión se obtienen del presupuesto guardado, no de cálculos locales.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={!referencesValid || saving}>{saving ? "Guardando…" : "Guardar presupuesto"}</Button></div>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>
}
