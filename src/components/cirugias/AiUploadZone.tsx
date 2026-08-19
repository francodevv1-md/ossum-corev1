"use client"

import type { ChangeEvent, DragEvent, KeyboardEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, FileText, FileUp, Sparkles, UploadCloud } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const OCR_STEPS = [
  "Subiendo archivo…",
  "Leyendo documento con Azure OCR…",
  "Extrayendo texto y tablas…",
  "Analizando con IA…",
  "Organizando datos detectados…",
] as const

const STEP_INTERVAL_MS = 2200

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/bmp",
] as const

const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.bmp"
const MAX_FILE_SIZE_MB = 4
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export type AiUploadZoneProps = {
  isProcessing?: boolean
  error?: string | null
  onFileSelected: (file: File) => void | Promise<void>
}

export function AiUploadZone({
  isProcessing = false,
  error = null,
  onFileSelected,
}: AiUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [stepIdx, setStepIdx] = useState(0)

  const displayError = error || localError

  // Rotate status messages while processing. setState is inside the interval
  // callback, not the effect body — safe under react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!isProcessing) return
    const id = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % OCR_STEPS.length)
    }, STEP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isProcessing])

  const acceptedMimeTypesText = useMemo(
    () => "PDF, JPG, JPEG, PNG o BMP",
    []
  )

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
      return `Tipo de archivo no soportado. Usá ${acceptedMimeTypesText}.`
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo supera el máximo permitido de ${MAX_FILE_SIZE_MB} MB.`
    }

    return null
  }, [acceptedMimeTypesText])

  const handleCandidateFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file)

      if (validationError) {
        setLocalError(validationError)
        return
      }

      setLocalError(null)
      setSelectedFileName(file.name)
      setStepIdx(0)

      try {
        await onFileSelected(file)
      } catch (caughtError) {
        if (caughtError instanceof Error) {
          setLocalError(caughtError.message)
        } else {
          setLocalError("No se pudo enviar el archivo")
        }
      }
    },
    [onFileSelected, validateFile]
  )

  const handleInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      await handleCandidateFile(file)
      event.target.value = ""
    },
    [handleCandidateFile]
  )

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)

      if (isProcessing) return

      const file = event.dataTransfer.files?.[0]
      if (!file) return

      await handleCandidateFile(file)
    },
    [handleCandidateFile, isProcessing]
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isProcessing) {
      setIsDragging(true)
    }
  }, [isProcessing])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  return (
    <div className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleInputChange}
          disabled={isProcessing}
        />

        <div
          role="button"
          tabIndex={isProcessing ? -1 : 0}
          aria-disabled={isProcessing}
          onClick={() => {
            if (!isProcessing) inputRef.current?.click()
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if ((event.key === "Enter" || event.key === " ") && !isProcessing) {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          className={cn(
            "flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 py-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isDragging && !isProcessing
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20"
              : "border-muted-foreground/25 bg-muted/10 hover:bg-muted/20",
            isProcessing && "cursor-wait opacity-80"
          )}
        >
          {isProcessing ? (
            <>
              {/* Document icon with scan line + AI sparkle */}
              <div className="relative mb-3 flex items-center justify-center">
                <div className="relative">
                  <FileText className="size-10 text-muted-foreground/40" />
                  <div className="absolute inset-0 overflow-hidden rounded">
                    <div className="ocr-scan-line absolute inset-x-0 top-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                  </div>
                  <Sparkles className="ocr-ai-pulse absolute -right-1.5 -top-1.5 size-4 text-emerald-500" />
                </div>
              </div>

              {/* Rotating status message */}
              <p
                key={stepIdx}
                className="text-sm font-medium transition-opacity duration-300"
                style={{ animation: "ocr-fade-in 0.3s ease-out" }}
              >
                {OCR_STEPS[stepIdx]}
              </p>

              {/* Progress bar (perceived progress, CSS-driven) */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="ocr-progress-bar h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
              </div>

              {/* Step dots */}
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                {OCR_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                      i <= stepIdx ? "bg-emerald-500" : "bg-muted-foreground/20"
                    )}
                  />
                ))}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Paso {stepIdx + 1} de {OCR_STEPS.length} · Esto puede tardar unos segundos.
              </p>
            </>
          ) : (
            <>
              {isDragging ? (
                <FileUp className="mb-2 size-6 text-emerald-600" />
              ) : (
                <UploadCloud className="mb-2 size-6 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                 Arrastrá el archivo acá o hacé click para elegirlo
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {acceptedMimeTypesText} · Máximo {MAX_FILE_SIZE_MB} MB
              </p>
              {selectedFileName && (
                <p className="mt-3 text-xs text-foreground">
                  <span className="font-medium">{selectedFileName}</span>
                </p>
              )}
            </>
          )}
        </div>

        {displayError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Error de carga</AlertTitle>
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}
    </div>
  )
}
