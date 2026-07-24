"use client"

import type { ChangeEvent, DragEvent, KeyboardEvent } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { AlertCircle, FileUp, Loader2, UploadCloud } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
] as const

const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.bmp"
const MAX_FILE_SIZE_MB = 20
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export type AiUploadZoneProps = {
  isProcessing?: boolean
  error?: string | null
  onFileSelected: (file: File) => void | Promise<void>
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${bytes} B`
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

  const displayError = error || localError

  const acceptedMimeTypesText = useMemo(
    () => "PDF, JPG, JPEG, PNG, WebP o BMP",
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
    <div className="rounded-md border border-border/70 bg-background/80 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Cargar autorización</p>
          <p className="text-xs text-muted-foreground">
          Subí un documento de autorización para extraer datos con IA (OpenAI).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
        >
          Seleccionar archivo
        </Button>
      </div>

      <div className="mt-3 space-y-3">
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
          tabIndex={0}
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
            "flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
            isDragging && !isProcessing
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20"
              : "border-muted-foreground/25 bg-muted/10 hover:bg-muted/20",
            isProcessing && "cursor-wait opacity-80"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mb-2 size-6 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">Procesando con IA…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Esto puede tardar unos segundos.
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
                Arrastrá un archivo acá o hacé click para seleccionarlo
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {acceptedMimeTypesText} · Máximo {MAX_FILE_SIZE_MB} MB
              </p>
              {selectedFileName && (
                <p className="mt-3 text-xs text-foreground">
                  Último archivo seleccionado: <span className="font-medium">{selectedFileName}</span>
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          <span>Formatos soportados: {acceptedMimeTypesText}</span>
          <span>Tamaño máximo: {formatSize(MAX_FILE_SIZE_BYTES)}</span>
        </div>

        {displayError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Error de carga</AlertTitle>
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

      </div>
    </div>
  )
}
