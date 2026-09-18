"use client"

import React, { useMemo, useState } from "react"
import type { Surgery, SurgeryNote, NoteType, NotePriority } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  StickyNote,
  Plus,
  AlertCircle,
  Clock,
  User,
  Lock,
  Filter,
  MessageSquare,
  ClipboardList,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────
interface NotasPanelProps {
  surgery: Surgery
  notes: SurgeryNote[]
  onAddNote: () => void
}

// ─── Constants ────────────────────────────────────────────────────

const TYPE_BADGE_STYLES: Record<NoteType, string> = {
  General: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  Urgente: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  "Logística": "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  "Facturación": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Interna: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  preparacion_pedido: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
}

const TYPE_ICONS: Record<NoteType, React.ReactNode> = {
  General: <MessageSquare className="size-3" />,
  Urgente: <AlertCircle className="size-3" />,
  "Logística": <StickyNote className="size-3" />,
  "Facturación": <StickyNote className="size-3" />,
  Interna: <Lock className="size-3" />,
  preparacion_pedido: <ClipboardList className="size-3" />,
}

const PRIORITY_BADGE_STYLES: Record<NotePriority, string> = {
  Baja: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  Media: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Alta: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
}

const ALL_TYPES: NoteType[] = ["General", "Urgente", "Logística", "Facturación", "Interna", "preparacion_pedido"]
const ALL_PRIORITIES: NotePriority[] = ["Baja", "Media", "Alta"]

// ─── Sub-components ───────────────────────────────────────────────

function EmptyState({ onAddNote }: { onAddNote: () => void }) {
  return (
    <Card className="rounded-xl border border-dashed border-slate-300 shadow-none">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="rounded-full bg-muted p-4">
          <StickyNote className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Sin notas registradas</p>
          <p className="text-xs text-muted-foreground">
            No hay notas para esta cirugía. Hacé clic en &quot;Agregar nota&quot; para registrar
            observaciones, seguimientos o información relevante.
          </p>
        </div>
        <Button onClick={onAddNote} size="sm" className="mt-2">
          <Plus className="size-4" />
          Agregar nota
        </Button>
      </CardContent>
    </Card>
  )
}

function NoteCard({ note }: { note: SurgeryNote }) {
  const typeStyle = TYPE_BADGE_STYLES[note.type]
  const priorityStyle = PRIORITY_BADGE_STYLES[note.priority]
  const typeIcon = TYPE_ICONS[note.type]

  return (
    <Card className="rounded-xl border-slate-200 py-0 transition-colors hover:bg-muted/30">
      <CardContent className="space-y-2 px-3.5 py-3">
        {/* ── Top row: badges + internal indicator ── */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Type badge */}
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 gap-0.5 font-medium border", typeStyle)}
          >
            {typeIcon}
            {note.type}
          </Badge>

          {/* Priority badge */}
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 font-medium border", priorityStyle)}
          >
            {note.priority}
          </Badge>

          {/* Internal indicator */}
          {note.isInternal && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 gap-0.5 font-medium bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
            >
              <Lock className="size-2.5" />
              Interna
            </Badge>
          )}
        </div>

        {/* ── Note text ── */}
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {note.text}
        </p>

        {/* ── Author + date/time ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="size-3" />
            <span>{note.userName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>{formatDateTime(note.date, note.time)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterBar({
  filterType,
  setFilterType,
  filterPriority,
  setFilterPriority,
  totalNotes,
  filteredCount,
}: {
  filterType: NoteType | "Todas"
  setFilterType: (v: NoteType | "Todas") => void
  filterPriority: NotePriority | "Todas"
  setFilterPriority: (v: NotePriority | "Todas") => void
  totalNotes: number
  filteredCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Filter className="size-3.5" />
        <span className="font-medium">Filtros</span>
      </div>

      {/* Type filter */}
      <Select
        value={filterType}
        onValueChange={(v) => setFilterType(v as NoteType | "Todas")}
      >
        <SelectTrigger size="sm" className="h-7 text-xs w-[130px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todos los tipos</SelectItem>
          {ALL_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={filterPriority}
        onValueChange={(v) => setFilterPriority(v as NotePriority | "Todas")}
      >
        <SelectTrigger size="sm" className="h-7 text-xs w-[130px]">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todas las prioridades</SelectItem>
          {ALL_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Count indicator */}
      {filteredCount !== totalNotes && (
        <span className="text-[10px] text-muted-foreground">
          {filteredCount} de {totalNotes} notas
        </span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function NotasPanel({ surgery, notes, onAddNote }: NotasPanelProps) {
  const [filterType, setFilterType] = useState<NoteType | "Todas">("Todas")
  const [filterPriority, setFilterPriority] = useState<NotePriority | "Todas">("Todas")

  // Sort notes newest first
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || "00:00"}`).getTime()
      const dateB = new Date(`${b.date}T${b.time || "00:00"}`).getTime()
      return dateB - dateA
    })
  }, [notes])

  // Apply filters
  const filteredNotes = useMemo(() => {
    return sortedNotes.filter((note) => {
      if (filterType !== "Todas" && note.type !== filterType) return false
      if (filterPriority !== "Todas" && note.priority !== filterPriority) return false
      return true
    })
  }, [sortedNotes, filterType, filterPriority])

  // ── Empty state ──
  if (notes.length === 0) {
    return <EmptyState onAddNote={onAddNote} />
  }

  // ── Urgent notes count for header indicator ──
  const urgentCount = notes.filter(
    (n) => n.type === "Urgente" || n.priority === "Alta"
  ).length

  return (
    <div className="space-y-3.5">
      {/* ── Header row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <StickyNote className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notas</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {notes.length}
              </Badge>
              {urgentCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 gap-0.5 font-medium bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                >
                  <AlertCircle className="size-2.5" />
                  {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Expediente {surgery.expedienteNumber ?? surgery.id}
            </p>
          </div>
        </div>

        <Button onClick={onAddNote} size="sm">
          <Plus className="size-4" />
          Agregar nota
        </Button>
      </div>

      {/* ── Filters ── */}
      <FilterBar
        filterType={filterType}
        setFilterType={setFilterType}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        totalNotes={notes.length}
        filteredCount={filteredNotes.length}
      />

      {/* ── Notes list ── */}
      <div className="space-y-2">
          {filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10 gap-2">
                <Filter className="size-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center">
                  No hay notas que coincidan con los filtros seleccionados.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotes.filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))
          )}
        </div>
    </div>
  )
}
