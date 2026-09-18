import type { CxOperationsDerivedDisplay } from "@/lib/cx-operations-derived"

type CxOperationsDerivedSummaryProps = {
  display: Pick<CxOperationsDerivedDisplay, "nextActionLabel" | "responsibleAreaLabel">
  className?: string
}

export function CxOperationsDerivedSummary({ display, className }: CxOperationsDerivedSummaryProps) {
  return (
    <dl className={`grid gap-1 text-sm ${className ?? ""}`}>
      <div>
        <dt className="sr-only">Próxima acción (derivada)</dt>
        <dd aria-label={`Próxima acción (derivada): Derivada · ${display.nextActionLabel}`}>
          <span className="font-medium">Próxima acción (derivada): </span>
          Derivada · {display.nextActionLabel}
        </dd>
      </div>
      <div>
        <dt className="sr-only">Área sugerida (derivada)</dt>
        <dd aria-label={`Área sugerida (derivada): Derivada · ${display.responsibleAreaLabel}`}>
          <span className="font-medium">Área sugerida (derivada): </span>
          Derivada · {display.responsibleAreaLabel}
        </dd>
      </div>
    </dl>
  )
}
