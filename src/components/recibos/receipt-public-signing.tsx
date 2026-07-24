"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ReceiptVoucherCard } from "@/components/recibos/receipt-voucher-card"
import { ReceiptStatusBadge } from "@/components/recibos/receipt-status"
import { formatDate } from "@/lib/formatters"
import {
  buildReceiptFlowQuery,
  getReceiptFlowContextItems,
  getReceiptFlowSourceLabel,
  RECEIPT_ROLE_LABELS,
  type ReceiptFlowContext,
} from "@/lib/digital-receipts/ui"
import type { PublicDigitalReceiptViewModel } from "@/lib/digital-receipts"
import { AlertTriangle, ArrowLeft, Download, Eraser, FileSignature, PenLine, ShieldCheck } from "lucide-react"

type SignaturePoint = {
  x: number
  y: number
}

type SignatureStroke = SignaturePoint[]

const SIGNATURE_PAD_HEIGHT = 220

function drawStroke(context: CanvasRenderingContext2D, stroke: SignatureStroke) {
  if (stroke.length === 0) {
    return
  }

  context.beginPath()
  context.moveTo(stroke[0].x, stroke[0].y)

  if (stroke.length === 1) {
    context.lineTo(stroke[0].x + 0.01, stroke[0].y + 0.01)
  } else {
    for (let index = 1; index < stroke.length; index += 1) {
      const point = stroke[index]
      context.lineTo(point.x, point.y)
    }
  }

  context.stroke()
}

function configureSignatureContext(context: CanvasRenderingContext2D) {
  context.lineCap = "round"
  context.lineJoin = "round"
  context.strokeStyle = "#0f172a"
  context.lineWidth = 2.25
}

function redrawSignatureCanvas(canvas: HTMLCanvasElement, strokes: SignatureStroke[]) {
  const context = canvas.getContext("2d")

  if (!context) {
    return
  }

  const pixelRatio = Math.max(canvas.width / Math.max(canvas.clientWidth, 1), 1)
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  configureSignatureContext(context)

  for (const stroke of strokes) {
    drawStroke(context, stroke)
  }
}

function getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent): SignaturePoint {
  const rect = canvas.getBoundingClientRect()

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function HandwrittenSignaturePad({
  onChange,
}: {
  onChange: (payload: { isEmpty: boolean; dataUrl: string | null }) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<SignatureStroke[]>([])
  const drawingStrokeRef = useRef<SignatureStroke | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current
    const hasSignature = strokesRef.current.length > 0

    onChange({
      isEmpty: !hasSignature,
      dataUrl: hasSignature && canvas ? canvas.toDataURL("image/png") : null,
    })
  }, [onChange])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current

    if (!canvas || !container) {
      return
    }

    const pixelRatio = typeof window === "undefined" ? 1 : Math.max(window.devicePixelRatio || 1, 1)
    const nextWidth = Math.max(Math.floor(container.clientWidth), 280)
    const nextHeight = SIGNATURE_PAD_HEIGHT

    canvas.style.width = `${nextWidth}px`
    canvas.style.height = `${nextHeight}px`
    canvas.width = Math.floor(nextWidth * pixelRatio)
    canvas.height = Math.floor(nextHeight * pixelRatio)

    redrawSignatureCanvas(canvas, strokesRef.current)
  }, [])

  useEffect(() => {
    resizeCanvas()

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          resizeCanvas()
        })

    if (observer && containerRef.current) {
      observer.observe(containerRef.current)
    }

    const handleWindowResize = () => {
      resizeCanvas()
    }

    window.addEventListener("resize", handleWindowResize)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", handleWindowResize)
    }
  }, [resizeCanvas])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    event.preventDefault()
    const point = getCanvasPoint(canvas, event.nativeEvent)
    const nextStroke = [point]
    drawingStrokeRef.current = nextStroke
    strokesRef.current = [...strokesRef.current, nextStroke]
    pointerIdRef.current = event.pointerId
    canvas.setPointerCapture(event.pointerId)

    redrawSignatureCanvas(canvas, strokesRef.current)
  }, [])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const currentStroke = drawingStrokeRef.current

    if (!canvas || !currentStroke || pointerIdRef.current !== event.pointerId) {
      return
    }

    event.preventDefault()
    currentStroke.push(getCanvasPoint(canvas, event.nativeEvent))
    redrawSignatureCanvas(canvas, strokesRef.current)
  }, [])

  const finishStroke = useCallback((pointerId?: number) => {
    const canvas = canvasRef.current

    if (canvas && typeof pointerId === "number" && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId)
    }

    drawingStrokeRef.current = null
    pointerIdRef.current = null
    emitChange()
  }, [emitChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    strokesRef.current = []
    drawingStrokeRef.current = null
    pointerIdRef.current = null

    if (canvas) {
      redrawSignatureCanvas(canvas, [])
    }

    emitChange()
  }, [emitChange])

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishStroke(event.pointerId)}
          onPointerLeave={(event) => {
            if (drawingStrokeRef.current) {
              finishStroke(event.pointerId)
            }
          }}
          onPointerCancel={(event) => finishStroke(event.pointerId)}
          className="block w-full touch-none bg-[linear-gradient(to_bottom,transparent_31px,#e2e8f0_32px)]"
          style={{ height: `${SIGNATURE_PAD_HEIGHT}px` }}
          aria-label="Firma manuscrita digital"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Firmá dentro del recuadro con dedo, mouse o stylus. La firma se guarda como evidencia manuscrita digital del recibo.
        </p>
        <Button type="button" variant="outline" onClick={clearSignature} className="shrink-0">
          <Eraser className="size-4" />
          Limpiar firma
        </Button>
      </div>
    </div>
  )
}

