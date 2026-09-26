"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, Check, FileText, Upload } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api/client"

type UnitScan = { id: string; rawValue: string; resolutionStatus: string; articleId?: string | null; lotCode?: string | null; serialNumber?: string | null; expirationDate?: string | null }
type ReceiptLine = { id: string; lineNumber: number; articleId: string | null; requestedQuantity: string; expectedQuantity?: string | null; receivedQuantity?: string; expectedCode?: string | null; expectedDescription?: string | null; lotCode: string | null; serialNumber: string | null; expirationDate: string | null; receivedLotCode?: string | null; receivedSerialNumber?: string | null; receivedExpirationDate?: string | null; resolutionStatus: string; scans?: UnitScan[] }
type GuidedAction = "identify_article" | "lot" | "serial" | "expiry" | "ready"
type ScanResult = { event: UnitScan; status: string; candidates?: Array<{ id: string; sku: string; description: string }>; line?: ReceiptLine; nextAction?: GuidedAction }
export type Receipt = { id: string; status: string; documentReference?: string | null; idempotencyKey?: string | null; lines: ReceiptLine[]; pendingScans?: ScanResult[] }
type OcrItem = { codigo: string; descripcion: string; cantidad: string; lote: string; vencimiento: string }
type OcrResult = { extracted: { numero_remito: string; proveedor_name: string; items: OcrItem[] }; warnings: string[]; confidence: number }
type NativeDetector = { detect(source: unknown): Promise<Array<{ rawValue: string }>> }
type NativeDetectorConstructor = new (options?: { formats: string[] }) => NativeDetector

const companyPath = (companyId: string) => `/api/companies/${encodeURIComponent(companyId)}`

function normalizeExpectedQuantity(rawValue: string): string | null {
  const value = rawValue.trim().replace(",", ".")
  return /^\d+(?:\.\d{1,4})?$/.test(value) ? value : null
}

