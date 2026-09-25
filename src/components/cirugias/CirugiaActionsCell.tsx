"use client"
import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Eye, Receipt, Truck, Activity, MoreHorizontal,
  StickyNote, ArrowUpDown, CalendarDays, Ban, XCircle, RotateCcw, Trash2, PlayCircle, Loader2, CheckCircle2,
} from "lucide-react"
import {
  canRemitirNR,
  canCargarConsumo,
} from "@/lib/businessRules"
import type { Surgery, SurgeryState } from "@/types"
import type { CSSProperties } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface CirugiaActionsCellProps {
  surgery: Surgery
  prId: string | undefined
  docStatus: string
  consumoState: string | null
  onOpenExpediente: (id: string) => void
  onOpenPresupuestoDialog: (surgery: Surgery) => void
  onSetExpTab: (tab: string) => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetNewState: (s: SurgeryState) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onRecover: (s: Surgery) => void
  canFacturar: (s: Surgery) => { allowed: boolean; reason?: string }
  tdClassName?: string
  tdStyle?: CSSProperties
  asCell?: boolean
}

// ═══════════════════════════════════════════════════════════════
// Business rule helpers for primary action determination
// ═══════════════════════════════════════════════════════════════

type PrimaryAction = "autorizar" | "crear_pr" | "despacho" | "cargar" | "facturar" | "ver" | "reanudar" | "expediente"

/**
 * Determine the most relevant next step based on the surgery's current state.
 */
function determinePrimaryAction(
  surgery: Surgery,
  prId: string | undefined,
  canFacturarResult: { allowed: boolean; reason?: string },
): PrimaryAction {
  // 1. Sin autorizar
  if (surgery.state === "Sin autorizar" || !surgery.autorizado) {
    return "autorizar"
  }

  // 2. Suspendida / Cancelada
  if (surgery.state === "Suspendida") {
    return "reanudar"
  }
  if (surgery.state === "Cancelada") {
    return "expediente"
  }

  // 3. En tránsito -> Despacho
  if (surgery.state === "En tránsito") {
    return "despacho"
  }

  // 4. Sin consumo -> Cargar
  if (surgery.state === "Sin consumo") {
    return "cargar"
  }

  // 5. Realizada / Finalizada -> Ver
  if (surgery.state === "Realizada" || surgery.state === "Finalizada") {
    return "ver"
  }

  // 6. Pendiente / Sin PR -> Crear PR
  if (surgery.state === "Pendiente" || (!prId && !surgery.prNumber && !surgery.presupuestoId)) {
    return "crear_pr"
  }

  // 7. Puede remitir -> Despacho
  if (canRemitirNR(surgery).allowed) {
    return "despacho"
  }

  // 8. Puede cargar consumo -> Cargar
  if (canCargarConsumo(surgery).allowed) {
    return "cargar"
  }

  // 9. Puede facturar -> Facturar
  if (canFacturarResult.allowed) {
    return "facturar"
  }

  // 10. Default: Ver
  return "ver"
}

// ═══════════════════════════════════════════════════════════════
// Dropdown action with optional disabled state + tooltip
// ═══════════════════════════════════════════════════════════════

interface ActionMenuItemProps {
  icon: React.ElementType
  label: string
  disabled?: boolean
  reason?: string
  onClick?: () => void
  variant?: "default" | "destructive"
}

