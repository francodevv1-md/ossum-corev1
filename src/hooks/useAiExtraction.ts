"use client"

import { useCallback, useState } from "react"

import { ApiClientError, apiFetch } from "@/lib/api/client"
import type { AutorizacionAIResponse } from "@/lib/validators/autorizacion-ai"

type UseAiExtractionOptions = {
  companyId: string
  mode?: "mock" | "vlm" | string
}

type UseAiExtractionResult = {
  extract: (file: File) => Promise<void>
  result: AutorizacionAIResponse | null
  error: string | null
  isProcessing: boolean
  reset: () => void
}

export function useAiExtraction({
  companyId,
  mode = "mock",
}: UseAiExtractionOptions): UseAiExtractionResult {
  const [result, setResult] = useState<AutorizacionAIResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setIsProcessing(false)
  }, [])

  const extract = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      setError(null)
      setResult(null)

      try {
        const formData = new FormData()
        formData.append("file", file)

        if (mode) {
          formData.append("mode", mode)
        }

        const response = await apiFetch<AutorizacionAIResponse>(
          `/api/companies/${companyId}/surgeries/ai-extract`,
          {
            method: "POST",
            body: formData,
          }
        )

        setResult(response)
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message)
        } else if (caughtError instanceof Error) {
          setError(caughtError.message)
        } else {
          setError("No se pudo procesar la autorización")
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [companyId, mode]
  )

  return {
    extract,
    result,
    error,
    isProcessing,
    reset,
  }
}
