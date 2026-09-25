"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Camera, CheckCircle2, CircleDot, Loader2, RefreshCw, ScanLine, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api/client"

type Action = { type: string; command?: string; method: string; route: string; targets: Record<string, string | null>; permitted: { quantity?: string | { max?: string | null }; unit?: string | null; receiptOutcomes?: string[] }; requiredInputs: string[]; blockers: string[]; idempotency: { required: boolean; field: string } }
type Allocation = { id: string; assignmentId: string; remito: { id: string } | null; expected: { quantity: string | null; unit: string }; assigned: { quantity: string | null }; dispatched: { quantity: string }; consumed: { quantity: string }; returned: { quantity: string }; pending: { quantity: string }; quarantine: { quantity: string }; positionId: string | null; lot: string | null; serial: string | null; identifiedCode: string | null; cajaCode: string | null; blockers: string[]; differences: Array<{ id: string; kind: string; closed: boolean; actions: Action[] }>; returns?: Array<{ id: string; state: string; quantity: string; actions: Action[] }>; receipt?: { actorId: string | null; at: string | null } | null; reconciliation?: { kind: string; actorId: string; at: string } | null; actions: Action[]; capabilities?: Record<string, { allowed: boolean; reason: string | null }>; lineage: Record<string, string | null>; snapshots: Record<string, unknown> | null }
type Projection = { generatedAt: string; summary: Record<string, string>; allocations: Allocation[]; assignments: Array<{ id: string; caja: { code: string | null }; preparations: Array<{ status: string; version: number }>; dispatches: Array<{ id: string; remitoId: string | null; acceptedAt?: string | null }>; actions: Action[] }> }
type Scan = { kind: "none"; code: string } | { kind: "exact"; code: string; allocation: { id: string } } | { kind: "ambiguous"; code: string; candidates: Array<{ id: string; identifiedCode: string | null; serial: string | null }> }

const labels: Record<string, string> = { RELEASE_ALLOCATION: "Preparar", ACCEPT_CONTROL: "Controlar", RESOLVE_DIFFERENCE: "Resolver diferencia", EMIT_REMITO_DISPATCH: "Despachar", RECORD_CONSUMPTION: "Registrar consumo", REGISTER_RETURN: "Registrar devolución", REGISTER_UNIDENTIFIED_RETURN: "Devolución no identificada", RECEIVE_RETURN: "Recibir devolución", RESOLVE_UNIDENTIFIED_RETURN: "Resolver devolución", CLOSE_RECONCILIATION: "Conciliar", REOPEN_RECONCILIATION: "Reabrir conciliación" }
const summaryLabels: Record<string, string> = { expected: "Esperado", assigned: "Asignado", dispatched: "Despachado", consumed: "Consumido", returned: "Devuelto", pending: "Pendiente", quarantine: "Cuarentena", blockers: "Bloqueos", differences: "Diferencias" }
const idempotencyKey = () => globalThis.crypto?.randomUUID?.() ?? `logistics-${Date.now()}`
const unavailable = "No disponible"
const timestamp = (value: string | null | undefined) => value ? new Date(value).toLocaleString("es-AR") : unavailable

