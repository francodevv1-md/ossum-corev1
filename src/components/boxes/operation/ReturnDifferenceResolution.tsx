"use client"

import { useState } from "react"
import { ArrowLeft, Check, CheckCircle2, CircleAlert, ClipboardCheck, Link2, LockKeyhole, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BoxPreparationControlEvidence,
  BoxPreparationControlHandoff,
  BoxPreparationPhysicalItem,
  BoxReturnResolutionHandoff,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

type ResolutionState = "resolve" | "review" | "error" | "success"

export function ReturnDifferenceResolution({
  operation,
  handoff,
  resolution,
  composition,
  evidence,
  onBack,
}: {
  operation: { reference: string; patientLabel: string; procedure: string }
  handoff: BoxPreparationControlHandoff
  resolution: BoxReturnResolutionHandoff
  composition: BoxPreparationPhysicalItem[]
  evidence: BoxPreparationControlEvidence
  onBack: () => void
}) {
  const [state, setState] = useState<ResolutionState>("resolve")
  const [closedIds, setClosedIds] = useState<string[]>([])
  const allClosed = resolution.differences.length > 0 && resolution.differences.every((item) => closedIds.includes(item.id))

  function returnToResult() {
    setState("resolve")
    setClosedIds([])
    onBack()
  }

  function toggleClosed(id: string) {
    if (state !== "resolve") return
    setClosedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] space-y-5 overflow-x-clip pb-10">
      <header className="overflow-hidden rounded-xl border bg-card shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          {state !== "success" ? <Button type="button" variant="ghost" className="-ml-3 min-h-11" onClick={returnToResult}><ArrowLeft className="size-4" aria-hidden="true" /> Volver al resultado de devolución</Button> : <div className="flex min-h-11 items-center gap-2 text-sm font-medium"><LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" /> Historial ilustrativo preservado</div>}
          <div className="flex flex-wrap gap-2"><Badge variant="outline" className="bg-muted/40">Presentación ilustrativa</Badge><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Sin cierre ni condición real</Badge></div>
        </div>
        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:px-7">
          <div><nav aria-label="Ubicación ilustrativa" className="text-xs font-medium text-muted-foreground">Expediente quirúrgico <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span> <span className="text-foreground">Resolución de diferencias</span></nav><h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Resolución y recontrol de Caja</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Cada diferencia se cierra con nueva evidencia local; el resultado histórico nunca se modifica.</p></div>
          <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Cirugía / Expediente</dt><dd className="font-mono font-semibold">{operation.reference}</dd></div><div><dt className="text-xs text-muted-foreground">Caja identificada</dt><dd className="mt-1 font-mono font-semibold">{handoff.candidate.unitCode}</dd></div></dl>
        </div>
      </header>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="historical-result-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Resultado histórico inmutable</p><h2 id="historical-result-title" className="mt-1 font-semibold">Devolución confirmada</h2></div><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Con diferencias</Badge></div><p className="mt-3 text-sm text-muted-foreground">Cerrar diferencias agrega evidencia; no reescribe este resultado.</p></section>

      {state === "error" ? <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"><div className="flex gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold">No se completó el recontrol ilustrativo</h2><p className="mt-1 text-sm">Las diferencias cerradas y la revisión permanecen; no se creó un nuevo control.</p></div></div></section> : null}
      {state === "success" ? <section role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold">Caja disponible en esta presentación</h2><p className="mt-1 text-sm">El recontrol limpio agregó un nuevo Control de preparación local. La condición ilustrativa actual es Disponible.</p></div></div></section> : null}

      <section aria-labelledby="differences-title"><div className="mb-3"><h2 id="differences-title" className="text-lg font-semibold">Diferencias individuales</h2><p className="mt-1 text-sm text-muted-foreground">La propiedad/capacidad real para cerrarlas sigue pendiente; no se infiere un rol.</p></div><ul className="space-y-3">{resolution.differences.map((difference) => { const closed = closedIds.includes(difference.id); return <li key={difference.id} className="rounded-xl border bg-card p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="bg-muted/30">{difference.kind}</Badge><p className="font-semibold">{difference.title}</p></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{difference.detail}</p></div><Button type="button" variant={closed ? "secondary" : "outline"} className="min-h-11 w-full sm:w-auto" aria-pressed={closed} aria-label={`${closed ? "Reabrir" : "Cerrar"} diferencia ${difference.kind}: ${difference.title}`} disabled={state !== "resolve"} onClick={() => toggleClosed(difference.id)}>{closed ? <RotateCcw className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}{closed ? "Reabrir diferencia" : "Cerrar diferencia ilustrativa"}</Button></div></li> })}</ul></section>

      {state === "review" || state === "error" || state === "success" ? <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="resolution-composition-title"><div className="border-b px-5 py-5 sm:px-6"><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-muted-foreground" aria-hidden="true" /><h2 id="resolution-composition-title" className="text-lg font-semibold">Composición física actual completa</h2></div><p className="mt-1 text-sm text-muted-foreground">Revisión limpia posterior al cierre de todas las diferencias.</p></div><ul className="divide-y">{composition.map((item) => <li key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6"><div><p className="font-semibold">{item.articleName}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{item.id}</p>{item.traceability ? <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground"><Link2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />{item.traceability}</p> : null}</div><p className="font-semibold sm:text-right">{item.quantity}</p></li>)}</ul></section> : null}

      {state === "success" ? <section className="rounded-xl border bg-card p-5" aria-labelledby="new-return-control-title"><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-muted-foreground" aria-hidden="true" /><h2 id="new-return-control-title" className="font-semibold">Nuevo Control de preparación</h2></div><dl className="mt-4 grid gap-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Referencia</dt><dd className="font-mono font-semibold">{evidence.reference}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Fecha</dt><dd><time dateTime={evidence.occurredAt}>{evidence.displayedAt}</time></dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Actor</dt><dd>{evidence.actor}</dd></div></dl></section> : null}

      {state === "resolve" ? <section className="rounded-xl border bg-muted/20 p-5" aria-labelledby="recontrol-box-title"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><h2 id="recontrol-box-title" className="font-semibold">Gate de recontrol</h2><p id="recontrol-box-description" className="mt-1 text-sm text-muted-foreground">{allClosed ? "Todas las diferencias están cerradas. El resultado histórico sigue intacto y podés revisar la composición completa." : `Quedan ${resolution.differences.length - closedIds.length} diferencias abiertas.`}</p></div><Button type="button" className="min-h-11" disabled={!allClosed} aria-describedby="recontrol-box-description" onClick={() => setState("review")}>Recontrolar caja</Button></div></section> : null}

      {state === "review" || state === "error" ? <section className="rounded-xl border bg-card p-5" aria-labelledby="resolution-actions-title"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><h2 id="resolution-actions-title" className="font-semibold">Confirmación local del recontrol</h2><p className="mt-1 text-sm text-muted-foreground">Solo un recontrol limpio exitoso cambia la condición ilustrativa actual a Disponible.</p></div><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="outline" className="min-h-11" onClick={() => setState("error")}><CircleAlert className="size-4" aria-hidden="true" /> Simular error</Button><Button type="button" className="min-h-11" disabled={composition.length === 0} onClick={() => setState("success")}><ClipboardCheck className="size-4" aria-hidden="true" /> Recontrolar caja</Button></div></div></section> : null}

      <p className="text-xs leading-5 text-muted-foreground">Límite: no cierra diferencias, cambia disponibilidad, crea control, Stock, API, auditoría ni persistencia real.</p>
    </main>
  )
}
