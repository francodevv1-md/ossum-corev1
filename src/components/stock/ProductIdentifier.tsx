"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CheckCircle2, Keyboard, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export type CaptureInput = { rawValue: string; symbology?: string }
export type IdentificationCandidate = { id: string; description: string; manufacturer?: string | null }
export type IdentificationResult = {
  status: "identified" | "not_found" | "ambiguous"
  item?: IdentificationCandidate
  lot?: string | null
  serial?: string | null
  expirationDate?: string | null
  rawValue?: string | null
  symbology?: string | null
  candidates?: IdentificationCandidate[]
  details?: Array<{ label: string; value: string }>
}

type ScanDetail = NonNullable<IdentificationResult["details"]>[number]

type ProductIdentifierProps = {
  resolve: (captures: CaptureInput[]) => Promise<IdentificationResult>
  onContinue: (result: IdentificationResult) => void
  onRegister?: (result: IdentificationResult) => void
  className?: string
}

type Detector = { detect(source: unknown): Promise<Array<{ rawValue: string; format?: string }>> }
type DetectorConstructor = new (options?: { formats: string[] }) => Detector

const formats = ["data_matrix", "qr_code", "code_128", "code_39", "code_93", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar", "aztec", "pdf417"]

export function ProductIdentifier({ resolve, onContinue, onRegister, className = "" }: ProductIdentifierProps) {
  const [result, setResult] = useState<IdentificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualValue, setManualValue] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activeRef = useRef(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const capturesRef = useRef<CaptureInput[]>([])

  const stopCamera = useCallback(() => {
    activeRef.current = false
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const acceptCaptures = useCallback(async (nextCaptures: CaptureInput[]) => {
    if (!nextCaptures.length) return
    stopCamera()
    setLoading(true)
    setCameraError(null)
    try {
      const resolved = await resolve(nextCaptures)
      setResult(resolved)
    } catch (caught) {
      setCameraError(caught instanceof Error ? caught.message : "No se pudo resolver el producto")
    } finally {
      setLoading(false)
    }
  }, [resolve, stopCamera])

  const addCapture = useCallback((capture: CaptureInput) => {
    const value = capture.rawValue.trim()
    if (!value || capturesRef.current.some((item) => item.rawValue === value)) return
    const next = [...capturesRef.current, { ...capture, rawValue: value }]
    capturesRef.current = next
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    settleTimerRef.current = setTimeout(() => void acceptCaptures(capturesRef.current), 800)
  }, [acceptCaptures])

  const startCamera = async () => {
    setCameraError(null)
    capturesRef.current = []
    setResult(null)
    const NativeDetector = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector
    if (!NativeDetector) {
      setCameraError("La cámara directa no está disponible. Usá un lector o ingresá el código.")
      return
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      setCameraOpen(true)
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()))
      const video = videoRef.current
      if (!video || !streamRef.current) return
      video.srcObject = streamRef.current
      await video.play()
      let detector: Detector
      try { detector = new NativeDetector({ formats }) } catch { detector = new NativeDetector({ formats: ["data_matrix", "qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"] }) }
      activeRef.current = true
      const scanFrame = async () => {
        const currentVideo = videoRef.current
        if (!activeRef.current || !currentVideo) return
        if (currentVideo.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          requestAnimationFrame(() => void scanFrame())
          return
        }
        try {
          const detected = await detector.detect(currentVideo)
          if (!activeRef.current) return
          detected.forEach(({ rawValue, format }) => addCapture({ rawValue, symbology: format }))
          if (activeRef.current) requestAnimationFrame(() => void scanFrame())
        } catch (caught) {
          stopCamera()
          setCameraError(caught instanceof Error ? `No se pudo leer el código: ${caught.message}` : "No se pudo leer el código")
        }
      }
      void scanFrame()
    } catch (caught) {
      stopCamera()
      setCameraError(caught instanceof Error ? caught.message : "No se pudo acceder a la cámara")
    }
  }

  const reset = () => {
    stopCamera()
    capturesRef.current = []
    setResult(null)
    setCameraError(null)
    setManualValue("")
  }

  const handleManual = () => {
    if (!manualValue.trim() || loading) return
    capturesRef.current = [{ rawValue: manualValue.trim(), symbology: "manual" }]
    void acceptCaptures(capturesRef.current)
  }

  const chooseCandidate = (candidate: IdentificationCandidate) => {
    if (!result) return
    setResult({ ...result, status: "identified", item: candidate, candidates: undefined })
  }

  return <section className={`mx-auto w-full max-w-2xl ${className}`} aria-live="polite">
    {!result && <Card className="overflow-hidden border-gray-200 shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div><h1 className="text-xl font-semibold tracking-tight text-gray-950">Identificar producto</h1><p className="mt-1 text-sm text-gray-500">Escaneá el envase para reconocer el artículo.</p></div>
        <div className="relative flex min-h-[min(56svh,28rem)] items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-center">
          {cameraOpen ? <><video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" /><div className="pointer-events-none absolute inset-x-8 top-1/2 h-40 -translate-y-1/2 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" /><p className="absolute bottom-5 left-4 right-4 text-sm font-medium text-white">Buscando el producto…</p><Button variant="secondary" className="absolute bottom-3 right-3 h-10" onClick={stopCamera}><X className="mr-2 size-4" />Cerrar</Button></> : <div className="space-y-3 px-6 text-white"><Camera className="mx-auto size-8 text-slate-300" /><p className="text-sm text-slate-300">Apuntá al producto</p><Button className="h-11 bg-white text-slate-950 hover:bg-slate-100" onClick={() => void startCamera()} disabled={loading}><Camera className="mr-2 size-4" />Escanear</Button></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500"><span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" />Lector conectado</span><div className="flex items-center gap-2"><Keyboard className="size-4" /><Input aria-label="Ingresar código" className="h-9 w-48" value={manualValue} onChange={(event) => setManualValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleManual()} placeholder="Ingresar código" /><Button variant="outline" className="h-9" onClick={handleManual} disabled={!manualValue.trim() || loading}><Search className="size-4" /></Button></div></div>
        {cameraError && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">{cameraError}</p>}
      </CardContent>
    </Card>}

    {loading && <Card className="border-gray-200 shadow-sm"><CardContent className="p-6"><p className="text-sm text-gray-500">Resolviendo producto…</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--ossum-action)]" /></div></CardContent></Card>}

    {result && !loading && <Card className="border-gray-200 shadow-sm"><CardContent className="space-y-5 p-5 sm:p-7">
      {result.status === "identified" && result.item && <><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" /><div><p className="font-semibold text-gray-950">Producto encontrado</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-gray-950">{result.item.description}</h2>{result.item.manufacturer && <p className="text-sm text-gray-500">{result.item.manufacturer}</p>}</div></div><dl className="grid grid-cols-1 divide-y rounded-lg border bg-gray-50 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0"><TraceField label="Lote" value={result.lot} /><TraceField label="Serie" value={result.serial} /><TraceField label="Vencimiento" value={result.expirationDate} /></dl><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" className="h-11" onClick={reset}>Escanear nuevamente</Button><Button className="h-11" onClick={() => { onContinue(result); reset() }}>Continuar</Button></div></>}
      {result.status === "ambiguous" && <><div><p className="font-semibold text-gray-950">Encontramos más de un producto posible.</p><p className="mt-1 text-sm text-gray-500">Elegí el artículo correcto para continuar.</p></div><div className="space-y-2">{result.candidates?.map((candidate) => <button type="button" key={candidate.id} onClick={() => chooseCandidate(candidate)} className="w-full rounded-lg border bg-white p-3 text-left transition-colors hover:border-[var(--ossum-action)] focus:outline-none focus:ring-2 focus:ring-[var(--ossum-action)]"><p className="font-medium text-gray-950">{candidate.description}</p>{candidate.manufacturer && <p className="mt-1 text-xs text-gray-500">{candidate.manufacturer}</p>}</button>)}</div><Button variant="outline" className="h-11" onClick={reset}>Escanear nuevamente</Button></>}
      {result.status === "not_found" && <><div><p className="font-semibold text-gray-950">Producto todavía no cargado.</p><p className="mt-1 text-sm text-gray-500">La lectura se hizo correctamente, pero no existe una ficha que coincida en esta empresa.</p></div>{result.details?.length ? <ScanDetails details={result.details} /> : null}<p className="text-xs text-gray-500">El GTIN identifica el artículo. Lote, serie y vencimiento corresponden a esta unidad.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" className="h-11" onClick={reset}>Escanear nuevamente</Button>{onRegister && <Button className="h-11" onClick={() => onRegister(result)}>Crear artículo</Button>}</div></>}
    </CardContent></Card>}
  </section>
}

function TraceField({ label, value }: { label: string; value?: string | null }) {
  return <div className="p-3 sm:p-4"><dt className="text-xs text-gray-500">{label}</dt><dd className={`mt-1 font-medium ${value ? "text-gray-950" : "text-gray-400"}`}>{value || "No informado"}</dd></div>
}

export function groupScanDetails(details: ScanDetail[]) {
  const article = details.filter(({ label }) => /^(GTIN|Dato GS1|Referencia adicional)/.test(label))
  const traceability = details.filter(({ label }) => /^(Lote|Serie|Vencimiento)/.test(label))
  return { article, traceability, diagnostics: details.filter((detail) => !article.includes(detail) && !traceability.includes(detail)) }
}

function DetailRows({ details }: { details: ScanDetail[] }) {
  return <dl className="divide-y overflow-hidden rounded-lg border bg-gray-50 text-sm">{details.map((detail) => <div key={`${detail.label}-${detail.value}`} className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-gray-500">{detail.label}</dt><dd className="break-all font-mono text-xs text-gray-950">{detail.value}</dd></div>)}</dl>
}

function ScanDetails({ details }: { details: ScanDetail[] }) {
  const groups = groupScanDetails(details)
  return <div className="space-y-4">
    {groups.article.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-gray-950">Datos del artículo</h2><DetailRows details={groups.article} /></section>}
    {groups.traceability.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-gray-950">Trazabilidad de esta unidad</h2><DetailRows details={groups.traceability} /></section>}
    {groups.diagnostics.length > 0 && <details className="rounded-lg border bg-gray-50"><summary className="cursor-pointer p-3 text-sm text-gray-600">Detalle técnico de lectura</summary><div className="border-t"><DetailRows details={groups.diagnostics} /></div></details>}
  </div>
}
