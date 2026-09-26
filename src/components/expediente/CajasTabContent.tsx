"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { CheckCircle2, Loader2, Package } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api/client"
import { canPerformStockOperations } from "@/lib/permissions/stock-operations-policy"

type Assignment = {
  id: string
  unitId: string
  unitCode: string
  serialNumber: string | null
  boxDescription: string
  active: boolean
  preparation: { id: string; formulaVersionNumber: number; lines: Array<{ id: string; articleId: string; description: string | null; quantity: string; stockUnit: string }> } | null
  recentLogEntries: Array<{ id: string; eventKind: "PROBLEM_REPORTED" | "REPAIR_SENT" | "REPAIR_RETURNED"; articleId: string; articleDescription: string; note: string; occurredAt: string; actor?: string }>
}

type Candidate = {
  unitId: string
  unitCode: string
  serialNumber: string | null
  boxDescription: string
  formulaVersionNumber: number | null
  expectedLineCount: number
  availability: { available: boolean; code: string; reason: string }
}

type CajasReadModel = {
  surgery: { acceptsNewCajasAssignments: boolean; newCajasAssignmentReason: string }
  assignments: Assignment[]
  candidates: Candidate[]
}

export function CajasTabContent({ surgeryId }: { surgeryId: string }) {
  const { activeCompany, currentAccess, currentUserLoading, isLoading } = useAuth()
  const companyId = activeCompany?.id
  if (!companyId || !surgeryId) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Seleccioná una empresa y una cirugía persistida.</div>
  const rolePending = isLoading || currentUserLoading
  const canMutate = !rolePending && canPerformStockOperations(currentAccess?.role)
  const permissionReason = rolePending
    ? "Verificando permisos para operar Stock."
    : canMutate
      ? null
      : "Tu rol actual no permite asignar ni preparar Cajas. Se requiere rol admin u operator."
  return <CajasTabBody key={`${companyId}:${surgeryId}`} companyId={companyId} surgeryId={surgeryId} canMutate={canMutate} permissionReason={permissionReason} />
}

