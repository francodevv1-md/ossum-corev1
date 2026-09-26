"use client"

import { useEffect, useMemo, useState } from "react"

import { ApiClientError, apiFetch } from "@/lib/api/client"

export type FiscalEvidence = {
  document: {
    displayState: string
    state: string
    createdAt: string
    submittedAt: string | null
    authorizedAt: string | null
  }
  attempts: Array<{
    id: string
    attemptNumber: number
    displayState: string
    state: string
    errorCode: string | null
    evidence: unknown
    createdAt: string
    updatedAt: string
  }>
}

export function useFiscalEvidence(companyId: string, invoiceId: string) {
  const requestUrl = useMemo(
    () => `/api/companies/${encodeURIComponent(companyId)}/invoices/${encodeURIComponent(invoiceId)}/fiscal-evidence`,
    [companyId, invoiceId],
  )
  const [result, setResult] = useState<{
    requestUrl: string
    data: FiscalEvidence | null
    error: string | null
    noEvidence: boolean
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void apiFetch<FiscalEvidence>(requestUrl)
      .then((result) => {
        if (cancelled) return
        setResult({ requestUrl, data: result, error: null, noEvidence: false })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        if (cause instanceof ApiClientError && cause.code === "fiscal_evidence_not_found") {
          setResult({ requestUrl, data: null, error: null, noEvidence: true })
        } else {
          setResult({ requestUrl, data: null, error: cause instanceof Error ? cause.message : "No se pudo cargar la evidencia fiscal.", noEvidence: false })
        }
      })

    return () => { cancelled = true }
  }, [requestUrl])

  if (result?.requestUrl !== requestUrl) return { data: null, loading: true, error: null, noEvidence: false }
  return { ...result, loading: false }
}
