"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, CreditCard, Eye, FileSignature, Plus, Search, TimerReset } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ReceiptSignerBadge, ReceiptStatusBadge } from "@/components/recibos/receipt-status"
import { StatsCard } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, ApiClientError } from "@/lib/api/client"
import { listInternalDigitalReceipts } from "@/lib/digital-receipts/client"
import { resolveDigitalReceiptPublicPreviewHref } from "@/lib/digital-receipts/public-preview-session"
import {
  buildReceiptFlowQuery,
  getReceiptFlowSourceLabel,
  mapDigitalReceiptToViewModel,
  type DigitalReceiptViewModel,
  type ReceiptFlowContext,
} from "@/lib/digital-receipts/ui"
import { formatCurrency, formatDate } from "@/lib/formatters"

type ReceiptListViewProps = {
  context?: ReceiptFlowContext
}

type SurgeryPickerItem = {
  id: string
  visibleNumber: string | null
  description: string | null
  patient?: {
    firstName: string | null
    lastName: string | null
    legalName: string | null
  } | null
}

function getSurgeryPatientLabel(surgery: SurgeryPickerItem) {
  const patient = surgery.patient
  const fullName = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim()
  return fullName || patient?.legalName || "Paciente sin nombre"
}

function getSurgeryOptionLabel(surgery: SurgeryPickerItem) {
  return surgery.visibleNumber || surgery.description || surgery.id
}