function readOptionalReceiptField<K extends "surgeryDate" | "surgeonName" | "institutionName">(
  receipt: PublicDigitalReceiptViewModel,
  key: K
) {
  const value = receipt[key]
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

function buildPatientClientDetail(receipt: PublicDigitalReceiptViewModel) {
  const parts = [receipt.patient.document, receipt.patient.relationLabel]

  if (receipt.payer?.name) {
    parts.push(`Cliente/pagador: ${receipt.payer.name}`)
  }

  return parts.filter(Boolean).join(" · ")
}

export function ReceiptPublicSigning({ receipt, context }: { receipt: PublicDigitalReceiptViewModel; context?: ReceiptFlowContext }) {
  const router = useRouter()
  const [dni, setDni] = useState(receipt.signer.document)
  const [signature, setSignature] = useState(receipt.signer.name)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const queryString = buildReceiptFlowQuery(context)
  const artifactUrl = `/api/public/digital-receipts/${receipt.token}/artifact`
  const contextItems = getReceiptFlowContextItems(context)
  const sourceLabel = getReceiptFlowSourceLabel(context)
  const surgeryDate = readOptionalReceiptField(receipt, "surgeryDate")
  const surgeonName = readOptionalReceiptField(receipt, "surgeonName")
  const institutionName = readOptionalReceiptField(receipt, "institutionName")
  const patientClientDetail = buildPatientClientDetail(receipt)

  const canSign = useMemo(() => {
    return dni.trim() === receipt.signer.document && !isSignatureEmpty && accepted
  }, [accepted, dni, isSignatureEmpty, receipt.signer.document])

  async function handleSubmit() {
    if (!canSign || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/public/digital-receipts/${receipt.token}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signerDocument: dni,
          signature: signature.trim() || receipt.signer.name,
          signerName: signature.trim() || receipt.signer.name,
          signatureDataUrl,
          accepted,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null

        throw new Error(payload?.error?.message ?? "No se pudo registrar la firma pública del recibo.")
      }

      router.push(`/ventas/recibos/publico/${receipt.token}/final${queryString}`)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo registrar la firma pública del recibo.")
      setIsSubmitting(false)
    }
  }

  if (receipt.status === "signed") {
    return <ReceiptTerminalState receipt={receipt} tone="signed" context={context} />
  }

  if (receipt.status === "expired") {
    return <ReceiptTerminalState receipt={receipt} tone="expired" context={context} />
  }

  if (receipt.status === "revoked") {
    return <ReceiptTerminalState receipt={receipt} tone="revoked" context={context} />
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ReceiptStatusBadge status={receipt.status} className="border-white/15 bg-white/10 text-white" />
                <Badge variant="outline" className="border-white/15 bg-white/10 text-white">Acceso público por token</Badge>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hover:text-white">
                <Link href={`/ventas/recibos/${receipt.id}${queryString}`}>
                  <ArrowLeft className="size-4" />
                  Volver a gestión
                </Link>
              </Button>
            </div>

            <div>
              {contextItems.length > 0 && <p className="text-xs font-medium text-slate-300">{sourceLabel} · {contextItems.join(" · ")}</p>}
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Recepción y firma manual del comprobante</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Revisá el comprobante como documento de cobro, verificá los datos del firmante habilitado y completá la conformidad manual para dejar constancia del recibo actual.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <MiniInfo label="Paciente" value={receipt.patient.name} detail={patientClientDetail} />
            {receipt.payer ? <MiniInfo label="Cliente / pagador" value={receipt.payer.name} detail={`${receipt.payer.document} · ${receipt.payer.relationLabel}`} /> : null}
            {surgeryDate ? <MiniInfo label="Fecha cirugía" value={formatDate(surgeryDate)} detail={receipt.expedienteLabel} /> : null}
            {surgeonName ? <MiniInfo label="Médico" value={surgeonName} /> : null}
            {institutionName ? <MiniInfo label="Institución" value={institutionName} /> : null}
            <MiniInfo label="Firmante habilitado" value={receipt.signer.name} detail={`${receipt.signer.document} · ${RECEIPT_ROLE_LABELS[receipt.signerRole]}`} />
            <MiniInfo label="Cirugía / expediente" value={receipt.surgeryId} detail={receipt.expedienteLabel} />
            <MiniInfo label="Fechas del comprobante" value={formatDate(receipt.issueDate)} detail={`Vence ${formatDate(receipt.dueDate)}`} />
          </div>
        </div>
      </div>

      <ReceiptVoucherCard receipt={receipt} />

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileSignature className="size-4 text-emerald-700" />
            Firma de conformidad
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Esta sección funciona como cierre del comprobante: identificar al firmante, dejar la firma/aclaración manual y confirmar la recepción del documento.
          </p>
        </div>

        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Identificación del firmante</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  El DNI debe coincidir exactamente con el registrado para {receipt.signer.name} antes de habilitar la firma.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dni">DNI del firmante</Label>
                <Input id="dni" value={dni} onChange={(event) => setDni(event.target.value)} placeholder="Ej. 31.442.908" />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FileSignature className="size-4 text-emerald-700" />
                  Firma / aclaración manuscrita digital
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Dibujá tu firma real en el pad. Si querés, podés sumar la aclaración para que el backend conserve firma manuscrita + nombre legible.
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                    <div className="flex items-center gap-2 font-medium">
                      <PenLine className="size-4" />
                      Firma manuscrita requerida
                    </div>
                    <p className="mt-1 leading-5 text-emerald-800">
                      La confirmación solo se habilita cuando existe una firma dibujada en el canvas.
                    </p>
                  </div>

                  <HandwrittenSignaturePad
                    onChange={({ isEmpty, dataUrl }) => {
                      setIsSignatureEmpty(isEmpty)
                      setSignatureDataUrl(dataUrl)
                    }}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="signature">Aclaración del firmante</Label>
                    <Input
                      id="signature"
                      value={signature}
                      onChange={(event) => setSignature(event.target.value)}
                      placeholder="Nombre completo para acompañar la firma"
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      Campo opcional de apoyo. La evidencia principal pasa a ser la firma manuscrita digital guardada en backend.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-50 sm:p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Aceptación del documento</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  La conformidad consume el link activo y deja el recibo firmado en backend para este acceso público real.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox id="accepted" checked={accepted} onCheckedChange={(checked) => setAccepted(Boolean(checked))} className="border-white/30 data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-500" />
                  <div>
                    <Label htmlFor="accepted" className="text-slate-50">Confirmo que revisé el comprobante y que soy el firmante habilitado</Label>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Esta aceptación deja constancia de recepción y conformidad sobre el comprobante actual.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p className="font-medium text-slate-100">Antes de firmar</p>
                  <ul className="space-y-2 leading-6">
                    <li>• Revisá el PDF del comprobante.</li>
                    <li>• Verificá que el DNI coincida con <strong className="text-white">{receipt.signer.document}</strong>.</li>
                    <li>• Dibujá la firma manuscrita en el pad y, si querés, agregá aclaración.</li>
                  </ul>
                </div>

              <div className="grid gap-2">
                <Button variant="outline" asChild className="border-white/15 bg-white text-slate-950 hover:bg-slate-100">
                  <a href={artifactUrl}>
                    <Download className="size-4" />
                    Descargar comprobante PDF
                  </a>
                </Button>
                <Button onClick={handleSubmit} disabled={!canSign || isSubmitting} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <ShieldCheck className="size-4" />
                  {isSubmitting ? "Firmando..." : "Confirmar firma manual"}
                </Button>
              </div>
            </div>
          </div>

          {!canSign && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Para habilitar la firma, el DNI debe coincidir exactamente con <strong>{receipt.signer.document}</strong>, debe existir una firma manuscrita en el pad y tenés que marcar conformidad.
            </div>
          )}

          {submitError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              {submitError}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function ReceiptFinalState({ receipt, context }: { receipt: PublicDigitalReceiptViewModel; context?: ReceiptFlowContext }) {
  const tone = receipt.status === "signed" ? "signed" : receipt.status === "revoked" ? "revoked" : receipt.status === "expired" ? "expired" : "pending"
  return <ReceiptTerminalState receipt={receipt} tone={tone} context={context} />
}

function ReceiptTerminalState({
  receipt,
  tone,
  context,
}: {
  receipt: PublicDigitalReceiptViewModel
  tone: "pending" | "signed" | "expired" | "revoked"
  context?: ReceiptFlowContext
}) {
  const queryString = buildReceiptFlowQuery(context)
  const contextItems = getReceiptFlowContextItems(context)
  const sourceLabel = getReceiptFlowSourceLabel(context)
  const toneMap = {
        pending: {
          icon: <FileSignature className="size-5" />,
          title: "La firma todavía no fue confirmada",
          description: "Este estado refleja el backend actual: el recibo sigue pendiente de firma pública real hasta que se confirme la conformidad desde el formulario.",
          badge: "Pendiente",
          className: "border-slate-200 bg-slate-50 text-slate-950",
        },
      signed: {
        icon: <ShieldCheck className="size-5" />,
        title: "Este recibo ya fue firmado",
        description: "La regla de una sola firma quedó consumida. Se mantiene disponible la constancia PDF descargable del recibo firmado.",
        badge: "Ya firmado",
        className: "border-sky-200 bg-sky-50 text-sky-950",
      },
    expired: {
      icon: <AlertTriangle className="size-5" />,
      title: "El link de firma venció",
      description: "El acceso público venció y debe regenerarse / reenviarse desde la gestión interna.",
      badge: "Vencido",
      className: "border-amber-200 bg-amber-50 text-amber-950",
    },
    revoked: {
      icon: <AlertTriangle className="size-5" />,
      title: "El acceso público fue revocado",
      description: "El link ya no está disponible. Si hace falta un nuevo acceso, debe regenerarse desde la gestión interna.",
      badge: "Revocado",
      className: "border-rose-200 bg-rose-50 text-rose-950",
    },
  } satisfies Record<string, { icon: ReactNode; title: string; description: string; badge: string; className: string }>

  const current = toneMap[tone]
  const artifactUrl = `/api/public/digital-receipts/${receipt.token}/artifact`
  const canDownloadArtifact = tone === "pending" || tone === "signed"
  const blockedDownloadMessage =
    tone === "expired"
      ? "La descarga pública ya no está disponible porque este acceso venció. Si necesitás la constancia, debe regenerarse o revisarse desde gestión interna."
      : tone === "revoked"
        ? "La descarga pública fue deshabilitada porque este acceso fue revocado. Si hace falta una nueva constancia, debe emitirse desde gestión interna."
        : null

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <Card className={`shadow-sm ${current.className}`}>
        <CardContent className="space-y-4 p-6 text-center sm:p-8">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/80 shadow-sm">{current.icon}</div>
          <div>
            <Badge variant="outline" className="border-current/20 bg-white/70">{current.badge}</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{current.title}</h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 opacity-80">{current.description}</p>
            {contextItems.length > 0 && <p className="mx-auto mt-3 max-w-2xl text-xs font-medium opacity-80">{sourceLabel} · {contextItems.join(" · ")}</p>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {canDownloadArtifact ? (
              <Button variant="outline" asChild>
                <a href={artifactUrl}>
                  <Download className="size-4" />
                  Descargar comprobante PDF
                </a>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href={`/ventas/recibos/publico/${receipt.token}${queryString}`}>
                Ver recibo
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/ventas/recibos/${receipt.id}${queryString}`}>
                Volver a gestión interna
              </Link>
            </Button>
          </div>
          {blockedDownloadMessage ? (
            <p className="mx-auto max-w-2xl text-sm leading-6 opacity-80">{blockedDownloadMessage}</p>
          ) : null}
        </CardContent>
      </Card>

      <ReceiptVoucherCard receipt={receipt} />
    </div>
  )
}

function MiniInfo({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </div>
  )
}
