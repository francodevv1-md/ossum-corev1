"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, CircleAlert, ClipboardCheck, Link2, LockKeyhole, RefreshCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BoxPostControlChangeReview,
  BoxPreparationControlEvidence,
  BoxPreparationControlHandoff,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

type RecontrolState = "review" | "error" | "success"

function EvidenceCard({
  evidence,
  label,
  current,
}: {
  evidence: BoxPreparationControlEvidence
  label: string
  current: boolean
}) {
  return (
    <article className="rounded-xl border bg-card p-5" aria-label={label}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {current ? (
            <ClipboardCheck className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          ) : (
            <LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <h3 className="mt-1 font-semibold">Control de preparación</h3>
          </div>
        </div>
        <Badge variant="outline" className="bg-muted/30">Solo lectura</Badge>
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Referencia</dt>
          <dd className="break-all font-mono font-semibold">{evidence.reference}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Fecha</dt>
          <dd><time dateTime={evidence.occurredAt}>{evidence.displayedAt}</time></dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Actor</dt>
          <dd className="text-right font-medium">{evidence.actor}</dd>
        </div>
      </dl>
    </article>
  )
}

export function PreparationRecontrolReview({
  operation,
  handoff,
  priorEvidence,
  recontrolEvidence,
  review,
  onBack,
  onReviewDispatch,
}: {
  operation: { reference: string; patientLabel: string; procedure: string }
  handoff: BoxPreparationControlHandoff
  priorEvidence: BoxPreparationControlEvidence
  recontrolEvidence: BoxPreparationControlEvidence
  review: BoxPostControlChangeReview
  onBack: () => void
  onReviewDispatch?: () => void
}) {
  const [state, setState] = useState<RecontrolState>("review")
  const canConfirm = review.currentComposition.length > 0 && review.changes.length > 0

  function returnToPostControl() {
    setState("review")
    onBack()
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] space-y-5 overflow-x-clip pb-10">
      <header className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          {state !== "success" ? (
            <Button type="button" variant="ghost" className="-ml-3 min-h-11 active:scale-[0.97] motion-reduce:transform-none" onClick={returnToPostControl}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Volver al cambio posterior
            </Button>
          ) : (
            <div className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" /> Historial ilustrativo preservado
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-muted/40">Presentación ilustrativa</Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Sin evidencia real / Stock / despacho
            </Badge>
          </div>
        </div>
        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:px-7">
          <div>
            <nav aria-label="Ubicación ilustrativa" className="text-xs font-medium text-muted-foreground">
              Expediente quirúrgico <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span>{" "}
              <span className="text-foreground">Revisión de recontrol</span>
            </nav>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Revisión de recontrol</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Revisión completa de la composición actual sin modificar el control histórico anterior.
            </p>
          </div>
          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Cirugía / Expediente</dt><dd className="font-mono font-semibold">{operation.reference}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Caja identificada</dt><dd className="mt-1 break-all font-mono font-semibold">{handoff.candidate.unitCode}</dd></div>
          </dl>
        </div>
      </header>

      {state === "error" ? (
        <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div><h2 className="font-semibold">No se completó el recontrol ilustrativo</h2><p className="mt-1 text-sm leading-6">La revisión actual se conserva. No se creó evidencia ni se liberó el gate.</p></div>
          </div>
        </section>
      ) : null}

      {state === "success" ? (
        <section role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div><h2 className="font-semibold">Recontrol ilustrativo confirmado</h2><p className="mt-1 text-sm leading-6">Se agregó una segunda representación local de Control de preparación. El control anterior permanece sin cambios.</p></div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="recontrol-composition-title">
        <div className="border-b px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2"><RefreshCcw className="size-4 text-muted-foreground" aria-hidden="true" /><h2 id="recontrol-composition-title" className="text-lg font-semibold">Composición actual completa</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Base íntegra de esta revisión ilustrativa.</p>
        </div>
        <ul className="divide-y" aria-label="Composición actual revisada para recontrol">
          {review.currentComposition.map((item) => (
            <li key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
              <div><p className="text-sm font-semibold">{item.articleName}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">Identidad física {item.id}</p>{item.traceability ? <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground"><Link2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />{item.traceability}</p> : null}</div>
              <p className="text-sm font-semibold tabular-nums sm:text-right">{item.quantity}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="control-history-title">
        <div className="mb-3"><h2 id="control-history-title" className="text-lg font-semibold">Historial de controles</h2><p className="mt-1 text-sm text-muted-foreground">Cada control conserva su identidad; ninguno reemplaza al anterior.</p></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <EvidenceCard evidence={priorEvidence} label="Control anterior preservado" current={false} />
          {state === "success" ? <EvidenceCard evidence={recontrolEvidence} label="Nuevo recontrol ilustrativo" current /> : null}
        </div>
      </section>

      {state !== "success" ? (
        <section className="rounded-xl border bg-card p-5" aria-labelledby="recontrol-actions-title">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div><h2 id="recontrol-actions-title" className="font-semibold">Confirmación local</h2><p id="recontrol-actions-description" className="mt-1 text-sm text-muted-foreground">El resultado existe solo dentro de esta presentación.</p></div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setState("error")}><CircleAlert className="size-4" aria-hidden="true" /> Simular error</Button>
              <Button type="button" className="min-h-11" disabled={!canConfirm} aria-describedby="recontrol-actions-description" onClick={() => setState("success")}><ClipboardCheck className="size-4" aria-hidden="true" /> Recontrolar caja</Button>
            </div>
          </div>
        </section>
      ) : null}

      {state === "success" && onReviewDispatch ? (
        <section className="rounded-xl border bg-card p-5" aria-labelledby="dispatch-next-title">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div><h2 id="dispatch-next-title" className="font-semibold">Siguiente bloque ilustrativo</h2><p className="mt-1 text-sm text-muted-foreground">La composición recontrolada puede pasar a revisión de despacho sin emitir un documento real.</p></div>
            <Button type="button" className="min-h-11" onClick={onReviewDispatch}>Revisar despacho ilustrativo</Button>
          </div>
        </section>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">Límite: este recontrol no cambia una condición productiva, no habilita despacho real y no crea Stock, reserva, API ni persistencia.</p>
    </main>
  )
}
