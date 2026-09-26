"use client"

import { useState } from "react"
import { ArrowLeft, Ban, ClipboardList, Info, Link2, LockKeyhole, RefreshCcw, TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BoxPostControlChangeReview as PostControlReviewFixture,
  BoxPreparationControlEvidence,
  BoxPreparationControlHandoff,
  BoxPreparationPhysicalItem,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

function CompositionList({ items, label }: { items: BoxPreparationPhysicalItem[]; label: string }) {
  return items.length > 0 ? (
    <ul className="divide-y" aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className="grid min-w-0 gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{item.articleName}</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Identidad física {item.id}</p>
            {item.traceability ? (
              <p className="mt-2 flex min-w-0 items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                <Link2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span className="break-words">Trazabilidad ilustrativa: {item.traceability}</span>
              </p>
            ) : null}
          </div>
          <p className="text-sm font-semibold tabular-nums sm:text-right">{item.quantity}</p>
        </li>
      ))}
    </ul>
  ) : (
    <p className="px-5 py-7 text-sm text-muted-foreground sm:px-6">No hay composición actual para revisar.</p>
  )
}

export function PostControlChangeReview({
  operation,
  handoff,
  evidence,
  review,
  onBack,
  onReviewRecontrol,
}: {
  operation: { reference: string; patientLabel: string; procedure: string }
  handoff: BoxPreparationControlHandoff
  evidence: BoxPreparationControlEvidence
  review: PostControlReviewFixture
  onBack: () => void
  onReviewRecontrol?: () => void
}) {
  const [announcement, setAnnouncement] = useState("")
  const controlledComposition = handoff.candidate.comparisons.flatMap((comparison) => comparison.actualItems)
  const hasCurrentComposition = review.currentComposition.length > 0

  function reviewRecontrol() {
    if (!hasCurrentComposition) return

    if (onReviewRecontrol) {
      onReviewRecontrol()
      return
    }

    setAnnouncement("Próximo paso ilustrativo listo: el recontrol revisaría la composición actual completa. No se creó evidencia.")
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] space-y-5 overflow-x-clip pb-10">
      <header className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <Button type="button" variant="ghost" className="-ml-3 min-h-11 active:scale-[0.97] motion-reduce:transform-none" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden="true" /> Volver al control confirmado
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-muted/40">Presentación ilustrativa</Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Sin evidencia real / Stock / despacho
            </Badge>
          </div>
        </div>
        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:px-7">
          <div className="min-w-0">
            <nav aria-label="Ubicación ilustrativa" className="text-xs font-medium text-muted-foreground">
              Expediente quirúrgico <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span>{" "}
              <span className="text-foreground">Cambio posterior al control</span>
            </nav>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Composición posterior al control</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Comparación local entre la última composición controlada y la composición física actual modificada.
            </p>
          </div>
          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <dt className="text-muted-foreground">Cirugía / Expediente</dt>
              <dd className="break-all font-mono font-semibold">{operation.reference}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Caja / unidad identificada</dt>
              <dd className="mt-1 break-all font-mono font-semibold">{handoff.candidate.boxId} · {handoff.candidate.unitCode}</dd>
              <dd className="mt-1 break-words text-xs leading-5 text-muted-foreground">{handoff.candidate.boxName}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section role="status" aria-labelledby="recontrol-gate-title" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 sm:p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 id="recontrol-gate-title" className="font-semibold">Recontrol requerido</h2>
            <p className="mt-1 text-sm leading-6">La composición actual cambió después del último control. Este bloqueo persiste hasta un recontrol exitoso; ese recontrol no se realiza en esta presentación.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card" aria-labelledby="controlled-composition-title">
          <div className="border-b px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="controlled-composition-title" className="text-lg font-semibold">Última composición controlada</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Evidencia ilustrativa anterior preservada en tratamiento de solo lectura.</p>
            <dl className="mt-4 grid gap-2 rounded-lg bg-muted/30 p-3 text-xs">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Referencia</dt><dd className="break-all font-mono font-semibold">{evidence.reference}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Fecha</dt><dd><time dateTime={evidence.occurredAt}>{evidence.displayedAt}</time></dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Actor</dt><dd className="font-medium">{evidence.actor}</dd></div>
            </dl>
          </div>
          <CompositionList items={controlledComposition} label="Composición del último control ilustrativo" />
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border bg-card" aria-labelledby="current-composition-title">
          <div className="border-b px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <RefreshCcw className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="current-composition-title" className="text-lg font-semibold">Composición física actual</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Estado local posterior al cambio; no reemplaza ni modifica el control anterior.</p>
          </div>
          <CompositionList items={review.currentComposition} label="Composición física actual posterior al cambio" />
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="change-ledger-title">
        <div className="border-b px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="change-ledger-title" className="text-lg font-semibold">Cambios desde el último control</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Comparación determinística ya derivada para esta presentación; no es un algoritmo productivo.</p>
        </div>
        <ol className="divide-y" aria-label="Registro de cambios posteriores al control">
          {review.changes.map((change) => (
            <li key={change.id} className="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
              <div>
                <Badge variant="outline" className="bg-muted/30">{change.kind}</Badge>
                <p className="mt-2 text-sm font-semibold">{change.articleName}</p>
              </div>
              <div className="min-w-0">
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Antes controlado</dt><dd className="mt-1 break-words font-medium">{change.priorValue}</dd></div>
                  <div><dt className="text-muted-foreground">Ahora actual</dt><dd className="mt-1 break-words font-medium">{change.currentValue}</dd></div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{change.explanation}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="dispatch-block-title">
        <div className="flex items-start gap-3">
          <Ban className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 id="dispatch-block-title" className="font-semibold">Revisión de despacho no disponible</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">El gate “Recontrol requerido” impide continuar al despacho. No existe acción alternativa ni bypass en esta superficie.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-muted/20 p-5" aria-labelledby="recontrol-review-title">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h2 id="recontrol-review-title" className="font-semibold">Preparar la revisión del recontrol</h2>
            <p id="recontrol-review-description" className="mt-1 text-sm leading-6 text-muted-foreground">Revisaría la composición actual completa como próximo paso ilustrativo. No confirma recontrol ni crea nueva evidencia.</p>
          </div>
          <Button type="button" className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none lg:w-auto" disabled={!hasCurrentComposition} aria-describedby="recontrol-review-description" onClick={reviewRecontrol}>
            Recontrolar caja
          </Button>
        </div>
        <p className="mt-4 text-sm font-medium" aria-live="polite" aria-atomic="true">{announcement}</p>
      </section>

      <section className="flex gap-3 rounded-xl border bg-muted/20 px-5 py-4 text-sm leading-6" aria-labelledby="post-control-boundary-title">
        <Info className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 id="post-control-boundary-title" className="font-semibold">Límite de esta presentación</h2>
          <p className="mt-1 text-muted-foreground">Todo es local e ilustrativo: no modifica evidencia real, Stock, reserva, despacho, producción ni persistencia.</p>
        </div>
      </section>
    </main>
  )
}