export function LogisticsOperationsWorkspace({ companyId, surgeryId, freshnessKey = 0, onOperationComplete }: { companyId: string; surgeryId: string; freshnessKey?: number; onOperationComplete?: () => void | Promise<void> }) {
  const [projection, setProjection] = useState<Projection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scanValue, setScanValue] = useState("")
  const [scan, setScan] = useState<Scan | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [mutating, setMutating] = useState(false)
  const [result, setResult] = useState("")
  const [filter, setFilter] = useState("")
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const actionOriginRef = useRef<HTMLButtonElement>(null)

  const base = `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/logistics/operations`
  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await apiFetch<Projection>(base)
        setProjection(data)
      setSelectedId((current) => current && data.allocations.some((item) => item.id === current) ? current : data.allocations[0]?.id ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la proyección logística.") }
    finally { setLoading(false) }
  }, [base])
  useEffect(() => { void Promise.resolve().then(refresh) }, [refresh, freshnessKey])
  useEffect(() => { if (action) requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("input, select, button")?.focus()) }, [action])
  useEffect(() => {
    if (!action) return
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("input, select, button:not([disabled])") ?? [])
      const first = focusable[0]; const last = focusable.at(-1)
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus() }
    }
    document.addEventListener("keydown", trapFocus)
    return () => document.removeEventListener("keydown", trapFocus)
  }, [action])
  useEffect(() => {
    const dialog = dialogRef.current
    if (!action || !dialog) return
    const background = Array.from(dialog.parentElement?.children ?? []).filter((element) => element !== dialog)
    background.forEach((element) => element.setAttribute("inert", ""))
    const redirectFocus = (event: FocusEvent) => { if (event.target instanceof Node && !dialog.contains(event.target)) dialog.querySelector<HTMLElement>("input, select, button:not([disabled])")?.focus() }
    document.addEventListener("focusin", redirectFocus)
    return () => { background.forEach((element) => element.removeAttribute("inert")); document.removeEventListener("focusin", redirectFocus) }
  }, [action])

  const selected = projection?.allocations.find((item) => item.id === selectedId) ?? null
  const allActions = useMemo(() => selected ? [...selected.actions, ...selected.differences.flatMap((item) => item.actions), ...(selected.returns ?? []).flatMap((item) => item.actions), ...((projection?.assignments.find((item) => item.id === selected.assignmentId)?.actions) ?? [])] : [], [projection?.assignments, selected])
  const deniedReasons = useMemo(() => [...new Set(projection?.allocations.flatMap((allocation) => Object.values(allocation.capabilities ?? {}).flatMap((capability) => !capability.allowed && capability.reason ? [capability.reason] : [])) ?? [])], [projection])
  const processStages = useMemo(() => {
    const assignment = projection?.assignments[0]
    const allocation = projection?.allocations[0]
    const preparation = assignment?.preparations[0]
    const dispatch = assignment?.dispatches[0]
    const returned = allocation?.returns?.[0]
    return [
      { name: "Preparar", state: preparation?.status ?? unavailable, actor: unavailable, at: unavailable },
      { name: "Control", state: unavailable, actor: unavailable, at: unavailable },
      { name: "Despachar", state: dispatch ? "Despachado" : unavailable, actor: unavailable, at: timestamp(dispatch?.acceptedAt) },
      { name: "Recibir", state: returned?.state ?? unavailable, actor: allocation?.receipt?.actorId ?? unavailable, at: timestamp(allocation?.receipt?.at) },
      { name: "Conciliar", state: allocation?.reconciliation?.kind ?? unavailable, actor: allocation?.reconciliation?.actorId ?? unavailable, at: timestamp(allocation?.reconciliation?.at) },
    ]
  }, [projection])
  const restoreActionFocus = useCallback(() => requestAnimationFrame(() => actionOriginRef.current?.isConnected ? actionOriginRef.current.focus() : document.getElementById(`allocation-${selectedId}`)?.focus()), [selectedId])
  useEffect(() => { if (!action && actionOriginRef.current) restoreActionFocus() }, [action, restoreActionFocus])
  const openAction = (next: Action, origin?: HTMLButtonElement) => { actionOriginRef.current = origin ?? (document.activeElement instanceof HTMLButtonElement ? document.activeElement : null); setResult(""); setFields({ quantity: typeof next.permitted.quantity === "string" ? next.permitted.quantity : "", reason: "", decision: "accept", evidenceReference: "", receiptOutcome: next.permitted.receiptOutcomes?.[0] ?? "" }); setAction(next) }
  const runAction = async (event: FormEvent) => {
    event.preventDefault(); if (!action) return
    const body: Record<string, unknown> = action.idempotency.required ? { [action.idempotency.field]: idempotencyKey() } : {}
    if (action.command) {
      body.action = action.command
      body.dispatchId = action.targets.dispatchId
      if (action.targets.dispatchLineId) body.dispatchLineId = action.targets.dispatchLineId
    }
    for (const field of action.requiredInputs) body[field] = fields[field]
    if (action.type === "RECEIVE_RETURN" || action.type === "RESOLVE_UNIDENTIFIED_RETURN") body.sourceOperationId = action.targets.returnOperationId
    setMutating(true)
    try { await apiFetch(action.route, Object.keys(body).length ? { method: action.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { method: action.method }); setAction(null); await refresh(); await onOperationComplete?.(); setResult("Operación completada. Proyección actualizada."); restoreActionFocus() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "La acción no pudo completarse."); setAction(null); void refresh(); restoreActionFocus() }
    finally { setMutating(false) }
  }
  const resolveScan = async (code = scanValue) => {
    if (!code.trim()) return
    setScan(null)
    try {
      const result = await apiFetch<Scan>(`${base}/resolve-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
      setScan(result)
      if (result.kind === "exact") { setSelectedId(result.allocation.id); setScanValue("") }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo resolver el código."); void refresh() }
  }
  const scanWithCamera = async (inputRef: React.RefObject<HTMLInputElement | null>) => {
    const Detector = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector
    if (!Detector || !navigator.mediaDevices?.getUserMedia) { setError("Cámara no disponible. Usá lector USB o ingreso manual."); inputRef.current?.focus(); return }
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); const video = document.createElement("video"); video.srcObject = stream; await video.play(); const found = await new Detector({ formats: ["qr_code", "code_128", "data_matrix"] }).detect(video); stream.getTracks().forEach((track) => track.stop()); if (found[0]?.rawValue) void resolveScan(found[0].rawValue); else setError("No se leyó ningún código. Intentá nuevamente o usá el lector USB.") } catch { setError("Permiso de cámara denegado. Usá lector USB o ingreso manual."); inputRef.current?.focus() }
  }

  if (loading && !projection) return <Surface><p role="status" className="flex items-center gap-2"><Loader2 className="animate-spin" />Cargando proyección logística…</p></Surface>
  if (error && !projection) return <Surface><p role="alert">{error}</p><Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw />Reintentar</Button></Surface>
  if (!projection) return <Surface><p>Logística no disponible para esta cirugía.</p></Surface>

  const summary = ["expected", "assigned", "dispatched", "consumed", "returned", "pending", "quarantine", "blockers", "differences"]
  const visibleAllocations = projection.allocations.filter((item) => !filter.trim() || [item.cajaCode, item.identifiedCode, item.positionId, item.lot, item.serial, item.remito?.id, ...item.blockers].filter(Boolean).join(" ").toLowerCase().includes(filter.trim().toLowerCase()))
  return <main data-logistics-workspace className="space-y-3 rounded-lg border border-[var(--ossum-line)] bg-slate-100 p-3 text-slate-900 sm:p-4"><WorkspaceSurfaceOverrides />
    <header className="flex flex-col gap-3 border-b border-[var(--ossum-line)] pb-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--ossum-action)]">Logística operativa</p><h2 className="mt-1 text-base font-semibold text-[var(--ossum-navy)]">Control físico de despacho</h2><p className="mt-1 text-xs text-slate-500">Proyección server-authoritative · {new Date(projection.generatedAt).toLocaleString("es-AR")}</p></div><Button variant="outline" size="sm" className="min-h-11 bg-white" onClick={() => void refresh()}><RefreshCw />Actualizar</Button></header>
    {error ? <p role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}{projection ? " La proyección visible puede estar desactualizada; reintentá para confirmar." : ""}</p> : null}
    {deniedReasons.length ? <section aria-label="Restricciones operativas" className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><p className="font-semibold">Restricciones operativas</p><ul className="mt-2 grid gap-1 sm:grid-cols-2">{deniedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section> : null}
    {result ? <p role="status" aria-live="polite" className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">{result}</p> : null}
    <section className="grid grid-cols-3 gap-px overflow-hidden rounded border border-slate-300 bg-slate-300 sm:grid-cols-5 lg:grid-cols-9">{summary.map((key) => <div key={key} className={`bg-white p-2 ${["blockers", "differences"].includes(key) && Number(projection.summary[key]) > 0 ? "text-red-800" : ""}`}><p className="text-[9px] uppercase tracking-wide text-slate-500">{summaryLabels[key] ?? unavailable}</p><p className="mt-1 font-mono text-sm font-semibold">{projection.summary[key]}</p></div>)}</section>
    <section className="grid gap-2 rounded border border-slate-300 bg-white p-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ossum-action)]">Siguiente tarea</p><p role="status" className="mt-1 text-sm">No disponible: la proyección actual no publica una siguiente tarea autoritativa.</p></div></section>
    <section className="rounded border border-slate-700 bg-[#101d2b] p-3 lg:hidden"><Label htmlFor="logistics-scan-mobile" className="text-xs text-slate-300">Escanear asignación</Label><div className="mt-1 flex gap-2"><Input ref={mobileInputRef} id="logistics-scan-mobile" aria-label="Escanear asignación móvil" className="h-11 border-slate-600 bg-slate-950 font-mono text-slate-100" value={scanValue} onChange={(event) => setScanValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void resolveScan()} placeholder="Cámara, lector USB o código" /><Button aria-label="Resolver código móvil" className="h-11" variant="outline" onClick={() => void resolveScan()}><ScanLine /></Button><Button aria-label="Usar cámara móvil" className="h-11" variant="outline" onClick={() => void scanWithCamera(mobileInputRef)}><Camera /></Button></div></section>
    <section aria-label="Mapa de proceso" className="grid grid-cols-1 gap-1 sm:grid-cols-5">{processStages.map((stage) => <div key={stage.name} className="border border-slate-700 bg-slate-900 p-2 text-center text-[10px]"><CircleDot className="mx-auto mb-1 size-3 text-slate-500" /><p>{stage.name}</p><p className="mt-1 text-[9px] text-cyan-100">{stage.state}</p><p className="mt-1 text-[9px] text-slate-400">Actor: {stage.actor}</p><p className="text-[9px] text-slate-400">Fecha/hora: {stage.at}</p></div>)}</section>
    <section className="rounded border border-slate-700 bg-[#101d2b]"><div className="flex flex-col gap-2 border-b border-slate-700 p-3 sm:flex-row sm:items-end"><div className="flex-1"><Label htmlFor="logistics-filter" className="text-xs text-slate-300">Filtrar asignaciones</Label><Input id="logistics-filter" className="mt-1 h-9 border-slate-600 bg-slate-950 text-slate-100" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Caja, remito, lote, serie, bloqueo…" /></div><div className="hidden flex-1 lg:block"><Label htmlFor="logistics-scan" className="text-xs text-slate-300">Escanear asignación</Label><div className="mt-1 flex gap-2"><Input ref={desktopInputRef} id="logistics-scan" className="h-11 border-slate-600 bg-slate-950 font-mono text-slate-100" value={scanValue} onChange={(event) => setScanValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void resolveScan()} placeholder="Cámara, lector USB o código" /><Button aria-label="Resolver código" className="h-11" variant="outline" onClick={() => void resolveScan()}><ScanLine /></Button><Button aria-label="Usar cámara" className="h-11" variant="outline" onClick={() => void scanWithCamera(desktopInputRef)}><Camera /></Button></div></div></div>
      {scan?.kind === "none" ? <p role="status" className="m-3 rounded border border-amber-700 bg-amber-950/40 p-2 text-xs">No hay una asignación elegible para <span className="font-mono">{scan.code}</span>.</p> : null}
      {scan?.kind === "ambiguous" ? <div role="status" className="m-3 rounded border border-amber-700 bg-amber-950/40 p-2 text-xs"><p>El código es ambiguo. Elegí una asignación:</p><div className="mt-2 flex flex-wrap gap-2">{scan.candidates.map((candidate) => <Button key={candidate.id} size="sm" variant="outline" onClick={() => { setSelectedId(candidate.id); setScan(null) }}>{candidate.identifiedCode ?? candidate.serial ?? candidate.id}</Button>)}</div></div> : null}
      {scan?.kind === "exact" ? <p role="status" className="m-3 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="size-4" />Asignación seleccionada por escaneo.</p> : null}
      {projection.allocations.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No hay asignaciones físicas para esta cirugía.</p> : visibleAllocations.length === 0 ? <p role="status" className="p-6 text-center text-sm text-slate-400">No hay asignaciones que coincidan con el filtro.</p> : <><div className="hidden overflow-x-auto md:block"><table className="min-w-[980px] w-full text-left text-xs"><thead className="sticky top-0 bg-[#0b1c31] text-[10px] uppercase tracking-wide text-cyan-100"><tr>{["Caja / código", "Esperado", "Asignado", "Desp.", "Consum.", "Dev.", "Pend.", "Lote / serie", "Estado"].map((name) => <th key={name} className="px-3 py-2 font-semibold">{name}</th>)}</tr></thead><tbody>{visibleAllocations.map((item) => <tr id={`allocation-${item.id}`} key={item.id} tabIndex={-1} onClick={() => setSelectedId(item.id)} className={`cursor-pointer border-t border-slate-800 hover:bg-cyan-950/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${selectedId === item.id ? "bg-cyan-950/40" : ""}`}><td className="px-3 py-2 font-mono">{item.cajaCode ?? "—"}<br /><span className="text-slate-500">{item.identifiedCode ?? item.positionId ?? "—"}</span></td><td>{item.expected.quantity ?? "—"}</td><td>{item.assigned.quantity ?? "—"}</td><td>{item.dispatched.quantity}</td><td>{item.consumed.quantity}</td><td>{item.returned.quantity}</td><td className={item.pending.quantity !== "0" ? "text-amber-300" : ""}>{item.pending.quantity}</td><td className="font-mono">{item.lot ?? "—"}<br />{item.serial ?? "—"}</td><td>{item.blockers.length ? <span className="text-red-300">Bloqueada</span> : "Sin bloqueos"}</td></tr>)}</tbody></table></div><div className="space-y-2 p-2 md:hidden">{visibleAllocations.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`min-h-11 w-full rounded border p-3 text-left text-xs ${selectedId === item.id ? "border-cyan-400 bg-cyan-950/40" : "border-slate-700"}`}><span className="font-mono">{item.cajaCode ?? "Caja"} · {item.identifiedCode ?? item.positionId ?? "—"}</span><span className="float-right text-amber-300">Pend. {item.pending.quantity}</span><p className="mt-1 text-slate-400">Esp. {item.expected.quantity ?? "—"} · Asig. {item.assigned.quantity ?? "—"} · Desp. {item.dispatched.quantity} · Cons. {item.consumed.quantity} · Dev. {item.returned.quantity}</p></button>)}</div></>}</section>
    {selected ? <section className="grid gap-3 xl:grid-cols-[1.3fr_.7fr]"><div className="rounded border border-slate-700 bg-[#101d2b] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">Inspector físico / comercial</p><dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><Detail label="Remito comercial" value={selected.remito?.id ?? "Sin remito físico"} mono /><Detail label="Caja" value={selected.cajaCode ?? "—"} mono /><Detail label="Lote" value={selected.lot ?? "—"} mono /><Detail label="Serie" value={selected.serial ?? "—"} mono /><Detail label="Posición" value={selected.positionId ?? "—"} mono /><Detail label="Trazabilidad" value={Object.values(selected.lineage).filter(Boolean).join(" · ") || "Sin referencias"} mono /></dl><div className="mt-3 border-t border-slate-700 pt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bloqueos y diferencias</p>{selected.blockers.length || selected.differences.length ? <ul className="mt-2 space-y-1 text-xs">{selected.blockers.map((blocker) => <li key={blocker} className="flex gap-2 text-red-300"><XCircle className="size-3 shrink-0" />{blocker}</li>)}{selected.differences.map((difference) => <li key={difference.id} className={difference.closed ? "text-slate-400" : "text-amber-300"}><AlertTriangle className="mr-1 inline size-3" />{difference.kind} · {difference.closed ? "resuelta" : "abierta"}</li>)}</ul> : <p className="mt-2 text-xs text-emerald-300">Sin bloqueos ni diferencias abiertas.</p>}</div></div><aside className="rounded border border-cyan-900 bg-[#0b1c31] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">Acciones permitidas</p>{allActions.length ? <div className="mt-3 flex flex-wrap gap-2">{allActions.map((item, index) => <Button key={`${item.type}-${index}`} size="sm" className="min-h-11 bg-cyan-700 hover:bg-cyan-500" onClick={() => openAction(item)}>{labels[item.type] ?? item.type}</Button>)}</div> : <ul className="mt-2 space-y-1 text-xs text-amber-200">{Object.entries(selected.capabilities ?? {}).filter(([, capability]) => !capability.allowed).map(([name, capability]) => <li key={name}>{name}: {capability.reason}</li>)}<li className="text-slate-400">No hay una acción autorizada para esta asignación.</li></ul>}</aside></section> : null}
    {action ? <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Confirmar acción logística" onKeyDown={(event) => { if (event.key === "Escape") setAction(null) }} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><form onSubmit={runAction} className="w-full max-w-lg overflow-hidden rounded border border-cyan-700 bg-[#0b1726]"><header className="border-b border-slate-700 p-4"><p className="text-xs font-semibold text-cyan-300">Confirmar operación</p><h3 className="mt-1 font-semibold">{labels[action.type] ?? action.type}</h3></header><div className="max-h-[60dvh] space-y-3 overflow-y-auto p-4 text-sm"><p className="text-slate-300">Destino: <span className="font-mono text-xs">{Object.values(action.targets).filter(Boolean).join(" · ")}</span></p>{action.requiredInputs.includes("quantity") ? <Field label={`Cantidad${action.permitted.unit ? ` (${action.permitted.unit})` : ""}`} name="quantity" value={fields.quantity} onChange={setFields} type="number" /> : null}{action.requiredInputs.includes("reason") ? <Field label="Motivo" name="reason" value={fields.reason} onChange={setFields} /> : null}{action.requiredInputs.includes("decision") ? <label className="block text-xs">Decisión<select className="mt-1 h-10 w-full rounded border border-slate-600 bg-slate-950 px-2" value={fields.decision} onChange={(event) => setFields((current) => ({ ...current, decision: event.target.value }))}><option value="accept">Aceptar</option><option value="reject">Rechazar</option></select></label> : null}{action.requiredInputs.includes("evidenceReference") ? <Field label="Referencia de evidencia" name="evidenceReference" value={fields.evidenceReference} onChange={setFields} /> : null}{action.requiredInputs.includes("receiptOutcome") ? <label className="block text-xs">Resultado de recepción<select className="mt-1 h-10 w-full rounded border border-slate-600 bg-slate-950 px-2" value={fields.receiptOutcome} onChange={(event) => setFields((current) => ({ ...current, receiptOutcome: event.target.value }))}>{action.permitted.receiptOutcomes?.map((outcome) => <option key={outcome}>{outcome}</option>)}</select></label> : null}<p className="rounded border border-amber-800 bg-amber-950/40 p-2 text-xs text-amber-200">La operación será revalidada por el servidor. Revisá cantidades y consecuencia antes de confirmar.</p></div><footer className="flex justify-end gap-2 border-t border-slate-700 p-3"><Button type="button" variant="outline" onClick={() => setAction(null)}>Cancelar</Button><Button type="submit" disabled={mutating}>{mutating ? <Loader2 className="animate-spin" /> : null}Confirmar</Button></footer></form></div> : null}
  </main>
}

function WorkspaceSurfaceOverrides() { return <style>{`[data-logistics-workspace] [class*="bg-[#101d2b]"], [data-logistics-workspace] [class*="bg-[#07111d]"] { background-color: white !important; } [data-logistics-workspace] [class*="bg-[#0b1c31]"], [data-logistics-workspace] [class*="bg-[#0b1726]"] { background-color: var(--ossum-navy) !important; } [data-logistics-workspace] [class*="bg-slate-950"], [data-logistics-workspace] [class*="bg-slate-900"] { background-color: white !important; } [data-logistics-workspace] [class*="border-slate-700"], [data-logistics-workspace] [class*="border-slate-800"], [data-logistics-workspace] [class*="border-slate-600"] { border-color: var(--ossum-line) !important; } [data-logistics-workspace] [class*="text-slate-100"], [data-logistics-workspace] [class*="text-slate-300"], [data-logistics-workspace] [class*="text-slate-400"] { color: rgb(71 85 105) !important; } [data-logistics-workspace] [class*="text-cyan-100"], [data-logistics-workspace] [class*="text-cyan-300"] { color: var(--ossum-action) !important; } [data-logistics-workspace] [class*="text-emerald-300"] { color: rgb(4 120 87) !important; } [data-logistics-workspace] [class*="text-amber-300"] { color: rgb(146 64 14) !important; } [data-logistics-workspace] [class*="text-red-300"] { color: rgb(185 28 28) !important; } [data-logistics-workspace] [class*="bg-cyan-950"] { background-color: rgb(240 249 255) !important; }`}</style> }
function Surface({ children }: { children: React.ReactNode }) { return <div className="space-y-3 rounded-lg border border-[var(--ossum-line)] bg-white p-4 text-sm text-slate-900">{children}</div> }
function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt><dd className={`mt-1 break-all ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd></div> }
function Field({ label, name, value, onChange, type = "text" }: { label: string; name: string; value: string; onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>; type?: string }) { return <label className="block text-xs">{label}<Input className="mt-1 h-10 border-slate-600 bg-slate-950" type={type} required value={value} onChange={(event) => onChange((current) => ({ ...current, [name]: event.target.value }))} /></label> }
