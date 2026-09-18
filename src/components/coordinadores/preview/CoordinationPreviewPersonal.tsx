import type { CoordinationSurgeryRow } from "@/lib/services/coordination-view.service"
import { CoordinationPreviewCaseRow, deriveCoordinationPreviewPresentation, sortCoordinationPreviewRecentFinalized } from "@/components/coordinadores/preview/CoordinationPreviewCaseRow"

function PreviewRows({ rows }: { rows: CoordinationSurgeryRow[] }) {
  return <div className="space-y-2">{rows.map((row) => <CoordinationPreviewCaseRow key={row.id} row={row} />)}</div>
}

export function CoordinationPreviewPersonal({ rows }: { rows: CoordinationSurgeryRow[] }) {
  if (rows.length === 0) return <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-600">No tenés casos asignados en esta etapa.</div>
  const finalized = rows.filter((row) => deriveCoordinationPreviewPresentation(row).entry.bucket === "finalizado").sort(sortCoordinationPreviewRecentFinalized).slice(0, 6)
  const active = rows.filter((row) => deriveCoordinationPreviewPresentation(row).entry.bucket !== "finalizado")

  return (
    <section className="space-y-3" aria-label="Bandeja de coordinación en vista de prueba">
      <PreviewRows rows={active} />
      {finalized.length > 0 && <details data-preview-recent-finalized="collapsed" className="rounded-xl border border-emerald-200 bg-white">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Finalizadas recientes · {finalized.length}</summary>
        <div className="border-t border-emerald-100 p-2"><PreviewRows rows={finalized} /></div>
      </details>}
    </section>
  )
}
