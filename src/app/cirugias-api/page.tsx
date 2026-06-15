"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, RefreshCcw, Server } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import {
  mapApiSurgeryListToRows,
  type RawSurgeryApiRecord,
  type SurgeryApiRow,
} from "@/lib/api/surgery-adapter"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatDate(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date)
}

function formatDateTime(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function displayValue(value: string | null) {
  return value ?? "—"
}

export default function CirugiasApiPage() {
  const { activeCompany, currentUserLoading } = useAuth()
  const [rows, setRows] = useState<SurgeryApiRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSurgeries = useCallback(() => {
    if (!activeCompany?.id) return

    setLoading(true)
    setError(null)

    apiFetch<RawSurgeryApiRecord[]>(
      `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries`
    )
      .then((data) => {
        setRows(mapApiSurgeryListToRows(data))
        setLoading(false)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Error loading surgeries"
        setError(message)
        setLoading(false)
      })
  }, [activeCompany?.id])

  useEffect(() => {
    if (!activeCompany?.id) return
    fetchSurgeries()
  }, [activeCompany?.id, fetchSurgeries])

  const hasCompany = Boolean(activeCompany?.id)

  const countLabel = useMemo(() => {
    if (!rows?.length) return "0 registros"
    return `${rows.length} registro${rows.length === 1 ? "" : "s"}`
  }, [rows])

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b bg-card/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Server className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cirugías API</h1>
            <p className="text-xs text-muted-foreground">
              Validación técnica de lectura backend paralela al módulo principal.
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-b bg-card/50 px-6 py-3">
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Vista técnica read-only</AlertTitle>
          <AlertDescription>
            Vista técnica read-only desde backend. No reemplaza todavía el módulo principal de Cirugías.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">{countLabel}</Badge>
          {activeCompany?.name ? (
            <Badge variant="outline">Empresa: {activeCompany.name}</Badge>
          ) : null}
          {loading ? <span className="text-xs text-muted-foreground">Cargando…</span> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={fetchSurgeries}
            disabled={!hasCompany || loading}
          >
            <RefreshCcw className="mr-2 size-3.5" />
            Recargar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {!hasCompany && !currentUserLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No hay empresa activa disponible para consultar cirugías.
          </div>
        ) : error ? (
          <div className="flex h-32 flex-col items-center justify-center gap-3 text-sm text-destructive">
            <span>Error al cargar cirugías desde API: {error}</span>
            <Button type="button" variant="outline" size="sm" onClick={fetchSurgeries}>
              Reintentar
            </Button>
          </div>
        ) : loading && !rows ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Cargando cirugías desde backend…
          </div>
        ) : !rows?.length ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No hay cirugías disponibles en el backend para esta empresa.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28 text-[11px]">Fecha</TableHead>
                <TableHead className="text-[11px]">Paciente</TableHead>
                <TableHead className="text-[11px]">Médico</TableHead>
                <TableHead className="text-[11px]">Institución</TableHead>
                <TableHead className="text-[11px]">Cliente</TableHead>
                <TableHead className="text-[11px]">Pagador</TableHead>
                <TableHead className="text-[11px]">Estado CX</TableHead>
                <TableHead className="text-[11px]">Prep.</TableHead>
                <TableHead className="text-[11px]">Exp. / Autorización</TableHead>
                <TableHead className="text-[11px]">ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs font-medium">
                    <div>{formatDate(row.surgeryDate)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      upd. {formatDateTime(row.updatedAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{displayValue(row.patientName)}</TableCell>
                  <TableCell className="text-xs">{displayValue(row.doctorName)}</TableCell>
                  <TableCell className="text-xs">{displayValue(row.institutionName)}</TableCell>
                  <TableCell className="text-xs">{displayValue(row.clientName)}</TableCell>
                  <TableCell className="text-xs">{displayValue(row.payerName)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {displayValue(row.cxStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {displayValue(row.prepStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>EXP {displayValue(row.expedienteNumber)}</div>
                    <div>AUT {displayValue(row.authorizationNumber)}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {row.id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
