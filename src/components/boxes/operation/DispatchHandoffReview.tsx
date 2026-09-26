"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, CircleAlert, ClipboardCheck, FileCheck2, Link2, LockKeyhole, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BoxDispatchEvidence,
  BoxPreparationControlEvidence,
  BoxPreparationControlHandoff,
  BoxPreparationPhysicalItem,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

type DispatchState = "review" | "error" | "success"

export function DispatchHandoffReview({
  operation,
  handoff,
  latestControl,
  dispatchEvidence,
  composition,
  onBack,
  onReviewReturn,
}: {
  operation: { reference: string; patientLabel: string; procedure: string }
  handoff: BoxPreparationControlHandoff
  latestControl: BoxPreparationControlEvidence
  dispatchEvidence: BoxDispatchEvidence
  composition: BoxPreparationPhysicalItem[]
  onBack: () => void
  onReviewReturn?: () => void
}) {
  const [state, setState] = useState<DispatchState>("review")
  const canIssue = composition.length > 0

  function returnToRecontrol() {
    setState("review")
    onBack()
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] space-y-5 overflow-x-clip pb-10">
      <header className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          {state !== "success" ? (
            <Button type="button" variant="ghost" className="-ml-3 min-h-11 active:scale-[0.97] motion-reduce:transform-none" onClick={returnToRecontrol}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Volver al recontrol confirmado
            </Button>
          ) : (
            <div className="flex min-h-11 items-center gap-2 text-sm font-medium"><LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" /> Despacho ilustrativo de solo lectura</div>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-muted/40">Presentación ilustrativa</Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Sin remito ni Stock real</Badge>
          </div>
        </div>
        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:px-7">
          <div>
            <nav aria-label="Ubicación ilustrativa" className="text-xs font-medium text-muted-foreground">Expediente quirúrgico <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span> <span className="text-foreground">Revisión de despacho</span></nav>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Revisión de despacho ilustrativa</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Revisá la composición recontrolada antes de simular la emisión del Remito.</p>
          </div>
          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Cirugía / Expediente</dt><dd className="font-mono font-semibold">{operation.reference}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Caja identificada</dt><dd className="mt-1 break-all font-mono font-semibold">{handoff.candidate.unitCode}</dd><dd className="mt-1 text-xs text-muted-foreground">Caja {handoff.candidate.boxId}</dd></div>
          </dl>
        </div>
      </header>

      {state === "error" ? (
        <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold">No se emitió el Remito ilustrativo</h2><p className="mt-1 text-sm leading-6">La revisión y el último Control de preparación se conservan. No se creó Contenido despachado ni movimiento de Stock.</p></div></div>
        </section>
      ) : null}

      {state === "success" ? (
        <section role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold">Despacho ilustrativo confirmado</h2><p className="mt-1 text-sm leading-6">Se representaron localmente el Remito y su Contenido despachado separado. No existe documento ni efecto productivo real.</p></div></div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="dispatch-composition-title">
        <div className="border-b px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-muted-foreground" aria-hidden="true" /><h2 id="dispatch-composition-title" className="text-lg font-semibold">Composición incluida en este despacho</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Última composición recontrolada completa; no se mezcla con otro despacho.</p>
        </div>
        <ul className="divide-y" aria-label="Composición del despacho ilustrativo">
          {composition.map((item) => (
            <li key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
              <div><p className="text-sm font-semibold">{item.articleName}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">Identidad física {item.id}</p>{item.traceability ? <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground"><Link2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />{item.traceability}</p> : null}</div>
              <p className="text-sm font-semibold tabular-nums sm:text-right">{item.quantity}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Evidencia ilustrativa del despacho">
        <article className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-muted-foreground" aria-hidden="true" /><h2 className="font-semibold">Último Control de preparación</h2></div>
          <p className="mt-3 break-all font-mono text-sm font-semibold">{latestControl.reference}</p>
          <p className="mt-1 text-xs text-muted-foreground">{latestControl.displayedAt} · preservado sin cambios</p>
        </article>
        {state === "success" ? (
          <article className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2"><FileCheck2 className="size-4 text-muted-foreground" aria-hidden="true" /><h2 className="font-semibold">Contenido despachado</h2></div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Remito</dt><dd className="font-mono font-semibold">{dispatchEvidence.remittanceReference}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Evidencia</dt><dd className="font-mono font-semibold">{dispatchEvidence.dispatchedContentReference}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Fecha</dt><dd><time dateTime={dispatchEvidence.occurredAt}>{dispatchEvidence.displayedAt}</time></dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Actor</dt><dd className="text-right font-medium">{dispatchEvidence.actor}</dd></div>
            </dl>
          </article>
        ) : null}
      </section>

      <section className="rounded-xl border bg-muted/20 p-5" aria-labelledby="dispatch-boundary-title">
        <h2 id="dispatch-boundary-title" className="font-semibold">Checkpoint definitivo solo en la simulación</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">El éxito representa Remito emitido + Contenido despachado separado. No asigna numeración real, no mueve Stock y no habilita producción.</p>
      </section>

      {state !== "success" ? (
        <section className="rounded-xl border bg-card p-5" aria-labelledby="dispatch-actions-title">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div><h2 id="dispatch-actions-title" className="font-semibold">Emisión local</h2><p id="dispatch-actions-description" className="mt-1 text-sm text-muted-foreground">La falla conserva el control; el éxito crea solo representaciones locales.</p></div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setState("error")}><CircleAlert className="size-4" aria-hidden="true" /> Simular error</Button>
              <Button type="button" className="min-h-11" disabled={!canIssue} aria-describedby="dispatch-actions-description" onClick={() => setState("success")}><Send className="size-4" aria-hidden="true" /> Emitir Remito ilustrativo</Button>
            </div>
          </div>
        </section>
      ) : null}

      {state === "success" && onReviewReturn ? (
        <section className="rounded-xl border bg-card p-5" aria-labelledby="return-next-title">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div><h2 id="return-next-title" className="font-semibold">Siguiente bloque ilustrativo</h2><p className="mt-1 text-sm text-muted-foreground">Abrí una devolución parcial contra este Contenido despachado local.</p></div>
            <Button type="button" className="min-h-11" onClick={onReviewReturn}>Revisar devolución ilustrativa</Button>
          </div>
        </section>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">Límite: no existe Remito, numeración, Contenido despachado, movimiento de Stock, API ni persistencia real.</p>
    </main>
  )
}