export function ReceiptListView({ context }: ReceiptListViewProps) {
  const { activeCompany, currentUserLoading, isLoading } = useAuth()
  const [receipts, setReceipts] = useState<DigitalReceiptViewModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [surgeryPickerOpen, setSurgeryPickerOpen] = useState(false)
  const [surgeryQuery, setSurgeryQuery] = useState("")
  const [surgeryOptions, setSurgeryOptions] = useState<SurgeryPickerItem[]>([])
  const [surgeryOptionsLoading, setSurgeryOptionsLoading] = useState(false)
  const [surgeryOptionsError, setSurgeryOptionsError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading || currentUserLoading) return
    if (!activeCompany?.id) {
      setLoading(false)
      setError("No hay compañía activa para cargar recibos internos.")
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    listInternalDigitalReceipts(activeCompany.id, { surgeryId: context?.surgeryId })
      .then((data) => {
        if (cancelled) return
        setReceipts(data.map((receipt) => mapDigitalReceiptToViewModel({ receipt, accesses: [], snapshots: [], events: [], artifacts: [] })))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiClientError ? err.message : "No se pudo cargar la bandeja interna.")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeCompany?.id, context?.surgeryId, currentUserLoading, isLoading])

  const stats = useMemo(() => {
    const total = receipts.length
    const signed = receipts.filter((receipt) => receipt.rawStatus === "signed").length
    const pendingSignature = receipts.filter((receipt) => receipt.rawStatus === "issued").length
    const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
    return { total, signed, pendingSignature, totalAmount }
  }, [receipts])

  const queryString = useMemo(() => buildReceiptFlowQuery(context), [context])
  const createHref = `/ventas/recibos/nuevo${queryString}`
  const hasContext = Boolean(context?.surgeryId || context?.from || context?.invoice)
  const canCreateRealReceipt = Boolean(context?.surgeryId)
  const sourceLabel = getReceiptFlowSourceLabel(context)
  const filteredSurgeryOptions = useMemo(() => {
    const normalizedQuery = surgeryQuery.trim().toLowerCase()
    if (!normalizedQuery) return surgeryOptions

    return surgeryOptions.filter((surgery) => {
      const haystack = [
        surgery.id,
        surgery.visibleNumber,
        surgery.description,
        getSurgeryPatientLabel(surgery),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [surgeryOptions, surgeryQuery])

  useEffect(() => {
    if (isLoading || currentUserLoading) return
    if (!activeCompany?.id || canCreateRealReceipt) return

    let cancelled = false
    setSurgeryOptionsLoading(true)
    setSurgeryOptionsError(null)

    apiFetch<SurgeryPickerItem[]>(`/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries?take=20`)
      .then((data) => {
        if (cancelled) return
        setSurgeryOptions(data)
      })
      .catch((err) => {
        if (cancelled) return
        setSurgeryOptionsError(err instanceof ApiClientError ? err.message : "No se pudieron cargar cirugías.")
      })
      .finally(() => {
        if (cancelled) return
        setSurgeryOptionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeCompany?.id, canCreateRealReceipt, currentUserLoading, isLoading])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/50 p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              <FileSignature className="size-3.5" />
              Recibo digital de cobro
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Bandeja interna Sprint 1</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Listado real contra backend interno. La navegación pública sigue en modo demo hasta abrir el boundary productivo.
            </p>
          </div>

          {canCreateRealReceipt ? (
            <Button asChild>
              <Link href={createHref}>
                <Plus className="size-4" />
                Nuevo recibo digital
              </Link>
            </Button>
          ) : (
            <Popover open={surgeryPickerOpen} onOpenChange={setSurgeryPickerOpen}>
              <PopoverTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Nuevo recibo digital
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[380px] space-y-3 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Elegí una cirugía real</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    La creación real necesita una cirugía persistida. Seleccioná una para abrir el create flow contextual.
                  </p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={surgeryQuery}
                    onChange={(event) => setSurgeryQuery(event.target.value)}
                    placeholder="Buscar por paciente, descripción o ID"
                    className="pl-9"
                  />
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {surgeryOptionsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 rounded-2xl" />
                      ))}
                    </div>
                  ) : surgeryOptionsError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>No se pudo cargar cirugías</AlertTitle>
                      <AlertDescription>{surgeryOptionsError}</AlertDescription>
                    </Alert>
                  ) : filteredSurgeryOptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                      No encontramos cirugías para ese criterio.
                    </div>
                  ) : (
                    filteredSurgeryOptions.map((surgery) => (
                      <Link
                        key={surgery.id}
                        href={`/ventas/recibos/nuevo?from=recibos&surgeryId=${encodeURIComponent(surgery.id)}`}
                        className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        onClick={() => setSurgeryPickerOpen(false)}
                      >
                        <p className="text-sm font-semibold text-slate-950">{getSurgeryOptionLabel(surgery)}</p>
                        <p className="mt-1 text-sm text-slate-600">{getSurgeryPatientLabel(surgery)}</p>
                        <p className="mt-1 text-xs text-slate-500">ID real: {surgery.id}</p>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Recibos internos" value={stats.total} icon={CreditCard} />
          <StatsCard title="Pendiente firma" value={stats.pendingSignature} icon={Eye} />
          <StatsCard title="Firmados" value={stats.signed} icon={CheckCircle2} />
          <StatsCard title="Importe total" value={formatCurrency(stats.totalAmount)} icon={TimerReset} />
        </div>
      </div>

      {hasContext && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Contexto recibido</p>
              <p className="text-sm text-slate-600">
                {context?.from ? `Origen: ${sourceLabel}. ` : ""}
                {context?.surgeryId ? `Cirugía: ${context.surgeryId}. ` : ""}
                {context?.invoice ? `Factura: ${context.invoice}.` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!canCreateRealReceipt && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Creación real requiere cirugía persistida</AlertTitle>
          <AlertDescription>
            Podés crear un recibo real desde Expediente/Cobros o usar el botón de arriba para elegir una cirugía existente antes de abrir el create flow.
          </AlertDescription>
        </Alert>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error al cargar recibos</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Bandeja interna</h2>
            <p className="text-sm text-slate-500">Crear → emitir → gestionar corre contra endpoints internos reales.</p>
          </div>

          {loading ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-72 rounded-3xl" />
              ))}
            </div>
          ) : receipts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
              No hay recibos internos para este contexto todavía.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              {receipts.map((receipt) => {
                const publicPreviewHref = resolveDigitalReceiptPublicPreviewHref({ receiptId: receipt.id, context })

                return <div key={receipt.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReceiptStatusBadge status={receipt.status} />
                    <ReceiptSignerBadge role={receipt.signerRole} />
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-950">{receipt.receiptNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{receipt.patient.name} · {receipt.surgeryId}</p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm">
                    <InfoLine label="Importe" value={formatCurrency(receipt.amount)} />
                    <InfoLine label="Emisión" value={formatDate(receipt.issueDate)} />
                    <InfoLine label="Vencimiento" value={formatDate(receipt.dueDate)} />
                    <InfoLine label="Canal" value={receipt.shareChannel} />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">{receipt.concept}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/ventas/recibos/${receipt.id}${queryString}`}>Gestionar</Link>
                    </Button>
                    {publicPreviewHref ? (
                      <Button asChild>
                        <a href={publicPreviewHref} target="_blank" rel="noreferrer">
                          Abrir preview pública
                        </a>
                      </Button>
                    ) : (
                      <Button disabled>Preview pública no disponible</Button>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    {publicPreviewHref
                      ? "Preview real disponible en este navegador para este recibo."
                      : "Emití o reemití el acceso en este navegador para abrir la vista pública real."}
                  </p>
                </div>
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-950">{value}</span>
    </div>
  )
}
