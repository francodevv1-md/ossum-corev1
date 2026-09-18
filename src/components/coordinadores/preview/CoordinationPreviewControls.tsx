import { Button } from "@/components/ui/button"
import type { CoordinatorSubject } from "@/lib/services/personal-coordinator-resolver.service"

type Props = {
  surface: "personal" | "global"
  targets: CoordinatorSubject[]
  selectedContactId?: string
  onSurfaceChange: (surface: "personal" | "global") => void
  onTargetChange: (contactId: string) => void
  onExit: () => void
}

export function CoordinationPreviewControls({ surface, targets, selectedContactId, onSurfaceChange, onTargetChange, onExit }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3" aria-label="Controles de vista de prueba">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <label className="text-xs font-medium text-slate-700">
          Probar bandeja de
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedContactId || ""}
            onChange={(event) => onTargetChange(event.target.value)}
          >
            <option value="" disabled>Seleccioná un coordinador</option>
            {targets.map((target) => <option key={target.contactId} value={target.contactId}>{target.label || "Coordinador sin nombre"}</option>)}
          </select>
        </label>
        <div className="flex gap-2" aria-label="Superficie de prueba">
          <Button type="button" variant={surface === "personal" ? "default" : "outline"} className="min-h-11" aria-pressed={surface === "personal"} onClick={() => onSurfaceChange("personal")}>Bandeja del coordinador</Button>
          <Button type="button" variant={surface === "global" ? "default" : "outline"} className="min-h-11" aria-pressed={surface === "global"} onClick={() => onSurfaceChange("global")}>Panel global</Button>
        </div>
        <Button type="button" variant="outline" className="min-h-11" onClick={onExit}>Volver a mi bandeja</Button>
      </div>
    </section>
  )
}