function CajasTabBody({ companyId, surgeryId, canMutate, permissionReason }: { companyId: string; surgeryId: string; canMutate: boolean; permissionReason: string | null }) {
  const contextKey = `${companyId}:${surgeryId}`
  const requestRef = useRef(0)
  const retryKeyRef = useRef<{ intent: string; key: string } | null>(null)
  const [data, setData] = useState<CajasReadModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigningUnitId, setAssigningUnitId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logAssignmentId, setLogAssignmentId] = useState("")
  const [logEventKind, setLogEventKind] = useState<"PROBLEM_REPORTED" | "REPAIR_SENT" | "REPAIR_RETURNED">("PROBLEM_REPORTED")
  const [logArticleId, setLogArticleId] = useState("")
  const [logNote, setLogNote] = useState("")
  const [savingLog, setSavingLog] = useState(false)

  useEffect(() => {
    let cancelled = false
    const requestId = ++requestRef.current
    apiFetch<CajasReadModel>(`/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/cajas`)
      .then((result) => {
        if (!cancelled && requestId === requestRef.current) setData(result)
      })
      .catch((cause: unknown) => {
        if (!cancelled && requestId === requestRef.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las cajas.")
      })
      .finally(() => {
        if (!cancelled && requestId === requestRef.current) setLoading(false)
      })
    return () => {
      cancelled = true
      requestRef.current += 1
    }
  }, [companyId, surgeryId])

  async function reload() {
    const requestId = ++requestRef.current
    setLoading(true)
    try {
      const result = await apiFetch<CajasReadModel>(`/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/cajas`)
      if (requestId === requestRef.current) setData(result)
    } catch (cause) {
      if (requestId === requestRef.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las cajas.")
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }

  async function assign(candidate: Candidate) {
    if (!canMutate || !data?.surgery.acceptsNewCajasAssignments || !candidate.availability.available) return
    const intent = `${contextKey}:${candidate.unitId}`
    const retry = retryKeyRef.current
    const idempotencyKey = retry?.intent === intent
      ? retry.key
      : globalThis.crypto?.randomUUID?.() ?? `${intent}:assignment-v1`
    retryKeyRef.current = { intent, key: idempotencyKey }
    const requestId = ++requestRef.current
    setAssigningUnitId(candidate.unitId)
    setError(null)
    setSuccess(null)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/cajas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: candidate.unitId, idempotencyKey }),
      })
      if (requestId !== requestRef.current) return
      retryKeyRef.current = null
      setSuccess(`${candidate.unitCode} quedó asignada y preparada.`)
      setAssigningUnitId(null)
      await reload()
    } catch (cause) {
      if (requestId !== requestRef.current) return
      setError(cause instanceof Error ? cause.message : "No se pudo asignar la caja.")
      setAssigningUnitId(null)
    }
  }

  async function appendLogEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const assignment = data?.assignments.find(({ id }) => id === logAssignmentId)
    if (!canMutate || !assignment || !logArticleId || !logNote.trim()) return
    const intent = `${contextKey}:${assignment.id}:${logEventKind}:${logArticleId}:${logNote.trim()}`
    const retry = retryKeyRef.current
    const idempotencyKey = retry?.intent === intent ? retry.key : globalThis.crypto?.randomUUID?.() ?? `${intent}:unit-log-v1`
    retryKeyRef.current = { intent, key: idempotencyKey }
    setSavingLog(true)
    setError(null)
    setSuccess(null)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/cajas/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.id,
          unitId: assignment.unitId,
          eventKind: logEventKind,
          articleId: logArticleId,
          note: logNote.trim(),
          idempotencyKey,
        }),
      })
      retryKeyRef.current = null
      setLogNote("")
      setSuccess("La excepción quedó registrada en la bitácora de la caja.")
      setSavingLog(false)
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la excepción.")
      setSavingLog(false)
      return
    }
  }

  if (loading) return <div className="flex items-center gap-2 rounded-lg border bg-white p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Cargando cajas disponibles…</div>
  if (error && !data) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>

  const mutationDisabledReason = permissionReason ?? (data?.surgery.acceptsNewCajasAssignments ? null : data?.surgery.newCajasAssignmentReason)
  const selectedLogAssignment = data?.assignments.find(({ id }) => id === logAssignmentId)
  const hasPreparationInstruments = Boolean(selectedLogAssignment?.preparation?.lines.length)
  const logKindLabel = { PROBLEM_REPORTED: "Problema reportado", REPAIR_SENT: "Enviado a reparación", REPAIR_RETURNED: "Regresó de reparación" } as const

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-4" /> {success}</div>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Package className="size-4" /> Cajas asignadas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.assignments.length ? data.assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-medium">{assignment.boxDescription}</p><p className="text-xs text-muted-foreground">{assignment.unitCode}{assignment.serialNumber ? ` · Serie ${assignment.serialNumber}` : ""}</p></div>
                <Badge variant={assignment.active ? "default" : "secondary"}>{assignment.active ? "Activa" : "Finalizada"}</Badge>
              </div>
              {assignment.preparation && <p className="mt-2 text-sm text-muted-foreground">Preparación v{assignment.preparation.formulaVersionNumber} · {assignment.preparation.lines.length} líneas esperadas</p>}
              {assignment.recentLogEntries?.length ? (
                <ul className="mt-3 space-y-2 border-t pt-3" aria-label={`Bitácora reciente de ${assignment.unitCode}`}>
                  {assignment.recentLogEntries.map((entry) => (
                    <li key={entry.id} className="text-xs leading-5 text-muted-foreground">
                      <span className="font-medium text-foreground">{logKindLabel[entry.eventKind]}</span>
                      {entry.articleDescription ? ` · ${entry.articleDescription}` : ""} — {entry.note}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )) : <p className="text-sm text-muted-foreground">Todavía no hay cajas asignadas a este expediente.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Registrar excepción</CardTitle></CardHeader>
        <CardContent>
          {data?.assignments.length ? (
            <form className="grid gap-3 md:grid-cols-2" onSubmit={appendLogEntry}>
              <div className="space-y-1.5">
                <Label htmlFor="cajas-log-assignment">Caja asignada</Label>
                <select id="cajas-log-assignment" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={logAssignmentId} onChange={(event) => { setLogAssignmentId(event.target.value); setLogArticleId("") }} disabled={!canMutate || savingLog} required>
                  <option value="">Seleccionar caja…</option>
                  {data.assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.unitCode} — {assignment.boxDescription}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cajas-log-kind">Tipo de excepción</Label>
                <select id="cajas-log-kind" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={logEventKind} onChange={(event) => setLogEventKind(event.target.value as typeof logEventKind)} disabled={!canMutate || savingLog}>
                  {Object.entries(logKindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="cajas-log-article">Instrumento de la preparación</Label>
                <select id="cajas-log-article" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={logArticleId} onChange={(event) => setLogArticleId(event.target.value)} disabled={!canMutate || savingLog || !hasPreparationInstruments} required>
                  <option value="">Seleccionar instrumento…</option>
                  {selectedLogAssignment?.preparation?.lines.map((line) => <option key={line.id} value={line.articleId}>{line.description ?? line.articleId}</option>)}
                </select>
                {selectedLogAssignment && !hasPreparationInstruments ? <p className="text-xs text-amber-800">La asignación no tiene instrumentos de preparación disponibles.</p> : null}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="cajas-log-note">Nota</Label>
                <Textarea id="cajas-log-note" value={logNote} onChange={(event) => setLogNote(event.target.value)} maxLength={4000} required disabled={!canMutate || savingLog} placeholder="Describí el problema o la reparación…" />
              </div>
              {permissionReason && <p className="text-sm text-amber-800 md:col-span-2">{permissionReason}</p>}
              <div className="md:col-span-2"><Button type="submit" size="sm" disabled={!canMutate || !hasPreparationInstruments || !logArticleId || !logNote.trim() || savingLog}>{savingLog && <Loader2 className="mr-2 size-4 animate-spin" />}Registrar excepción</Button></div>
            </form>
          ) : <p className="text-sm text-muted-foreground">Asigná una caja para registrar problemas o reparaciones.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Cajas identificadas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {mutationDisabledReason && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{mutationDisabledReason}</p>}
          {data?.candidates.length ? data.candidates.map((candidate) => (
            <div key={candidate.unitId} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{candidate.boxDescription}</p>
                <p className="text-xs text-muted-foreground">{candidate.unitCode}{candidate.serialNumber ? ` · Serie ${candidate.serialNumber}` : ""}{candidate.formulaVersionNumber ? ` · Fórmula v${candidate.formulaVersionNumber}` : ""}</p>
                <p className={candidate.availability.available ? "mt-1 text-xs text-emerald-700" : "mt-1 text-xs text-amber-700"}>{candidate.availability.reason}</p>
              </div>
              <Button size="sm" disabled={Boolean(mutationDisabledReason) || !candidate.availability.available || assigningUnitId !== null} onClick={() => assign(candidate)}>
                {assigningUnitId === candidate.unitId && <Loader2 className="mr-2 size-4 animate-spin" />}
                Asignar y preparar
              </Button>
            </div>
          )) : <p className="text-sm text-muted-foreground">No hay cajas físicas identificadas para mostrar.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
