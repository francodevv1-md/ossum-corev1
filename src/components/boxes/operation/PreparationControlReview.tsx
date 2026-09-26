"use client"

import { useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Info,
  Link2,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BoxPreparationComparison,
  BoxPreparationControlEvidence,
  BoxPreparationControlHandoff,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

type ReviewState = "review" | "error" | "success"

function ActualComposition({ comparisons }: { comparisons: BoxPreparationComparison[] }) {
  const physicalItems = comparisons.flatMap((comparison) => comparison.actualItems)

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="actual-composition-title">
      <div className="border-b px-5 py-5 sm:px-6">
        <h2 id="actual-composition-title" className="text-lg font-semibold">Composición física actual completa</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Contenido efectivamente seleccionado para esta revisión ilustrativa. La trazabilidad pertenece a cada elemento físico.
        </p>
      </div>
      {physicalItems.length > 0 ? (
        <ul className="divide-y" aria-label="Composición física seleccionada">
          {physicalItems.map((item) => (
            <li key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-6">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.articleName}</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Identidad física {item.id}</p>
                {item.traceability ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                    <Link2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                    Trazabilidad ilustrativa: {item.traceability}
                  </p>
                ) : null}
              </div>
              <p className="text-sm font-semibold tabular-nums sm:text-right">{item.quantity}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-sm text-muted-foreground sm:px-6">No hay componentes físicos seleccionados.</p>
      )}
    </section>
  )
}

function ComparisonSummary({ handoff }: { handoff: BoxPreparationControlHandoff }) {
  const matches = handoff.candidate.comparisons.filter((comparison) => comparison.kind === "Coincide")
  const differences = handoff.candidate.comparisons.filter((comparison) => comparison.kind !== "Coincide")

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="comparison-summary-title">
      <div className="border-b px-5 py-5 sm:px-6">
        <h2 id="comparison-summary-title" className="text-lg font-semibold">Resultado de la comparación</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Coincidencias y diferencias reconocidas se muestran por separado.</p>
      </div>
      <div className="grid lg:grid-cols-2">
        <section className="border-b p-5 lg:border-b-0 lg:border-r sm:p-6" aria-labelledby="matches-title">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            <h3 id="matches-title" className="font-semibold">Coincidencias</h3>
          </div>
          <ul className="mt-4 space-y-4" aria-label="Líneas coincidentes">
            {matches.map((comparison) => (
              <li key={comparison.id}>
                <p className="text-sm font-medium">{comparison.expectedArticle ?? comparison.actualItems[0]?.articleName}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{comparison.explanation}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="p-5 sm:p-6" aria-labelledby="acknowledged-differences-title">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <h3 id="acknowledged-differences-title" className="font-semibold">Diferencias reconocidas</h3>
          </div>
          <ul className="mt-4 space-y-4" aria-label="Diferencias reconocidas para el control">
            {differences.map((comparison) => {
              const acknowledged = handoff.acknowledgedDifferenceIds.includes(comparison.id)
              return (
                <li key={comparison.id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{comparison.expectedArticle ?? comparison.actualItems[0]?.articleName}</p>
                    <Badge variant="outline" className="gap-1.5 bg-background">
                      {acknowledged ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <TriangleAlert className="size-3" aria-hidden="true" />}
                      {acknowledged ? "Reconocida localmente" : "Pendiente"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-medium">{comparison.kind}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{comparison.explanation}</p>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </section>
  )
}

export function PreparationControlReview({
  operation,
  handoff,
  evidence,
  onCancel,
  onSimulatePostControlChange,
}: {
  operation: { reference: string; patientLabel: string; procedure: string }
  handoff: BoxPreparationControlHandoff
  evidence: BoxPreparationControlEvidence
  onCancel: () => void
  onSimulatePostControlChange?: () => void
}) {
  const [reviewState, setReviewState] = useState<ReviewState>("review")
  const requiredDifferenceIds = handoff.candidate.comparisons
    .filter((comparison) => comparison.requiresAcknowledgement)
    .map((comparison) => comparison.id)
  const allDifferencesAcknowledged = requiredDifferenceIds.every((id) =>
    handoff.acknowledgedDifferenceIds.includes(id)
  )

  function simulateFailure() {
    setReviewState("error")
  }

  function confirmIllustrativeControl() {
    if (!allDifferencesAcknowledged) return
    setReviewState("success")
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] space-y-5 overflow-x-clip pb-10">
      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          {reviewState !== "success" ? (
            <Button type="button" variant="ghost" className="-ml-3 min-h-11 active:scale-[0.97] motion-reduce:transform-none" onClick={onCancel}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Cancelar y volver a preparación
            </Button>
          ) : (
            <div className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" /> Evidencia ilustrativa de solo lectura
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-muted/40">Presentación ilustrativa</Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              No mueve Stock / no crea evidencia real
            </Badge>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:px-7">
          <div className="min-w-0">
            <nav aria-label="Ubicación ilustrativa" className="text-xs font-medium text-muted-foreground">
              Expediente quirúrgico <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span>{" "}
              <span className="text-foreground">Control de preparación</span>
            </nav>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Control de preparación</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {reviewState === "success"
                ? "Confirmación ilustrativa conservada como lectura histórica local."
                : "Revisá la unidad, su composición física completa y las diferencias reconocidas antes de confirmar."}
            </p>
          </div>

          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Cirugía / Expediente</dt>
              <dd className="break-all font-mono font-semibold">{operation.reference}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Caja identificada</dt>
              <dd className="mt-1 break-all font-mono font-semibold">{handoff.candidate.unitCode}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted-foreground">
                Caja {handoff.candidate.boxId} · {handoff.candidate.boxName}
              </dd>
            </div>
          </dl>
        </div>

      </section>

      {reviewState === "error" ? (
        <section role="alert" aria-labelledby="control-error-title" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="control-error-title" className="font-semibold">No se completó el control ilustrativo</h2>
              <p className="mt-1 text-sm leading-6">La revisión se conserva para volver a intentar. No se creó Control de preparación, evidencia real, despacho ni movimiento de Stock.</p>
            </div>
          </div>
        </section>
      ) : null}

      {reviewState === "success" ? (
        <section aria-labelledby="control-success-title" className="overflow-hidden rounded-xl border bg-card">
          <div role="status" aria-live="polite" className="flex items-start gap-3 border-b bg-emerald-50 px-5 py-5 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100 sm:px-6">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="control-success-title" className="font-semibold">Control ilustrativo confirmado</h2>
              <p className="mt-1 text-sm leading-6">Se generó únicamente una representación local de evidencia para esta presentación.</p>
            </div>
          </div>
          <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-lg font-semibold">Control de preparación</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Composición física y diferencias reconocidas preservadas en tratamiento de solo lectura.</p>
            </div>
            <dl className="grid gap-2 text-sm lg:min-w-64">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Referencia</dt><dd className="font-mono font-semibold">{evidence.reference}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Fecha</dt><dd><time dateTime={evidence.occurredAt}>{evidence.displayedAt}</time></dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Actor</dt><dd className="text-right font-medium">{evidence.actor}</dd></div>
            </dl>
          </div>
          <div className="flex items-start gap-2 border-t bg-muted/20 px-5 py-4 text-xs leading-5 text-muted-foreground sm:px-6">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Solo lectura · sin edición · sin Contenido despachado · sin reserva · sin efecto operativo o productivo
          </div>
          {onSimulatePostControlChange ? (
            <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs leading-5 text-muted-foreground">
                Continuá con un cambio local posterior sin modificar esta evidencia ilustrativa.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
                onClick={onSimulatePostControlChange}
              >
                <RefreshCcw className="size-4" aria-hidden="true" /> Simular cambio posterior
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <ActualComposition comparisons={handoff.candidate.comparisons} />
      <ComparisonSummary handoff={handoff} />

      <section className="flex gap-3 rounded-xl border bg-muted/20 px-5 py-4 text-sm leading-6" aria-labelledby="checkpoint-boundary-title">
        <Info className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 id="checkpoint-boundary-title" className="font-semibold">Preparación, no despacho definitivo</h2>
          <p className="mt-1 text-muted-foreground">
            Este control registra evidencia de preparación solamente; no crea Contenido despachado, no reserva ni mueve Stock y no produce un registro operativo real.
          </p>
        </div>
      </section>

      {reviewState !== "success" ? (
        <section className="rounded-xl border bg-card p-5" aria-labelledby="control-actions-title">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <h2 id="control-actions-title" className="font-semibold">Confirmación local</h2>
              <p id="control-actions-description" className="mt-1 text-sm leading-6 text-muted-foreground">
                {allDifferencesAcknowledged
                  ? "Todas las diferencias requeridas fueron reconocidas en O1. Podés simular un error o confirmar la evidencia ilustrativa."
                  : "Faltan diferencias requeridas por reconocer. Volvé a O1 para completar la revisión."}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none sm:w-auto" onClick={simulateFailure}>
                <CircleAlert className="size-4" aria-hidden="true" /> Simular error
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
                disabled={!allDifferencesAcknowledged}
                aria-describedby="control-actions-description"
                onClick={confirmIllustrativeControl}
              >
                <ClipboardCheck className="size-4" aria-hidden="true" /> Confirmar control ilustrativo
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
