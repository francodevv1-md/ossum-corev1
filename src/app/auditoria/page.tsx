"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ─── Types ─────────────────────────────────────────────────────────────

type AuditEvent = {
  id: string
  module: string
  action: string
  entityType: string
  entityId: string
  userId: string
  detail?: string | null
  createdAt: string
}

// ─── Helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function truncate(value: string, max = 8) {
  return value.length > max ? value.slice(0, max) + "…" : value
}

const MODULE_COLORS: Record<string, string> = {
  cirugias: "bg-blue-100 text-blue-800 border-blue-200",
  auth: "bg-emerald-100 text-emerald-800 border-emerald-200",
  contacts: "bg-amber-100 text-amber-800 border-amber-200",
  seed: "bg-violet-100 text-violet-800 border-violet-200",
}

function moduleColor(module: string) {
  return MODULE_COLORS[module] ?? "bg-gray-100 text-gray-700 border-gray-200"
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const { activeCompany } = useAuth()
  const [events, setEvents] = useState<AuditEvent[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moduleFilter, setModuleFilter] = useState<string>("all")

  useEffect(() => {
    if (!activeCompany?.id) return

    let cancelled = false
    setLoading(true)
    setError(null)

    apiFetch<AuditEvent[]>(
      `/api/companies/${encodeURIComponent(activeCompany.id)}/audit-events?take=50`
    )
      .then((data) => {
        if (cancelled) return
        setEvents(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Error loading audit events")
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeCompany?.id])

  const modules = useMemo(() => {
    if (!events) return []
    const set = new Set(events.map((e) => e.module))
    return Array.from(set).sort()
  }, [events])

  const filteredEvents = useMemo(() => {
    if (!events) return []
    if (moduleFilter === "all") return events
    return events.filter((e) => e.module === moduleFilter)
  }, [events, moduleFilter])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b bg-card/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Auditoría</h1>
            <p className="text-xs text-muted-foreground">
              Registro de eventos del sistema
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-b bg-card/50 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue placeholder="Todos los módulos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los módulos</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading && (
            <span className="text-xs text-muted-foreground">Cargando…</span>
          )}
          {filteredEvents.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="flex items-center justify-center h-32 text-sm text-destructive px-6">
            Error al cargar eventos de auditoría: {error}
          </div>
        ) : loading && !events ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Cargando eventos de auditoría…
          </div>
        ) : !filteredEvents.length ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No hay eventos de auditoría registrados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-36">Fecha / Hora</TableHead>
                <TableHead className="text-[11px]">Módulo</TableHead>
                <TableHead className="text-[11px]">Acción</TableHead>
                <TableHead className="text-[11px]">Entidad</TableHead>
                <TableHead className="text-[11px]">ID</TableHead>
                <TableHead className="text-[11px]">Usuario</TableHead>
                <TableHead className="text-[11px]">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-xs whitespace-nowrap font-mono">
                    {formatDate(event.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={moduleColor(event.module)}>
                      {event.module}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{event.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {event.entityType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {truncate(event.entityId)}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {truncate(event.userId)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {event.detail || "—"}
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
