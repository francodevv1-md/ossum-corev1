import { useEffect, useMemo, useRef } from "react"
import { useCoordinationView, type CoordinationSurface } from "@/hooks/useCoordinationView"
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter"

export function useActiveCoordination(surface: CoordinationSurface) {
  const view = useCoordinationView({ surface, isolated: true, loadAll: true })
  const refresh = useRef(view.refresh)
  refresh.current = view.refresh
  useEffect(() => {
    const reload = () => { void refresh.current() }
    window.addEventListener("focus", reload)
    window.addEventListener("coordination-updated", reload)
    return () => {
      window.removeEventListener("focus", reload)
      window.removeEventListener("coordination-updated", reload)
    }
  }, [])
  const surgeries = useMemo(() => mapApiSurgeryListToSurgeries(view.response?.surgeries ?? [], []), [view.response])
  return { ...view, surgeries }
}
