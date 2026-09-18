import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { RECEIPT_ROLE_LABELS, type DigitalReceiptViewModel } from "@/lib/digital-receipts/ui"
import type { DigitalReceiptMock } from "@/lib/recibos-digitales.mock"
import { ReceiptSignerBadge, ReceiptStatusBadge } from "@/components/recibos/receipt-status"
import { CreditCard, FileBadge2, ShieldCheck, Wallet } from "lucide-react"

type ReceiptVoucherCardData = DigitalReceiptViewModel | DigitalReceiptMock

function readOptionalReceiptField<K extends "surgeryDate" | "surgeonName" | "institutionName">(
  receipt: ReceiptVoucherCardData,
  key: K
) {
  if (!(key in receipt)) {
    return undefined
  }

  const value = (receipt as Record<string, unknown>)[key]
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

function buildPatientClientDetail(receipt: ReceiptVoucherCardData) {
  const base = `${receipt.patient.document} · ${receipt.patient.relationLabel}`

  if (!receipt.payer) {
    return base
  }

  return `${base} · Cliente/pagador: ${receipt.payer.name}`
}

export function ReceiptVoucherCard({ receipt, className }: { receipt: ReceiptVoucherCardData; className?: string }) {
  const surgeryDate = readOptionalReceiptField(receipt, "surgeryDate")
  const surgeonName = readOptionalReceiptField(receipt, "surgeonName")
  const institutionName = readOptionalReceiptField(receipt, "institutionName")

  return (
    <Card className={className}>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  <FileBadge2 className="size-3.5" />
                  Comprobante de recepción y cobro
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">{receipt.receiptNumber}</h3>
                  <p className="mt-1 text-sm text-slate-300">{receipt.companyName} · {receipt.issuerArea}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ReceiptStatusBadge status={receipt.status} className="border-white/10 bg-white/10 text-white" />
                <ReceiptSignerBadge role={receipt.signerRole} className="border-white/15 bg-white/10 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Identificación del comprobante</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                <InfoBlock label="Paciente" value={receipt.patient.name} detail={buildPatientClientDetail(receipt)} />
                {receipt.payer ? <InfoBlock label="Cliente / pagador" value={receipt.payer.name} detail={`${receipt.payer.document} · ${receipt.payer.relationLabel}`} /> : null}
                {surgeryDate ? <InfoBlock label="Fecha cirugía" value={formatDate(surgeryDate)} detail={receipt.expedienteLabel} /> : null}
                {surgeonName ? <InfoBlock label="Médico" value={surgeonName} /> : null}
                {institutionName ? <InfoBlock label="Institución" value={institutionName} /> : null}
                <InfoBlock label="Firmante habilitado" value={receipt.signer.name} detail={`${receipt.signer.document} · ${RECEIPT_ROLE_LABELS[receipt.signerRole]}`} />
                <InfoBlock label="Cirugía / expediente" value={receipt.surgeryId} detail={receipt.expedienteLabel} />
                <InfoBlock label="Fechas del comprobante" value={formatDate(receipt.issueDate)} detail={`Vence ${formatDate(receipt.dueDate)}`} />
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Detalle del cobro</p>
                    <p className="mt-1 text-sm text-slate-600">Composición visible del concepto actualmente emitido.</p>
                  </div>
                  <Badge variant="outline" className="text-[11px]">No fiscal</Badge>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Concepto</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">{receipt.concept}</p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span>Ítem</span>
                    <span>Detalle</span>
                    <span className="text-right">Importe</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {receipt.lineItems.map((item) => (
                      <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-950">{item.label}</p>
                        </div>
                        <div>
                          <p className="text-sm leading-6 text-slate-600">{item.detail}</p>
                        </div>
                        <p className="text-right text-sm font-semibold text-slate-950">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <CreditCard className="size-4" />
                    Condiciones de pago
                  </div>
                  <div className="mt-4 space-y-4">
                    <InfoBlockSoft label="Medio de pago" value={receipt.paymentMethod} />
                    <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Importe total</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{formatCurrency(receipt.amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-50 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                    <ShieldCheck className="size-4" />
                    Espacio de conformidad
                  </div>

                  <div className="space-y-3 text-sm">
                    <InfoBlockDark label="Firmante predefinido" value={`${receipt.signer.name} · ${RECEIPT_ROLE_LABELS[receipt.signerRole]}`} />
                    <InfoBlockDark label="DNI requerido" value={receipt.signer.document} />
                    <InfoBlockDark label="Expediente asociado" value={receipt.expedienteLabel} />
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center gap-2 text-slate-100">
                      <Wallet className="size-4 text-emerald-300" />
                      La firma manual confirma la recepción del comprobante actual
                    </div>
                    <p className="leading-6">
                      {receipt.notes} La constancia PDF depende del estado público disponible en este flujo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoBlock({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </div>
  )
}

function InfoBlockSoft({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

function InfoBlockDark({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-50">{value}</p>
    </div>
  )
}
