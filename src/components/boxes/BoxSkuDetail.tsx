"use client"

import { ArrowLeft, ArrowRight, Info, Layers3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  BoxPresentationSku,
  BoxPresentationUnit,
  BoxUnitCondition,
} from "@/features/boxes/presentation/boxes-presentation-fixtures"

function ConditionLabel({ condition }: { condition: BoxUnitCondition }) {
  if (!condition) {
    return <span className="text-xs text-muted-foreground">Sin resultado confirmado</span>
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-current/20 font-medium",
        condition === "Disponible"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {condition}
    </Badge>
  )
}

export function BoxSkuDetail({
  box,
  onBack,
  onOpenUnit,
}: {
  box: BoxPresentationSku
  onBack: () => void
  onOpenUnit: (unit: BoxPresentationUnit) => void
}) {
  const expectedContent = box.expectedContent

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--ossum-surface)]" aria-labelledby="box-model-title">
      <header className="shrink-0 border-b border-[var(--ossum-line)] bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-2 text-xs"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a Cajas
          </Button>
        </div>

        <div className="border-t border-[var(--ossum-line)] px-4 py-3">
          <div className="min-w-0 max-w-4xl">
            <nav aria-label="Ubicación" className="text-[11px] font-medium text-gray-400">
              Artículos y Stock <span aria-hidden="true">/</span> Cajas <span aria-hidden="true">/</span>{" "}
              <span className="text-[var(--ossum-navy)]">{box.id}</span>
            </nav>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-gray-500">{box.id}</span>
              <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px]">Artículo compuesto</Badge>
              <Badge variant="secondary" className="h-5 rounded px-1.5 text-[10px]">{box.category}</Badge>
            </div>
            <h1 id="box-model-title" className="mt-1 text-lg font-semibold text-[var(--ossum-navy)]">{box.name}</h1>
            <p className="mt-1 text-xs leading-5 text-gray-500">{box.description}</p>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 items-start gap-3 overflow-auto p-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden border border-[var(--ossum-line)] bg-white" aria-labelledby="expected-content-title">
          <div className="grid gap-3 border-b border-[var(--ossum-line)] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 className="size-3.5 text-gray-400" aria-hidden="true" />
                <h2 id="expected-content-title" className="text-sm font-semibold text-[var(--ossum-navy)]">Contenido esperado</h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">Componentes previstos para esta Caja.</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="border border-[var(--ossum-line)] bg-[var(--ossum-surface-2)] px-2.5 py-1.5 sm:text-right">
                <p className="text-xs font-semibold">{expectedContent.label}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{expectedContent.context}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-b border-[var(--ossum-line)] bg-blue-50 px-4 py-2 text-xs leading-5 text-blue-950">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-medium">Referencia reutilizable:</span>{" "}
              <span className="text-blue-900/80">no confirma el contenido físico ni lo despachado.</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-xs">
              <caption className="sr-only">Artículos y cantidades del Contenido esperado</caption>
              <thead className="bg-[var(--ossum-navy)] text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Artículo</th>
                  <th className="px-3 py-2 text-left font-medium">Cantidad esperada</th>
                  <th className="px-3 py-2 text-right font-medium">Orden</th>
                </tr>
              </thead>
              <tbody>
                {expectedContent.items.map((item) => (
                  <tr key={item.articleId}>
                    <td className="border-b border-[var(--ossum-line)] px-3 py-2">
                      <p className="font-medium">{item.articleName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-gray-500">{item.articleId}</p>
                    </td>
                    <td className="border-b border-[var(--ossum-line)] px-3 py-2 font-medium tabular-nums">
                      {item.expectedQuantity} {item.quantityUnit}
                    </td>
                    <td className="border-b border-[var(--ossum-line)] px-3 py-2 text-right font-mono text-gray-500 tabular-nums">
                      {item.order ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>

        <aside className="overflow-hidden border border-[var(--ossum-line)] bg-white" aria-labelledby="identified-boxes-title">
          <div className="border-b border-[var(--ossum-line)] px-4 py-3">
            <h2 id="identified-boxes-title" className="text-sm font-semibold text-[var(--ossum-navy)]">Cajas identificadas</h2>
            <p className="mt-1 text-xs text-gray-500">Resumen asociado a la Caja {box.id}.</p>
          </div>
          <ul className="divide-y">
            {box.units.map((unit) => (
              <li key={unit.code}>
                <button
                  type="button"
                   className="group flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left outline-none transition-colors hover:bg-[var(--ossum-surface-2)] focus-visible:bg-[var(--ossum-surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                  onClick={() => onOpenUnit(unit)}
                  aria-label={`Abrir Caja identificada ${unit.code}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-medium text-gray-400">Caja identificada</span>
                    <span className="mt-0.5 block break-all font-mono text-xs font-semibold text-[var(--ossum-navy)]">{unit.code}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <ConditionLabel condition={unit.condition} />
                    <ArrowRight
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

    </section>
  )
}
