"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { Camera, LoaderCircle, RefreshCw, ScanLine, WifiOff } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiClientError } from "@/lib/api/client"
import { resolveRemitoScan, type RemitoScanProjection } from "@/lib/api/remito-scan"

type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> }
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike
type View = "idle" | "loading" | "result" | "invalid" | "unavailable" | "conflict" | "camera-denied" | "offline"

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" })

function cacheKey(userId: string, companyId: string, locator: string) {
  return `ossum.remitoScan.v1:${userId}:${companyId}:${locator.toUpperCase()}`
}

function cameraLocator(value: string) {
  try {
    const url = new URL(value)
    const prefix = "/remitos/scan/"
    return url.origin === window.location.origin && url.pathname.startsWith(prefix)
      ? decodeURIComponent(url.pathname.slice(prefix.length))
      : value
  } catch { return value }
}

export function RemitoScanWorkspace({ initialLocator = "" }: { initialLocator?: string }) {
  const { user, activeCompany } = useAuth()
  const [locator, setLocator] = useState(initialLocator)
  const [lastLocator, setLastLocator] = useState(initialLocator)
  const [view, setView] = useState<View>(initialLocator ? "loading" : "idle")
  const [projection, setProjection] = useState<RemitoScanProjection | null>(null)
  const [stale, setStale] = useState(false)
  const errorRef = useRef<HTMLHeadingElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const readCache = useCallback((code: string) => {
    if (!user?.id || !activeCompany?.id) return null
    try {
      return JSON.parse(localStorage.getItem(cacheKey(user.id, activeCompany.id, code)) ?? "null") as RemitoScanProjection | null
    } catch { return null }
  }, [activeCompany, user])

  const resolve = useCallback(async (code: string) => {
    const candidate = code.trim()
    if (!candidate) return
    stopCamera()
    setLastLocator(candidate)
    setView("loading")
    setStale(false)
    try {
      const data = await resolveRemitoScan(candidate, activeCompany?.id)
      setProjection(data)
      setLocator(data.remitoShortCode)
      setView("result")
      if (user?.id && activeCompany?.id) {
        try { localStorage.setItem(cacheKey(user.id, activeCompany.id, data.remitoShortCode), JSON.stringify(data)) } catch { /* Cache is optional. */ }
      }
      window.history.replaceState(null, "", `/remitos/scan/${encodeURIComponent(data.remitoShortCode)}`)
    } catch (error) {
      const cached = readCache(candidate)
      if (!navigator.onLine && cached) {
        setProjection(cached); setStale(true); setView("offline"); return
      }
      setProjection(null)
      if (error instanceof ApiClientError && error.code === "invalid_remito_locator") setView("invalid")
      else if (error instanceof ApiClientError && error.code === "company_selection_required") setView("conflict")
      else if (error instanceof ApiClientError && ["remito_scan_unavailable", "company_access_denied"].includes(error.code ?? "")) setView("unavailable")
      else setView("offline")
    }
  }, [activeCompany, readCache, stopCamera, user])

  useEffect(() => {
    if (!initialLocator) return
    const timeout = window.setTimeout(() => void resolve(initialLocator), 0)
    return () => window.clearTimeout(timeout)
  }, [initialLocator, resolve])
  useEffect(() => { if (["invalid", "unavailable", "conflict", "camera-denied", "offline"].includes(view)) errorRef.current?.focus() }, [view])
  useEffect(() => stopCamera, [stopCamera])

  const startCamera = async () => {
    const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
    if (!Detector || !navigator.mediaDevices?.getUserMedia) { setView("camera-denied"); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      streamRef.current = stream
      if (!videoRef.current) return stopCamera()
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      const detector = new Detector({ formats: ["qr_code", "code_128"] })
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const [match] = await detector.detect(videoRef.current)
          if (match?.rawValue) void resolve(cameraLocator(match.rawValue))
          else window.setTimeout(() => void scan(), 250)
        } catch { stopCamera(); setView("camera-denied") }
      }
      void scan()
    } catch { stopCamera(); setView("camera-denied") }
  }

  const submit = (event: FormEvent) => { event.preventDefault(); void resolve(locator) }
  const errorCopy: Partial<Record<View, [string, string]>> = {
    invalid: ["Código inválido", "Revisá el código RM1 e intentá nuevamente."],
    unavailable: ["Remito no disponible", "No se encontró un remito disponible para esta empresa."],
    conflict: ["Seleccioná una empresa", "Elegí la empresa activa antes de escanear."],
    "camera-denied": ["Cámara no disponible", "Habilitá el permiso de cámara o ingresá el código manualmente."],
    offline: ["Sin conexión", projection ? "Mostramos la última lectura autorizada guardada en este dispositivo." : "No pudimos consultar el remito. Verificá tu conexión y reintentá."],
  }
  const error = errorCopy[view]

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-xl flex-col gap-5 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <header><p className="text-sm font-medium text-primary">Logística · Solo lectura</p><h1 className="text-2xl font-semibold tracking-tight">Escanear remito</h1><p className="mt-1 text-sm text-muted-foreground">Usá la cámara o ingresá el código RM1.</p></header>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ScanLine aria-hidden="true" /> Identificación</CardTitle></CardHeader><CardContent className="space-y-4">
        <video ref={videoRef} aria-label="Vista de cámara para escanear" className="aspect-video w-full rounded-lg bg-muted object-cover" muted playsInline />
        <Button type="button" variant="outline" size="lg" className="min-h-12 w-full" onClick={() => void startCamera()}><Camera /> Abrir cámara</Button>
        <form className="space-y-2" onSubmit={submit}><Label htmlFor="remito-code">Código del remito</Label><div className="flex gap-2"><Input id="remito-code" value={locator} onChange={(event) => setLocator(event.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="RM1-XXXX-XXXX-XXXX-XXXX-C" className="min-h-12" /><Button type="submit" size="lg" className="min-h-12" disabled={!locator.trim() || view === "loading"}>Consultar</Button></div></form>
      </CardContent></Card>
      <div aria-live="polite" aria-atomic="true">
        {view === "loading" ? <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" aria-hidden="true" /> Consultando remito…</p> : null}
        {error ? <Alert variant={view === "invalid" ? "destructive" : "default"}>{view === "offline" ? <WifiOff /> : null}<AlertTitle ref={errorRef} tabIndex={-1}>{error[0]}</AlertTitle><AlertDescription>{error[1]}<Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void resolve(lastLocator)}><RefreshCw /> Reintentar</Button></AlertDescription></Alert> : null}
      </div>
      {projection ? <Card aria-label="Detalle del remito"><CardHeader><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm">{projection.remitoShortCode}</p><CardTitle>{projection.documentType}</CardTitle></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{projection.state.replaceAll("_", " ")}</span></div>{stale ? <p role="status" className="text-sm font-medium text-amber-700">Lectura guardada · puede estar desactualizada</p> : null}<p className="text-sm text-muted-foreground">Emitido el {dateFormat.format(new Date(projection.issuedAt))}</p></CardHeader><CardContent><h2 className="mb-3 font-medium">Contenido</h2><ul className="divide-y">{projection.items.map((item, index) => <li key={`${item.sku ?? item.description}-${index}`} className="py-3"><p className="font-medium">{item.description}</p><p className="text-sm text-muted-foreground">{item.quantity} {item.unit ?? "u."}{item.lotNumber ? ` · Lote ${item.lotNumber}` : ""}{item.serialNumber ? ` · Serie ${item.serialNumber}` : ""}{item.expirationDate ? ` · Vence ${item.expirationDate}` : ""}</p></li>)}</ul></CardContent></Card> : null}
    </main>
  )
}
