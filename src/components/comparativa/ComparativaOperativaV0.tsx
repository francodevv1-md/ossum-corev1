"use client"

import { AlertTriangle, Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TraceItemRow, TraceSummary } from "@/lib/api/trazabilidad"

type ComparativaOperativaV0Props = {
  rows: TraceItemRow[]
  summary: TraceSummary | null
  loading: boolean
  error: string | null
  remitoLabels?: Record<string, string>
}

const WARNING_LABELS: Record<string, string> = {
  RETURNED_QUANTITY_SOURCE_CONFLICT: "Conflicto entre fuentes de devolución.",
  UNMATCHED_CONSUMO_ITEM: "El consumo no tiene una asociación directa con un ítem de remito.",
  UNMATCHED_DEVOLUCION_ITEM: "La devolución no tiene una asociación directa con un ítem de remito.",
}

function warningLabel(warning: string) {
  return WARNING_LABELS[warning] ?? `Advertencia Trace: ${warning.replaceAll("_", " ").toLowerCase()}.`
}

function AttentionText({ row }: { row: TraceItemRow }) {
  const messages: string[] = []

  if (row.matchConfidence === "unmatched" || !row.remitoItemId) {
    messages.push("Sin asociación de remito conocida.")
  }
  if (row.status === "difference") messages.push("Estado Trace: diferencia en las cantidades informadas.")
  if (row.status === "unknown") messages.push("Estado Trace: información desconocida o incompleta.")
  if (row.status === "pending") messages.push("Estado Trace: revisión operativa pendiente.")
  messages.push(...row.warnings.map(warningLabel))

  if (messages.length === 0) return <span className="text-muted-foreground">Sin atención</span>

  return (
    <div className="flex min-w-52 items-start gap-1.5 text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{messages.join(" ")}</span>
    </div>
  )
}

function ComparisonState({ children, loading = false }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <CardContent className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground" role="status">
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      <span>{children}</span>
    </CardContent>
  )
}

export function ComparativaOperativaV0({ rows, summary, loading, error, remitoLabels = {} }: ComparativaOperativaV0Props) {
  return (
    <Card className="overflow-hidden border-slate-200 py-0 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader className="gap-1 border-b bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
        <CardTitle className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          Comparativa operativa preliminar
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Vista operativa preliminar y de solo lectura para esta cirugía.
        </p>
        {summary ? (
          <p className="text-[10px] text-muted-foreground">
            Contexto Trace: {summary.itemRowsCount} filas en {summary.remitosCount} remitos.
          </p>
        ) : null}
      </CardHeader>

      {loading ? <ComparisonState loading>Cargando comparativa operativa.</ComparisonState> : null}
      {!loading && error ? <ComparisonState>No se pudo cargar la comparativa: {error}</ComparisonState> : null}
      {!loading && !error && rows.length === 0 ? (
        <ComparisonState>No hay filas operativas disponibles para esta cirugía.</ComparisonState>
      ) : null}
      {!loading && !error && rows.length > 0 ? (
        <CardContent className="p-0">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-950/40 dark:hover:bg-slate-950/40">
                <TableHead>Artículo</TableHead>
                <TableHead>Remito</TableHead>
                <TableHead className="text-right">Remitido</TableHead>
                <TableHead className="text-right">Consumido</TableHead>
                <TableHead className="text-right">Devuelto</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead>Atención</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-normal">
                    <span className="block font-medium text-foreground">{row.description}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{row.sku ?? "SKU desconocido"}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      Ítem: {row.remitoItemId ?? row.itemId ?? row.id}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal font-mono text-xs">
                    {row.remitoId ? (remitoLabels[row.remitoId] ?? row.remitoId) : <span className="font-sans text-muted-foreground">Sin asociación de remito</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.sentQuantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.consumedQuantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.returnedQuantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.pendingQuantity}</TableCell>
                  <TableCell className="whitespace-normal text-xs"><AttentionText row={row} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      ) : null}
    </Card>
  )
}
