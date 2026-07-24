"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSeguimientoFeed } from "@/hooks/useSeguimientoFeed"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"
import { AlertCircle, Loader2, Mail, MessageSquare, Paperclip, Pin, ShieldCheck } from "lucide-react"
import type { Surgery } from "@/types"

interface CoordinatorCaseTrackingPreviewProps {
  surgery: Surgery
  onOpenFullTracking: () => void
  onOpenEvidence: () => void
  onOpenMail: () => void
}

function getEntryTone(entryType: string) {
  switch (entryType) {
    case "mail_evidence":
      return {
        label: "Correo",
        icon: Mail,
        className: "bg-violet-50 text-violet-700 border-violet-200",
      }
    case "file_photo_evidence":
      return {
        label: "Adjunto",
        icon: Paperclip,
        className: "bg-sky-50 text-sky-700 border-sky-200",
      }
    case "authorization_evidence":
      return {
        label: "Autorización",
        icon: ShieldCheck,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      }
    default:
      return {
        label: "Nota",
        icon: MessageSquare,
        className: "bg-slate-100 text-slate-700 border-slate-200",
      }
  }
}

export function CoordinatorCaseTrackingPreview({ surgery, onOpenFullTracking, onOpenEvidence, onOpenMail }: CoordinatorCaseTrackingPreviewProps) {
  const { entries, highlightedEntries, loading, error } = useSeguimientoFeed(surgery.id)

  const summary = useMemo(() => {
    const photoEntries = entries.filter((entry) => entry.entryType === "file_photo_evidence")
    const mailEntries = entries.filter((entry) => entry.entryType === "mail_evidence")
    const authorizationEntries = entries.filter((entry) => entry.entryType === "authorization_evidence")

    return {
      photoCount: photoEntries.reduce((total, entry) => total + (entry.photoMeta?.fileCount ?? 0), 0),
      photoEntriesCount: photoEntries.length,
      mailCount: mailEntries.length,
      authorizationCount: authorizationEntries.length,
      recentEntries: entries.slice(0, 3),
    }
  }, [entries])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
        <Loader2 className="size-4 animate-spin" />
        Cargando seguimiento…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">No se pudo cargar el seguimiento</p>
            <p className="mt-0.5 text-xs text-red-700/80">{error}</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3 h-8 text-[11px]" onClick={onOpenFullTracking}>
          Abrir seguimiento completo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-600">
        <Badge variant="outline" className="h-6 rounded-full bg-white px-2 text-[10px] text-slate-700">
          <MessageSquare className="mr-1 size-3" />
          {entries.length} movimientos
        </Badge>
        <Badge variant="outline" className="h-6 rounded-full bg-white px-2 text-[10px] text-slate-700">
          <Pin className="mr-1 size-3" />
          {highlightedEntries.length} fijados
        </Badge>
        <Badge variant="outline" className="h-6 rounded-full bg-white px-2 text-[10px] text-slate-700">
          <Paperclip className="mr-1 size-3" />
          {summary.photoCount} adjuntos
        </Badge>
        <Badge variant="outline" className="h-6 rounded-full bg-white px-2 text-[10px] text-slate-700">
          <Mail className="mr-1 size-3" />
          {summary.mailCount} correos
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Adjuntos visuales</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{summary.photoEntriesCount} entradas · {summary.photoCount} archivo{summary.photoCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Correo vinculado</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{summary.mailCount > 0 ? `${summary.mailCount} evidencia${summary.mailCount === 1 ? "" : "s"}` : "Sin correo importado"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Autorizaciones</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{summary.authorizationCount > 0 ? `${summary.authorizationCount} registradas` : "Sin registro aún"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Actividad reciente</p>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onOpenFullTracking}>
            Abrir feed completo
          </Button>
        </div>

        {summary.recentEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-xs text-slate-500">
            Todavía no hay seguimiento cargado. Abrí el feed para sumar nota, evidencia visual o importar correo.
          </div>
        ) : (
          <div className="space-y-2">
            {summary.recentEntries.map((entry) => {
              const tone = getEntryTone(entry.entryType)
              const Icon = tone.icon
              return (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", tone.className)}>
                          <Icon className="size-3" />
                          {tone.label}
                        </span>
                        {entry.isHighlighted ? <Badge className="h-5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">Fijado</Badge> : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-slate-700">{entry.summary || entry.content}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{entry.createdAt ? formatDate(entry.createdAt) : ""}</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">{entry.authorName}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" onClick={onOpenEvidence} variant="outline" className="gap-2 justify-start bg-white">
          <Paperclip className="size-4" />
          Ver evidencias
        </Button>
        <Button type="button" variant="outline" onClick={onOpenMail} className="gap-2 justify-start bg-white">
          <Mail className="size-4" />
          Correo / importar
        </Button>
        <Button type="button" onClick={onOpenFullTracking} className="gap-2 bg-sky-700 hover:bg-sky-800">
          <MessageSquare className="size-4" />
          Seguimiento completo
        </Button>
      </div>
    </div>
  )
}
