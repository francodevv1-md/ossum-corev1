import type { CoordinationSurgeryRow } from "@/lib/services/coordination-view.service"
import { CoordinationPreviewCaseRow, deriveCoordinationPreviewPresentation, sortCoordinationPreviewRecentFinalized } from "@/components/coordinadores/preview/CoordinationPreviewCaseRow"

export function CoordinationPreviewGlobal({ rows }: { rows: CoordinationSurgeryRow[] }) {
  if (rows.length === 0) return <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-600">No hay casos operativos para mostrar.</div>
  const finalized = rows.filter((row) => deriveCoordinationPreviewPresentation(row).entry.bucket === "finalizado").sort(sortCoordinationPreviewRecentFinalized).slice(0, 6)
  const active = rows.filter((row) => deriveCoordinationPreviewPresentation(row).entry.bucket !== "finalizado")

  return <section className="space-y-3" aria-label="Panel global en vista de prueba">
    <div className="space-y-2">{active.map((row) => <CoordinationPreviewCaseRow key={row.id} row={row} />)}</div>
    {finalized.length > 0 && <details data-preview-recent-finalized="collapsed" className="rounded-xl border border-emerald-200 bg-white">
      <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Finalizadas recientes · {finalized.length}</summary>
      <div className="space-y-2 border-t border-emerald-100 p-2">{finalized.map((row) => <CoordinationPreviewCaseRow key={row.id} row={row} />)}</div>
    </details>}
  </section>
}
