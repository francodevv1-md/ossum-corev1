"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { COMPROBANTE_LABELS, documentMoney, type ComprobanteRecord } from "./comprobantes-model"
import { formatDate } from "@/lib/formatters"

export function ComprobanteDetail({ record, onClose }: { record: ComprobanteRecord; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent className="w-full overflow-y-auto motion-reduce:animate-none sm:max-w-xl">
        <SheetHeader className="border-b pr-10">
          <SheetDescription>{COMPROBANTE_LABELS[record.type]} · Solo lectura</SheetDescription>
          <SheetTitle>{record.type} {record.number ?? "Sin numeración"}</SheetTitle>
          <p className="break-all font-mono text-xs text-muted-foreground">{record.id}</p>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-muted-foreground">Estado</dt><dd className="mt-1 font-medium">{record.state.replaceAll("_", " ")}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Fecha</dt><dd className="mt-1">{formatDate(record.date)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{record.type === "CO" ? "Importe total del recibo" : "Importe"}</dt><dd className="mt-1 tabular-nums">{record.type === "NR" ? "No aplica" : documentMoney(record.amount, record.currency)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Saldo</dt><dd className="mt-1 tabular-nums">{record.type === "FV" ? documentMoney(record.balance, record.currency) : "No aplica"}</dd></div>
          </dl>
          <p className="text-sm">{record.concept}</p>
          <section aria-label={record.type === "CO" ? "Imputaciones" : "Detalle del comprobante"}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{record.type === "CO" ? "Imputaciones a facturas de esta cirugía" : "Detalle"}</h3>
            {record.lines.length ? (
              <ul className="divide-y rounded-lg border">
                {record.lines.map(line => (
                  <li key={line.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                    <div className="min-w-0 break-words"><p>{line.description}</p>{line.quantity !== undefined && <p className="mt-1 text-xs text-muted-foreground">Cantidad: {line.quantity}</p>}</div>
                    {line.total !== undefined && <span className="shrink-0 tabular-nums">{documentMoney(line.total, record.currency)}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Sin detalle registrado.</p>}
          </section>
          <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            PDF, impresión y modificación: no disponibles en esta vista. La modificación debe realizarse en el módulo correspondiente; este listado no cambia ni emite comprobantes.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