function ActionMenuItem({ icon: Icon, label, disabled, reason, onClick, variant }: ActionMenuItemProps) {
  if (disabled && reason) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block">
              <DropdownMenuItem
                disabled
                variant={variant}
                className="opacity-60"
                onSelect={(e) => e.preventDefault()}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                <span className="ml-auto text-[9px] text-muted-foreground dark:text-slate-500">No disponible</span>
              </DropdownMenuItem>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[280px] border-slate-200/80 bg-white/95 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100">
            <p className="text-xs font-medium">{label} — No disponible</p>
            <p className="mt-1 text-[10px] text-muted-foreground dark:text-slate-400">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <DropdownMenuItem variant={variant} onClick={onClick} disabled={disabled}>
      <Icon className="size-4" />
      <span>{label}</span>
    </DropdownMenuItem>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function CirugiaActionsCell({
  surgery, prId, docStatus, consumoState,
  onOpenExpediente, onOpenPresupuestoDialog,
  onSetExpTab, onSetDialogSurgery,
  onSetNewState, onSetChangeStateDialogOpen, onSetChangeDateDialogOpen,
  onSetSuspendDialogOpen, onSetCancelDialogOpen, onSetNoteDialogOpen,
  onSetFacturarDialogOpen, onRecover, canFacturar,
  tdClassName, tdStyle, asCell = true,
}: CirugiaActionsCellProps) {
  const s = surgery
  const { activeCompany } = useAuth()
  const [executeDialogOpen, setExecuteDialogOpen] = React.useState(false)
  const [isExecuting, setIsExecuting] = React.useState(false)
  const [executeError, setExecuteError] = React.useState<string | null>(null)

  // Compute business rule results
  const canFacturarResult = canFacturar(s)
  const canRemitirResult = canRemitirNR(s)
  const canConsumoResult = canCargarConsumo(s)

  // Determine primary action
  const primaryAction = determinePrimaryAction(s, prId, canFacturarResult)

  // Has PR for display logic
  const hasPr = !!(prId || s.prNumber || s.presupuestoId)

  // ── Compute disabled reasons for dropdown actions ──
  const verPrReason = !hasPr ? "No existe presupuesto para esta cirugía" : undefined
  const remitirReason = !canRemitirResult.allowed ? canRemitirResult.reason : undefined
  const consumoReason = !canConsumoResult.allowed ? canConsumoResult.reason : undefined
  const facturarReason = !canFacturarResult.allowed ? canFacturarResult.reason : undefined
  const canSuspend = s.state !== "Suspendida" && s.state !== "Cancelada"
  const canCancel = s.state !== "Cancelada" && s.state !== "Suspendida"
  const canRecover = s.state === "Suspendida" || s.state === "Cancelada"
  const canExecute = s.backendCxStatus === "scheduled" && Boolean(s.backendId) && Boolean(activeCompany?.id)
  const executeReason = s.backendCxStatus !== "scheduled"
    ? "Solo una cirugía programada puede ejecutarse."
    : !s.backendId || !activeCompany?.id
      ? "La cirugía no tiene contexto server-side disponible."
      : undefined
  const primaryButtonClassName = "h-6 px-2 text-[11px] font-medium border border-slate-300/90 bg-white hover:bg-slate-50 text-slate-800 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
  const openDeletePreview = () => {
    onSetDialogSurgery(s)
    window.dispatchEvent(new CustomEvent("ossum:open-delete-surgery-dialog", { detail: { surgery: s } }))
  }
  const executeSurgery = async () => {
    if (!canExecute || !s.backendId || !activeCompany?.id) return
    setIsExecuting(true)
    setExecuteError(null)

    try {
      await apiFetch(
        `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(s.backendId)}/execute`,
        { method: "POST" }
      )
      setExecuteDialogOpen(false)
      window.dispatchEvent(new CustomEvent("ossum:surgeries-refresh"))
    } catch (error) {
      setExecuteError(error instanceof Error ? error.message : "No se pudo ejecutar la cirugía.")
    } finally {
      setIsExecuting(false)
    }
  }

  const renderInner = () => (
    <>
      <div className="flex items-center gap-1">
        {/* ── Contextual primary action ── */}
        {primaryAction === "autorizar" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => { onOpenExpediente(s.id); onSetExpTab("ficha") }}>
            Autorizar
          </Button>
        )}
        {primaryAction === "crear_pr" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => onOpenPresupuestoDialog(s)}>
            Crear PR
          </Button>
        )}
        {primaryAction === "despacho" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => { onOpenExpediente(s.id); onSetExpTab("remitos") }}>
            Despacho
          </Button>
        )}
        {primaryAction === "cargar" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => { onOpenExpediente(s.id); onSetExpTab("consumo") }}>
            Cargar
          </Button>
        )}
        {primaryAction === "facturar" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => { onSetDialogSurgery(s); onSetFacturarDialogOpen(true) }}>
            Facturar
          </Button>
        )}
        {primaryAction === "reanudar" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => onRecover(s)}>
            Reanudar
          </Button>
        )}
        {primaryAction === "expediente" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => onOpenExpediente(s.id)}>
            Expediente
          </Button>
        )}
        {primaryAction === "ver" && (
          <Button variant="outline" size="sm" className={primaryButtonClassName} onClick={() => onOpenExpediente(s.id)}>
            Ver
          </Button>
        )}

        {/* ── More actions dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0 border border-slate-300/90 bg-white hover:bg-slate-50 text-slate-600 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800">
              <MoreHorizontal className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
            <DropdownMenuLabel className="text-xs">Más acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Ver expediente — always available */}
            <ActionMenuItem
              icon={Eye}
              label="Ver expediente"
              onClick={() => onOpenExpediente(s.id)}
            />

            {/* Ver / Crear PR */}
            {hasPr ? (
              <ActionMenuItem
                icon={Receipt}
                label="Ver PR"
                onClick={() => { onOpenExpediente(s.id); onSetExpTab("presupuesto") }}
              />
            ) : (
              <ActionMenuItem
                icon={Receipt}
                label="Crear PR"
                onClick={() => onOpenPresupuestoDialog(s)}
              />
            )}

            {/* Remitir NR */}
            <ActionMenuItem
              icon={Truck}
              label="Remitir NR"
              disabled={!canRemitirResult.allowed}
              reason={remitirReason}
              onClick={canRemitirResult.allowed ? () => { onOpenExpediente(s.id); onSetExpTab("remitos") } : undefined}
            />

            {/* Cargar consumo */}
            <ActionMenuItem
              icon={Activity}
              label="Cargar consumo"
              disabled={!canConsumoResult.allowed}
              reason={consumoReason}
              onClick={canConsumoResult.allowed ? () => { onOpenExpediente(s.id); onSetExpTab("consumo") } : undefined}
            />

            <ActionMenuItem
              icon={PlayCircle}
              label="Ejecutar cirugía"
              disabled={!canExecute}
              reason={executeReason}
              onClick={canExecute ? () => { setExecuteError(null); setExecuteDialogOpen(true) } : undefined}
            />

            {/* Facturar / Autorizar FV */}
            <ActionMenuItem
              icon={Receipt}
              label={canFacturarResult.allowed ? "Facturar" : "Autorizar FV"}
              disabled={!canFacturarResult.allowed}
              reason={facturarReason}
              onClick={canFacturarResult.allowed ? () => { onSetDialogSurgery(s); onSetFacturarDialogOpen(true) } : undefined}
            />

            {/* Agregar nota */}
            <ActionMenuItem
              icon={StickyNote}
              label="Agregar nota"
              onClick={() => { onSetDialogSurgery(s); onSetNoteDialogOpen(true) }}
            />

            <DropdownMenuSeparator />

            {/* Cambiar estado */}
            <ActionMenuItem
              icon={ArrowUpDown}
              label="Cambiar estado"
              onClick={() => { onSetDialogSurgery(s); onSetNewState(s.state); onSetChangeStateDialogOpen(true) }}
            />

            {/* Cambiar fecha */}
            <ActionMenuItem
              icon={CalendarDays}
              label="Cambiar fecha"
              onClick={() => { onSetDialogSurgery(s); onSetChangeDateDialogOpen(true) }}
            />

            <DropdownMenuSeparator />

            {/* Suspender */}
            {canSuspend && (
              <ActionMenuItem
                icon={Ban}
                label="Suspender"
                onClick={() => { onSetDialogSurgery(s); onSetSuspendDialogOpen(true) }}
              />
            )}

            {/* Cancelar */}
            {canCancel && (
              <ActionMenuItem
                icon={XCircle}
                label="Cancelar"
                variant="destructive"
                onClick={() => { onSetDialogSurgery(s); onSetCancelDialogOpen(true) }}
              />
            )}

            {/* Recuperar */}
            {canRecover && (
              <ActionMenuItem
                icon={RotateCcw}
                label="Recuperar"
                onClick={() => onRecover(s)}
              />
            )}

            <DropdownMenuSeparator />

            <ActionMenuItem
              icon={Trash2}
              label="Eliminar cirugía"
              variant="destructive"
              onClick={openDeletePreview}
            />
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        <AlertDialog open={executeDialogOpen} onOpenChange={(open) => {
          if (!isExecuting) setExecuteDialogOpen(open)
          if (!open) setExecuteError(null)
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Ejecutar cirugía?</AlertDialogTitle>
              <AlertDialogDescription>
                La cirugía pasará a Realizada con la fecha y hora actual. Esta acción requiere un Remito entregado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {executeError ? <p className="text-sm text-destructive" role="alert">{executeError}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isExecuting}>Cancelar</AlertDialogCancel>
              <Button type="button" onClick={() => void executeSurgery()} disabled={isExecuting} autoFocus>
                {isExecuting ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                {isExecuting ? "Ejecutando…" : "Confirmar ejecución"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  )

  if (!asCell) {
    return (
      <div className={cn("flex items-center", tdClassName)} style={tdStyle} onClick={(e) => e.stopPropagation()}>
        {renderInner()}
      </div>
    )
  }

  return (
    <td className={cn("px-2 py-1", tdClassName)} style={tdStyle} onClick={(e) => e.stopPropagation()}>
      {renderInner()}
    </td>
  )
}
