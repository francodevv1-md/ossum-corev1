"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api/client"

type Quantity = { quantity?: string | null; unit?: string | null }
type Allocation = {
  assignmentId: string
  cajaCode?: string | null
  expected?: Quantity
  assigned?: Quantity
  dispatched?: Quantity
  consumed?: Quantity
  returned?: Quantity
  pending?: Quantity
  quarantine?: Quantity
  lot?: string | null
  serial?: string | null
  identifiedCode?: string | null
  remito?: unknown
  blockers?: string[]
  differences?: Array<{ kind: string; closed: boolean }>
  returns?: Array<{ state: string; quantity: string; unit?: string | null }>
  receipt?: { outcome?: string | null; at?: string | null } | null
  reconciliation?: { kind: string; at?: string | null } | null
}
type Assignment = {
  caja?: { code?: string | null }
  preparations?: Array<{ status?: string; requiresRecontrol?: boolean; expected?: Quantity; assigned?: Quantity }>
  dispatches?: Array<{ acceptedAt?: string | null }>
}
type Projection = {
  generatedAt: string
  summary: Partial<Record<"expected" | "assigned" | "dispatched" | "consumed" | "returned" | "pending" | "quarantine", string>>
  assignments: Assignment[]
  allocations: Allocation[]
}

const unavailable = "No disponible"
const quantityLabels = [["expected", "Esperado"], ["assigned", "Asignado"], ["dispatched", "Despachado"], ["consumed", "Consumido"], ["returned", "Devuelto"], ["pending", "Pendiente"]] as const
const blockerLabels: Record<string, string> = {
  expected_line_unavailable: "Falta información de material esperado",
  allocation_snapshot_unavailable: "Falta información de trazabilidad del material",
  remito_lineage_unavailable: "Falta información de remito",
}

function dateTime(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date.toLocaleString("es-AR")
}

function statusFor(values: string[], fallback: string) {
  const unique = [...new Set(values.filter(Boolean))]
  return unique.length > 1 ? "Resumen mixto" : unique[0] ?? fallback
}

function preparationStatus(assignments: Assignment[]) {
  return statusFor(assignments.map((assignment) => {
    const preparation = assignment.preparations?.[0]
    if (!preparation) return "Sin información de preparación disponible"
    if (preparation.requiresRecontrol) return "Requiere nuevo control"
    return preparation.status === "COMPLETE" ? "Preparación completa" : "Preparación registrada"
  }), "Sin información de preparación disponible")
}

function dispatchStatus(assignments: Assignment[]) {
  return statusFor(assignments.map((assignment) => assignment.dispatches?.length ? "Despacho registrado" : "Aún no se registró despacho"), "Aún no se registró despacho")
}

function labelFor(value: string | null | undefined, labels: Record<string, string>, fallback = "Registrado") {
  if (!value) return unavailable
  return labels[value] ?? fallback
}

function quantityFor(quantity?: Quantity) {
  return [quantity?.quantity, quantity?.unit].filter(Boolean).join(" ") || unavailable
}

function returnState(state: string) {
  return labelFor(state, { PENDING_IDENTIFICATION: "Devolución pendiente de identificación", RECEIVED: "Devolución recibida" }, "Devolución registrada")
}

function receiptState(receipt: Allocation["receipt"]) {
  return labelFor(receipt?.outcome, { FIT: "Recepción conforme", OBSERVED: "Recepción observada", DAMAGED: "Recepción con daño", NOT_FIT: "Recepción no apta", UNIDENTIFIABLE: "Recepción pendiente de identificación" })
}

function reconciliationState(reconciliation: Allocation["reconciliation"]) {
  return labelFor(reconciliation?.kind, { CLOSED: "Conciliación cerrada", REOPENED: "Conciliación reabierta" })
}

function latestEvent(projection: Projection) {
  const events = [
    ...projection.assignments.flatMap((assignment) => assignment.dispatches?.map((dispatch) => [dispatch.acceptedAt, "Despacho registrado"] as const) ?? []),
    ...projection.allocations.flatMap((allocation) => [[allocation.receipt?.at, "Recepción registrada"], [allocation.reconciliation?.at, "Conciliación registrada"]] as const),
  ].filter(([at]) => dateTime(at))
  return events.sort(([left], [right]) => new Date(right!).valueOf() - new Date(left!).valueOf())[0]
}

function Flow({ projection }: { projection: Projection }) {
  const receipt = statusFor(projection.allocations.map((allocation) => allocation.receipt ? receiptState(allocation.receipt) : allocation.returns?.length ? "Devolución registrada" : "Sin datos de recepción disponibles"), "Sin datos de recepción disponibles")
  const reconciliation = statusFor(projection.allocations.map((allocation) => allocation.reconciliation ? reconciliationState(allocation.reconciliation) : "Sin datos de conciliación disponibles"), "Sin datos de conciliación disponibles")
  const stages = [["Preparación", preparationStatus(projection.assignments)], ["Control", "Sin información de control disponible"], ["Despacho", dispatchStatus(projection.assignments)], ["Recepción / devolución", receipt], ["Conciliación", reconciliation]]
  return <section aria-label="Flujo logístico" className="grid gap-px overflow-hidden rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-line)] sm:grid-cols-5">{stages.map(([title, status]) => <div key={title} className="bg-white px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-gray-500">{title}</p><p className="mt-1 text-xs font-medium text-gray-800">{status}</p></div>)}</section>
}

