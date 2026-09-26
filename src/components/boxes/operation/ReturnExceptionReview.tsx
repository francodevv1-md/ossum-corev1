"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, CircleAlert, FileSearch, PackageOpen, TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BoxDispatchEvidence,
  BoxPreparationControlHandoff,
  BoxPreparationPhysicalItem,
  BoxReturnExceptionPreset,
  BoxReturnResolutionHandoff,
  BoxReturnScenario,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

type ReturnState = "draft" | "error" | "success"

function ExceptionDraft({
  preset,
  selected,
  disabled,
  onToggle,
}: {
  preset: BoxReturnExceptionPreset
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="bg-muted/30">{preset.kind}</Badge><p className="text-sm font-semibold">{preset.title}</p></div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{preset.detail}</p>
          {preset.dispatchedSide && preset.receivedSide ? (
            <dl className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-3 text-xs sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Lado original</dt><dd className="mt-1 font-medium">{preset.dispatchedSide}</dd></div>
              <div><dt className="text-muted-foreground">Lado recibido</dt><dd className="mt-1 font-medium">{preset.receivedSide}</dd></div>
            </dl>
          ) : null}
        </div>
        <Button type="button" variant={selected ? "secondary" : "outline"} className="min-h-11 w-full sm:w-auto" aria-pressed={selected} aria-label={`${selected ? "Quitar" : "Registrar"} excepción ${preset.kind}: ${preset.title}`} disabled={disabled} onClick={onToggle}>
          {selected ? "Quitar excepción" : "Registrar excepción"}
        </Button>
      </div>
    </li>
  )
}

