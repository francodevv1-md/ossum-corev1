import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { InfoTooltip, HelpTip } from "@/components/ui/info-tooltip"

describe("InfoTooltip Component Library", () => {
  it("renders trigger button with aria-label", () => {
    render(
      <InfoTooltip
        title="Ayuda Facturación"
        description="Descripción de prueba"
        shortcuts={[{ key: "F2", label: "Catálogo" }]}
      />
    )

    const trigger = screen.getByRole("button", { name: "Ayuda Facturación" })
    expect(trigger).toBeInTheDocument()
  })

  it("renders HelpTip inline helper", () => {
    render(<HelpTip text="Texto de ayuda inline" title="Campo requerido" />)
    const trigger = screen.getByRole("button", { name: "Campo requerido" })
    expect(trigger).toBeInTheDocument()
  })
})
