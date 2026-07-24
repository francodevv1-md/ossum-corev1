type Props = {
  actorLabel: string
  surface: "personal" | "global"
  subjectLabel?: string
}

export function CoordinationPreviewBanner({ actorLabel, surface, subjectLabel }: Props) {
  return (
    <aside className="sticky top-0 z-10 rounded-xl border border-sky-300 bg-sky-950 px-4 py-3 text-white shadow-sm" aria-label="Vista de prueba DEV de solo lectura">
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">Vista de prueba DEV · Solo lectura</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sky-100">
        <span>Sesión real: {actorLabel}</span>
        <span>{surface === "personal" ? `Bandeja visualizada: ${subjectLabel || "Coordinador"}` : "Panel global"}</span>
      </div>
    </aside>
  )
}
