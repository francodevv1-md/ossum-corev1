"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ApiClientError, apiFetch } from "@/lib/api/client"

export type FiscalEvidence = {
  document: {
    id?: string
    environment?: string
    displayState: string
    state: string
    createdAt: string
    submittedAt: string | null
    authorizedAt: string | null
    externalReference?: string
    snapshotHash?: string
    lastErrorCode?: string | null
    lastErrorMessage?: string | null
  }
  attempts: Array<{
    id: string
    attemptNumber: number
    displayState: string
    state: string
    errorCode: string | null
    errorMessage?: string | null
    evidence: unknown
    createdAt: string
    updatedAt: string
  }>
}

export type FiscalActionPhase =
  | "idle"
  | "validating"
  | "checking_existing"
  | "submitting"
  | "waiting_provider"
  | "reconciliation_required"
  | "success"
  | "failure"

function actionErrorMessage(cause: unknown) {
  if (cause instanceof ApiClientError) {
    if (cause.code === "fiscal_issuance_in_progress") {
      return "Existe una emisión previa sin confirmación o en curso. Reconciliá el estado para verificar si ARCA otorgó CAE."
    }
    if (cause.code === "fiscal_snapshot_mismatch") {
      return "La factura fue modificada luego del registro fiscal. Revisá sus datos antes de continuar."
    }
    if (cause.code === "fiscal_already_authorized") {
      return "La factura ya cuenta con autorización fiscal y CAE registrado."
    }
    if (cause.code === "invoice_cancelled") {
      return "No se puede emitir fiscalmente una factura anulada."
    }
    if (cause.code === "fiscal_dev_config_missing") {
      return "La configuración DEV de TusFacturas no está disponible en este entorno."
    }
    if (cause.code === "fiscal_document_not_found") {
      return "No hay un documento fiscal previo para reconciliar."
    }
    if (cause.message) {
      return cause.message
    }
  }
  if (cause instanceof Error && cause.message) {
    return cause.message
  }
  return "No se pudo completar la operación fiscal DEV. Revisá los datos e intentá reconciliar si hubo una respuesta incierta."
}

function resultPhase(data: FiscalEvidence): FiscalActionPhase {
  if (data.document.displayState === "AUTHORIZED" || data.document.displayState === "SIMULATED") return "success"
  if (data.document.state === "REJECTED") return "failure"
  return "reconciliation_required"
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
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionPhase, setActionPhase] = useState<FiscalActionPhase>("idle")
  const actionInFlight = useRef(false)

  const fetchEvidence = useCallback(async () => {
    try {
      const data = await apiFetch<FiscalEvidence>(requestUrl)
      setResult({ requestUrl, data, error: null, noEvidence: false })
      setActionError(null)
      return data
    } catch (cause: unknown) {
      if (cause instanceof ApiClientError && cause.code === "fiscal_evidence_not_found") {
        setResult({ requestUrl, data: null, error: null, noEvidence: true })
      } else {
        setResult({
          requestUrl,
          data: null,
          error: cause instanceof Error ? cause.message : "No se pudo cargar la evidencia fiscal.",
          noEvidence: false,
        })
      }
      return null
    }
  }, [requestUrl])

  useEffect(() => {
    let cancelled = false
    void apiFetch<FiscalEvidence>(requestUrl)
      .then((data) => {
        if (!cancelled) {
          setResult({ requestUrl, data, error: null, noEvidence: false })
          setActionError(null)
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        if (cause instanceof ApiClientError && cause.code === "fiscal_evidence_not_found") {
          setResult({ requestUrl, data: null, error: null, noEvidence: true })
        } else {
          setResult({
            requestUrl,
            data: null,
            error: cause instanceof Error ? cause.message : "No se pudo cargar la evidencia fiscal.",
            noEvidence: false,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [requestUrl])

  const issueDev = useCallback(async () => {
    if (actionInFlight.current) return null
    actionInFlight.current = true
    setSubmitting(true)
    setActionError(null)
    setActionPhase("validating")
    try {
      setActionPhase("checking_existing")
      setActionPhase("submitting")
      const issueUrl = `/api/companies/${encodeURIComponent(companyId)}/invoices/${encodeURIComponent(invoiceId)}/fiscal-issue`
      const data = await apiFetch<FiscalEvidence>(issueUrl, { method: "POST" })
      setResult({ requestUrl, data, error: null, noEvidence: false })
      setActionPhase(resultPhase(data))
      return data
    } catch (cause: unknown) {
      setActionError(actionErrorMessage(cause))
      setActionPhase(
        cause instanceof ApiClientError && cause.code === "fiscal_issuance_in_progress"
          ? "reconciliation_required"
          : "failure",
      )
      throw cause
    } finally {
      setSubmitting(false)
      actionInFlight.current = false
    }
  }, [companyId, invoiceId, requestUrl])

  const reconcileDev = useCallback(async () => {
    if (actionInFlight.current) return null
    actionInFlight.current = true
    setSubmitting(true)
    setActionError(null)
    setActionPhase("checking_existing")
    try {
      setActionPhase("submitting")
      const reconcileUrl = `/api/companies/${encodeURIComponent(companyId)}/invoices/${encodeURIComponent(invoiceId)}/fiscal-reconcile`
      const data = await apiFetch<FiscalEvidence>(reconcileUrl, { method: "POST" })
      setResult({ requestUrl, data, error: null, noEvidence: false })
      setActionPhase(resultPhase(data))
      return data
    } catch (cause: unknown) {
      setActionError(actionErrorMessage(cause))
      setActionPhase("reconciliation_required")
      throw cause
    } finally {
      setSubmitting(false)
      actionInFlight.current = false
    }
  }, [companyId, invoiceId, requestUrl])

  const loading = result?.requestUrl !== requestUrl

  return {
    data: loading ? null : result?.data ?? null,
    loading,
    submitting,
    actionPhase,
    error: actionError || (loading ? null : result?.error ?? null),
    noEvidence: loading ? false : result?.noEvidence ?? false,
    refetch: fetchEvidence,
    issueDev,
    reconcileDev,
  }
}