export function LogisticsInformationSurface({ companyId, surgeryId, freshnessKey = 0 }: { companyId: string; surgeryId: string; freshnessKey?: number }) {
  const [projection, setProjection] = useState<Projection | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<"denied" | "error" | null>(null)
  const requestUrl = useMemo(() => `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/logistics/operations`, [companyId, surgeryId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void apiFetch<Projection>(requestUrl).then((data) => {
      if (!cancelled) { setProjection(data); setFailed(null) }
    }).catch((error: unknown) => {
      if (!cancelled) setFailed(typeof error === "object" && error && "status" in error && error.status === 403 ? "denied" : "error")
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [freshnessKey, requestUrl])

  if (loading && !projection) return <Surface><p role="status">Cargando información logística...</p><div className="grid grid-cols-3 gap-px bg-[var(--ossum-line)] sm:grid-cols-6">{quantityLabels.map(([key]) => <span key={key} className="h-12 animate-pulse bg-[var(--ossum-surface-2)]" />)}</div><div className="h-16 animate-pulse bg-[var(--ossum-surface-2)]" /></Surface>
  if (!projection) return <Surface><p role="alert">{failed === "denied" ? "No tenés acceso para consultar la información logística de esta cirugía." : "No pudimos cargar la información logística de esta cirugía."}</p></Surface>

  const cajas = [...new Set([...projection.assignments.map((assignment) => assignment.caja?.code), ...projection.allocations.map((allocation) => allocation.cajaCode)].filter((code): code is string => Boolean(code)))]
  const differences = projection.allocations.flatMap((allocation) => allocation.differences ?? [])
  const blockers = projection.allocations.flatMap((allocation) => allocation.blockers ?? [])
  const event = latestEvent(projection)
  const hasMixedStages = preparationStatus(projection.assignments) === "Resumen mixto" || dispatchStatus(projection.assignments) === "Resumen mixto"

  return <Surface>
    <header className="border-b border-[var(--ossum-line)] pb-2">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-[var(--ossum-navy)]">Logística</h2>{hasMixedStages && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Resumen mixto</span>}</div>
      <p className="mt-1 text-[11px] text-gray-500">Actualizado {dateTime(projection.generatedAt) ?? unavailable}</p>
    </header>
    {failed === "error" && <p role="status" className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">La información puede no estar al día. Se mostrará la última actualización disponible.</p>}
    <section aria-label="Resumen de cantidades" className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-line)] sm:grid-cols-6">{quantityLabels.map(([key, label]) => <div key={key} className="bg-white px-3 py-2"><p className="text-[10px] uppercase tracking-[.08em] text-gray-500">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums text-gray-800">{projection.summary[key] ?? unavailable}</p></div>)}</section>
    {projection.summary.quarantine && projection.summary.quarantine !== "0" && <p className="text-xs text-amber-800">{projection.summary.quarantine} en cuarentena</p>}
    <Flow projection={projection} />
    {projection.allocations.length === 0 ? <section className="rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-surface)] px-3 py-4 text-sm text-gray-700"><p className="font-medium">Todavía no hay preparación ni materiales asignados para esta cirugía.</p><p className="mt-1 text-xs text-gray-500">La información logística aparecerá cuando sea registrada.</p></section> : <section className="min-w-0 overflow-hidden rounded-md border border-[var(--ossum-line)]"><div className="border-b border-[var(--ossum-line)] bg-[var(--ossum-surface)] px-3 py-2"><h3 className="text-xs font-semibold text-[var(--ossum-navy)]">Caja y materiales</h3><p className="mt-1 text-[11px] text-gray-500">Caja{cajas.length !== 1 ? "s" : ""}: {cajas.join(", ") || unavailable}</p></div><div className="hidden overflow-x-auto md:block"><table className="min-w-[720px] w-full text-left text-xs"><thead className="bg-[var(--ossum-navy)] text-white"><tr>{["Material", "Caja", "Esperado", "Asig.", "Desp.", "Cons.", "Dev.", "Pend.", "Trazabilidad"].map((label) => <th key={label} className="whitespace-nowrap px-3 py-1.5 font-medium">{label}</th>)}</tr></thead><tbody>{projection.allocations.map((allocation, index) => <tr key={`${allocation.cajaCode ?? "material"}-${index}`} className="border-t border-[var(--ossum-line)]"><td className="px-3 py-2">{unavailable}</td><td className="px-3 py-2 font-mono text-[11px] text-gray-600">{allocation.cajaCode ?? unavailable}</td>{([allocation.expected, allocation.assigned, allocation.dispatched, allocation.consumed, allocation.returned, allocation.pending] as Array<Quantity | undefined>).map((quantity, quantityIndex) => <td key={quantityIndex} className="px-3 py-2 text-right tabular-nums">{quantityFor(quantity)}</td>)}<td className="px-3 py-2 text-[11px] text-gray-600">{[allocation.lot && `Lote ${allocation.lot}`, allocation.serial && `Serie ${allocation.serial}`, allocation.identifiedCode && `Código ${allocation.identifiedCode}`].filter(Boolean).join(" · ") || unavailable}</td></tr>)}</tbody></table></div><div className="space-y-2 p-2 md:hidden">{projection.allocations.map((allocation, index) => <article key={`${allocation.cajaCode ?? "material"}-${index}`} data-testid="material-card" className="min-w-0 rounded border border-[var(--ossum-line)] p-3 text-xs"><p className="font-medium text-gray-800">Material: {unavailable}</p><p className="mt-1 font-mono text-[11px] text-gray-600">Caja: {allocation.cajaCode ?? unavailable}</p><dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">{quantityLabels.map(([key, label]) => <div key={key} className="min-w-0"><dt className="text-[10px] uppercase tracking-[.08em] text-gray-500">{label}</dt><dd className="tabular-nums text-gray-800">{quantityFor(allocation[key])}</dd></div>)}</dl><p className="mt-2 break-words text-[11px] text-gray-600">{[allocation.lot && `Lote ${allocation.lot}`, allocation.serial && `Serie ${allocation.serial}`, allocation.identifiedCode && `Código ${allocation.identifiedCode}`].filter(Boolean).join(" · ") || unavailable}</p></article>)}</div></section>}
    <div className="grid gap-3 lg:grid-cols-2"><section className="rounded-md border border-[var(--ossum-line)] p-3"><h3 className="text-xs font-semibold text-[var(--ossum-navy)]">Remito y despacho</h3><p className="mt-1 text-xs text-gray-700">Remito: {unavailable}</p><p className="mt-1 text-xs text-gray-500">{dispatchStatus(projection.assignments)}</p></section>{(differences.length > 0 || blockers.length > 0) && <section className="rounded-md border border-amber-200 bg-amber-50 p-3"><h3 className="text-xs font-semibold text-amber-900">Diferencias y bloqueos</h3><ul className="mt-1 space-y-1 text-xs text-amber-900">{differences.map((difference, index) => <li key={`difference-${index}`}>{difference.closed ? "Diferencia registrada" : "Hay una diferencia pendiente de revisión logística"}</li>)}{blockers.map((blocker, index) => <li key={`blocker-${index}`}>{blockerLabels[blocker] ?? "Hay una condición pendiente de revisión logística"}</li>)}</ul></section>}</div>
    <section className="rounded-md border border-[var(--ossum-line)] p-3"><h3 className="text-xs font-semibold text-[var(--ossum-navy)]">Recepción, devolución y conciliación</h3>{projection.allocations.some((allocation) => allocation.receipt || allocation.returns?.length || allocation.reconciliation) ? <div className="mt-2 space-y-2 text-xs text-gray-700">{projection.allocations.map((allocation, index) => (allocation.receipt || allocation.returns?.length || allocation.reconciliation) && <div key={`outcome-${index}`} className="border-t border-[var(--ossum-line)] pt-2 first:border-0 first:pt-0"><p className="font-medium">Caja: {allocation.cajaCode ?? unavailable} · Material: {unavailable}</p>{allocation.returns?.map((returned, returnIndex) => <p key={returnIndex}>Devolución: {returnState(returned.state)} · {quantityFor(returned)}</p>)}{allocation.receipt && <p>Recepción: {receiptState(allocation.receipt)}{dateTime(allocation.receipt.at) && ` · ${dateTime(allocation.receipt.at)}`}</p>}{allocation.reconciliation && <p>Conciliación: {reconciliationState(allocation.reconciliation)}{dateTime(allocation.reconciliation.at) && ` · ${dateTime(allocation.reconciliation.at)}`}</p>}</div>)}</div> : <p className="mt-1 text-xs text-gray-700">Sin datos de recepción, devolución o conciliación disponibles.</p>}</section>
    <section className="rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-surface)] p-3"><h3 className="text-xs font-semibold text-[var(--ossum-navy)]">Última novedad y trazabilidad</h3><p className="mt-1 text-xs text-gray-700">{event ? `${event[1]} · ${dateTime(event[0])}` : "Sin novedades registradas disponibles"}</p><p className="mt-1 text-[11px] text-gray-500">{[cajas.length ? `Caja ${cajas.join(", ")}` : null, preparationStatus(projection.assignments), dispatchStatus(projection.assignments), projection.allocations.some((allocation) => allocation.receipt || allocation.returns?.length) ? "Recepción o devolución registrada" : null, projection.allocations.some((allocation) => allocation.reconciliation) ? "Conciliación registrada" : null].filter(Boolean).join(" → ")}</p></section>
  </Surface>
}

function Surface({ children }: { children: React.ReactNode }) {
  return <main className="min-w-0 space-y-3 rounded-lg border border-[var(--ossum-line)] bg-white p-3 text-sm sm:p-4">{children}</main>
}