export function ReturnExceptionReview({
  operation,
  handoff,
  dispatchEvidence,
  dispatchedComposition,
  scenario,
  onBack,
  onReviewDifferences,
}: {
  operation: { reference: string; patientLabel: string; procedure: string }
  handoff: BoxPreparationControlHandoff
  dispatchEvidence: BoxDispatchEvidence
  dispatchedComposition: BoxPreparationPhysicalItem[]
  scenario: BoxReturnScenario
  onBack: () => void
  onReviewDifferences?: (handoff: BoxReturnResolutionHandoff) => void
}) {
  const [state, setState] = useState<ReturnState>("draft")
  const [selectedExceptionIds, setSelectedExceptionIds] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [requiresAttention, setRequiresAttention] = useState(false)
  const selectedExceptions = scenario.exceptions.filter((item) => selectedExceptionIds.includes(item.id))
  const hasDifferences = selectedExceptions.length > 0 || requiresAttention
  const predictedResult = hasDifferences ? "Con diferencias" : "Porción sin diferencias"

  function returnToDispatch() {
    setState("draft")
    onBack()
  }

  function toggleException(id: string) {
    setSelectedExceptionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function reviewDifferences() {
    if (!onReviewDifferences || !hasDifferences) return
    const differences: BoxReturnResolutionHandoff["differences"] = selectedExceptions.map((item) => ({ id: item.id, kind: item.kind, title: item.title, detail: item.detail }))
    if (requiresAttention) {
      differences.push({ id: "attention-note", kind: "Nota con atención", title: "Nota simple pendiente", detail: note.trim() || "Requiere atención sin detalle adicional." })
    }
    onReviewDifferences({ historicalResult: "Con diferencias", differences, note: note.trim() || undefined })
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] space-y-5 overflow-x-clip pb-10">
      <header className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          {state !== "success" ? <Button type="button" variant="ghost" className="-ml-3 min-h-11" onClick={returnToDispatch}><ArrowLeft className="size-4" aria-hidden="true" /> Volver al despacho</Button> : <div className="min-h-11 text-sm font-medium">Devolución ilustrativa de solo lectura</div>}
          <div className="flex flex-wrap gap-2"><Badge variant="outline" className="bg-muted/40">Presentación ilustrativa</Badge><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Sin Return ni Stock real</Badge></div>
        </div>
        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:px-7">
          <div><nav aria-label="Ubicación ilustrativa" className="text-xs font-medium text-muted-foreground">Expediente quirúrgico <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span> <span className="text-foreground">Devolución parcial</span></nav><h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Devolución parcial por excepciones</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">La porción devuelta se considera sin cambios salvo que registres una diferencia.</p></div>
          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Cirugía / Expediente</dt><dd className="font-mono font-semibold">{operation.reference}</dd></div><div><dt className="text-xs text-muted-foreground">Despacho ilustrativo</dt><dd className="mt-1 font-mono font-semibold">{dispatchEvidence.dispatchedContentReference}</dd><dd className="mt-1 text-xs text-muted-foreground">{handoff.candidate.unitCode}</dd></div></dl>
        </div>
      </header>

      {state === "error" ? <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"><div className="flex gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold">No se confirmó la devolución ilustrativa</h2><p className="mt-1 text-sm">La porción, excepciones y nota permanecen disponibles. No se creó resultado ni efecto Stock.</p></div></div></section> : null}
      {state === "success" ? <section role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold">Porción devuelta confirmada localmente</h2><p className="mt-1 text-sm">Resultado ilustrativo: {predictedResult}. El saldo pendiente y el historial anterior permanecen visibles; la Caja identificada no queda globalmente Disponible.</p></div></div></section> : null}

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Contabilidad ilustrativa de la devolución">
        <article className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Porción devuelta ahora</h2><ul className="mt-3 space-y-2 text-sm">{scenario.returnedNow.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{item}</li>)}</ul></article>
        <article className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Saldo compartido pendiente</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{scenario.pendingBalance}</p><p className="mt-2 text-xs text-muted-foreground">La Caja identificada continúa vinculada y no queda globalmente Disponible.</p></article>
      </section>

      <details className="rounded-xl border bg-card p-5"><summary className="cursor-pointer font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">Inspeccionar Contenido despachado completo</summary><ul className="mt-4 divide-y border-t">{dispatchedComposition.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{item.articleName}</span><span className="font-medium">{item.quantity}</span></li>)}</ul></details>

      <section aria-labelledby="return-exceptions-title"><div className="mb-3"><h2 id="return-exceptions-title" className="text-lg font-semibold">Registrar solo excepciones</h2><p className="mt-1 text-sm text-muted-foreground">Las líneas sin cambios no requieren reingreso.</p></div><ul className="space-y-3">{scenario.exceptions.map((preset) => <ExceptionDraft key={preset.id} preset={preset} selected={selectedExceptionIds.includes(preset.id)} disabled={state === "success"} onToggle={() => toggleException(preset.id)} />)}</ul></section>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="return-note-title"><h2 id="return-note-title" className="font-semibold">Nota simple opcional</h2><textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={state === "success"} rows={3} className="mt-3 w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" placeholder="Contexto descriptivo sin crear un incidente" /><label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={requiresAttention} onChange={(event) => setRequiresAttention(event.target.checked)} disabled={state === "success"} className="size-4" /> Requiere atención</label><p className="text-xs text-muted-foreground">No crea categoría, ticket, reparación ni resolución.</p></section>

      <section className="rounded-xl border bg-muted/20 p-5" aria-labelledby="return-result-title" role="status" aria-live="polite" aria-atomic="true"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><h2 id="return-result-title" className="font-semibold">Resultado previsto de esta porción</h2><p className="mt-1 text-sm text-muted-foreground">Sin excepciones, la porción queda revisada sin diferencias. La condición Disponible solo corresponde cuando toda la Caja identificada cumple los requisitos de cierre.</p></div><Badge variant="outline" className="min-h-9 px-3 text-sm">{hasDifferences ? <TriangleAlert className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}{predictedResult}</Badge></div></section>

      {state !== "success" ? <section className="rounded-xl border bg-card p-5" aria-labelledby="return-actions-title"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><h2 id="return-actions-title" className="font-semibold">Confirmación local</h2><p id="return-actions-description" className="mt-1 text-sm text-muted-foreground">La falla conserva borradores; el éxito no produce Return, Consumption, Stock, facturación ni contabilidad real.</p></div><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="outline" className="min-h-11" onClick={() => setState("error")}><CircleAlert className="size-4" aria-hidden="true" /> Simular error</Button><Button type="button" className="min-h-11" aria-describedby="return-actions-description" onClick={() => setState("success")}><PackageOpen className="size-4" aria-hidden="true" /> Confirmar devolución ilustrativa</Button></div></div></section> : null}

      {state === "success" && hasDifferences && onReviewDifferences ? <section className="rounded-xl border bg-card p-5" aria-labelledby="resolution-next-title"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><h2 id="resolution-next-title" className="font-semibold">Diferencias pendientes</h2><p className="mt-1 text-sm text-muted-foreground">El resultado histórico permanece inmutable. Cerrá cada diferencia antes de Recontrolar caja.</p></div><Button type="button" className="min-h-11" onClick={reviewDifferences}>Revisar diferencias</Button></div></section> : null}

      <p className="flex gap-2 text-xs leading-5 text-muted-foreground"><FileSearch className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Límite: no existe Return, Consumption, Stock, disponibilidad global, facturación, contabilidad, API ni persistencia real.</p>
    </main>
  )
}
