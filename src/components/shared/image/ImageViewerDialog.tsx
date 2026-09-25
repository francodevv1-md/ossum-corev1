"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  Loader2,
  FileText,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAccessToken } from "@/lib/auth/client"

export type ImageViewerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  src?: string | null
  alt?: string
  title?: string
  subtitle?: string
  onDownload?: () => void | Promise<void>
  onOpenInNewTab?: () => void
  onShare?: () => void | Promise<void>
  currentIndex?: number
  totalCount?: number
  onPrev?: () => void
  onNext?: () => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

export function ImageViewerDialog({
  open,
  onOpenChange,
  src,
  alt = "Vista previa de imagen",
  title = "Imagen",
  subtitle,
  onDownload,
  onOpenInNewTab,
  onShare,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
}: ImageViewerDialogProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isInteracting, setIsInteracting] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Refs for gesture calculations without re-render race conditions
  const dragStartRef = useRef({ x: 0, y: 0 })
  const pinchStartRef = useRef({ distance: 0, initialZoom: 1 })
  const lastTapRef = useRef<number>(0)

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [loadingResolved, setLoadingResolved] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Reset transformations and resolve authenticated source
  useEffect(() => {
    if (!open) {
      setResolvedSrc(null)
      setLoadError(false)
      return
    }

    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
    setIsInteracting(false)
    setImageLoaded(false)
    setLoadError(false)

    if (!src) {
      setResolvedSrc(null)
      return
    }

    if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http://") || src.startsWith("https://")) {
      setResolvedSrc(src)
      return
    }

    let active = true
    let blobUrl: string | null = null

    async function fetchAuthImage() {
      try {
        setLoadingResolved(true)
        const token = await getAccessToken()
        const res = await fetch(src!, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        if (!active) return
        blobUrl = URL.createObjectURL(blob)
        setResolvedSrc(blobUrl)
      } catch {
        if (active) {
          setLoadError(true)
          setResolvedSrc(src!)
        }
      } finally {
        if (active) setLoadingResolved(false)
      }
    }

    void fetchAuthImage()

    return () => {
      active = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [open, src])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)))
      if (next <= 1) {
        setPan({ x: 0, y: 0 })
      }
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleRotateCw = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleRotateCcw = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360)
  }, [])

  const handleToggleZoom = useCallback(() => {
    setZoom((prev) => (prev === 1 ? 2 : 1))
    setPan({ x: 0, y: 0 })
  }, [])

  // Keyboard navigation & controls
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        handleZoomIn()
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        handleZoomOut()
      } else if (event.key === "0") {
        event.preventDefault()
        handleReset()
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault()
        if (event.shiftKey) {
          handleRotateCcw()
        } else {
          handleRotateCw()
        }
      } else if (event.key === "ArrowLeft" && onPrev && currentIndex !== undefined && currentIndex > 0) {
        event.preventDefault()
        onPrev()
      } else if (
        event.key === "ArrowRight" &&
        onNext &&
        currentIndex !== undefined &&
        totalCount !== undefined &&
        currentIndex < totalCount - 1
      ) {
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handleZoomIn, handleZoomOut, handleReset, handleRotateCw, handleRotateCcw, onPrev, onNext, currentIndex, totalCount])

  // Mouse wheel zoom
  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault()
    if (event.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }

  // Mouse drag to pan
  const handleMouseDown = (event: React.MouseEvent) => {
    if (zoom <= 1) return
    event.preventDefault()
    setIsInteracting(true)
    dragStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isInteracting) return
    event.preventDefault()
    setPan({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => {
    setIsInteracting(false)
  }

  // Native Mobile Touch Handlers (Pinch to zoom + Pan + Double Tap)
  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      // 2 fingers = Pinch zoom start
      const t1 = event.touches[0]
      const t2 = event.touches[1]
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      pinchStartRef.current = { distance, initialZoom: zoom }
      setIsInteracting(true)
    } else if (event.touches.length === 1) {
      const now = Date.now()
      const isDoubleTap = now - lastTapRef.current < 300
      lastTapRef.current = now

      if (isDoubleTap) {
        handleToggleZoom()
        return
      }

      // Single finger drag if zoomed in
      if (zoom > 1) {
        const touch = event.touches[0]
        dragStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y }
        setIsInteracting(true)
      }
    }
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isInteracting) return

    if (event.touches.length === 2 && pinchStartRef.current.distance > 0) {
      // Pinching
      const t1 = event.touches[0]
      const t2 = event.touches[1]
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const scaleFactor = distance / pinchStartRef.current.distance
      const calculatedZoom = Number((pinchStartRef.current.initialZoom * scaleFactor).toFixed(2))
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, calculatedZoom))
      setZoom(clamped)
    } else if (event.touches.length === 1 && zoom > 1) {
      // Panning
      const touch = event.touches[0]
      setPan({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      })
    }
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (event.touches.length === 0) {
      setIsInteracting(false)
      pinchStartRef.current = { distance: 0, initialZoom: 1 }
      if (zoom <= 1) {
        setPan({ x: 0, y: 0 })
      }
    } else if (event.touches.length === 1 && zoom > 1) {
      // Switched from pinch to single finger
      const touch = event.touches[0]
      dragStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y }
    }
  }

  const hasMultiple = totalCount !== undefined && totalCount > 1
  const canPrev = hasMultiple && currentIndex !== undefined && currentIndex > 0
  const canNext = hasMultiple && currentIndex !== undefined && currentIndex < totalCount - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col h-[92vh] max-h-[94vh] w-[95vw] max-w-[95vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[1360px] overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950 p-0 text-slate-100 shadow-2xl gap-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle || alt || "Visualizador y editor de vista previa de imagen"}</DialogDescription>
        </DialogHeader>

        {/* Top Control Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 bg-slate-900/95 px-3.5 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md">
          {/* Left: Info + Multi-image pagination */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-xs sm:text-sm font-semibold text-slate-100">{title}</h4>
              {subtitle ? (
                <p className="truncate text-[11px] sm:text-xs text-slate-400">{subtitle}</p>
              ) : null}
            </div>

            {hasMultiple ? (
              <div className="ml-1.5 flex items-center gap-0.5 sm:gap-1 rounded-full border border-slate-800 bg-slate-950/80 px-2 py-0.5 text-xs text-slate-400">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-5 p-0 text-slate-300 hover:text-white disabled:opacity-30"
                  disabled={!canPrev}
                  onClick={onPrev}
                  title="Anterior (←)"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="px-1 text-[11px] sm:text-xs font-medium text-slate-300">
                  {(currentIndex ?? 0) + 1} / {totalCount}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-5 p-0 text-slate-300 hover:text-white disabled:opacity-30"
                  disabled={!canNext}
                  onClick={onNext}
                  title="Siguiente (→)"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>

          {/* Center / Right Toolbar: Zoom & Rotation Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Zoom controls */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/70 p-0.5 shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                className="size-6 sm:size-7 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                title="Alejar (-)"
              >
                <ZoomOut className="size-3.5 sm:size-4" />
              </Button>
              <button
                type="button"
                onClick={handleReset}
                className="min-w-[38px] sm:min-w-[46px] px-1 text-center font-mono text-[11px] sm:text-xs font-semibold text-slate-300 hover:text-white"
                title="Restablecer zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="size-6 sm:size-7 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                title="Acercar (+)"
              >
                <ZoomIn className="size-3.5 sm:size-4" />
              </Button>
            </div>

            {/* Rotation controls */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/70 p-0.5 shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                className="size-6 sm:size-7 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={handleRotateCcw}
                title="Rotar antihorario (Shift+R)"
              >
                <RotateCcw className="size-3.5 sm:size-4" />
              </Button>
              {rotation !== 0 ? (
                <span className="px-1 font-mono text-[11px] sm:text-xs text-[var(--ossum-action)]">
                  {rotation}°
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="size-6 sm:size-7 p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={handleRotateCw}
                title="Rotar 90° horario (R)"
              >
                <RotateCw className="size-3.5 sm:size-4" />
              </Button>
            </div>

            {/* Reset all button if modified */}
            {(zoom !== 1 || rotation !== 0 || pan.x !== 0 || pan.y !== 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 px-2 text-[11px] sm:text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                onClick={handleReset}
                title="Restablecer imagen"
              >
                <RefreshCw className="mr-1 size-3" />
                Reset
              </Button>
            )}

            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className="size-7 sm:size-8 p-0 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg ml-0.5"
              onClick={() => onOpenChange(false)}
              title="Cerrar (Esc)"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Main Image Canvas with hardware acceleration and touch-action none */}
        <div
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleToggleZoom}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ touchAction: "none" }}
          className={cn(
            "relative flex-1 min-h-0 w-full overflow-hidden bg-slate-950 flex items-center justify-center p-3 sm:p-6 select-none",
            zoom > 1 ? (isInteracting ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
          )}
        >
          {loadingResolved ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-400 select-none">
              <Loader2 className="size-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Cargando imagen en alta resolución...</p>
            </div>
          ) : resolvedSrc && !loadError ? (
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                willChange: "transform",
                transition: isInteracting
                  ? "none"
                  : "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              className="flex h-full w-full items-center justify-center pointer-events-none"
            >
              <img
                src={resolvedSrc}
                alt={alt}
                draggable={false}
                onLoad={() => setImageLoaded(true)}
                onError={() => setLoadError(true)}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-opacity duration-200 pointer-events-auto"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-md bg-slate-900/80 rounded-2xl border border-slate-800 text-slate-300 select-none">
              <FileText className="size-10 text-blue-400" />
              <div>
                <p className="text-sm font-bold text-white">{title || alt}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Este archivo es un documento o su formato no admite visualización directa como imagen.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {onDownload && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDownload}
                    className="h-8 text-xs gap-1.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                  >
                    <Download className="size-3.5" />
                    <span>Descargar archivo</span>
                  </Button>
                )}
                {onOpenInNewTab && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onOpenInNewTab}
                    className="h-8 text-xs gap-1.5 text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Abrir en nueva pestaña</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Multi-image floating arrow buttons */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (canPrev && onPrev) onPrev()
                }}
                disabled={!canPrev}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 flex size-9 sm:size-11 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-slate-800 disabled:opacity-0"
                title="Anterior (←)"
              >
                <ChevronLeft className="size-5 sm:size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (canNext && onNext) onNext()
                }}
                disabled={!canNext}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex size-9 sm:size-11 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-slate-800 disabled:opacity-0"
                title="Siguiente (→)"
              >
                <ChevronRight className="size-5 sm:size-6" />
              </button>
            </>
          )}

          {/* Quick hint banner on zoom / controls */}
          <div className="pointer-events-none absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1 text-[10px] sm:text-xs text-slate-400 backdrop-blur-md shadow-md text-center max-w-[90vw] truncate">
            Pellizcar o doble toque para zoom · Arrastrar para mover
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 bg-slate-900/80 px-3.5 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenInNewTab ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-8 rounded-lg text-[10px] sm:text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white px-2 sm:px-3"
                onClick={onOpenInNewTab}
              >
                <ExternalLink className="mr-1 sm:mr-1.5 size-3 sm:size-3.5" />
                Abrir en nueva pestaña
              </Button>
            ) : null}
            {onShare ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-8 rounded-lg text-[10px] sm:text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white px-2 sm:px-3"
                onClick={onShare}
              >
                <Upload className="mr-1 sm:mr-1.5 size-3 sm:size-3.5" />
                Compartir
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onDownload ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 rounded-lg border-slate-700 bg-slate-800 text-[10px] sm:text-[11px] font-medium text-slate-100 hover:bg-slate-700 hover:text-white px-2.5 sm:px-3"
                onClick={onDownload}
              >
                <Download className="mr-1 sm:mr-1.5 size-3 sm:size-3.5" />
                Descargar archivo
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
