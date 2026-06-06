"use client"

import React, { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Pencil, Check, X, FileText } from "lucide-react"

/**
 * CHATZAI-017M: Leyenda del presupuesto — preview/edit section
 *
 * Shows the leyenda text that will accompany the presupuesto,
 * sourced from the surgery's `leyenda` field (entered in Step 0).
 *
 * Features:
 * - Read mode: displays leyenda text or "Sin leyenda cargada" empty state
 * - Edit mode: inline Textarea for quick edits
 * - "Destacada" badge shown when leyendaDestacada is true
 * - Functional intent: this text will appear in the PR PDF (pending future implementation)
 */

interface LeyendaPresupuestoSectionProps {
  /** Current leyenda text from the surgery form */
  leyenda: string
  /** Whether the leyenda is marked as "destacada" */
  leyendaDestacada: boolean
  /** Callback to update the leyenda text */
  onLeyendaChange: (value: string) => void
  /** Callback to update the destacada flag */
  onLeyendaDestacadaChange: (value: boolean) => void
  /** CHATZAI-025A.4: Compact mode — inline single-line display with truncated text, minimal chrome */
  compact?: boolean
}

export function LeyendaPresupuestoSection({
  leyenda,
  leyendaDestacada,
  onLeyendaChange,
  onLeyendaDestacadaChange,
  compact = false,
}: LeyendaPresupuestoSectionProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(leyenda)

  const startEditing = () => {
    setDraft(leyenda)
    setEditing(true)
  }

  const confirmEdit = () => {
    onLeyendaChange(draft)
    setEditing(false)
  }

  const cancelEdit = () => {
    setDraft(leyenda)
    setEditing(false)
  }

  // ─── CHATZAI-025A.4: Compact edit mode ───
  if (editing && compact) {
    return (
      <div data-testid="leyenda-presupuesto-edit">
        <div className="flex items-center gap-1.5 mb-1">
          <FileText className="size-3 text-muted-foreground shrink-0" />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Leyenda
          </p>
          {leyendaDestacada && (
            <Badge variant="warning" className="h-3.5 text-[8px] px-1 font-semibold leading-none">
              DESTACADA
            </Badge>
          )}
          <div className="flex items-center gap-0.5 ml-auto">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={confirmEdit}
              data-testid="leyenda-confirm-btn"
              title="Confirmar"
            >
              <Check className="size-3 text-emerald-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={cancelEdit}
              data-testid="leyenda-cancel-btn"
              title="Cancelar"
            >
              <X className="size-3 text-destructive" />
            </Button>
          </div>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Observaciones / leyenda del presupuesto..."
          rows={2}
          className="text-[11px] h-auto resize-none min-h-0"
          autoFocus
          data-testid="leyenda-edit-textarea"
        />
      </div>
    )
  }

  // ─── Standard edit mode ───
  if (editing) {
    return (
      <div className="space-y-1.5" data-testid="leyenda-presupuesto-edit">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Leyenda del presupuesto
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={confirmEdit}
              data-testid="leyenda-confirm-btn"
              title="Confirmar"
            >
              <Check className="size-3 text-emerald-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={cancelEdit}
              data-testid="leyenda-cancel-btn"
              title="Cancelar"
            >
              <X className="size-3 text-destructive" />
            </Button>
          </div>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Observaciones / leyenda del presupuesto..."
          rows={2}
          className="text-xs h-auto resize-none"
          autoFocus
          data-testid="leyenda-edit-textarea"
        />
        <p className="text-[9px] text-muted-foreground italic">
          Este texto acompañará al presupuesto en su salida documental.
        </p>
      </div>
    )
  }

  // ─── Read mode ───
  const hasContent = leyenda.trim().length > 0

  // CHATZAI-025A.4: Compact read mode — single-line inline, truncated, minimal chrome
  if (compact) {
    return (
      <div data-testid="leyenda-presupuesto-section">
        <div className="flex items-center gap-1.5">
          <FileText className="size-3 text-muted-foreground shrink-0" />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
            Leyenda
          </p>
          {leyendaDestacada && (
            <Badge variant="warning" className="h-3.5 text-[8px] px-1 font-semibold leading-none shrink-0">
              DESTACADA
            </Badge>
          )}
          {hasContent ? (
            <span
              className={cn(
                "text-[11px] leading-tight truncate",
                leyendaDestacada
                  ? "text-amber-800 dark:text-amber-300 font-medium"
                  : "text-muted-foreground"
              )}
              data-testid="leyenda-text"
              title={leyenda}
            >
              {leyenda}
            </span>
          ) : (
            <span
              className="text-[11px] text-muted-foreground/50 italic"
              data-testid="leyenda-empty"
            >
              Sin leyenda
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-5 text-[9px] gap-0.5 px-1 hover:text-emerald-700 shrink-0"
            onClick={startEditing}
            data-testid="leyenda-edit-btn"
            title="Editar leyenda"
          >
            <Pencil className="size-2.5" />
            Editar
          </Button>
        </div>
      </div>
    )
  }

  // ─── Standard read mode (non-compact) ───
  return (
    <div data-testid="leyenda-presupuesto-section">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <FileText className="size-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Leyenda del presupuesto
          </p>
          {leyendaDestacada && (
            <Badge
              variant="warning"
              className="h-3.5 text-[8px] px-1 font-semibold leading-none"
            >
              DESTACADA
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 text-[9px] gap-0.5 px-1.5 hover:text-emerald-700"
          onClick={startEditing}
          data-testid="leyenda-edit-btn"
          title="Editar leyenda"
        >
          <Pencil className="size-2.5" />
          Editar
        </Button>
      </div>

      {hasContent ? (
        <div
          className={cn(
            "rounded-sm px-2.5 py-1.5 text-xs leading-relaxed",
            leyendaDestacada
              ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-muted/30 text-muted-foreground border border-transparent"
          )}
          data-testid="leyenda-text"
        >
          {leyenda}
        </div>
      ) : (
        <div
          className="rounded-sm px-2.5 py-1.5 text-xs text-muted-foreground/50 italic border border-dashed border-muted-foreground/20"
          data-testid="leyenda-empty"
        >
          Sin leyenda cargada
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/60 italic mt-0.5">
        {hasContent
          ? "Texto que acompañará al presupuesto en su salida documental."
          : "Agregue una leyenda para que acompañe al presupuesto."}
      </p>
    </div>
  )
}
