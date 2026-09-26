"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Box,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Info,
  Link2,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BoxPreparationCandidate,
  BoxPreparationComparison,
  BoxPreparationControlHandoff,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"
import { cn } from "@/lib/utils"

const KIND_STYLES: Record<BoxPreparationComparison["kind"], string> = {
  Coincide: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  "Cantidad menor": "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  "Cantidad mayor": "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  Faltante: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
  "Agregado no esperado": "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  Sustitución: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
}

function CandidateSelector({
  candidates,
  selectedIds,
  onToggle,
}: {
  candidates: BoxPreparationCandidate[]
  selectedIds: string[]
  onToggle: (candidate: BoxPreparationCandidate) => void
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="candidate-selector-title">
      <div className="border-b px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <PackageCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="candidate-selector-title" className="text-lg font-semibold">Cajas identificadas</h2>
        </div>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Elegí una o más unidades existentes. Esta selección es provisional y no reserva Stock.
        </p>
      </div>

      <ul className="divide-y" aria-label="Candidatas para la preparación ilustrativa">
        {candidates.map((candidate) => {
          const selected = selectedIds.includes(candidate.id)
          const reasonId = `${candidate.id}-reason`

          return (
            <li key={candidate.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{candidate.unitCode}</span>
                  {candidate.eligible ? (
                    <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <CheckCircle2 className="size-3" aria-hidden="true" /> Disponible para selección
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <Ban className="size-3" aria-hidden="true" /> No disponible
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium">{candidate.boxName}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">Caja {candidate.boxId}</p>
                {candidate.unavailableReason ? (
                  <p id={reasonId} className="mt-2 flex max-w-2xl items-start gap-2 text-xs leading-5 text-amber-900 dark:text-amber-200">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {candidate.unavailableReason}
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                variant={selected ? "secondary" : "outline"}
                className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
                aria-pressed={candidate.eligible ? selected : undefined}
                aria-label={
                  candidate.eligible
                    ? `${selected ? "Quitar" : "Seleccionar"} Caja identificada ${candidate.unitCode}, ${candidate.boxName}`
                    : `Caja identificada ${candidate.unitCode} no disponible, ${candidate.boxName}`
                }
                aria-describedby={candidate.unavailableReason ? reasonId : undefined}
                disabled={!candidate.eligible}
                onClick={() => onToggle(candidate)}
              >
                {selected ? <Check className="size-4" aria-hidden="true" /> : <Box className="size-4" aria-hidden="true" />}
                {selected ? "Seleccionada" : candidate.eligible ? "Seleccionar unidad" : "Selección no disponible"}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ComparisonLine({
  comparison,
  acknowledged,
  onToggleAcknowledgement,
}: {
  comparison: BoxPreparationComparison
  acknowledged: boolean
  onToggleAcknowledgement: () => void
}) {
  const matches = comparison.kind === "Coincide"
  const titleId = `${comparison.id}-title`

  return (
    <li className="overflow-hidden rounded-xl border bg-card" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-5">
        <h3 id={titleId} className="text-sm font-semibold">
          {comparison.expectedArticle ?? comparison.actualItems[0]?.articleName ?? "Componente físico"}
        </h3>
        <Badge variant="outline" className={cn("gap-1.5", KIND_STYLES[comparison.kind])}>
          {matches ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <TriangleAlert className="size-3" aria-hidden="true" />}
          {comparison.kind}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2">
        <section className="border-b p-4 md:border-b-0 md:border-r sm:p-5" aria-label="Contenido esperado">
          <p className="text-xs font-semibold text-muted-foreground">Contenido esperado</p>
          {comparison.expectedArticle ? (
            <div className="mt-3">
              <p className="text-sm font-medium">{comparison.expectedArticle}</p>
              <p className="mt-1 text-sm text-muted-foreground">Cantidad de referencia: {comparison.expectedQuantity}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Sin línea equivalente en la fórmula de referencia.</p>
          )}
        </section>

        <section className="p-4 sm:p-5" aria-label="Selección física actual">
          <p className="text-xs font-semibold text-muted-foreground">Selección física actual</p>
          {comparison.actualItems.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {comparison.actualItems.map((item) => (
                <li key={item.id} className="text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{item.articleName}</span>
                    <span className="font-semibold tabular-nums">{item.quantity}</span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Identidad física {item.id}</p>
                  {item.traceability ? (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Link2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      Trazabilidad ilustrativa: {item.traceability}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-medium">Sin componente físico seleccionado</p>
          )}
        </section>
      </div>

      <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
        <div className="flex items-start gap-2 text-sm leading-6">
          {matches ? (
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-1 size-4 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <p>
            {comparison.explanation}
            {matches ? <span className="block text-xs text-muted-foreground">No requiere reconocimiento.</span> : null}
          </p>
        </div>
        {comparison.requiresAcknowledgement ? (
          <Button
            type="button"
            variant={acknowledged ? "secondary" : "outline"}
            className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
            aria-pressed={acknowledged}
            aria-label={`${acknowledged ? "Deshacer reconocimiento" : "Reconocer diferencia"}: ${comparison.kind} en ${comparison.expectedArticle ?? comparison.actualItems[0]?.articleName ?? "componente físico"}`}
            onClick={onToggleAcknowledgement}
          >
            {acknowledged ? <RotateCcw className="size-4" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            {acknowledged ? "Deshacer reconocimiento" : "Reconocer diferencia"}
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function BoxPreparationWorkspace({
  operation,
  candidates,
  onBack,
  onReviewControl,
}: {
  operation: { reference: string; patientLabel: string; procedure: string }
  candidates: BoxPreparationCandidate[]
  onBack: () => void
  onReviewControl?: (handoff: BoxPreparationControlHandoff) => void
}) {
  const initiallySelected = candidates.find((candidate) => candidate.eligible)?.id
  const [selectedIds, setSelectedIds] = useState<string[]>(initiallySelected ? [initiallySelected] : [])
  const [activeId, setActiveId] = useState<string | null>(initiallySelected ?? null)
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([])
  const [incorporatedCandidateId, setIncorporatedCandidateId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("Preparación ilustrativa abierta. Ninguna selección reserva Stock.")

  const selectedCandidates = selectedIds.flatMap((id) => {
    const candidate = candidates.find((item) => item.id === id)
    return candidate ? [candidate] : []
  })
  const activeCandidate = selectedCandidates.find((candidate) => candidate.id === activeId) ?? selectedCandidates[0]
  const unresolvedCount = activeCandidate
    ? activeCandidate.comparisons.filter(
        (comparison) => comparison.requiresAcknowledgement && !acknowledgedIds.includes(comparison.id)
      ).length
    : 0
  const incorporationConfirmed = activeCandidate?.id === incorporatedCandidateId
  const canConfirmIncorporation = Boolean(activeCandidate) && unresolvedCount === 0
  const reviewAvailable = canConfirmIncorporation && incorporationConfirmed

  function toggleCandidate(candidate: BoxPreparationCandidate) {
    if (!candidate.eligible) return

    if (selectedIds.includes(candidate.id)) {
      const remaining = selectedIds.filter((id) => id !== candidate.id)
      setSelectedIds(remaining)
      if (activeId === candidate.id) setActiveId(remaining[0] ?? null)
      if (incorporatedCandidateId === candidate.id) setIncorporatedCandidateId(null)
      setAnnouncement(`${candidate.unitCode} quitada de la selección provisional. No se liberó Stock porque no existía una reserva.`)
      return
    }

    setSelectedIds((current) => [...current, candidate.id])
    setActiveId(candidate.id)
    setAnnouncement(`${candidate.unitCode} agregada a la selección provisional. Stock continúa sin reserva.`)
  }

  function toggleAcknowledgement(comparison: BoxPreparationComparison) {
    const acknowledged = acknowledgedIds.includes(comparison.id)
    setAcknowledgedIds((current) =>
      acknowledged ? current.filter((id) => id !== comparison.id) : [...current, comparison.id]
    )
    if (activeCandidate?.id === incorporatedCandidateId) setIncorporatedCandidateId(null)
    setAnnouncement(
      acknowledged
        ? `Se deshizo el reconocimiento de ${comparison.kind}. Revisar control vuelve a quedar condicionado.`
        : `Diferencia ${comparison.kind} reconocida solo en esta presentación.`
    )
  }

  function confirmIncorporation() {
    if (!activeCandidate || !canConfirmIncorporation) return
    setIncorporatedCandidateId(activeCandidate.id)
    setAnnouncement(`${activeCandidate.unitCode} incorporada en la preparación ilustrativa. En la implementación real, este checkpoint reservará la Caja identificada y sus componentes.`)
  }

  function reviewControl() {
    if (!activeCandidate || !reviewAvailable) return

    if (onReviewControl) {
      const requiredIds = new Set(
        activeCandidate.comparisons
          .filter((comparison) => comparison.requiresAcknowledgement)
          .map((comparison) => comparison.id)
      )
      onReviewControl({
        candidate: activeCandidate,
        acknowledgedDifferenceIds: acknowledgedIds.filter((id) => requiredIds.has(id)),
      })
      return
    }

    setAnnouncement("O1 está listo para el próximo bloque ilustrativo: O2, Control de preparación. No se creó evidencia ni reserva de Stock.")
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 overflow-x-clip pb-10">
      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <Button type="button" variant="ghost" className="-ml-3 min-h-11 active:scale-[0.97] motion-reduce:transform-none" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden="true" /> Volver a la presentación B0
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-muted/40">Presentación ilustrativa</Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {incorporationConfirmed ? "Checkpoint de reserva simulado" : "Borrador sin reserva de Stock"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:px-7">
          <div className="min-w-0">
            <nav aria-label="Ubicación ilustrativa" className="text-xs font-medium text-muted-foreground">
              Expediente quirúrgico <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span>{" "}
              <span className="text-foreground">Preparación ilustrativa</span>
            </nav>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Preparación ilustrativa</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Compará la referencia esperada con una selección física demostrativa antes del próximo bloque de control.
            </p>
          </div>

          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Cirugía / Expediente</dt>
              <dd className="font-mono font-semibold">{operation.reference}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contexto</dt>
              <dd className="mt-1 font-medium">{operation.patientLabel}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted-foreground">{operation.procedure}</dd>
            </div>
          </dl>
        </div>

        <div className="flex gap-3 border-t bg-muted/20 px-5 py-4 text-sm leading-6 lg:px-7">
          <Info className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p><span className="font-medium">Límite de presentación:</span> explorar, comparar, seleccionar o reconocer diferencias no reserva ni modifica Stock.</p>
        </div>
      </section>

      <CandidateSelector candidates={candidates} selectedIds={selectedIds} onToggle={toggleCandidate} />

      {activeCandidate ? (
        <section className="space-y-4" aria-labelledby="selected-workspace-title">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Unidad en preparación</p>
                <h2 id="selected-workspace-title" className="mt-1 text-lg font-semibold">{activeCandidate.unitCode}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Caja {activeCandidate.boxId} · {activeCandidate.boxName} · {activeCandidate.expectedVersion}
                </p>
              </div>
              <Badge variant="secondary">Selección provisional</Badge>
            </div>

            {selectedCandidates.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Cambiar unidad seleccionada en preparación">
                {selectedCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-pressed={candidate.id === activeCandidate.id}
                    onClick={() => setActiveId(candidate.id)}
                    className={cn(
                      "min-h-11 rounded-md border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                      candidate.id === activeCandidate.id ? "bg-foreground text-background" : "bg-background hover:bg-muted"
                    )}
                  >
                    {candidate.unitCode}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-semibold">Comparación de preparación</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ejemplos pre-derivados; no se calculan cantidades ni contratos productivos.</p>
              </div>
              <p className="text-sm font-medium" aria-label={`${unresolvedCount} diferencias pendientes de reconocimiento`}>
                {unresolvedCount} {unresolvedCount === 1 ? "diferencia pendiente" : "diferencias pendientes"}
              </p>
            </div>

            <ul className="space-y-4" aria-label={`Comparación de ${activeCandidate.unitCode}`}>
              {activeCandidate.comparisons.map((comparison) => (
                <ComparisonLine
                  key={comparison.id}
                  comparison={comparison}
                  acknowledged={acknowledgedIds.includes(comparison.id)}
                  onToggleAcknowledgement={() => toggleAcknowledgement(comparison)}
                />
              ))}
            </ul>
          </div>

          <section className="rounded-xl border bg-card p-5" aria-labelledby="review-readiness-title">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-start gap-3">
                <PackageCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <h2 id="review-readiness-title" className="font-semibold">Incorporación y reserva</h2>
                  <p id="review-readiness-description" className="mt-1 text-sm leading-6 text-muted-foreground">
                    {incorporationConfirmed
                      ? "Checkpoint ilustrativo completado. La composición puede pasar al Control de preparación."
                      : canConfirmIncorporation
                        ? "Confirmá la incorporación de la Caja identificada y sus componentes antes del control."
                        : `Reconocé las ${unresolvedCount} diferencias visibles antes de incorporar la composición.`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">La maqueta no reserva Stock; el checkpoint representa dónde ocurrirá la reserva atómica en la implementación real.</p>
                </div>
              </div>
              <Button
                type="button"
                variant={incorporationConfirmed ? "secondary" : "default"}
                className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none lg:w-auto"
                disabled={!canConfirmIncorporation || incorporationConfirmed}
                aria-describedby="review-readiness-description"
                onClick={confirmIncorporation}
              >
                {incorporationConfirmed ? <Check className="size-4" aria-hidden="true" /> : <PackageCheck className="size-4" aria-hidden="true" />}
                {incorporationConfirmed ? "Incorporación confirmada" : "Confirmar incorporación ilustrativa"}
              </Button>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5" aria-labelledby="control-next-title">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <h2 id="control-next-title" className="font-semibold">Control de preparación</h2>
                  <p id="control-next-description" className="mt-1 text-sm leading-6 text-muted-foreground">
                    {reviewAvailable ? "La incorporación está confirmada localmente. Revisá la composición completa antes del control." : "Completá primero el checkpoint de incorporación y reserva."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="min-h-11 w-full active:scale-[0.97] motion-reduce:transform-none lg:w-auto"
                disabled={!reviewAvailable}
                aria-describedby="control-next-description"
                onClick={reviewControl}
              >
                Revisar control <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </section>
        </section>
      ) : (
        <section className="rounded-xl border bg-card px-5 py-10 text-center" aria-labelledby="no-selection-title">
          <Box className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
          <h2 id="no-selection-title" className="mt-3 font-semibold">Elegí una Caja identificada</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            La comparación aparecerá cuando agregues una unidad elegible a esta selección provisional.
          </p>
        </section>
      )}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </main>
  )
}