export function ReceiptOperationalWorkspace({ initialReceipt, backHref, sourceLabel }: { initialReceipt?: Receipt; backHref?: string; sourceLabel?: string } = {}) {
  const { activeCompany } = useAuth()
  const [phase, setPhase] = useState<"document" | "scan">(initialReceipt ? "scan" : "document")
  const [receipt, setReceipt] = useState<Receipt | null>(initialReceipt ?? null)
  const [documentReference, setDocumentReference] = useState("")
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [scanValue, setScanValue] = useState("")
  const [scan, setScan] = useState<ScanResult | null>(() => initialReceipt?.pendingScans?.find((item) => item.status === "PENDING_TRACE") ?? null)
  const [pendingScans, setPendingScans] = useState<ScanResult[]>(() => initialReceipt?.pendingScans?.filter((item) => item.status === "PENDING") ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerInputRef = useRef<HTMLInputElement>(null)

  const focusScanner = () => requestAnimationFrame(() => scannerInputRef.current?.focus())

  const createDraft = async (expectedLines?: OcrItem[], reference = documentReference) => {
    if (!activeCompany) return
    const normalizedExpectedLines = expectedLines?.map((line) => ({ ...line, cantidad: normalizeExpectedQuantity(line.cantidad) }))
    if (normalizedExpectedLines?.some((line) => line.cantidad === null)) {
      setError("Hay una cantidad del remito que necesita revisión manual. Usá un valor numérico, por ejemplo 1 o 2.5.")
      return
    }
    setLoading(true); setError(null)
    try {
      const created = await apiFetch<Receipt>(`${companyPath(activeCompany.id)}/receipts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentReference: reference.trim() || undefined, expectedLines: normalizedExpectedLines?.map((line) => ({ code: line.codigo || undefined, description: line.descripcion || undefined, expectedQuantity: line.cantidad ?? "", lotCode: line.lote || undefined, expirationDate: line.vencimiento || undefined })) }),
      })
      setReceipt(created); setPhase("scan"); focusScanner()
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear la recepción") } finally { setLoading(false) }
  }

  const extractDocument = async () => {
    if (!activeCompany || !documentFile) return
    setOcrLoading(true); setError(null)
    try {
      const formData = new FormData()
      formData.append("file", documentFile)
      formData.append("tipo", "remito-proveedor")
      const result = await apiFetch<OcrResult>(`${companyPath(activeCompany.id)}/compras/ocr-extract`, { method: "POST", body: formData })
      setDocumentReference(result.extracted.numero_remito || "")
      await createDraft(result.extracted.items, result.extracted.numero_remito || documentReference)
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo leer el remito") } finally { setOcrLoading(false) }
  }

  const updateReceiptLine = (result: ScanResult) => {
    if (!result.line) return
    setReceipt((current) => current ? {
      ...current,
      lines: current.lines.some((line) => line.id === result.line!.id)
        ? current.lines.map((line) => line.id === result.line!.id ? { ...result.line!, scans: (line.scans ?? []).some((event) => event.id === result.event.id) ? (line.scans ?? []).map((event) => event.id === result.event.id ? result.event : event) : [...(line.scans ?? []), result.event] } : line)
        : [...current.lines, { ...result.line!, scans: [result.event] }],
    } : current)
  }

  const runScan = async (rawValue = scanValue) => {
    if (!activeCompany || !receipt || !rawValue.trim()) return
    setLoading(true); setError(null)
    try {
      const result = await apiFetch<ScanResult>(`${companyPath(activeCompany.id)}/receipts/${receipt.id}/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawValue }) })
      setScan(result)
      if (result.status === "PENDING") setPendingScans((current) => [...current.filter((item) => item.event.id !== result.event.id), result])
      updateReceiptLine(result); setScanValue(""); focusScanner()
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo consultar el artículo") } finally { setLoading(false) }
  }

  const captureTrace = async (rawValue = scanValue) => {
    if (!activeCompany || !receipt || !scan || !rawValue.trim()) return
    setLoading(true); setError(null)
    try {
      const result = await apiFetch<ScanResult>(`${companyPath(activeCompany.id)}/receipts/${receipt.id}/scans/${scan.event.id}/capture`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawValue }) })
      updateReceiptLine(result); setScan(result); setScanValue(""); focusScanner()
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la trazabilidad") } finally { setLoading(false) }
  }

  const resolvePendingScan = async (pendingScan: ScanResult, articleId: string) => {
    if (!activeCompany || !receipt) return
    setLoading(true); setError(null)
    try {
      const result = await apiFetch<ScanResult>(`${companyPath(activeCompany.id)}/receipts/${receipt.id}/scans/${pendingScan.event.id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId }) })
      if (!result.line) throw new Error("La recepción no devolvió la línea del artículo")
      updateReceiptLine(result)
      setPendingScans((current) => current.filter((item) => item.event.id !== pendingScan.event.id))
      setScan(result)
      focusScanner()
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo vincular el artículo") } finally { setLoading(false) }
  }

  const confirm = async () => {
    if (!activeCompany || !receipt) return
    setLoading(true); setError(null)
    try { setReceipt(await apiFetch<Receipt>(`${companyPath(activeCompany.id)}/receipts/${receipt.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm" }) })) } catch (e) { setError(e instanceof Error ? e.message : "No se pudo confirmar la recepción") } finally { setLoading(false) }
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }, [])

  const startCamera = async () => {
    setCameraError(null)
    const Detector = (window as Window & { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector
    if (!Detector) { setCameraError("Este navegador no admite lectura directa. Usá un lector USB o ingresá el código manualmente."); return }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      setCameraOpen(true)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const video = videoRef.current
      if (!video || !streamRef.current) return
      video.srcObject = streamRef.current
      await video.play()
      const detector = new Detector({ formats: ["qr_code", "data_matrix", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"] })
      let active = true
      const scanFrame = async () => {
        if (!active || !videoRef.current) return
        const detected = await detector.detect(videoRef.current)
        if (detected[0]?.rawValue) {
          active = false
          const rawValue = detected[0].rawValue
          stopCamera()
          await (scan?.status === "PENDING_TRACE" ? captureTrace(rawValue) : runScan(rawValue))
          return
        }
        requestAnimationFrame(() => void scanFrame())
      }
      void scanFrame()
    } catch (e) { stopCamera(); setCameraError(e instanceof Error ? e.message : "No se pudo acceder a la cámara") }
  }

  useEffect(() => stopCamera, [stopCamera])
  useEffect(() => { if (phase === "scan" && receipt?.status !== "CONFIRMED") focusScanner() }, [phase, receipt?.id, receipt?.status])

  const hasExpectedLines = Boolean(receipt?.lines.some((line) => line.expectedQuantity != null))
  const hasScannedLines = Boolean(receipt?.lines.some((line) => Number(line.receivedQuantity ?? 0) > 0))
  const visualStatus = receipt?.status === "CONFIRMED" ? "CONFIRMED" : hasExpectedLines && !hasScannedLines ? "PREPARED" : "IN_CONTROL"
  const statusLabel = visualStatus === "CONFIRMED" ? "Confirmada" : visualStatus === "PREPARED" ? "Preparada" : "En control"
  const canEdit = receipt?.status !== "CONFIRMED"
  const nextAction = scan?.status === "PENDING_TRACE" ? scan.nextAction : "identify_article"
  const actionLabel = nextAction === "lot" ? "Escaneá el lote" : nextAction === "serial" ? "Escaneá la serie" : nextAction === "expiry" ? "Escaneá el vencimiento" : "Escaneá el producto"
  const inputLabel = nextAction === "lot" ? "Lote" : nextAction === "serial" ? "Serie" : nextAction === "expiry" ? "Vencimiento" : "Producto"

  return <main className="min-h-[calc(100vh-4rem)] bg-[var(--ossum-bg)] px-3 py-4 sm:px-4 sm:py-6 md:px-8"><div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
    <header className="flex flex-col items-start gap-2 border-b border-[var(--ossum-line)] pb-4 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-4"><div>{backHref && <Link href={backHref} className="mb-2 inline-flex items-center text-sm font-medium text-[var(--ossum-action)] hover:underline"><ArrowLeft className="mr-1 size-4" />Volver a Remitos de Proveedor</Link>}<p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ossum-action)]">{sourceLabel ?? "Stock · recepción"}</p><h1 className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">Recepción de mercadería</h1><p className="mt-1 max-w-xl text-sm text-gray-500">Escaneá los productos esperados y confirmá la recepción.</p></div></header>
    {!activeCompany && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Seleccioná una empresa para operar stock.</p>}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!receipt && phase === "document" && <Card><CardHeader><CardTitle className="text-base">1. Cargar remito proveedor</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-1"><Label htmlFor="receipt-reference">Número de remito (opcional)</Label><Input id="receipt-reference" value={documentReference} onChange={(e) => setDocumentReference(e.target.value)} placeholder="Ej. 18453" /></div><div className="rounded-md border border-dashed border-[var(--ossum-line)] bg-gray-50 p-6 text-center"><FileText className="mx-auto size-8 text-gray-400" /><p className="mt-2 text-sm font-medium">Subí el PDF o una foto del remito</p><p className="mt-1 text-xs text-gray-500">El OCR extrae proveedor, número y artículos esperados.</p><Label htmlFor="receipt-document" className="sr-only">Archivo del remito</Label><Input id="receipt-document" className="mx-auto mt-4 max-w-sm" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} /></div><div className="flex flex-wrap justify-between gap-2"><Button variant="outline" onClick={() => void createDraft()} disabled={loading}><FileText className="mr-2 size-4" />Cargar sin remito</Button><Button onClick={() => void extractDocument()} disabled={ocrLoading || !documentFile}><Upload className="mr-2 size-4" />{ocrLoading ? "Leyendo remito…" : "Leer remito con OCR"}</Button></div></CardContent></Card>}
    {receipt && <Card><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Recepción <span data-testid="receipt-id">{receipt.id}</span></CardTitle><p className="mt-1 text-sm text-gray-500">{receipt.documentReference ? `Remito proveedor: ${receipt.documentReference}` : "Recepción sin remito esperado"}</p></div><Badge variant={visualStatus === "CONFIRMED" ? "default" : visualStatus === "IN_CONTROL" ? "secondary" : "outline"}>{statusLabel}</Badge></CardHeader><CardContent className="space-y-4">
      {canEdit && <><div className="rounded-md border border-[var(--ossum-line)] bg-gray-50 p-3 sm:p-4"><p className="text-sm font-medium">2. {actionLabel}</p><p className="mt-1 text-xs text-gray-500">La recepción suma una unidad recién cuando se completa lo requerido para ese artículo.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"><div><Label htmlFor="receipt-scan">{inputLabel}</Label><Input ref={scannerInputRef} className="mt-1 h-11 sm:h-9" id="receipt-scan" value={scanValue} onChange={(e) => setScanValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void (scan?.status === "PENDING_TRACE" ? captureTrace() : runScan())} placeholder="Cámara, lector USB o código" /></div><Button className="h-11 w-full sm:h-9 sm:w-auto" variant="outline" onClick={() => void startCamera()} disabled={loading}><Camera className="mr-2 size-4" />Usar cámara</Button></div>{cameraError && <p role="alert" className="mt-2 text-sm text-amber-700">{cameraError}</p>}{cameraOpen && <div className="mt-3 overflow-hidden rounded-md border bg-black"><video ref={videoRef} muted playsInline className="aspect-video max-h-80 w-full object-contain" /><Button variant="secondary" className="m-2 h-10" onClick={stopCamera}>Cerrar cámara</Button></div>}</div>
        {scan && scan.status !== "PENDING" && <div role="status" className={`rounded-md border p-3 text-sm ${scan.status === "RESOLVED" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-center justify-between"><span>Resultado: <strong>{scan.status === "RESOLVED" ? "Registrado" : actionLabel}</strong></span><span className={scan.status === "RESOLVED" ? "text-emerald-800/70" : "text-amber-800/70"}>{scan.candidates?.length ?? 0} candidato(s)</span></div>{scan.line && scan.status === "RESOLVED" ? <p className="mt-2">{scan.line.expectedDescription || scan.candidates?.[0]?.description} · recibido {scan.line.receivedQuantity} de {scan.line.expectedQuantity}</p> : <details className="mt-2 text-xs text-amber-800/80"><summary>Detalles técnicos</summary><p className="mt-1 break-all font-mono">{scan.event.rawValue}</p></details>}</div>}
        {pendingScans.map((pendingScan) => <div key={pendingScan.event.id} role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-medium">{pendingScan.candidates?.length ? "Seleccioná el artículo correspondiente" : "Código no registrado — pendiente"}</p>{pendingScan.candidates?.length ? <div className="mt-3 flex flex-wrap gap-2">{pendingScan.candidates.map((candidate) => <Button key={candidate.id} type="button" variant="outline" onClick={() => void resolvePendingScan(pendingScan, candidate.id)} disabled={loading}>{candidate.sku} · {candidate.description}</Button>)}</div> : null}</div>)}
      </>}
      {receipt.lines.length > 0 && <div className="-mx-3 overflow-x-auto rounded-md border sm:mx-0"><table className="min-w-[620px] w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Artículo esperado</th><th className="px-3 py-2">Esperado</th><th className="px-3 py-2">Recibido</th><th className="px-3 py-2">Diferencia</th><th className="px-3 py-2">Unidades</th></tr></thead><tbody>{receipt.lines.map((line) => { const expected = Number(line.expectedQuantity ?? line.requestedQuantity); const received = Number(line.receivedQuantity ?? 0); const difference = received - expected; return <tr key={line.id} className="border-t"><td className="px-3 py-3"><div className="font-medium">{line.expectedDescription || "Sin identificar"}</div><div className="font-mono text-xs text-gray-500">{line.expectedCode || "—"}</div></td><td className="px-3 py-3">{expected}</td><td className="px-3 py-3">{received}</td><td className={`px-3 py-3 font-medium ${difference === 0 ? "text-emerald-700" : "text-amber-700"}`}>{difference > 0 ? `+${difference}` : difference}</td><td className="px-3 py-3"><details><summary>{line.scans?.length ?? 0} unidad(es)</summary><ul className="mt-2 space-y-1 text-xs text-gray-500">{line.scans?.map((unit) => <li key={unit.id}>{[unit.lotCode && `Lote ${unit.lotCode}`, unit.serialNumber && `Serie ${unit.serialNumber}`, unit.expirationDate && `Vence ${unit.expirationDate.slice(0, 10)} `].filter(Boolean).join(" · ") || "Sin datos de trazabilidad"}</li>)}</ul></details></td></tr>})}</tbody></table></div>}
      {canEdit && <Button className="h-11 w-full sm:w-auto" onClick={confirm} disabled={loading || pendingScans.length > 0 || scan?.status === "PENDING_TRACE" || receipt.lines.length === 0 || receipt.lines.some((line) => Number(line.receivedQuantity ?? 0) <= 0)}><Check className="mr-2 size-4" />Confirmar recepción</Button>}
    </CardContent></Card>}
  </div></main>
}
