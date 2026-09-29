"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  ExternalLink,
  FileText,
  RefreshCw,
  Send,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFiscalEvidence, type FiscalActionPhase, type FiscalEvidence } from "@/hooks/useFiscalEvidence"

type ProviderDocument = {
  type: string | null
  number: string | null
  pdfUrl: string | null
  cae: string | null
  caeVto: string | null
  issueDate: string | null
  recipientIva: string | null
  recipientDocument: string | null
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function providerDocument(attempts: FiscalEvidence["attempts"]): ProviderDocument {
  for (const attempt of [...attempts].reverse()) {
    const evidence = recordOf(attempt.evidence)
    const response = recordOf(recordOf(evidence?.issuance)?.response) ?? recordOf(recordOf(evidence?.reconciliation)?.response)
    if (!response) continue
    const value = (key: string) => (typeof response[key] === "string" && response[key].trim() ? response[key].trim() : null)
    const comprobante = recordOf(response.comprobante)
    const client = recordOf(response.cliente)
    const document = {
      type: value("comprobante_tipo") ?? (typeof comprobante?.tipo === "string" ? comprobante.tipo : null),
      number: value("comprobante_nro") ?? (typeof comprobante?.numero === "string" ? comprobante.numero : null),
      pdfUrl: value("comprobante_pdf_url"),
      cae: value("cae"),
      caeVto: value("vencimiento_cae") ?? (typeof comprobante?.vencimiento_cae === "string" ? comprobante.vencimiento_cae : null),
      issueDate: value("fecha") ?? (typeof comprobante?.fecha === "string" ? comprobante.fecha : null),
      recipientIva: typeof client?.condicion_iva === "string" ? client.condicion_iva : null,
      recipientDocument:
        typeof client?.documento_tipo === "string" && typeof client?.documento_nro === "string"
          ? `${client.documento_tipo} ${client.documento_nro}`
          : null,
    }
    if (Object.values(document).some(Boolean)) return document
  }
  return {
    type: null,
    number: null,
    pdfUrl: null,
    cae: null,
    caeVto: null,
    issueDate: null,
    recipientIva: null,
    recipientDocument: null,
  }
}

function dateTime(value?: string | null) {
  if (!value) return "No disponible"
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? "No disponible" : date.toLocaleString("es-AR")
}

export function FiscalEvidenceDialog({
  companyId,
  invoiceId,
  invoiceLabel,
  open,
  onOpenChange,
  onSuccess,
}: {
  companyId: string
  invoiceId: string
  invoiceLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const { data, loading, submitting, actionPhase, error, noEvidence, issueDev, reconcileDev } = useFiscalEvidence(
    companyId,
    invoiceId,
  )

  const handleIssue = async () => {
    try {
      await issueDev()
      onSuccess?.()
    } catch {
      // error is captured in hook state
    }
  }

  const handleReconcile = async () => {
    try {
      await reconcileDev()
      onSuccess?.()
    } catch {
      // error is captured in hook state
    }
  }

  const isAuthorized = data?.document.state === "AUTHORIZED" || data?.document.displayState === "AUTHORIZED"
  const isSimulated = data?.document.displayState === "SIMULATED" && !isAuthorized
  const isAuthorizedOrSimulated = isAuthorized || isSimulated
  const isRejected = data?.document.state === "REJECTED"
  const isPendingOrUnknown =
    data?.document.state === "PENDING" ||
    data?.document.state === "UNKNOWN" ||
    data?.document.state === "SUBMITTED"
  const canReconcile = (isPendingOrUnknown || isRejected) && !isAuthorizedOrSimulated
  const canEmit = noEvidence || (!isAuthorizedOrSimulated && !isPendingOrUnknown && !isRejected)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-primary" />
            Evidencia fiscal DEV · {invoiceLabel}
          </DialogTitle>
          <DialogDescription>
            Gestión y consulta de emisión fiscal de prueba contra el sandbox de TusFacturas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Cargando evidencia fiscal…</span>
          </div>
        ) : null}

        {noEvidence ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3.5 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm"
          >
            {submitting ? (
              <IssuanceProgressStepper phase={actionPhase} />
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="size-4.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Emisión fiscal en entorno de pruebas (Sandbox)</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Envía esta factura hacia el sandbox de TusFacturas para validar matriz impositiva, CUIT y registrar evidencia de simulación o CAE de prueba.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-md border border-border/60 bg-background/60 p-2.5 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Comprobante</span>
                <p className="font-semibold text-foreground">{invoiceLabel}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Entorno fiscal</span>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">TusFacturas DEV</p>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end">
              <Button
                size="sm"
                onClick={handleIssue}
                disabled={submitting}
                className="gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {submitting ? "Emitiendo comprobante…" : "Emitir comprobante en DEV"}
              </Button>
            </div>
          </motion.div>
        ) : null}

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium flex items-start gap-2"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
            <div>
              <p className="font-semibold">Atención requerida</p>
              <p className="mt-0.5 text-destructive/90">{error}</p>
            </div>
          </motion.div>
        ) : null}

        {data ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <EvidenceBanner evidence={data} document={providerDocument(data.attempts)} />
            <EvidenceBody evidence={data} document={providerDocument(data.attempts)} />

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
              {canReconcile ? (
                <Button
                  size="sm"
                  variant={isPendingOrUnknown ? "default" : "outline"}
                  onClick={handleReconcile}
                  disabled={submitting}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Reconciliar estado
                </Button>
              ) : null}

              {canEmit ? (
                <Button
                  size="sm"
                  onClick={handleIssue}
                  disabled={submitting}
                  className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Emitir comprobante en DEV
                </Button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function EvidenceBanner({ evidence, document }: { evidence: FiscalEvidence; document: ProviderDocument }) {
  const isAuthorized = evidence.document.state === "AUTHORIZED" || evidence.document.displayState === "AUTHORIZED"
  const isSimulated = evidence.document.displayState === "SIMULATED" && !isAuthorized
  const isRejected = evidence.document.state === "REJECTED"
  const isPendingOrUnknown =
    evidence.document.state === "PENDING" ||
    evidence.document.state === "UNKNOWN" ||
    evidence.document.state === "SUBMITTED"

  if (isAuthorized) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Comprobante autorizado</h4>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                Autorizado con Código de Autorización Electrónico (CAE).
              </p>
            </div>
          </div>
          <Badge variant="success" className="text-xs font-bold shrink-0">
            AUTHORIZED
          </Badge>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs border-t border-emerald-500/20 pt-2.5">
          {document.cae ? (
            <div>
              <span className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70 block">CAE otorgado</span>
              <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100 text-sm">{document.cae}</span>
            </div>
          ) : null}
          {document.caeVto ? (
            <div>
              <span className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70 block">Vencimiento CAE</span>
              <span className="font-medium text-emerald-950 dark:text-emerald-100">{document.caeVto}</span>
            </div>
          ) : null}
          {evidence.document.authorizedAt ? (
            <div className="sm:col-span-2">
              <span className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70 block">Fecha y hora de autorización</span>
              <span className="font-mono text-emerald-950 dark:text-emerald-100">{dateTime(evidence.document.authorizedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (isSimulated) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">Simulación DEV completada — sin CAE fiscal</h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Comprobante de prueba generado en sandbox de TusFacturas. No autorizado por ARCA.
              </p>
            </div>
          </div>
          <Badge variant="warning" className="text-xs font-bold shrink-0">
            SIMULATED
          </Badge>
        </div>
      </div>
    )
  }

  if (isRejected) {
    const lastAttempt = evidence.attempts[evidence.attempts.length - 1]
    const errorCode = evidence.document.lastErrorCode || lastAttempt?.errorCode || "RECHAZADO"
    const errorMessage = evidence.document.lastErrorMessage || lastAttempt?.errorMessage || "La emisión fiscal fue rechazada por validación."

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive" role="alert">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <XCircle className="size-5 text-destructive shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Emisión rechazada</h4>
              <p className="text-xs text-destructive/90">
                La solicitud no fue aceptada. Corregí los datos fiscales de la factura o contacto antes de reconciliar.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-bold border-destructive text-destructive shrink-0">
            REJECTED
          </Badge>
        </div>

        <div className="mt-3 rounded-md bg-destructive/15 p-2.5 text-xs">
          <p className="font-mono font-semibold">Código: {errorCode}</p>
          <p className="mt-0.5 text-destructive/90">{errorMessage}</p>
        </div>
        <p className="mt-2 text-[11px] text-destructive/80">
          Para evitar números duplicados o desorden correlativo, no se realiza reemisión automática. Corregí los datos y usá &quot;Reconciliar estado&quot;.
        </p>
      </div>
    )
  }

  if (isPendingOrUnknown) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-muted/40 p-4 text-foreground">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Estado pendiente de confirmación</h4>
              <p className="text-xs text-muted-foreground">
                La solicitud fue enviada pero el resultado definitivo de ARCA aún no fue confirmado.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 shrink-0">
            {evidence.document.state}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Utilizá el botón <strong>&quot;Reconciliar estado&quot;</strong> para verificar si el comprobante ya obtuvo CAE en TusFacturas.
        </p>
      </div>
    )
  }

  return null
}

function EvidenceBody({ evidence, document }: { evidence: FiscalEvidence; document: ProviderDocument }) {
  return (
    <div className="space-y-4 text-sm">
      <section className="rounded-lg border bg-card/60 p-4 shadow-xs" aria-label="Datos del comprobante">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Detalle del comprobante
        </h4>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border/50 bg-muted/20 p-2.5">
            <dt className="text-[11px] font-medium text-muted-foreground">Tipo de comprobante</dt>
            <dd className="mt-0.5 font-medium text-foreground">{document.type ?? "No informado por el proveedor"}</dd>
          </div>
          <div className="rounded-md border border-border/50 bg-muted/20 p-2.5">
            <dt className="text-[11px] font-medium text-muted-foreground">Número de comprobante</dt>
            <dd className="mt-0.5 font-mono font-semibold text-foreground">{document.number ?? "No informado por el proveedor"}</dd>
          </div>
          {document.issueDate ? (
            <div className="rounded-md border border-border/50 bg-muted/20 p-2.5">
              <dt className="text-[11px] font-medium text-muted-foreground">Fecha de emisión</dt>
              <dd className="mt-0.5 font-medium text-foreground">{document.issueDate}</dd>
            </div>
          ) : null}
          {document.recipientDocument ? (
            <div className="rounded-md border border-border/50 bg-muted/20 p-2.5">
              <dt className="text-[11px] font-medium text-muted-foreground">Documento receptor</dt>
              <dd className="mt-0.5 font-medium text-foreground">{document.recipientDocument}</dd>
            </div>
          ) : null}
          {document.recipientIva ? (
            <div className="sm:col-span-2 rounded-md border border-border/50 bg-muted/20 p-2.5">
              <dt className="text-[11px] font-medium text-muted-foreground">Responsabilidad IVA receptor</dt>
              <dd className="mt-0.5 font-medium text-foreground">{document.recipientIva}</dd>
            </div>
          ) : null}
        </dl>

        {document.pdfUrl ? (
          <div className="mt-3 pt-2 border-t border-border/50">
            <a
              href={document.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir PDF DEV (se abre en una nueva pestaña)"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 hover:underline"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              Abrir PDF DEV
              <span className="sr-only">(se abre en una nueva pestaña)</span>
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="fiscal-attempt-history" className="space-y-2">
        <h4 id="fiscal-attempt-history" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Historial de intentos ({evidence.attempts.length})
        </h4>
        {evidence.attempts.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No hay intentos registrados.</p>
        ) : (
          <ol className="space-y-2">
            <AnimatePresence>
              {evidence.attempts.map((attempt) => (
                <motion.li
                  key={attempt.id}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-border/70 bg-card p-3 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">Intento #{attempt.attemptNumber}</span>
                    <Badge
                      variant={
                        attempt.displayState === "AUTHORIZED" || attempt.state === "AUTHORIZED"
                          ? "success"
                          : attempt.displayState === "SIMULATED"
                          ? "warning"
                          : attempt.state === "REJECTED"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {attempt.displayState || attempt.state}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{dateTime(attempt.updatedAt)}</p>
                  {attempt.errorCode || attempt.errorMessage ? (
                    <div className="mt-1.5 text-xs">
                      {attempt.errorCode ? (
                        <span className="font-mono text-destructive font-medium mr-2">Error: {attempt.errorCode}</span>
                      ) : null}
                      {attempt.errorMessage ? (
                        <span className="text-destructive/90">{attempt.errorMessage}</span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Sin errores reportados.</p>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </section>
    </div>
  )
}

function IssuanceProgressStepper({ phase }: { phase: FiscalActionPhase }) {
  const steps = [
    { key: "validating", label: "Validación de matriz fiscal", desc: "Verificación de tipo de factura, CUIT y alícuota IVA" },
    { key: "checking_existing", label: "Control de duplicados", desc: "Adquisición de lock atómico y snapshot inmutable" },
    { key: "submitting", label: "Envío a TusFacturas DEV", desc: "Transmisión cifrada al endpoint sandbox de TusFacturas" },
    { key: "waiting_provider", label: "Respuesta de ARCA", desc: "Procesamiento de CAE o simulación de sandbox" },
  ]

  const phaseOrder = ["validating", "checking_existing", "submitting", "waiting_provider"]
  const currentIdx = phase === "idle" ? 0 : phaseOrder.indexOf(phase)
  const activeStepIdx = currentIdx === -1 ? 2 : currentIdx

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="polite"
      className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3.5 shadow-xs"
    >
      <div className="flex items-center gap-2.5">
        <Loader2 className="size-5 animate-spin text-primary shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-foreground">Procesando emisión fiscal en tiempo real</h4>
          <p className="text-[11px] text-muted-foreground">
            Conectando con sandbox de TusFacturas y validando reglas ARCA…
          </p>
        </div>
      </div>

      <div className="space-y-2 border-t border-primary/15 pt-3">
        {steps.map((step, idx) => {
          const isDone = activeStepIdx > idx
          const isCurrent = activeStepIdx === idx
          const isPending = activeStepIdx < idx

          return (
            <div
              key={step.key}
              className={`flex items-start gap-2.5 text-xs transition-opacity duration-200 ${
                isPending ? "opacity-40" : "opacity-100"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <div className="size-4 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-semibold ${isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
                <p className="text-[10px] text-muted-foreground leading-tight">{step.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
