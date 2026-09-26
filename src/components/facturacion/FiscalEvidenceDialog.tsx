"use client"

import { ExternalLink, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFiscalEvidence, type FiscalEvidence } from "@/hooks/useFiscalEvidence"

type ProviderDocument = { type: string | null; number: string | null; pdfUrl: string | null }

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function providerDocument(attempts: FiscalEvidence["attempts"]): ProviderDocument {
  for (const attempt of [...attempts].reverse()) {
    const evidence = recordOf(attempt.evidence)
    const response = recordOf(recordOf(evidence?.issuance)?.response) ?? recordOf(recordOf(evidence?.reconciliation)?.response)
    if (!response) continue
    const value = (key: string) => typeof response[key] === "string" && response[key].trim() ? response[key].trim() : null
    const document = { type: value("comprobante_tipo"), number: value("comprobante_nro"), pdfUrl: value("comprobante_pdf_url") }
    if (document.type || document.number || document.pdfUrl) return document
  }
  return { type: null, number: null, pdfUrl: null }
}

function dateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? "No disponible" : date.toLocaleString("es-AR")
}

export function FiscalEvidenceDialog({
  companyId,
  invoiceId,
  invoiceLabel,
  open,
  onOpenChange,
}: {
  companyId: string
  invoiceId: string
  invoiceLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, loading, error, noEvidence } = useFiscalEvidence(companyId, invoiceId)
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Evidencia fiscal · {invoiceLabel}</DialogTitle>
        <DialogDescription>Información fiscal de solo lectura provista por el servidor.</DialogDescription>
      </DialogHeader>

      {loading ? <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Cargando evidencia fiscal…</p> : null}
      {noEvidence ? <p role="status" className="rounded-md border bg-muted/40 p-3 text-sm">Esta factura no tiene evidencia fiscal registrada.</p> : null}
      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {data ? <EvidenceBody evidence={data} document={providerDocument(data.attempts)} /> : null}
    </DialogContent>
  </Dialog>
}

function EvidenceBody({ evidence, document }: { evidence: FiscalEvidence; document: ProviderDocument }) {
  return <div className="space-y-4 text-sm">
    <section className="rounded-md border p-3" aria-label="Estado fiscal">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Estado visible</span>
        <Badge variant={evidence.document.displayState === "AUTHORIZED" ? "success" : "warning"}>{evidence.document.displayState}</Badge>
      </div>
      {evidence.document.displayState === "SIMULATED" ? <p className="mt-2 font-medium text-amber-800">Comprobante de prueba — no autorizado por ARCA</p> : null}
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Tipo de comprobante</dt><dd>{document.type ?? "No informado por el proveedor"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Número de comprobante</dt><dd className="font-mono">{document.number ?? "No informado por el proveedor"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Último intento</dt><dd>{evidence.attempts.length ? dateTime(evidence.attempts[evidence.attempts.length - 1]?.updatedAt ?? "") : "Sin intentos registrados"}</dd></div>
      </dl>
      {document.pdfUrl ? <a href={document.pdfUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir PDF DEV (se abre en una nueva pestaña)" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"><FileText className="size-4" aria-hidden="true" /> Abrir PDF DEV <span className="sr-only">(se abre en una nueva pestaña)</span><ExternalLink className="size-3" aria-hidden="true" /></a> : null}
    </section>

    <section aria-labelledby="fiscal-attempt-history">
      <h3 id="fiscal-attempt-history" className="font-medium">Historial de intentos</h3>
      {evidence.attempts.length === 0 ? <p className="mt-2 text-muted-foreground">No hay intentos registrados.</p> : <ol className="mt-2 space-y-2">{evidence.attempts.map((attempt) => <li key={attempt.id} className="rounded-md border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">Intento {attempt.attemptNumber}</span><Badge variant={attempt.displayState === "AUTHORIZED" ? "success" : "outline"}>{attempt.displayState}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{dateTime(attempt.updatedAt)}</p><p className="mt-2 text-sm">{attempt.errorCode ? `Error: ${attempt.errorCode}` : "Sin error informado."}</p></li>)}</ol>}
    </section>
  </div>
}
