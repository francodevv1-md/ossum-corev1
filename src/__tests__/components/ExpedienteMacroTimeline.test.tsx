import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ExpedienteMacroTimeline } from "@/components/expediente/ExpedienteMacroTimeline"

describe("ExpedienteMacroTimeline", () => {
  it("preserva las seis etiquetas y marca únicamente la etapa actual", () => {
    render(
      <ExpedienteMacroTimeline
        model={{
          activeKey: "transito",
          stages: [
            { key: "sin_autorizar", label: "Sin autorizar", done: true, current: false },
            { key: "autorizado", label: "Autorizado", done: true, current: false },
            { key: "pendiente", label: "Pendiente", done: true, current: false },
            { key: "transito", label: "Tránsito", done: false, current: true },
            { key: "realizada", label: "Realizada", done: false, current: false },
            { key: "finalizada", label: "Finalizada", done: false, current: false },
          ],
        }}
      />,
    )

    expect(screen.getAllByText(/Sin autorizar|Autorizado|Pendiente|Tránsito|Realizada|Finalizada/)).toHaveLength(6)
    expect(screen.getByText("Tránsito").parentElement).toHaveAttribute("aria-current", "step")
  })
})
