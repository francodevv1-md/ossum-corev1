"use client"

import { useMemo, useState } from "react"
import { AlertCircle, FilePlus2, FolderOpen, Info, Receipt } from "lucide-react"
import { toast } from "sonner"

import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { SearchInput, SurgeryDrawer } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useInvoices } from "@/hooks/useInvoices"
import { usePendingInvoiceSources, type PendingInvoiceCandidate } from "@/hooks/usePendingInvoiceSources"
import { formatDecimalCurrency } from "@/lib/decimal-money"

export default function PendientesFacturarPage() {
  const invoicesApi = useInvoices()
  const sourcesApi = usePendingInvoiceSources(invoicesApi.invoices)
  const { openExpediente } = useExpedienteDrawer()
  const [search, setSearch] = useState("")
  const [selection, setSelection] = useState<{ companyId: string; candidate: PendingInvoiceCandidate } | null>(null)
  const selected = selection && selection.companyId === sourcesApi.companyId ? selection.candidate : null

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es")
    if (!query) return sourcesApi.candidates
    return sourcesApi.candidates.filter((candidate) => [
      candidate.surgeryId,
      candidate.presupuestoId,
      candidate.consumoId ?? "",
      candidate.kind,
    ].some((value) => value.toLocaleLowerCase("es").includes(query)))
  }, [search, sourcesApi.candidates])

  const createDraft = async () => {
    if (!selected || selected.companyId !== sourcesApi.companyId) return
    try {
      await invoicesApi.createFromSource({ presupuestoId: selected.presupuestoId, consumoId: selected.consumoId })
      await sourcesApi.refresh()
      setSelection(null)
      toast.success("Borrador operativo creado desde datos backend")
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo crear el borrador operativo")
    }
  }

  const error = sourcesApi.error ?? invoicesApi.error

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Pendientes de facturar</h1>
        <p className="text-sm text-muted-foreground">Presupuestos aprobados y consumos validados listos para crear borradores.</p>
      </div>

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Borradores operativos y no fiscales</AlertTitle>
        <AlertDescription>
          Esta pantalla no emite comprobantes ni asigna números fiscales. La documentación puede mostrar alertas, pero nunca bloquea la facturación.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>No se pudieron cargar los pendientes</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void Promise.all([invoicesApi.refresh(), sourcesApi.refresh()])}>Reintentar</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Cirugía, presupuesto o consumo" className="w-full sm:max-w-md" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {sourcesApi.loading || invoicesApi.loading ? (
            <p className="p-10 text-center text-sm text-muted-foreground" role="status">Cargando fuentes backend…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No hay fuentes backend pendientes de facturar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Base</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Cirugía backend</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fuente backend</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Importe</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((candidate) => (
                    <tr key={candidate.key} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <Badge variant={candidate.kind === "consumo" ? "info" : "secondary"}>
                          {candidate.kind === "consumo" ? "Consumo + presupuesto" : "Presupuesto"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{candidate.surgeryId}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <div><span className="text-muted-foreground">Presupuesto:</span> <span className="font-mono">{candidate.presupuestoId}</span></div>
                        {candidate.consumoId ? <div><span className="text-muted-foreground">Consumo:</span> <span className="font-mono">{candidate.consumoId}</span></div> : null}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {candidate.amount ? `${formatDecimalCurrency(candidate.amount, 4)} ${candidate.currency}` : "Se calculará en backend"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label={`Abrir expediente ${candidate.surgeryId}`} onClick={() => openExpediente(candidate.surgeryId)}>
                            <FolderOpen className="size-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setSelection({ companyId: candidate.companyId, candidate })}>
                            <FilePlus2 className="size-3" /> Crear borrador
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelection(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear borrador operativo</DialogTitle>
            <DialogDescription>
              El backend cargará y valorará las líneas. No se emitirá una factura fiscal ni se asignará número.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
              <p><span className="text-muted-foreground">Cirugía:</span> <span className="font-mono">{selected.surgeryId}</span></p>
              <p><span className="text-muted-foreground">Presupuesto:</span> <span className="font-mono">{selected.presupuestoId}</span></p>
              {selected.consumoId ? <p><span className="text-muted-foreground">Consumo:</span> <span className="font-mono">{selected.consumoId}</span></p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelection(null)}>Cancelar</Button>
            <Button disabled={invoicesApi.mutatingId === "__create_source__"} onClick={() => void createDraft()}>
              <Receipt className="size-4" /> Guardar borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}
