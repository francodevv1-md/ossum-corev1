"use client"

import { useMemo, useState } from "react"
import { AlertCircle, FilePlus2, FolderOpen, Info, Receipt } from "lucide-react"
import { toast } from "sonner"

import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { SearchInput, SurgeryDrawer } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
      candidate.surgeryNumber,
      candidate.patientName,
      candidate.institutionName,
      candidate.presupuestoNumber,
      candidate.consumoNumber,
      candidate.title,
    ].some((value) => value?.toLocaleLowerCase("es").includes(query)))
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
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      <header className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-2">
        <h1 className="text-base font-semibold text-[var(--ossum-navy)]">Pendientes de facturar</h1>
        <p className="text-[11px] text-gray-400">{rows.length} caso{rows.length !== 1 ? "s" : ""} listo{rows.length !== 1 ? "s" : ""} para preparar factura</p>
      </header>

      <Alert className="m-3 mb-0 shrink-0 rounded-md border-[var(--ossum-line)] bg-white py-2">
        <Info className="size-4" />
        <AlertTitle>Preparación sin emisión fiscal</AlertTitle>
        <AlertDescription>
          Crear un borrador organiza los datos para revisar la factura. No emite comprobantes ni asigna numeración fiscal.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive" className="m-3 mb-0 shrink-0">
          <AlertCircle className="size-4" />
          <AlertTitle>No se pudieron cargar los pendientes</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void Promise.all([invoicesApi.refresh(), sourcesApi.refresh()])}>Reintentar</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente, institución o número…" className="h-8 w-full text-xs sm:w-80" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {sourcesApi.loading || invoicesApi.loading ? (
            <p className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground" role="status">Cargando casos pendientes…</p>
          ) : rows.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-10 text-center">
              <p className="text-sm font-medium">No hay casos pendientes de facturar</p>
              <p className="text-xs text-muted-foreground">Los presupuestos aprobados y consumos validados aparecerán acá.</p>
            </div>
          ) : (
            <div className="m-3 flex-1 overflow-auto border border-[var(--ossum-line)] bg-white">
              <table className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium text-white">Caso</th>
                    <th className="sticky top-0 z-10 bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium text-white">Paciente</th>
                    <th className="sticky top-0 z-10 bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium text-white">Institución</th>
                    <th className="sticky top-0 z-10 bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium text-white">Base de facturación</th>
                    <th className="sticky top-0 z-10 bg-[var(--ossum-navy)] px-3 py-2 text-right font-medium text-white">Importe</th>
                    <th className="sticky top-0 z-10 bg-[var(--ossum-navy)] px-3 py-2 text-right font-medium text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((candidate) => (
                    <tr key={candidate.key} className="group transition-colors hover:bg-[var(--ossum-surface-2)]">
                      <td className="border-b border-[var(--ossum-line)] px-3 py-2">
                        <p className="font-mono text-[11px] font-semibold text-gray-800">{candidate.surgeryNumber ?? "Sin número visible"}</p>
                      </td>
                      <td className="border-b border-[var(--ossum-line)] px-3 py-2 font-medium text-gray-800">{candidate.patientName ?? "Sin informar"}</td>
                      <td className="border-b border-[var(--ossum-line)] px-3 py-2 text-gray-600">{candidate.institutionName ?? "Sin informar"}</td>
                      <td className="border-b border-[var(--ossum-line)] px-3 py-2">
                        <Badge variant={candidate.kind === "consumo" ? "info" : "secondary"}>
                          {candidate.kind === "consumo" ? "Consumo validado" : "Presupuesto aprobado"}
                        </Badge>
                        <p className="mt-1 font-mono text-[11px] text-gray-500">
                          {[candidate.presupuestoNumber, candidate.consumoNumber].filter(Boolean).join(" · ") || "Sin número visible"}
                        </p>
                      </td>
                      <td className="border-b border-[var(--ossum-line)] px-3 py-2 text-right font-medium tabular-nums text-gray-800">
                        {candidate.amount ? `${formatDecimalCurrency(candidate.amount, 4)} ${candidate.currency}` : "Al crear el borrador"}
                      </td>
                      <td className="border-b border-[var(--ossum-line)] px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Abrir expediente ${candidate.surgeryNumber ?? "sin número visible"}`} onClick={() => openExpediente(candidate.surgeryId)}>
                            <FolderOpen className="size-4" />
                          </Button>
                          <Button size="sm" aria-label={`Preparar factura para ${candidate.patientName ?? candidate.surgeryNumber ?? "caso sin identificar"}`} className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={() => setSelection({ companyId: candidate.companyId, candidate })}>
                            <FilePlus2 className="size-3.5" /> Preparar factura
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelection(null) }}>
        <DialogContent className="p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-[var(--ossum-line)] px-6 py-4">
            <DialogTitle className="text-base text-[var(--ossum-navy)]">Preparar factura</DialogTitle>
            <DialogDescription>
              Se creará un borrador para revisar. Esta acción no emite una factura fiscal.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="mx-6 my-5 grid gap-3 rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-surface-2)] p-4 text-sm sm:grid-cols-2">
              <div><p className="text-[11px] text-gray-500">Caso</p><p className="font-medium">{selected.surgeryNumber ?? "Sin número visible"}</p></div>
              <div><p className="text-[11px] text-gray-500">Paciente</p><p className="font-medium">{selected.patientName ?? "Sin informar"}</p></div>
              <div><p className="text-[11px] text-gray-500">Institución</p><p className="font-medium">{selected.institutionName ?? "Sin informar"}</p></div>
              <div><p className="text-[11px] text-gray-500">Documentos</p><p className="font-mono text-xs">{[selected.presupuestoNumber, selected.consumoNumber].filter(Boolean).join(" · ") || "Sin número visible"}</p></div>
            </div>
          ) : null}
          <DialogFooter className="border-t border-[var(--ossum-line)] px-6 py-4">
            <Button variant="outline" onClick={() => setSelection(null)}>Cancelar</Button>
            <Button disabled={invoicesApi.mutatingId === "__create_source__"} onClick={() => void createDraft()}>
              <Receipt className="size-4" /> Crear borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurgeryDrawer />
    </div>
  )
}
